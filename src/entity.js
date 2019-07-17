"use strict"

if (typeof require !== "undefined") {
    var m3c = require("./m3c.js")
    var str = require("./str.js")
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

    const placeholder = "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png"

    /**
     * Fetches the name
     * @param {tpf.Client} client
     * @param {string} entity IRI of an Entity
     * @param {(name: string) => void} returnName
     *        Callback function that receives the name.
     */
    function Name(client, entity, returnName) {
        return new Promise(function () {
            client
                .Entity(entity)
                .Link(rdfs, "label")
                .Single(returnName)
        })
    }

    /**
     * @class
     * @param {tpf.Client} client
     * @param {string} entity  IRI of the Person
     */
    function Person(client, entity) {
        this.Collaborators = function Collaborators(returnCollaborators) {
            const runners = new Promise(function (resolve) {
                client
                    .Entity(entity)
                    .Link(base, "isPIFor")
                    .Link(base, "collectionFor")
                    .Link(base, "runBy")
                    .Results(resolve)
            })

            const investigators = new Promise(function (resolve) {
                client
                    .Entity(entity)
                    .Link(base, "runnerOf")
                    .Link(base, "collectedBy")
                    .Link(base, "hasPI")
                    .Results(resolve)
            })

            return Promise
                .all([runners, investigators])
                .then(flatten)
                .then(returnCollaborators)
        }

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(base, "runnerOf")
                    .Link(base, "developedFrom")
                    .Results(returnDatasets)
            })
        }

        this.Emails = function Emails(returnEmails) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(obo, "ARG_2000028")
                    .Link(vcard, "hasEmail")
                    .Link(vcard, "email")
                    .Results(returnEmails)
            })
        }

        this.Name = function name(returnName) {
            return Name(client, entity, returnName)
        }

        this.Organization = function Organization(returnOrganization) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(base, "associatedWith")
                    .Single(returnOrganization)
            })
        }

        this.Phones = function Phones(returnPhones) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(obo, "ARG_2000028")
                    .Link(vcard, "hasTelephone")
                    .Link(vcard, "telephone")
                    .Results(returnPhones)
            })
        }

        this.Photo = function Photo(returnPhoto) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(vitro, "mainImage")
                    .Link(vitro, "downloadLocation")
                    .Results(returnPhoto)
            })
        }

        this.Projects = function Projects(returnProjects) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(base, "isPIFor")
                    .Results(returnProjects)
            })
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(vivo, "relatedBy")
                    .Type(vivo, "Authorship")
                    .Link(vivo, "relates")
                    .Type(bibo, "Document")
                    .Results(returnPublications)
            })
        }

        this.Studies = function Studies(returnStudies) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(base, "runnerOf")
                    .Results(returnStudies)
            })
        }

        this.Tools = function Tools(returnTools) {
            return new Promise(function () {
                client
                    .Entity(entity)
                    .Link(base, "developerOf")
                    .Results(returnTools)
            })
        }
    }

    /**
     * Fills in the HTML element for all Persons.
     *
     * @param {tpf.Client} client
     * @param {Element}    element Root HTML node for this profile.
     */
    function RenderPeople(client, element) {
        const ol = element.querySelector("ol")
        const template = element.querySelector("li.person.template")

        client
            .List(foaf + "Person")
            .ForEach(function (personIRI) {
                renderPersonCard(personIRI.slice(1, -1))
            })

        function renderPersonCard(entity) {
            const li = template.cloneNode(true)
            li.className = li.className.replace("template", "")

            const link = li.querySelector("a")
            link.href = m3c.ProfileLink("person", entity)

            ol.append(li)

            client
                .Entity(entity)
                .Link(rdfs, "label")
                .Single(renderName)

            client
                .Entity(entity)
                .Link(vitro, "mainImage")
                .Link(vitro, "downloadLocation")
                .Single(renderPhoto)

            client
                .Entity(entity)
                .Link(base, "associatedWith")
                .Link(rdfs, "label")
                .Single(renderOrganization)

            client
                .Entity(entity)
                .Link(obo, "ARG_2000028")
                .Link(vcard, "hasTelephone")
                .Link(vcard, "telephone")
                .Single(renderPhone)

            client
                .Entity(entity)
                .Link(obo, "ARG_2000028")
                .Link(vcard, "hasEmail")
                .Link(vcard, "email")
                .Single(renderEmail)

            function renderEmail(email) {
                if (!email) {
                    return
                }

                li.querySelector(".email").innerHTML = str.Format(
                    '<i class="fas fa-envelope"></i>{}',
                    email
                )
            }

            function renderName(name) {
                name = name.trim()
                link.querySelector(".name").innerHTML =
                    '<i class="fas fa-user"></i>' + name
                link.querySelector(".photo").alt = name

                sort(ol, 1)
            }

            function renderOrganization(name) {
                li.querySelector(".organization").innerHTML =
                    '<i class="fas fa-building"></i>' + name.trim()
            }

            function renderPhone(telephone) {
                if (!telephone) {
                    return
                }

                li.querySelector(".phone").innerHTML = str.Format(
                    '<i class="fas fa-phone"></i>{}',
                    telephone
                )
            }

            function renderPhoto(src) {
                if (!src) {
                    src = placeholder
                }

                link.querySelector(".photo").src = src
            }
        }
    }

    /**
     * Sorts the HTML ordered list of Persons.
     * @param {Element} root      Root element containing the `<ol>`.
     * @param {number}  direction Descending <0; ascending >0; 0 is nonsense.
     */
    function Sort(root, direction) {
        sort(root.querySelector("ol"), direction)
    }

    /** Creates a new array from a two-dimensional array. */
    function flatten(arr) {
        return arr.reduce(function (acc, val) {
            return acc.concat(val)
        }, [])
    }

    /** Sorts an ordered list's items. */
    function sort(ol, direction) {
        const lis = Array.prototype.slice.call(ol.querySelectorAll("li"))
        lis.sort(function (a, b) {
            const name1 = a.querySelector(".name").innerText.toUpperCase()
            const name2 = b.querySelector(".name").innerText.toUpperCase()

            if (!name1) return -1
            if (!name2) return 1
            if (name1 < name2) return -1 * direction
            if (name1 > name2) return 1 * direction
            return 0
        })

        while (ol.firstChild) {
            ol.removeChild(ol.firstChild)
        }

        lis.forEach(function (li) {
            ol.append(li)
        })
    }

    // Module Exports
    return {
        Name: Name,
        Person: Person,
        RenderPeople: RenderPeople,
        Sort: Sort,
    }

})()

if (typeof module !== "undefined") {
    module.exports = entity
}
