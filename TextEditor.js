/**
 * Recursively loop over all child nodes, return true in the callback to stop looping.
 * @param {*} fun callback
 * @returns true if should stop recursing
 */
HTMLElement.prototype.recursiveLoopNodes = function(fun) {
    for (let child of this.childNodes) {
        switch (child.nodeType) {
            case Node.TEXT_NODE:
                if (fun(child)) return true;
                break;
            case Node.ELEMENT_NODE:
                if (child.recursiveLoopNodes(fun)) return true;
                if (fun(child)) return true;
                break;
        }
    }
    return false;
}

/**
 * Get or set the caret index in a HTMLElement.
 * @param {*} set if undefined, returns caretIndex, otherwise sets.
 * @returns if argument provided, nothing, otherwise caretIndex.
 */
HTMLElement.prototype.caretIndex = function(set = undefined) {
    const selection = window.getSelection();
    if (set === undefined) {
        let caretIndex = 0;
        this.recursiveLoopNodes(node => {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    if (node === selection.focusNode) {
                        caretIndex += selection.focusOffset;
                        return true;
                    }
                    caretIndex += node.textContent.length;
                    return false;

                default:
                    if (node.tagName == 'BR') caretIndex += 1;
                    if (node === selection.focusNode) {
                        caretIndex--;
                        return true;
                    }
                    return false;
            }
        });

        return caretIndex;
    } else {
        let caretIndex = set;
        this.recursiveLoopNodes(node => {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    if (caretIndex < node.length) {
                        selection.setBaseAndExtent(node, caretIndex, node, caretIndex);
                        return true;
                    }
                    caretIndex -= node.length;
                    return false;

                default:
                    if (node.tagName == 'BR') {
                        if (caretIndex < 1) {
                            selection.setBaseAndExtent(node, caretIndex, node, caretIndex);
                            return true;
                        }
                        caretIndex -= 1;
                    }
                    return false;
            }
        });
    }
}

/**
 * Scroll a child element into view, but only if it's not already in view.
 * @param {*} target 
 */
HTMLElement.prototype.scrollIntoViewIfNeeded = function(target) {
    // Target is outside the viewport from the bottom
    if (target.getBoundingClientRect().bottom > this.getBoundingClientRect().bottom) {
        //  The bottom of the target will be aligned to the bottom of the visible area of the scrollable ancestor.
        target.scrollIntoView(false);
    }

    // Target is outside the view from the top
    if (target.getBoundingClientRect().top < this.getBoundingClientRect().top) {
        // The top of the target will be aligned to the top of the visible area of the scrollable ancestor
        target.scrollIntoView();
    }
};

/**
 * Checks if character is whitespace
 * @param {*} c 
 * @returns true if whitespace
 */
function isWhitespace(c) {
    return c === ' ' ||
        c === '\n' ||
        c === '\t' ||
        c === '\r' ||
        c === '\f' ||
        c === '\v' ||
        c === '\u00a0' ||
        c === '\u1680' ||
        c === '\u2000' ||
        c === '\u200a' ||
        c === '\u2028' ||
        c === '\u2029' ||
        c === '\u202f' ||
        c === '\u205f' ||
        c === '\u3000' ||
        c === '\ufeff'
}

/**
 * Checks if character is alphabetical
 * @param {*} c 
 * @returns true if alphabetical
 */
function isAlpha(c) {
    return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z';
}

/**
 * Checks if character is numerical
 * @param {*} c 
 * @returns true if numerical
 */
function isNum(c) {
    return c >= '0' && c <= '9';
}

/**
 * Checks if character is alpha-numerical
 * @param {*} c 
 * @returns true if alpha-numerical
 */
function isAlnum(c) {
    return isNum(c) || isAlpha(c);
}

/**
 * Classifies a character into categories, used for ctrl + backspace etc.
 * @param {*} char 
 * @returns character category
 */
function characterCategory(char) {
    if (isWhitespace(char)) return 0;
    else if (isAlnum(char)) return 1;
    else return 2;
}

/**
 * Text Editor with option for syntax highlighting.
 */
