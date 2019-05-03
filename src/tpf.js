"use strict"

var tpf = (function namespace() {

    /**
     * Client for a Triple Pattern Fragment server.
     *
     * The main benefit of this client is its caching of previous TPF requests.
     * Additionally, it supports both a fluent API using {@link Client#Entity}
     * and Promise-based querying using {@link Client#Query}.
     */
    class Client {
        constructor(endpoint) {
            this.cache = {}
            this.endpoint = endpoint
            this.lookup = this.lookup.bind(this)
        }

        /**
         * Query the TPF server for an entity using a fluent/chaining interface.
         *
         * **Example**: get all emails via vcard
         *
         *    new Client("https://vivo.metabolomics.info/tpf/core")
         *       .Entity("https://vivo.metabolomics.info/individual/n007")
         *       .Link("http://purl.obolibrary.org/obo/", "ARG_2000028")
         *       .Link("http://www.w3.org/2006/vcard/ns#", "hasEmail")
         *       .Link("http://www.w3.org/2006/vcard/ns#", "email")
         *       .Results(function (emails) { console.log(emails) })
         */
        Entity(iri) {
            return new fluentQuery(this, iri)
        }

        /**
         * Query the TPF server.
         * @param {string} subject
         * @param {string} predicate
         * @param {string} object
         */
        Query(subject, predicate, object) {
            return Query(this.endpoint, subject, predicate, object)
        }

        /** Queries the TPF server for the entity with `iri`, if not cached. */
        lookup(iri) {
            const valid = this.valid
            const cache = this.cache

            if (valid(cache[iri])) {
                return Promise.resolve(cache[iri].triples)
            }

            return Query(endpoint, iri)
                .then(function (triples) {
                    cache[iri] = {
                        triples: triples,
                        updated: new Date(),
                    }
                    return triples
                })
                .then(function (triples) { return triples.filter(useful) })
        }

        /** Returns whether an item is in the cache and is recent or not. */
        valid(cacheItem) {
            if (!cacheItem) {
                return false
            }

            const cutoff = 30000 // 5 minutes
            const now = new Date()

            return now - cacheItem.updated < cutoff
        }
    }

    /**
     * Creates an IRI Reference string of the form \<http://example.com/x>.
     * @param {string} prefix
     * @param {string} fragment
     */
    function IRIReference(prefix, fragment) {
        return "<" + prefix + fragment + ">"
    }

    /**
     * Parses n-triples into an array of three strings.
     * @param {string} text
     */
    function ParseTriples(text) {
        const triples = []

        const lines = text.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split(" ")
            // parts should be an array of at least 4 elements ending with "."
            // ["<http...>", "<http...>", "\"Hi", "there!\"@en-US"", "."]
            if (parts.length < 4) {
                continue
            }

            const triple = {
                Subject: parts[0],
                Predicate: parts[1],
                Object: parts.slice(2, parts.length - 1).join(" "),
            }

            triples.push(triple)
        }

        return triples
    }

    /**
     * Query a Linked Data Fragments Server by triple pattern.
     * @param {string} endpoint URL of the TPF server.
     * @param {string} subject
     * @param {string} predicate
     * @param {string} object
     */
    function Query(endpoint, subject, predicate, object) {
        const criteria = {
            subject: subject || "",
            predicate: predicate || "",
            object: object || "",
        }

        const headers = {
            Accept: "application/n-triples; charset=utf-8"
        }

        const options = {
            headers: headers,
        }

        const url = endpoint + encodeQueryString(criteria)

        return fetch(url, options)
            .then(function (data) { return data.text() })
            .then(ParseTriples)
    }

    /** Removes the surrounding double-quotation marks from a string. */
    function decodeString(str) {
        if (str.length === 0) {
            return str
        }

        if (str[0] !== '"' || str[str.length - 1] !== '"') {
            return str
        }

        return str.slice(1, -1)
    }

    /** Encodes the individual parts of a query string to make it URI safe. */
    function encodeQueryString(parts) {
        if (!parts || Object.keys(parts).length === 0) {
            return ""
        }

        const enc = encodeURIComponent

        return "?" +
            Object
                .keys(parts)
                .map(function (key) {
                    const pair = [enc(key), enc(parts[key])]
                    return pair.join("=")
                })
                .join("&")
    }

    /** Flattens a multi-dimensional array into a single-dimensional array. */
    function flatten(multiDimensionalArray) {
        return multiDimensionalArray
            .reduce(function (prev, current) {
                return prev.concat(current)
            }, [])
    }

    /**
     * Supports the fluent/chaining interface for TPF querying.
     *
     * This works by tracking, but postponing, the lookups until {@link Results}
     * is called. At that point, each entity is looked up, then filtered. The
     * process repeats until there are no more links to follow.
     */
    class fluentQuery {
        constructor(client, subject) {
            this.client = client
            this.subjects = [subject]
            this.triples = []
            this.functions = []
        }

        Link(ontology, fragment) {
            const self = this
            const lookup = this.client.lookup
            const pred = IRIReference(ontology, fragment)

            function link() {
                return Promise
                    .all(
                        self.subjects
                            .map(function (subject) { return lookup(subject) })
                    )
                    .then(function (results) {
                        self.subjects =
                            flatten(results)
                                .filter(function (t) { return t.Predicate === pred })
                                .map(function (t) { return t.Object })
                    })
            }

            this.functions.push(link)

            return this
        }

        /**
         * Executes the query, then calling `callback` with the results.
         * @param {(results: string[])} callback
         */
        Results(callback) {
            const self = this

            this.process()
                .then(function () {
                    const decoded = self.subjects.map(decodeString)
                    callback(decoded)
                })

            return this
        }

        process() {
            if (this.functions.length === 0) {
                return Promise.resolve(this.results)
            }

            const self = this
            const head = this.functions.shift()

            return head()
                .then(function () { return self.process() })
        }
    }

    /**
     * Removes unused metadata and hypermedia-control triples.
     * @see http://www.hydra-cg.com/spec/latest/triple-pattern-fragments/#definition
     */
    function useful(triple) {
        const controls = "http://www.w3.org/ns/hydra/core"
        const metadata = "http://rdfs.org/ns/void"

        return triple.Object.indexOf(controls) === -1 &&
            triple.Object.indexOf(metadata) === -1 &&
            triple.Predicate.indexOf(controls) === -1 &&
            triple.Predicate.indexOf(metadata) === -1
    }

    // Namespace Exports
    return {
        Client: Client,
        IRIReference: IRIReference,
        ParseTriples: ParseTriples,
        Query: Query,
    }

})()

if (typeof module !== "undefined") {
    module.exports = tpf
}
