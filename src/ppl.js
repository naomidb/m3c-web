"use strict"

if (typeof require !== "undefined") {
    var m3c = require("./m3c.js")
    var str = require("./str.js")
    var tpf = require("./tpf.js")
}

/**
 * Functions related to a Person or people.
 * @module ppl
 */
var ppl = (function module() {
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
     * Fills in the HTML element for the specified entity using the TPF client.
     *
     * @param {tpf.Client} client
     * @param {string}     entity  IRI for the person.
     * @param {Element}    element Root HTML node for this profile.
     */
    function RenderPerson(client, entity, element) {
        if (!entity) {
            element.innerText = "No profile specified."
            return
        }

        client
            .Entity(entity)
            .Link(rdfs, "label")
            .Single(renderName)

        client
            .Entity(entity)
            .Link(vitro, "mainImage")
            .Link(vitro, "downloadLocation")
            .Results(renderPhoto)

        client
            .Entity(entity)
            .Link(base, "associatedWith")
            .Single(renderOrganization)

        client
            .Entity(entity)
            .Link(obo, "ARG_2000028")
            .Link(vcard, "hasTelephone")
            .Link(vcard, "telephone")
            .Results(renderPhones)

        client
            .Entity(entity)
            .Link(obo, "ARG_2000028")
            .Link(vcard, "hasEmail")
            .Link(vcard, "email")
            .Results(renderEmails)

        client
            .Entity(entity)
            .Link(base, "isPIFor")
            .Link(base, "collectionFor")
            .Link(base, "runBy")
            .Results(renderAdditionalCollaborators)

        client
            .Entity(entity)
            .Link(base, "runnerOf")
            .Link(base, "collectedBy")
            .Link(base, "hasPI")
            .Results(renderAdditionalCollaborators)

        client
            .Entity(entity)
            .Link(base, "isPIFor")
            .Results(renderProjects)

        client
            .Entity(entity)
            .Link(base, "runnerOf")
            .Results(renderStudies)

        client
            .Entity(entity)
            .Link(vivo, "relatedBy")
            .Type(vivo, "Authorship")
            .Link(vivo, "relates")
            .Type(bibo, "Document")
            .Results(renderPublications)

        // Start of render functions

        function renderAdditionalCollaborators(collaborators) {
            if (collaborators.length === 0) {
                return
            }

            const section = element.querySelector("section.people")
            section.className = section.className.replace("hidden", "")

            const ul = element.querySelector("ul.people")
            collaborators.forEach(renderCollaborator)

            function renderCollaborator(personIRI) {
                client
                    .Entity(personIRI)
                    .Link(rdfs, "label")
                    .Single(function renderCollaboratorListItem(name) {
                        renderListItem(ul, "person", personIRI, name)
                    })
            }
        }

        function renderEmails(emails) {
            const ul = element.querySelector(".emails")

            ul.innerHTML = emails
                .map(function (email) {
                    return str.Format(
                        '<li> \
                            <i class="fas fa-envelope"></i> \
                            <a href="mailto:{}">{}</a> \
                        </li>',
                        email, email
                    )
                })
                .join("\n")
        }

        function renderListItem(ul, type, iri, name) {
            const li = document.createElement("li")
            li.innerHTML = str.Format(
                '<a href="{}">{}</a>',
                m3c.ProfileLink(type, iri.slice(1, -1)),
                name
            )
            ul.appendChild(li)
        }

        function renderName(name) {
            if (!name) {
                element.innerText = "Unknown person."
                return
            }

            name = name.trim()
            element.querySelector(".name").innerHTML = name
            element.querySelector(".photo").alt = name
        }

        function renderOrganization(organizationIRI) {
            client
                .Entity(organizationIRI)
                .Link(rdfs, "label")
                .Single(function (name) {
                    const div = element.querySelector(".organization")
                    div.innerHTML = str.Format(
                        '<i class="fas fa-building"></i><a href="{}">{}</a>',
                        m3c.ProfileLink("organization", organizationIRI.slice(1, -1)),
                        name
                    )
                })
        }

        function renderPhones(phones) {
            const ul = element.querySelector(".phones")
            ul.innerHTML = phones
                .map(function (phone) {
                    return str.Format(
                        '<li><i class="fas fa-phone"></i>{}</li>',
                        phone
                    )
                })
                .join("\n")
        }

        function renderPhoto(urls) {
            const img = element.querySelector(".photo")

            if (urls.length === 0) {
                img.src = placeholder
            } else {
                img.src = urls[0]
            }
        }

        function renderProjects(projects) {
            const ul = element.querySelector("ul.projects")

            if (projects.length === 0) {
                ul.innerHTML = "<li><em>None</em></li>"
                return
            }

            projects.forEach(renderProject)

            function renderProject(projectIRI) {
                client
                    .Entity(projectIRI)
                    .Link(rdfs, "label")
                    .Single(function renderProjectListItem(name) {
                        renderListItem(ul, "project", projectIRI, name)
                    })
            }
        }

        function renderPublications(publications) {
            const ul = element.querySelector("ul.publications")

            if (publications.length === 0) {
                ul.innerHTML = "<li><em>None</em></li>"
                return
            }

            publications.forEach(renderPublication)

            function renderPublication(publicationIRI) {
                client
                    .Entity(publicationIRI)
                    .Link(rdfs, "label")
                    .Single(function renderPublicationListItem(name) {
                        renderListItem(ul, "publication", publicationIRI, name)
                    })
            }
        }

        function renderStudies(studies) {
            const ul = element.querySelector("ul.studies")

            if (studies.length === 0) {
                ul.innerHTML = "<li><em>None</em></li>"
                return
            }

            studies.forEach(renderStudy)

            function renderStudy(studyIRI) {
                client
                    .Entity(studyIRI)
                    .Link(rdfs, "label")
                    .Single(function renderStudyListItem(name) {
                        renderListItem(ul, "study", studyIRI, name)
                    })
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
        RenderPeople: RenderPeople,
        RenderPerson: RenderPerson,
        Sort: Sort,
    }

})()

if (typeof module !== "undefined") {
    module.exports = ppl
}
