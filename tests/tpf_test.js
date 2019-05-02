const assert = require("assert").strict
const mocha = require("mocha")

const tpf = require("../src/tpf.js")

mocha.describe("tpf.Triples", function () {
    mocha.it("should parse application/n-triples text", function () {
        const ntriples = 
            "<http://example.com/a/007> <http://example.com/o/name> \"Bond, James\"@en-UK ."
        const triples = tpf.ParseTriples(ntriples)
        assert(Array.isArray(triples))
        assert.equal(triples.length, 1)
        assert.equal(triples[0].Subject, "<http://example.com/a/007>")
    })

    mocha.it("should filter out blank lines", function () {
        const ntriples = 
            "<http://example.com/a/007> <http://example.com/o/name> \"Bond, James\"@en-UK .\n"
        const triples = tpf.ParseTriples(ntriples)
        assert(Array.isArray(triples))
        assert.equal(triples.length, 1)
    })
})