class TextEditor extends HTMLElement {
    constructor() {
        super();
    }

    /**
     * Get the range of lines currently in the selection.
     * null if selection is currently not in this text editor.
     */
    get currentSelectedLines() {
        let selection = window.getSelection();
        if (selection.focusNode == null || selection.anchorNode == null) return null;

        let nodeA = selection.focusNode;
        while (nodeA.parentNode != null && nodeA.parentNode != this) {
            nodeA = nodeA.parentNode;
        }

        let nodeB = selection.anchorNode;
        while (nodeB.parentNode != null && nodeB.parentNode != this) {
            nodeB = nodeB.parentNode;
        }

        let indexA = Array.prototype.indexOf.call(this.childNodes, nodeA);
        let indexB = Array.prototype.indexOf.call(this.childNodes, nodeB);
        if (indexA == -1 || indexB == -1) return null;
        return [Math.min(indexA, indexB), Math.max(indexA, indexB)];
    }

    /**
     * Push a state into the history of the state manager.
     * @param {*} input state, formatted like { content: text, caret: index }
     */
    pushHistory(input) {
        this.stateManager.history.push(this.stateManager.now);
        if (this.stateManager.history.length > 1000) {
            this.stateManager.history = this.stateManager.history.slice(-1000);
        }
        this.stateManager.now = input;
        this.stateManager.future = [];
    }

    /**
     * Restore state from history.
     */
    undo() {
        if (this.stateManager.history.length == 0) return;
        this.stateManager.future.push(this.stateManager.now)
        this.stateManager.now = this.stateManager.history.pop();
        this.format(this.stateManager.now.content);
        this.caretIndex(this.stateManager.now.caret);
        this.scrollToCaret();
    }

    /**
     * Restore state from future.
     */
    redo() {
        if (this.stateManager.future.length == 0) return;
        this.stateManager.history.push(this.stateManager.now)
        this.stateManager.now = this.stateManager.future.pop();
        this.format(this.stateManager.now.content);
        this.caretIndex(this.stateManager.now.caret);
        this.scrollToCaret();
    }

    /**
     * Scroll to the caret.
     */
    scrollToCaret() {
        let lines = this.currentSelectedLines;
        if (lines != null) {
            this.scrollIntoViewIfNeeded(this.childNodes[lines[0]]);
        }
    }

    /**
     * Deletes the current selection.
     * @returns true if something was selected.
     */
    deleteSelection() {
        let selection = window.getSelection();
        if (selection.anchorNode === selection.focusNode &&
            selection.anchorOffset == selection.focusOffset) return false;
        else {
            selection.deleteFromDocument();
            return true;
        }
    }

