"use strict"

var tpf = (function namespace() {

    /**
     * Query a Linked Data Fragments Server by triple pattern.
     */
    function Query(endpoint, subject, predicate, object) {
        const criteria = {
            subject: subject || "",
            predicate: predicate || "",
            object: object || "",
            // page: "1",
        }

        const headers = {
            Accept: "application/n-triples; charset=utf-8"
        }

        const options = {
            headers: headers,
        }

        const url = endpoint + encodeQueryString(criteria)

        return fetch(url, options)
            .then(function (data) { return data.text() })
            .then(ParseTriples)
    }

    /**
     * Parses n-triples into an array of three strings.
     */
    function ParseTriples(text) {
        const triples = []

        const lines = text.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split(" ")
            // parts should be an array of at least 4 elements ending with "."
            // ["<http...>", "<http...>", "\"Hi", "there!\"@en-US"", "."]
            if (parts.length < 4) {
                continue
            }

            const triple = {
                Subject: parts[0],
                Predicate: parts[1],
                Object: parts.slice(2, parts.length - 1).join(" "),
            }

            triples.push(triple)
        }

        return triples
    }

    function encodeQueryString(parts) {
        if (!parts || Object.keys(parts).length === 0) {
            return ""
        }

        const enc = encodeURIComponent

        return "?" +
            Object
                .keys(parts)
                .map(function (key) {
                    const pair = [enc(key), enc(parts[key])]
                    return pair.join("=")
                })
                .join("&")
    }

    return {
        ParseTriples: ParseTriples,
        Query: Query,
    }

})()

if (typeof module !== "undefined") {
    module.exports = tpf
}