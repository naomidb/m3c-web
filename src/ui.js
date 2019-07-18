"use strict"

if (typeof require !== "undefined") {
    // No imports.
}

/**
 * Models of the various Entities such as a Person.
 * @module entity
 */
var ui = (function module() {

    /**
     * Maintains a list's order and allows it to be reversed.
     *
     * @param {HTMLElement} ol Ordered list element.
     * @param {HTMLElement} ctrlReverse Reverse button or link.
     * @param {number} direction Initial order: 1 for normal, -1 for reverse.
     * @param {(li: HTMLLIElement) => string} listItemKey
     *        Callback function to get the sorting key for a list item.
     */
    function SortedList(ol, ctrlReverse, direction, listItemKey) {
        if (!direction) {
            direction = 1
        }

        ctrlReverse.addEventListener("click", onClick)

        // This observer is responsible for resorting the list whenever items
        // are added or remove.
        const observer = new MutationObserver(onMutate)
        observe()

        function observe() {
            observer.observe(ol, { childList: true })
        }

        function onClick(clickEvent) {
            clickEvent.preventDefault()
            direction *= -1
            sort(ol, direction)
        }

        function onMutate(mutations) {
            const mutation = mutations.find(function (mutation) {
                return mutation.type === 'childList'
            })

            if (!mutation) {
                return
            }

            // Stop observing changes until after sorting is complete, otherwise
            // each change during sorting will trigger onMutate forever.
            observer.disconnect()
            sort(ol, direction)
            observe()
        }

        /** Sorts an ordered list's items. */
        function sort() {
            const lis = Array.prototype.slice.call(ol.querySelectorAll("li"))
            lis.sort(function (a, b) {
                const name1 = listItemKey(a)
                const name2 = listItemKey(b)

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
    }

    // Module Exports
    return {
        SortedList: SortedList,
    }

})()

if (typeof module !== "undefined") {
    module.exports = ui
}