    /**
     * Called when HTMLElement is constructed.
     */
    connectedCallback() {
        this.setAttribute("contenteditable", true);
        this.setAttribute("spellcheck", false);
        this.classList.add("text-editor");

        // This event fires whenever the content has changed
        this.addEventListener("input", (event) => {
            let afterInput = this.text;
            this.format(afterInput);
            this.pushHistory({ content: afterInput, caret: this.caretIndex() });
        });

        // Because browsers are shit, we need to handle typing characters ourselves...
        this.addEventListener("keypress", (event) => {
            this.deleteSelection();
            this.format(this.text, event.key);
            this.pushHistory({ content: this.text, caret: this.caretIndex() });
            event.preventDefault();
        });

        // Manually handle all these things, because once again, fuck browsers and no standardization...
        this.addEventListener("keydown", (event) => {
            if (event.key == "Enter") {
                this.deleteSelection();
                this.format(this.text, "\n");
            } else if (event.key == "Backspace") {
                if (this.deleteSelection()) {
                    this.format(this.text);
                } else {
                    let text = this.text;
                    let index = this.caretIndex();
                    if (event.ctrlKey) {
                        if (index != 0) {
                            let cat = characterCategory(text[index - 1]);
                            let end = 0;
                            for (let i = index - 2; i >= 0; i--) {
                                let otherCat = characterCategory(text[i]);
                                if (cat != otherCat) {
                                    end = i + 1;
                                    break;
                                }
                            }
                            text = text.slice(0, end) + text.slice(index);
                            this.caretIndex(end)
                            this.format(text);
                        }
                    } else {
                        if (index != 0) {
                            text = text.slice(0, index - 1) + text.slice(index);
                            this.caretIndex(index - 1)
                            this.format(text);
                        }
                    }
                }
            } else if (event.key == "Delete") {
                if (this.deleteSelection()) {
                    this.format(this.text);
                } else {
                    let text = this.text;
                    let index = this.caretIndex();
                    if (event.ctrlKey) {
                        if (index != text.length) {
                            let cat = characterCategory(text[index]);
                            let end = text.length;
                            for (let i = index + 1; i < text.length; i++) {
                                let otherCat = characterCategory(text[i]);
                                if (cat != otherCat) {
                                    end = i;
                                    break;
                                }
                            }
                            text = text.slice(0, index) + text.slice(end);
                            this.format(text);
                        }
                    } else {
                        if (index != text.length) {
                            text = text.slice(0, index) + text.slice(index + 1);
                            this.format(text);
                        }
                    }
                }
                this.pushHistory({ content: this.text, caret: this.caretIndex() });
            } else if (event.ctrlKey && event.key.toLowerCase() == "z") {
                this.undo();
                this.scrollToCaret();
                event.preventDefault();
                return;
            } else if (event.ctrlKey && event.key.toLowerCase() == "y") {
                this.redo();
                this.scrollToCaret();
                event.preventDefault();
                return;
            } else if (event.key == "Tab") {
                this.deleteSelection();
                this.format(this.text, "    "); // !!! These are 4 spaces !!!
            } else return; // Unhandled cases, return
            this.scrollToCaret(); // handled cases, scroll to the caret.
            this.pushHistory({ content: this.text, caret: this.caretIndex() });
            event.preventDefault();
        });

        // When the selection changes, update the selected lines
        document.addEventListener("selectionchange", (event) => {
            let lines = this.currentSelectedLines;
            if (lines == null) return;

            // Remove "selected" and "multi-selected" from all elements.
            let els = this.getElementsByClassName("selected");
            while (els.length > 0) {
                els[0].classList.remove("selected");
            }

            els = this.getElementsByClassName("multi-selected");
            while (els.length > 0) {
                els[0].classList.remove("multi-selected");
            }

            let multi = lines[0] != lines[1];
            for (let i = lines[0]; i <= lines[1]; i++) {
                this.childNodes[i].classList.add(multi ? "multi-selected" : "selected");
            }
        });

        // Prevent formatted pasting, we need it as plaintext
        this.addEventListener('paste', function(event) {
            event.preventDefault();
            this.deleteSelection();
            this.format(this.text, event.clipboardData.getData('text/plain'));
            this.pushHistory({ content: this.text, caret: this.caretIndex() });
            this.scrollToCaret();
        });

        this.format(this.text);

        this.stateManager = {
            future: [],
            now: { content: "", caret: 0 },
            history: []
        };
    }

