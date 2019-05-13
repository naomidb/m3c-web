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
        foaf = "http://xmlns.com/foaf/0.1/",
        obo = "http://purl.obolibrary.org/obo/",
        rdfs = "http://www.w3.org/2000/01/rdf-schema#",
        vcard = "http://www.w3.org/2006/vcard/ns#",
        vitro = "http://vitro.mannlib.cornell.edu/ns/vitro/public#"

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
                link.querySelector(".name").innerText = name
                link.querySelector(".photo").alt = name

                sort(ol, 1)
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
            .Results(renderName)

        client
            .Entity(entity)
            .Link(vitro, "mainImage")
            .Link(vitro, "downloadLocation")
            .Results(renderPhoto)

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
            .Link(base, "isStudyFor")
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
                    .Single(renderCollaboratorListItem)

                function renderCollaboratorListItem(name) {
                    const li = document.createElement("li")
                    ul.appendChild(li)

                    li.innerHTML = str.Format(
                        '<a href="{}">{}</a>',
                        m3c.ProfileLink("person", personIRI.slice(1, -1)),
                        name
                    )
                }
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

        function renderName(labels) {
            let name = labels[0]
            if (!name) {
                element.innerText = "Unknown person."
                return
            }

            name = name.trim()
            element.querySelector(".name").innerHTML = name
            element.querySelector(".photo").alt = name
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
                    .Single(renderProjectListItem)

                function renderProjectListItem(name) {
                    const li = document.createElement("li")
                    ul.appendChild(li)

                    li.innerHTML = str.Format(
                        '<a href="{}">{}</a>',
                        m3c.ProfileLink("project", projectIRI.slice(1, -1)),
                        name
                    )
                }
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
                    .Single(renderStudyListItem)

                function renderStudyListItem(name) {
                    const li = document.createElement("li")
                    ul.appendChild(li)

                    li.innerHTML = str.Format(
                        '<a href="{}">{}</a>',
                        m3c.ProfileLink("study", studyIRI.slice(1, -1)),
                        name
                    )
                }
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
