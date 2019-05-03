"use strict"

if (typeof require !== "undefined") {
    var tpf = require("./tpf.js")
}

var m3c = (function namespace() {

    let endpoint = ""
    let cache = {}

    function Configure(url) {
        endpoint = url
    }

    function Query(iri) {
        return new query(iri)
    }

    function decodeString(str) {
        if (str.length === 0) {
            return str
        }

        if (str[0] !== '"' || str[str.length - 1] !== '"') {
            return str
        }

        return str.slice(1, -1)
    }

    function flatten(multiDimensionalArray) {
        return multiDimensionalArray
            .reduce(function (prev, current) {
                return prev.concat(current)
            }, [])
    }

    /** Creates an IRI Reference string of the form <http://example.com/x>. */
    function iriref(prefix, fragment) {
        return "<" + prefix + fragment + ">"
    }

    function lookup(iri) {
        if (valid(cache[iri])) {
            return Promise.resolve(cache[iri].triples)
        }

        return tpf
            .Query(endpoint, iri)
            .then(function (triples) {
                cache[iri] = {
                    triples: triples,
                    updated: new Date(),
                }
                return triples
            })
            .then(function (triples) { return triples.filter(useful) })
    }

    /**
     * Supports the fluent/chaining interface for TPF querying.
     *
     * Example: get all emails via vcard.
     *
     *  m3c.Query("https://vivo.metabolomics.info/individual/n007")
     *     .Link("http://purl.obolibrary.org/obo/", "ARG_2000028")
     *     .Link("http://www.w3.org/2006/vcard/ns#", "hasEmail")
     *     .Link("http://www.w3.org/2006/vcard/ns#", "email")
     *     .Results(function (emails) { console.log(emails) })
     */
    class query {
        constructor(subject) {
            this.subjects = [subject]
            this.triples = []
            this.functions = []
        }

        Link(ontology, fragment) {
            const self = this
            const pred = iriref(ontology, fragment)

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

    /** Returns whether an item is in the cache and is recent or not. */
    function valid(cacheItem) {
        if (!cacheItem) {
            return false
        }

        const cutoff = 30000 // 5 minutes
        const now = new Date()

        return now - cacheItem.updated < cutoff
    }

    return {
        Configure: Configure,
        Query: Query,
    }

})()

if (typeof module !== "undefined") {
    module.exports = m3c
}