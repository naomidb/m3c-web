"use strict"

if (typeof require !== "undefined") {
    var tpf = require("./tpf.js")
}

/**
 * Models of the various Entities such as a Person.
 * @module entity
 */
var entity = (function module() {
    const
        base = "http://www.metabolomics.info/ontologies/2019/metabolomics-consortium#",
        bibo = "http://purl.org/ontology/bibo/",
        foaf = "http://xmlns.com/foaf/0.1/",
        obo = "http://purl.obolibrary.org/obo/",
        rdfs = "http://www.w3.org/2000/01/rdf-schema#",
        vcard = "http://www.w3.org/2006/vcard/ns#",
        vitro = "http://vitro.mannlib.cornell.edu/ns/vitro/public#",
        vivo = "http://vivoweb.org/ontology/core#"

    /**
     * Fetches the name (label) of an Entity.
     *
     * @param {tpf.Client} client
     * @param {string} iri IRI of an Entity
     * @param {(name: string) => void} returnName
     *        Callback function that receives the name.
     */
    function Name(client, iri, returnName) {
        return new Promise(function () {
            client
                .Entity(iri)
                .Link(rdfs, "label")
                .Single(decodeString(returnName))
        })
    }

    /**
     *
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Person
     */
    function Person(client, iri) {
        return new person(client, iri)
    }

    /**
     * Fetches the name (label) of an Entity.
     *
     * @param {tpf.Client} client
     * @param {(name: string) => void} returnPerson
     *        Callback function that receives each the URI of a Person. It is
     *        called once per Person.
     */
    function Persons(client, returnPerson) {
        return new Promise(function () {
            client
                .List(foaf + "Person")
                .ForEach(returnPerson)
        })
    }

    function decodeString(callback) {
        return function decoder(text) {
            callback(deleteSurroundingQuotes(text))
        }
    }

    function decodeStrings(callback) {
        return function decoder(strings) {
            callback(strings.map(deleteSurroundingQuotes))
        }
    }

    function deleteSurroundingQuotes(str) {
        if (str[0] === '"' && str[str.length - 1] === '"') {
            return str.slice(1, -1)
        }
        return str
    }

    /** Creates a new array from a two-dimensional array. */
    function flatten(arr) {
        return arr.reduce(function (acc, val) {
            return acc.concat(val)
        }, [])
    }

    /**
     * @class
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Person
     */
    function person(client, iri) {
        this.Collaborators = function Collaborators(returnCollaborators) {
            const runners = new Promise(function (resolve) {
                client
                    .Entity(iri)
                    .Link(base, "isPIFor")
                    .Link(base, "collectionFor")
                    .Link(base, "runBy")
                    .Results(decodeStrings(resolve))
            })

            const investigators = new Promise(function (resolve) {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Link(base, "collectedBy")
                    .Link(base, "hasPI")
                    .Results(decodeStrings(resolve))
            })

            return Promise
                .all([runners, investigators])
                .then(flatten)
                .then(returnCollaborators)
        }

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Link(base, "developedFrom")
                    .Results(decodeStrings(returnDatasets))
            })
        }

        this.Emails = function Emails(returnEmails) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(obo, "ARG_2000028")
                    .Link(vcard, "hasEmail")
                    .Link(vcard, "email")
                    .Results(decodeStrings(returnEmails))
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.Organization = function Organization(returnOrganization) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "associatedWith")
                    .Single(decodeString(returnOrganization))
            })
        }

        this.Phones = function Phones(returnPhones) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(obo, "ARG_2000028")
                    .Link(vcard, "hasTelephone")
                    .Link(vcard, "telephone")
                    .Results(decodeStrings(returnPhones))
            })
        }

        this.Photo = function Photo(returnPhoto) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(vitro, "mainImage")
                    .Link(vitro, "downloadLocation")
                    .Link(vitro, "directDownloadUrl")
                    .Single(decodeString(returnPhoto))
            })
        }

        this.PhotoThumbnail = function Photo(returnPhoto) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(vitro, "mainImage")
                    .Link(vitro, "thumbnailImage")
                    .Link(vitro, "downloadLocation")
                    .Link(vitro, "directDownloadUrl")
                    .Single(decodeString(returnPhoto))
            })
        }

        this.Projects = function Projects(returnProjects) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "isPIFor")
                    .Results(decodeStrings(returnProjects))
            })
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(vivo, "relatedBy")
                    .Type(vivo, "Authorship")
                    .Link(vivo, "relates")
                    .Type(bibo, "Document")
                    .Results(decodeStrings(returnPublications))
            })
        }

        this.Studies = function Studies(returnStudies) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Results(decodeStrings(returnStudies))
            })
        }

        this.Tools = function Tools(returnTools) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "developerOf")
                    .Results(decodeStrings(returnTools))
            })
        }
    }

    // Module Exports
    return {
        Name: Name,
        Person: Person,
        Persons: Persons,
    }

})()

if (typeof module !== "undefined") {
    module.exports = entity
}
