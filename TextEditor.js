const textEditorStyle = `
.text-editor {
    --text-editor-line-number-width: 60px;
    --text-editor-line-number-padding: 8px;
    --text-editor-padding: 0px;
    --text-editor-line-number-color: #111;
    --text-editor-line-number-background: #ddd;
    --text-editor-background: #fff;
    --text-editor-selected-line-background: #eee;
    --text-editor-selected-line-number-background: #ccc;
    --text-editor-selection-background: #B5D5FF;
    --text-editor-caret-color: #000;
    --text-editor-color: #000;
    --text-editor-selection-color: #000;
    --text-editor-highlight: #bbb;
    --text-editor-line-padding: 0px;
    font-family: monospace;
    display: block;
    position: relative;
    padding: var(--text-editor-padding);
    padding-left: var(--line-number-width);
    outline: none;
    font-size: 1rem;
    white-space: pre-wrap;
    tab-size: 4;
    overflow-y: auto;
    overflow-x: visible;
    overflow-wrap: break-word;
    box-sizing: border-box;
    color: var(--text-editor-color);
    caret-color: var(--text-editor-caret-color);
    background-color: var(--text-editor-background);
    counter-reset: text-editor-linenmr;
}

.dark-mode {
    --text-editor-line-number-color: rgb(230, 230, 230);
    --text-editor-line-number-background: rgb(28, 28, 28);
    --text-editor-background: rgb(20, 20, 20);
    --text-editor-selected-line-background: rgb(28, 28, 28);
    --text-editor-selected-line-number-background: rgb(38, 38, 38);
    --text-editor-selection-background: #182e4b;
    --text-editor-caret-color: rgb(230, 230, 230);
    --text-editor-color: rgb(230, 230, 230);
    --text-editor-selection-color: rgb(230, 230, 230);
    --text-editor-highlight: rgb(108, 108, 108);
}

.text-editor::before {
    content: '';
    position: absolute;
    width: var(--text-editor-line-number-width);
    height: 100%;
    background-color: var(--text-editor-line-number-background);
}

.text-editor ::selection {
    color: var(--text-editor-selection-color);
    background-color: var(--text-editor-selection-background);
}

.text-editor div.line {
    padding: var(--text-editor-line-padding) var(--text-editor-padding) var(--text-editor-line-padding) calc(var(--text-editor-line-number-width) + var(--text-editor-line-number-padding));
    min-height: 1em;
    counter-increment: text-editor-linenmr;
    position: relative;
    transition: background-color 0.1s;
}

.text-editor div.line.selected {
    background-color: var(--text-editor-selected-line-background);
}

.text-editor div.line::before {
    content: counter(text-editor-linenmr);
    position: absolute;
    box-sizing: border-box;
    top: 0;
    left: 0;
    padding-top: var(--text-editor-line-padding);
    width: var(--text-editor-line-number-width);
    height: 100%;
    text-align: right;
    padding-right: var(--text-editor-line-number-padding);
    background-color: var(--text-editor-line-number-background);
    color: var(--text-editor-line-number-color);
    transition: background-color 0.1s;
}

.text-editor div.line.multi-selected::before,
.text-editor div.line.selected::before {
    background-color: var(--text-editor-selected-line-number-background);
}

.text-editor span.highlighted {
    box-shadow: 0 0 0px 1px var(--text-editor-highlight) inset;
}
`;

const textEditorStylesheet = document.createElement("style");
textEditorStylesheet.innerHTML = textEditorStyle;
document.head.prepend(textEditorStylesheet);

/**
 * Find the first index of the string/regex in a string, starting at offset.
 * @param {*} str string/regex to find
 * @param {*} offset start at offset in original string
 * @returns index of str in string
 */