    /**
     * Get the text in this text editor. This is a non-trivial operation, it needs
     * to retrieve this from all the text nodes, so cache this where necessary!!
     */
    get text() {
        let text = "";
        this.recursiveLoopNodes(node => {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    text += node.textContent;
                    return false;

                default:
                    if (node.tagName == 'BR') text += "\n";
                    return false;
            }
        });
        if (text.slice(-1) == '\n') text = text.slice(0, -1);
        return text;
    }

    /**
     * Turn the text into lines with formatted parts. Should return something 
     * in this format: [[{ type: name, content: text }, ...], ...];
     * An array of lines, filled with parts. It is important that this 
     * maintains the exact textContent that it had before, otherwise weird things happen.
     * @param {*} text 
     * @returns lines
     */
    generateLines(text) {
        let lines = [];
        let currentLine = [];
        let currentPart = {
            type: 0,
            content: ""
        };

        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char == "\n") {
                currentLine.push(currentPart);
                lines.push(currentLine);
                currentPart = {
                    type: currentPart.type,
                    content: ""
                };
                currentLine = [];
            } else {
                currentPart.content += char;
            }
        }

        currentLine.push(currentPart);
        lines.push(currentLine);
        return lines;
    }

    /**
     * Format the given text, and put it in the text editor.
     * @param {*} text string of text to format.
     * @param {*} append optional string to append at caret location before formatting.
     */
    format(text, append = "") {
        let caretIndex = this.caretIndex();
        text = text.slice(0, caretIndex) + append + text.slice(caretIndex);
        caretIndex += append.length;
        let newLines = this.generateLines(text);
        let oldLines = this.childNodes;

        let firstDiff = 0;
        let lastDiffNew = 0;
        let lastDiffOld = 0;

        // Find the first line that is different
        for (firstDiff = 0; firstDiff < newLines.length && firstDiff < oldLines.length; firstDiff++) {
            let oldLine = oldLines[firstDiff];
            let newLine = newLines[firstDiff];
            // If not same amount of parts, definitely changed
            if (oldLine.childNodes.length - 1 != newLine.length) break;
            // If amount of parts is same, check every part for changes.
            let doBreak = false;
            for (let part = 0; part < newLine.length; part++) {
                let oldPart = oldLine.childNodes[part];
                let newPart = newLine[part];
                if ( // Text node means it hasn't been formatted yet
                    oldPart.nodeType == Node.TEXT_NODE ||
                    oldPart.getAttribute("data-type") != newPart.type ||
                    oldPart.textContent != newPart.content) {
                    doBreak = true;
                    break;
                };
            }
            if (doBreak) break;
        }
        // find the last line that differs
        for (lastDiffNew = newLines.length - 1, lastDiffOld = oldLines.length - 1; firstDiff < lastDiffOld; lastDiffNew--, lastDiffOld--) {
            let oldLine = oldLines[lastDiffOld];
            let newLine = newLines[lastDiffNew];
            // If not same amount of parts, definitely changed
            if (oldLine.childNodes.length - 1 != newLine.length) break;
            // If amount of parts is same, check every part for changes.
            let doBreak = false;
            for (let part = 0; part < newLine.length; part++) {
                let oldPart = oldLine.childNodes[part];
                let newPart = newLine[part];
                if ( // Text node means it hasn't been formatted yet
                    oldPart.nodeType == Node.TEXT_NODE ||
                    oldPart.getAttribute("data-type") != newPart.type ||
                    oldPart.textContent != newPart.content) {
                    doBreak = true;
                    break;
                };
            }
            if (doBreak) break;
        }
        // Apply styling, reusing old divs where possible
        let insertionPt = oldLines[firstDiff] || null;
        for (; firstDiff <= lastDiffNew; firstDiff++) {
            let reuseOld = firstDiff <= lastDiffOld;
            let lineDiv = null;
            if (reuseOld) {
                lineDiv = oldLines[firstDiff];
                if (lineDiv.tagName != "DIV") {
                    let temp = document.createElement("div");
                    this.insertBefore(temp, lineDiv)
                    this.removeChild(lineDiv);
                    lineDiv = temp;
                } else {
                    lineDiv.innerHTML = "";
                }
                // Update insertion point for when we cannot further reuse.
                insertionPt = oldLines[firstDiff + 1] || null;
            } else {
                lineDiv = document.createElement("div");
            }
            lineDiv.className = "line";
            for (let part of newLines[firstDiff]) {
                let partSpan = document.createElement("span");
                partSpan.setAttribute("data-type", part.type);
                partSpan.textContent = part.content;
                lineDiv.appendChild(partSpan);
            }
            lineDiv.appendChild(document.createElement("br"));
            if (!reuseOld) this.insertBefore(lineDiv, insertionPt);
        }
        // Finally remove any divs that are left over.
        for (; firstDiff <= lastDiffOld; lastDiffOld--) {
            this.removeChild(oldLines[firstDiff]);
        }

        this.caretIndex(caretIndex); // Put the caret back where it belongs.
    }
}

customElements.define("text-editor", TextEditor);