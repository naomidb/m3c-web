"use strict"

if (typeof require !== "undefined") {
    var m3c = require("./m3c.js")
    var str = require("./str.js")
    var tpf = require("./tpf.js")
}

/**
 * Functions related to a Person or people.
 * @module proj
 */
var proj = (function module() {
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
     * Fills in the HTML element for all Projects.
     *
     * @param {tpf.Client} client
     * @param {Element}    element Root HTML node for this profile.
     */
    function RenderProjects(client, element) {
        const ol = element.querySelector("ol")
        const template = element.querySelector("li.project.template")

        client
            .List(base + "Project")
            .ForEach(function (projectIRI) {
                renderProjectCard(projectIRI.slice(1, -1))
            })

        function renderProjectCard(entity) {
            const li = template.cloneNode(true)
            li.className = li.className.replace("template", "")

            const link = li.querySelector("a")
            link.href = m3c.ProfileLink("project", entity)

            ol.append(li)

            client
                .Entity(entity)
                .Link(rdfs, "label")
                .Single(renderTitle)
        
            client
                .Entity(entity)
                .Link(base, "projectId")
                .Single(renderId)
            
            client
                .Entity(entity)
                .Link(base, "hasPI")
                .Single(renderPIs)

            function renderTitle(title) {
                title = title.trim()
                link.querySelector(".title").innerHTML =
                    '<i class="fas fa-book"></i>' + title

                sort(ol, 1)
            }

            function renderId(projid) {
                projid = projid.trim()
                link.querySelector(".projid").innerHTML = projid
            }

            function renderPIs(name) {
                const ul = element.querySelector("ul.people")
                pis.forEach(renderPI)

                function renderPI(piIRI){
                    client.Entity(piIRI)
                    .Link(rdfs, "label")
                    .Single(function renderPIListItem(name) {
                        renderListItem(ul, "person", piIRI, name)
                    })
                }
            }

            function renderListItem(ul, type, iri, name) {
                const li = document.createElement("li")
                li.innerHTML = 
                    '<i class="fas fa-user"></i>' + name
                ul.appendChild(li)
            }
        }
    }

    /**
     * Fills in the HTML element for the specified entity using the TPF client.
     *
     * @param {tpf.Client} client
     * @param {string}     entity  IRI for the project.
     * @param {Element}    element Root HTML node for this profile.
     */
    function RenderProject(client, entity, element) {
        if (!entity) {
            element.innerText = "No profile specified."
            return
        }

        client
            .Entity(entity)
            .Link(rdfs, "label")
            .Single(renderTitle)

        client
            .Entity(entity)
            .Link(base, "projectId")
            .Single(renderId)
        
        client
            .Entity(entity)
            .Link(base, "summary")
            .Single(renderSummary)

        client
            .Entity(entity)
            .Link(base, "hasPI")
            .Results(renderPIs)

        client
            .Entity(entity)
            .Link(base, "collectionFor")
            .Results(renderStudies)

        client
            .Entity(entity)
            .Link(base, "collectionFor")
            .Link(base, "developedFrom")
            .Results(renderDatasets)

        client
            .Entity(entity)
            .Link(base, "produced")
            .Results(renderPublications)

        // Start of render functions

        function renderTitle(title) {
            if (!title) {
                element.innerText = "Unknown project."
                return
            }

            title = title.trim()
            element.querySelector(".title").innerHTML = title
        }

        function renderId(projid) {
            projid = projid.trim()
            element.querySelector("span.projid").innerHTML = projid
        }
        
        function renderSummary(summary) {
            summary = summary.trim()
            element.querySelector("p.summary").innerHTML = summary
        }

        function renderPIs(pis) {
            const ul = element.querySelector("ul.people")
            pis.forEach(renderPI)

            function renderPI(piIRI){
                client.Entity(piIRI)
                .Link(rdfs, "label")
                .Single(function renderPIListItem(name) {
                    renderListItem(ul, "person", piIRI, name)
                })
            }
        }
        
        function renderStudies(studies){
            const ul = element.querySelector("ul.studies")

            if (studies.length === 0) {
                ul.innerHTML = "<li><em>None</em></li>"
                return
            }

            studies.forEach(renderStudy)
            
            function renderStudy(studyIRI){
                client.Entity(studyIRI)
                .Link(rdfs, "label")
                .Single(function renderStudyListItem(study) {
                    renderListItem(ul, "study", studyIRI, study)
                })
            }
        }
        
        function renderDatasets(datasets) {
            const ul = element.querySelector("ul.datasets")

            if (datasets.length === 0) {
                return
            }

            datasets.forEach(renderDataset)

            function renderDataset(datasetIRI) {
                client
                    .Entity(datasetIRI)
                    .Link(rdfs, "label")
                    .Single(function renderProjectListItem(name) {
                        renderListItem(ul, "dataset", datasetIRI, name)
                    })
            }
        }
        
        function renderPublications(publications){
            const ul = element.querySelector("ul.publications")

            if (publications.length === 0){
                ul.innerHTML = "<li><em>None</em></li>"
                return
            }

            publications.forEach(renderPublication)

            function renderPublication(publicationIRI) {
                client
                    .Entity(publicationIRI)
                    .Link(rdfs, "label")
                    .Single(function renderPublicationListItems(title) {
                        renderListItem(ul, "publication", publicationIRI, title)
                    })
            }
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
        RenderProjects: RenderProjects,
        RenderProject: RenderProject,
        Sort: Sort,
    }

})()

if (typeof module !== "undefined") {
    module.exports = proj
}
