"use strict"

var str = (function namespace() {

    /**
     * Replaces instances of {} in text with the additional arguments.
     *
     * Example
     *   str.Format("{}, {}!", "Hello", "World") --> "Hello, World!"
     *
     * @param {string} text
     * @param {...string} args
     */
    function Format(text) {
        for (let i = 1; i < arguments.length; i++) {
            text = text.replace("{}", arguments[i])
        }

        return text
    }

    return {
        Format: Format
    }

})()

if (typeof module !== "undefined") {
    module.exports = str
}
