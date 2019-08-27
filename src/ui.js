"use strict"

if (typeof require !== "undefined") {
    // No imports.
}

/**
 * User Interface components
 * @module ui
 */
var ui = (function module() {
    /**
     * Manage a facets and their interaction with a listing of items.
     *
     * @param {Node} facets HTML Element containing the facets.
     * @param {Node} results HTML Element containing the listed items.
     * @param {Array.<(selected: string[], item: Node)>} filters
     *        Filter functions that are called whenever there is a change to the
     *        selected facets. There should be one per facet.
     */
    function Facets(facets, results, filters) {
        /**
         * Increment the count of a facet option.
         *
         * If the specified option does not exists, it will be created.
         *
         * @param {string} facetID Unique facet name.
         * @param {string} optionID Unique identifier for the option.
         * @param {string} optionName Label for the option.
         */
        function increment(facetID, optionID, optionName) {
            const facet = facets.querySelector(".facet." + facetID + " ul")
            if (!facet) {
                return
            }

            var option

            const input = facet.querySelector('input[value="' + optionID + '"]')
            if (input) {
                option = input.parentElement
            }

            if (!option) {
                const template = facet.querySelector(".template")
                const data = {
                    box: {
                        value: optionID,
                        onclick: onFacetClick,
                    },
                    name: optionName,
                    count: 0,
                }

                option = Render(template, data)
            }

            const count = option.querySelector(".count")
            count.innerText = parseInt(count.innerText) + 1
        }

        function onFacetClick() {
            const lis = results.querySelectorAll("li")
            const items = []
            for (var i = 0; i < lis.length; i++) {
                items.push(lis[i])
            }

            const remainingSets = filters.map(function(filter) {
                const checked = facets.querySelectorAll(
                    ".facet." + filter.name + " input:checked"
                )

                const selected = []
                for (var i = 0; i < checked.length; i++) {
                    const input = checked[i]
                    const option = input.parentElement
                    const name = option.querySelector(".name")
                    selected.push(name.innerText.trim())
                }

                if (selected.length === 0) {
                    return items
                }

                const remaining = items.filter(function(item) {
                    return filter(selected, item)
                })

                return remaining
            })

            for (var i = 0; i < items.length; i++) {
                const item = items[i]

                if (remainingSets.some(isItemInSubset)) {
                    // Item is in at least one of the sets of remaining items.
                    item.className = item.className.replace("hidden", "")
                    item.className = item.className.trim()
                    continue
                }

                // Item was filtered out of all facets, hide it if necessary.
                if (item.className.indexOf("hidden") !== -1) {
                    continue
                }

                item.className = "hidden " + item.className
                item.className = item.className.trim()

                function isItemInSubset(subset) {
                    return subset.indexOf(item) !== -1
                }
            }
        }

        return {
            Increment: increment,
        }
    }

    /**
     * Clones template, fills it in with data, then adds it to the parent.
     *
     * Example:
     *     <section>
     *       <div class="template"><span class="name" /></div>
     *     </section>
     *
     *   Render(document.querySelector(".template"), {name: "Hi"}) =>
     *
     *     <section>
     *       <div class="template"><span class="name" /></div>
     *       <div><span class="name">Hi</span></div>
     *     </section>
     *
     * @param {Node} template
     * @param {Object.<string, any>} data
     */
    function Render(template, data) {
        const clone = template.cloneNode(true)
        clone.className = clone.className.replace("template", "")

        for (var key in data) {
            /** @type {Node} */
            const placeholder = clone.querySelector("." + key)
            if (!placeholder) {
                console.warn("render: missing placeholder: " + key)
                continue
            }

            switch (typeof data[key]) {
                case "function":
                    data[key](setText(placeholder))
                    break

                case "object":
                    for (var name in data[key]) {
                        const isEventListener = name.slice(0, 2) === "on"
                        if (isEventListener) {
                            const event = name.slice(2)
                            placeholder.addEventListener(event, data[key][name])
                            break
                        }

                        const isFunction = data[key][name] instanceof Function
                        if (isFunction) {
                            data[key][name](done)
                            function done(val) {
                                placeholder[name] = val
                            }
                            break
                        }

                        placeholder[name] = data[key][name]
                    }
                    break

                case "string":
                default:
                    placeholder.innerText = data[key]
                    break
            }

            function setText(element) {
                return function callback(text) {
                    element.innerText = text
                }
            }
        }

        template.parentElement.appendChild(clone)
        return clone
    }

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
            const mutation = mutations.find(function(mutation) {
                return mutation.type === "childList"
            })

            if (!mutation) {
                return
            }

            update()
        }

        /** Sorts an ordered list's items. */
        function sort() {
            const lis = Array.prototype.slice.call(ol.querySelectorAll("li"))
            lis.sort(function(a, b) {
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

            lis.forEach(function(li) {
                ol.append(li)
            })
        }

        function update() {
            // Stop observing changes until after sorting is complete, otherwise
            // each change during sorting will trigger onMutate forever.
            observer.disconnect()
            sort(ol, direction)
            observe()
        }

        return {
            Update: update,
        }
    }

    // Module Exports
    return {
        Facets: Facets,
        Render: Render,
        SortedList: SortedList,
    }
})()

if (typeof module !== "undefined") {
    module.exports = ui
}