String.prototype.findFirstOf = function(str, offset = 0) {
    if (str instanceof RegExp) {
        let start = this.slice(offset).search(str);
        if (start == -1) start = Number.MAX_VALUE;
        else start += offset;
        return start;
    } else {
        let start = this.indexOf(str, offset);
        if (start == -1) start = Number.MAX_VALUE;
        return start;
    }
}

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
HTMLElement.prototype.caretIndex = function(set = undefined, otherend = false) {
    const selection = window.getSelection();
    if (set === undefined) {
        let lookingFor = otherend ? selection.anchorNode : selection.focusNode;
        let offset = otherend ? selection.anchorOffset : selection.focusOffset;
        let caretIndex = 0;
        this.recursiveLoopNodes(node => {
            switch (node.nodeType) {
                case Node.TEXT_NODE:
                    if (node === lookingFor) {
                        caretIndex += offset;
                        return true;
                    }
                    caretIndex += node.textContent.length;
                    return false;

                default:
                    if (node.tagName == 'BR') caretIndex += 1;
                    if (node === lookingFor) {
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
 * Get the element at the index.
 * @param {*} index 
 * @returns 
 */
HTMLElement.prototype.getElementAtIndex = function(index) {
    let element = null;
    this.recursiveLoopNodes(node => {
        switch (node.nodeType) {
            case Node.TEXT_NODE:
                if (index < node.length) {
                    element = node;
                    return true;
                }
                index -= node.length;
                return false;

            default:
                if (node.tagName == 'BR') {
                    if (index < 1) {
                        element = node;
                        return true;
                    }
                    index -= 1;
                }
                return false;
        }
    });
    return element;
}

/**
 * Scroll a child element into view, but only if it's not already in view.
 * @param {*} target 
 */
HTMLElement.prototype.scrollIntoViewIfNeeded = function(target) {
    // Target is outside the viewport from the bottom
    if (target.getBoundingClientRect().bottom > this.getBoundingClientRect().bottom) {
        //  The bottom of the target will be aligned to the bottom of the visible area of the scrollable ancestor.
        target.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    // Target is outside the view from the top
    if (target.getBoundingClientRect().top < this.getBoundingClientRect().top) {
        // The top of the target will be aligned to the top of the visible area of the scrollable ancestor
        target.scrollIntoView({ behavior: "smooth", block: "start" });
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
        this.highlightMatching = [];
        this.autoComplete = [];
        this.overwrite = [];
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
            let caretFocus = this.caretIndex();
            let caretAnchor = this.caretIndex(undefined, true);
            if (caretFocus < caretAnchor) {
                selection.deleteFromDocument();
                this.caretIndex(caretFocus);
            } else {
                selection.deleteFromDocument();
                this.caretIndex(caretAnchor);
            }
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
            if (this.overwrite.includes(event.key)) {
                let text = this.text;
                let caretIndex = this.caretIndex();

                if (text[caretIndex] !== event.key) {
                    this.format(this.text, event.key);
                    this.pushHistory({ content: this.text, caret: this.caretIndex() });
                } else {
                    this.caretIndex(caretIndex + 1);
                }
            } else if (event.key in this.autoComplete) {
                let autoAdd = this.autoComplete[event.key];
                this.format(this.text, event.key);
                let text = this.text;
                this.pushHistory({ content: text, caret: this.caretIndex() });
                this.format(text, autoAdd, false);
                this.pushHistory({ content: this.text, caret: this.caretIndex() });
            } else if (event.key.length == 1) {
                this.format(this.text, event.key);
                this.pushHistory({ content: this.text, caret: this.caretIndex() });
            }

            this.scrollToCaret();
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
                            let toRemove = text[index - 1];
                            if (toRemove in this.autoComplete) {
                                if (text[index] == this.autoComplete[toRemove]) {
                                    text = text.slice(0, index - 1) + text.slice(index + 1);
                                } else {
                                    text = text.slice(0, index - 1) + text.slice(index);
                                }
                            } else {
                                text = text.slice(0, index - 1) + text.slice(index);
                            }
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

            els = this.getElementsByClassName("highlighted");
            while (els.length > 0) {
                els[0].classList.remove("highlighted");
            }

            let caret = this.caretIndex();
            this.stateManager.now.caret = caret;

            // Highlight matching brackets/math symbols
            let c0 = this.getElementAtIndex(caret);
            let c1 = this.getElementAtIndex(caret - 1);
            if (c0.nodeType == Node.TEXT_NODE) c0 = c0.parentNode;
            if (c1.nodeType == Node.TEXT_NODE) c1 = c1.parentNode;
            let type0 = c0.getAttribute("data-type");
            let type1 = c1.getAttribute("data-type");

            let allParts = [...this.querySelectorAll("span")];

            let index0 = allParts.indexOf(c0);
            let index1 = allParts.indexOf(c1);

            for (let el of this.highlightMatching) {
                let matchOpen = false;
                for (let open of el[0]) {
                    if (open.type == type0 && open.content == c0.textContent) {
                        matchOpen = true;
                        break;
                    }
                }

                if (matchOpen) { // At the start of a match
                    let nested = 1;
                    let offset = index0;
                    while (nested > 0) {
                        offset++;
                        if (offset >= allParts.length) break;
                        let curPart = allParts[offset];
                        let curType = curPart.getAttribute("data-type");
                        let hadMatch = false;
                        for (let open of el[1]) {
                            if (open.type == curType && open.content == curPart.textContent) {
                                nested--;
                                hadMatch = true;
                                break;
                            }
                        }
                        if (hadMatch) continue;
                        for (let open of el[0]) {
                            if (open.type == curType && open.content == curPart.textContent) {
                                nested++;
                                break;
                            }
                        }
                    }

                    if (nested == 0) {
                        c0.classList.add("highlighted");
                        allParts[offset].classList.add("highlighted");
                    }
                }

                let matchClose = false;
                for (let close of el[1]) {
                    if (close.type == type1 && close.content == c1.textContent) {
                        matchClose = true;
                        break;
                    }
                }

                if (matchClose) { // At the end of a match
                    let nested = 1;
                    let offset = index1;
                    while (nested > 0) {
                        offset--;
                        if (offset < 0) break;
                        let curPart = allParts[offset];
                        let curType = curPart.getAttribute("data-type");
                        let hadMatch = false;
                        for (let open of el[0]) {
                            if (open.type == curType && open.content == curPart.textContent) {
                                nested--;
                                hadMatch = true;
                                break;
                            }
                        }
                        if (hadMatch) continue;
                        for (let open of el[1]) {
                            if (open.type == curType && open.content == curPart.textContent) {
                                nested++;
                                break;
                            }
                        }
                    }

                    if (nested == 0) {
                        c1.classList.add("highlighted");
                        allParts[offset].classList.add("highlighted");
                    }
                }
            }
        });

        // Prevent formatted pasting, we need it as plaintext
        this.addEventListener('paste', function(event) {
            event.preventDefault();
            this.deleteSelection();
            let pastedContent = event.clipboardData.getData('text/plain');
            pastedContent = pastedContent.replaceAll("\r", "");
            this.format(this.text, pastedContent);
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

    get value() {
        return this.text;
    }

    set value(val) {
        val = val.replaceAll("\r", "");
        this.format(val);
    }

    /**
     * Get the index in the text for a line.
     * @param {*} line
     * @returns index of start of the line in text
     */
    indexAtLine(line) {
        let text = this.text;
        let lines = text.split("\n");
        let index = 0;
        while (--line >= 0) {
            if (line < lines.length) index += lines[line].length + 1;
        }
        return index;
    }

    /**
     * Tokenize the string, tokens are of form { content: text, type: string }
     * @param {*} text input text
     * @returns array of tokens
     */
    tokenize(text) {
        return [{ content: text, type: "normal" }];
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
        let tokens = this.tokenize(text);

        // Divide the tokens into lines.
        let lines = [];
        let currentLine = [];
        for (let token of tokens) {
            if (token.content.includes("\n")) {
                let linesInToken = token.content.split("\n");
                let first = true;
                for (let line of linesInToken) {
                    if (!first) {
                        lines.push(currentLine);
                        currentLine = [];
                    }
                    first = false;
                    currentLine.push({
                        content: line,
                        type: token.type
                    });
                }
            } else {
                currentLine.push(token);
            }
        }

        lines.push(currentLine);
        return lines;
    }

    /**
     * Format the given text, and put it in the text editor.
     * @param {*} text string of text to format.
     * @param {*} append optional string to append at caret location before formatting.
     */
    format(text, append = "", tocaret = true) {
        let caretIndex = this.caretIndex();
        text = text.slice(0, caretIndex) + append + text.slice(caretIndex);
        if (tocaret) caretIndex += append.length;
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