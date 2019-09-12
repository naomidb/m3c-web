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
        rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        obo = "http://purl.obolibrary.org/obo/",
        rdfs = "http://www.w3.org/2000/01/rdf-schema#",
        vcard = "http://www.w3.org/2006/vcard/ns#",
        vitro = "http://vitro.mannlib.cornell.edu/ns/vitro/public#",
        vivo = "http://vivoweb.org/ontology/core#"

    /**
     * Fetches all Authorships, the link between authors and publications.
     * @param {tpf.Client} client
     */
    function Authorships(client) {
        return client
            .Query(null, vivo + "relates", null)
            .then(function (triples) {
                const authorships = {}
                triples.forEach(function (triple) {
                    if (!authorships[triple.Subject]) {
                        authorships[triple.Subject] = []
                    }

                    authorships[triple.Subject].push(triple.Object)
                })
                return authorships
            })
    }

    /**
     * Fetches a mapping from person IRI to their associated organizations' IRI.
     * @param {tpf.Client} client
     */
    function AssociatedWiths(client) {
        return client
            .Query(null, base + "associatedWith", null)
            .then(function(triples) {
                const associatedWith = {}
                triples.forEach(function(triple) {
                    if (!associatedWith[triple.Subject]) {
                        associatedWith[triple.Subject] = []
                    }
                    associatedWith[triple.Subject].push(triple.Object)
                })
                return associatedWith
            })
    }

    function Departments(client) {
        return new Promise(function (resolve) {
            client
                .List(vivo + "Department")
                .Results(resolve)
        })
    }

    function FundingOrganizations(client) {
        return client
            .Query(null, base + "managedBy", null)
            .then(function(triples) {
                const fundedBys = {}
                triples.forEach(function(triple) {
                    fundedBys[triple.Subject] = triple.Object
                })
                return fundedBys
            })
    }

    function Institutes(client) {
        return new Promise(function (resolve) {
            client
                .List(vivo + "Institute")
                .Results(resolve)
        })
    }

    function Laboratories(client) {
        return new Promise(function (resolve) {
            client
                .List(vivo + "Laboratory")
                .Results(resolve)
        })
    }

    /**
     * Fetches the name (label) of an Entity.
     *
     * @param {tpf.Client} client
     * @param {string} iri IRI of an Entity
     * @param {(name: string) => void} returnName
     *        Callback function that receives the name.
     */
    function Name(client, iri, returnName) {
        return new Promise(function() {
            client
                .Entity(iri)
                .Link(rdfs, "label")
                .Single(decodeString(returnName))
        })
    }

    /**
     * Fetches all names.
     * @param {tpf.Client} client
     */
    function Names(client) {
        return client.Query(null, rdfs + "label", null).then(function(triples) {
            const names = {}
            triples.forEach(function(triple) {
                names[triple.Subject] = parseVIVOString(triple.Object)
            })
            return names
        })
    }

    /**
     *
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Organization
     */
    function Organization(client, iri) {
        return new organization(client, iri)
    }

    /**
     * Gets a mapping from child organization IRI to their parent's IRI.
     * @param {tpf.Client} client
     */
    function Parents(client) {
        return client
            .Query(null, base + "hasParent", null)
            .then(function (triples) {
                const parents = {}
                triples.forEach(function (triple) {
                    parents[triple.Subject] = triple.Object
                })
                return parents
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
     * Fetches all entities of type foaf:Person.
     * @param {tpf.Client} client
     */
    function Persons(client) {
        return new Promise(function(resolve) {
            client.List(foaf + "Person").Results(resolve)
        })
    }

    function Project(client, iri) {
        return new project(client, iri)
    }

    function Projects(client) {
        return new Promise(function(resolve) {
            client.List(base + "Project").Results(resolve)
        })
    }

    function Publication(client, iri) {
        return new publication(client, iri)
    }

    function Publications(client) {
        return new Promise(function (resolve) {
            client
                .List(bibo + "Document")
                .Results(resolve)
        })
    }

    function Studies(client) {
        return new Promise(function(resolve) {
            client.List(base + "Study").Results(resolve)
        })
    }

    function Study(client, iri) {
        return new study(client, iri)
    }

    function SubmissionDates(client) {
        return client
            .Query(null, base + "submitted", null)
            .then(function(triples) {
                const submitted = {}
                triples.forEach(function(triple) {
                    submitted[triple.Subject] = parseDate(triple.Object)
                })
                return submitted
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
        return arr.reduce(function(acc, val) {
            return acc.concat(val)
        }, [])
    }

    /**
     * Parses a Date object from an xsd:dateTime string.
     *
     * Ex: "2015-07-16T00:00:00"^^<http://www.w3.org/2001/XMLSchema#dateTime>
     */
    function parseDate(dt) {
        const dateTime = dt.substring(1, dt.lastIndexOf('"'))
        return new Date(dateTime)
    }

    /**
     * @class
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Person
     */
    function person(client, iri) {
        this.Collaborators = function Collaborators(returnCollaborators) {
            const runners = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "isPIFor")
                    .Link(base, "collectionFor")
                    .Link(base, "runBy")
                    .Results(decodeStrings(resolve))
            })

            const investigators = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Link(base, "inCollection")
                    .Link(base, "hasPI")
                    .Results(decodeStrings(resolve))
            })

            return Promise.all([runners, investigators])
                .then(flatten)
                .then(unique)
                .then(returnCollaborators)
        }

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Link(base, "developedFrom")
                    .Results(decodeStrings(returnDatasets))
            })
        }

        this.Emails = function Emails(returnEmails) {
            return new Promise(function() {
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

        this.Organizations = function Organizations(returnOrganizations) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "associatedWith")
                    .Results(decodeString(returnOrganizations))
            })
        }

        this.Phones = function Phones(returnPhones) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(obo, "ARG_2000028")
                    .Link(vcard, "hasTelephone")
                    .Link(vcard, "telephone")
                    .Results(decodeStrings(returnPhones))
            })
        }

        this.Photo = function Photo(returnPhoto) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vitro, "mainImage")
                    .Link(vitro, "downloadLocation")
                    .Link(vitro, "directDownloadUrl")
                    .Single(decodeString(returnPhoto))
            })
        }

        this.PhotoThumbnail = function Photo(returnPhoto) {
            return new Promise(function() {
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
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "isPIFor")
                    .Results(decodeStrings(returnProjects))
            })
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function() {
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
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "runnerOf")
                    .Results(decodeStrings(returnStudies))
            })
        }

        this.Tools = function Tools(returnTools) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "developerOf")
                    .Results(decodeStrings(returnTools))
            })
        }
    }

    /**
     * @class
     * @param {tpf.Client} client
     * @param {string} iri IRI of the Organization
     */
    function organization(client, iri) {
        this.Children = function Children(returnChildren) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "parentOf")
                    .Results(decodeStrings(returnChildren))
            })
        }

        this.Grandparent = function Grandparent(returnGrandparent) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "hasParent")
                    .Link(base, "hasParent")
                    .Single(decodeString(returnGrandparent))
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.Parent = function Parent(returnParent) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "hasParent")
                    .Single(decodeString(returnParent))
            })
        }

        this.People = function People(returnPeople) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "associationFor")
                    .Results(decodeStrings(returnPeople))
            })
        }

        this.Projects = function Projects(returnProjects) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "manages")
                    .Results(decodeStrings(returnProjects))
            })
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function () {
                client
                    .Entity(iri)
                    .Link(base, "associationFor")
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
                    .Link(base, "manages")
                    .Link(base, "collectionFor")
                    .Results(decodeStrings(returnStudies))
            })
        }

        const typeNames = {
            "<http://vivoweb.org/ontology/core#Institute>": "Institute",
            "<http://vivoweb.org/ontology/core#Department>": "Department",
            "<http://vivoweb.org/ontology/core#Laboratory>": "Laboratory"
        }

        this.Type = function Type(returnType) {
            const getTypes = new Promise(function (resolve) {
                client
                    .Entity(iri)
                    .Link(rdf, "type")
                    .Results(decodeStrings(resolve))
            })

            return getTypes
                .then(getMostSpecificType)

            function getMostSpecificType(types) {
                for (var i = 0; i < types.length; i++) {
                    const type = types[i]
                    if (typeNames[type]) {
                        returnType(typeNames[type])
                        return
                    }
                }
                returnType("Organization")
            }
        }
    }

    function project(client, iri) {
        const self = this

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "collectionFor")
                    .Link(base, "developedFrom")
                    .Results(decodeStrings(returnDatasets))
            })
        }

        this.Department = function Department(returnDepartment) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "managedBy")
                    .Type(vivo, "Department")
                    .Single(returnDepartment)
            })
        }

        this.ID = function ID(returnID) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "projectId")
                    .Single(decodeString(returnID))
            })
        }

        this.Institute = function Institute(returnInstitute) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "managedBy")
                    .Type(vivo, "Institute")
                    .Single(returnInstitute)
            })
        }

        this.Laboratory = function Laboratory(returnLaboratory) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "managedBy")
                    .Type(vivo, "Laboratory")
                    .Single(returnLaboratory)
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.People = function People(returnPeople) {
            const runners = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "hasPI")
                    .Results(decodeStrings(resolve))
            })

            const investigators = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "collectionFor")
                    .Link(base, "runBy")
                    .Results(decodeStrings(resolve))
            })

            return Promise.all([investigators, runners])
                .then(flatten)
                .then(unique)
                .then(returnPeople)
        }

        this.Publications = function Publications(returnPublications) {
            return new Promise(function() {
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
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "collectionFor")
                    .Results(decodeStrings(returnStudies))
            })
        }

        this.Tools = function Tools(returnTools) {
            return new Promise(function(resolve) {
                self.People(resolve)
            }).then(function(people) {
                const getToolsByPerson = people.map(function(personIRI) {
                    return new Promise(function(resolve) {
                        client
                            .Entity(personIRI.slice(1, -1))
                            .Link(base, "developerOf")
                            .Results(decodeStrings(resolve))
                    })
                })

                return Promise.all(getToolsByPerson)
                    .then(flatten)
                    .then(unique)
                    .then(returnTools)
            })
        }
    }

    function publication(client, iri) {
        const self = this

        this.PubMedLink = function PubMedLink(returnPubMedLink) {
            const urlbase = "https://www.ncbi.nlm.nih.gov/pubmed/"

            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(vivo, "pmid")
                    .Single(decodeString(makeLink))
            })

            function makeLink(pmid) {
                if (pmid) {
                    returnPubMedLink(urlbase + pmid)
                    return
                }

                self.Title(makeSearchLink)
            }

            function makeSearchLink(title) {
                returnPubMedLink(urlbase + "?term=" + encodeURIComponent(title))
            }
        }

        this.Title = function Title(returnName) {
            return Name(client, iri, returnName)
        }
    }

    function study(client, iri) {
        self = this

        this.Datasets = function Datasets(returnDatasets) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "developedFrom")
                    .Results(decodeStrings(returnDatasets))
            })
        }

        this.Department = function Department(returnDepartment) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Link(base, "managedBy")
                    .Type(vivo, "Department")
                    .Single(returnDepartment)
            })
        }

        this.ID = function ID(returnID) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "studyId")
                    .Single(decodeString(returnID))
            })
        }

        this.Institute = function Institute(returnInstitute) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Link(base, "managedBy")
                    .Type(vivo, "Institute")
                    .Single(returnInstitute)
            })
        }

        this.Laboratory = function Laboratory(returnLaboratory) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Link(base, "managedBy")
                    .Type(vivo, "Laboratory")
                    .Single(returnLaboratory)
            })
        }

        this.Name = function name(returnName) {
            return Name(client, iri, returnName)
        }

        this.People = function People(returnPeople) {
            const runners = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "runBy")
                    .Results(decodeStrings(resolve))
            })

            const investigators = new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Link(base, "isPIFor")
                    .Results(decodeStrings(resolve))
            })

            return Promise.all([investigators, runners])
                .then(flatten)
                .then(unique)
                .then(returnPeople)
        }

        this.Project = function Project(returnProject) {
            return new Promise(function() {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Single(decodeString(returnProject))
            })
        }

        this.Studies = function Studies(returnStudies) {
            return new Promise(function(resolve) {
                client
                    .Entity(iri)
                    .Link(base, "inCollection")
                    .Link(base, "collectionFor")
                    .Results(decodeStrings(resolve))
            })
                .then(filterOutSelf)
                .then(returnStudies)

            function filterOutSelf(studies) {
                return studies.filter(function(study) {
                    return iri !== study.slice(1, -1)
                })
            }
        }

        this.Submitted = function Submitted(returnSubmitted) {
            return new Promise(function() {
                return client
                    .Query(iri, base + "submitted", null)
                    .then(function(triples) {
                        if (triples.length === 0) {
                            return
                        }

                        const date = parseDate(triples[0].Object)
                        returnSubmitted(date)
                    })
            })
        }
    }

    /**
     * Returns the unique items in an array.
     * @param {(String[]|Number[])} items
     */
    function unique(items) {
        const distinct = {}
        for (var i = 0; i < items.length; i++) {
            const item = items[i]
            distinct[item] = true
        }
        return Object.keys(distinct)
    }

    // Module Exports
    return {
        Authorships: Authorships,
        AssociatedWiths: AssociatedWiths,
        Departments: Departments,
        FundingOrganizations: FundingOrganizations,
        Institutes: Institutes,
        Laboratories: Laboratories,
        Name: Name,
        Names: Names,
        Parents: Parents,
        Person: Person,
        Persons: Persons,
        Organization: Organization,
        Project: Project,
        Projects: Projects,
        Publication: Publication,
        Publications: Publications,
        Studies: Studies,
        Study: Study,
        SubmissionDates: SubmissionDates,
    }
})()

if (typeof module !== "undefined") {
    module.exports = entity
}
