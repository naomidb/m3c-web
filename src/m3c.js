"use strict"

if (typeof require !== "undefined") {
    var tpf = require("./tpf.js")
}

/**
 * Functionality specific to M3C's architecture and domain.
 * @module m3c
 */
var m3c = (function module() {

    const loc = window.location

    const params = new URLSearchParams(loc.search)
    const defaultEndpoint = loc.protocol + "//" + loc.hostname + "/tpf/core"

    /**
     * Configures a new TPF Client.
     *
     * By default, if no `endpoint` is passed in the query string, the endpoint
     * of the TPF server is assumed to be at `/tpf/core` on the current server.
     *
     * @returns {tpf.Client}
     */
    function NewTPFClient() {
        let endpoint = params.get("endpoint")
        if (!endpoint) {
            endpoint = defaultEndpoint
        }

        return new tpf.Client(endpoint)
    }

    /**
     * Generates the canonical, relative form of a Profile page link.
     *
     * Example when used on the staging server *stage.x.org*
     *
     *    ProfileLink("person", "http://x.org/n007")
     *    => "person.html?iri=http://x.org/n007&endpoint=http://stage.x.org"
     *
     * @param {"person"|"publication"|"project"|"study"|"organization"|"dataset"|"tool"} type
     *        Entity type.
     * @param {string} iri  IRI of the entity.
     */
    function ProfileLink(type, iri) {
        let url = type + ".html?iri=" + encodeURIComponent(iri)

        const endpoint = params.get("endpoint")
        if (endpoint) {
            url += "&" + encodeURIComponent(endpoint)
        }

        return url
    }

    /**
     * Gets the subject IRI from the `iri` query string parameter.
     * @returns {string}
     */
    function Subject() {
        return params.get("iri")
    }

    // Module Exports
    return {
        NewTPFClient: NewTPFClient,
        ProfileLink: ProfileLink,
        Subject: Subject,
    }

})()

if (typeof module !== "undefined") {
    module.exports = m3c
}
