"use strict"

if (typeof require !== "undefined") {
    var tpf = require("./tpf.js")
}

var m3c = (function namespace() {

    /** Interface to the M3C server. */
    class Client {
        constructor(url) {
            this.url = url
            this.cache = {}
        }

        GetEntity(iri) {
            const client = this
            const useful = this.useful

            return this
                .Lookup(iri)
                .then(function (triples) { return triples.filter(useful) })
                .then(function (triples) { return new Entity(client, triples) })
        }

        GetPerson(iri) {
            const client = this
            const useful = this.useful

            return this
                .Lookup(iri)
                .then(function (triples) { return triples.filter(useful) })
                .then(function (triples) { return Person.FromTriples(client, triples) })
        }

        Lookup(iri) {
            const cache = this.cache

            if (this.valid(cache[iri])) {
                return Promise.resolve(cache[iri].triples)
            }

            return tpf
                .Query(this.url, iri)
                .then(function (triples) {
                    cache[iri] = {
                        triples: triples,
                        updated: new Date(),
                    }
                    return triples
                })
        }

        /**
         * Used to remove unused metadata and hypermedia-control triples.
         * @see http://www.hydra-cg.com/spec/latest/triple-pattern-fragments/#definition
         */
        useful(triple) {
            const controls = "http://www.w3.org/ns/hydra/core"
            const metadata = "http://rdfs.org/ns/void"

            return triple.Object.indexOf(controls) === -1 &&
                triple.Object.indexOf(metadata) === -1 &&
                triple.Predicate.indexOf(controls) === -1 &&
                triple.Predicate.indexOf(metadata) === -1
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
     * Represents anything that can be the subject of a Triple Pattern Fragment.
     */
    class Entity {
        constructor(client, triples) {
            this.client = client
            this.triples = triples
            this.links = {
                get(predicate) {
                    return this[predicate] || []
                }
            }

            for (let i = 0; i < triples.length; i++) {
                const triple = triples[i]

                if (!this.links[triple.Predicate]) {
                    this.links[triple.Predicate] = []
                }

                this.links[triple.Predicate].push(triple.Object)
            }
        }

        entity() {
            const root = this
            return {
                current: [root],
                objects(iref) {
                    this.current = this.current.reduce(function (current, subject) {
                        links.get(iref)
                        return current.append()
                    }, [])
                }
            }
        }

        labels() {
            const rdfsLabel = iriref(rdfs, "label")
            return this.links.get(rdfsLabel)
        }

        types() {
            const rdfType = iriref(rdf, "type")
            return this.links.get(rdfType)
        }
    }

    class Person extends Entity {
        static FromTriples(client, triples) {
            const foafPerson = iriref(foaf, "Person")

            if (!hasType(triples, foafPerson)) {
                return null
            }

            return new Person(client, triples)
        }

        Name() {
            const labels = this.labels()
            return decodeString(labels[0]).trim()
        }

        Emails() {
            return this
                .entity()
                .objects(iriref(obo, "ARG_2000028"))
                .objects(iriref(vcard, "hasEmail"))
                .objects(iriref(vcard, "email"))
                .strings()
        }

        emailCards() {
            const vcardHasEmail = iriref(vcard, "hasEmail")
            return vcards()
                .then(function (cards) {
                    return cards
                        .map(function (card) {
                            return card.links.get(vcardHasEmail)
                        })
                        .filter(function (vcardEmailIRI) {

                        })
                })
        }

        vcards() {
            const oboArg28 = iriref(obo, "ARG_2000028")

            const uris = this.links.get(oboArg28)
            const cards = uris.map(this.client.Lookup)

            return Promise
                .all(cards)
                .then(function (cards) {
                    return cards.filter(function notNull(c) { return !!c })
                })
        }
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

    function hasType(triples, type) {
        const rdfType = iriref(rdf, "type")

        return triples.some(function (t) {
            return t.Predicate === rdfType && t.Object === type
        })
    }

    /** Creates an IRI Reference string of the form <http://example.com/x>. */
    function iriref(prefix, fragment) {
        return "<" + prefix + fragment + ">"
    }

    const
        foaf = "http://xmlns.com/foaf/0.1/",
        obo = "http://purl.obolibrary.org/obo/",
        rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs = "http://www.w3.org/2000/01/rdf-schema#",
        vcard = "http://www.w3.org/2006/vcard/ns#"

    return {
        Client: Client,
        Person: Person,
    }

})()

if (typeof module !== "undefined") {
    module.exports = m3c
}