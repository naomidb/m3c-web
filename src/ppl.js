"use strict"

if (typeof require !== "undefined") {
    var str = require("./str.js")
}

var ppl = (function namespace() {
    const
        base = "http://www.metabolomics.info/ontologies/2019/metabolomics-consortium#",
        foaf = "http://xmlns.com/foaf/0.1/",
        obo = "http://purl.obolibrary.org/obo/",
        rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs = "http://www.w3.org/2000/01/rdf-schema#",
        vcard = "http://www.w3.org/2006/vcard/ns#",
        vitro = "http://vitro.mannlib.cornell.edu/ns/vitro/public#"

    /**
     *
     * @param {tpf.client} client
     * @param {string} entity
     * @param {Element} element Root node for this profile.
     */
    function RenderPerson(client, entity, element) {
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
            .Link(base, "isPIfor")
            .Results(function (projectURIs) {
                console.log({ projectURIs })
            })

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
            const name = labels[0].trim()
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
            const placeholder = "http://stage.vivo.metabolomics.info/images/placeholders/person.thumbnail.jpg"

            if (urls.length === 0) {
                img.src = placeholder
            } else {
                img.src = urls[0]
            }
        }
    }

    return {
        RenderPerson: RenderPerson
    }

})()

if (typeof module !== "undefined") {
    module.exports = ppl
}
