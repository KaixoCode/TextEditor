const NORMAL = "nrm";
const COMMAND = "cmd";
const VERBATIM = "vrb";
const COMMENT = "cmt";
const SYMBOL = "sbl";
const MATH = "mth";

class LaTeXTextEditor extends TextEditor {
    constructor() {
        super();
    }

    generateLines(text) {
        let tokens = [];
        let i = 0;

        let mathSingleOpen = false;
        let mathDoubleOpen = false;

        while (i < text.length) {

            let mathStart = text.indexOf('$', i);
            if (mathStart == -1) mathStart = Number.MAX_VALUE;

            let commentStart = text.indexOf('%', i);
            if (commentStart == -1) commentStart = Number.MAX_VALUE;

            let commandStart = text.indexOf('\\', i);
            if (commandStart == -1) commandStart = Number.MAX_VALUE;

            let symbolStart = text.slice(i).search(/[\{\}\[\]\+\-\/\*\(\)\|\=\_\~]/);
            if (symbolStart == -1) symbolStart = Number.MAX_VALUE;
            else symbolStart += i;
            if (mathSingleOpen || mathDoubleOpen) symbolStart = Number.MAX_VALUE;

            let first = Math.min(mathStart, Math.min(symbolStart, Math.min(commentStart, commandStart)));

            let normal = mathSingleOpen || mathDoubleOpen ? MATH : NORMAL;

            if (first == Number.MAX_VALUE) { // No more special cases
                tokens.push({
                    content: text.substr(i),
                    type: normal
                });
                break;
            } else { // Special case, so add everything up to it to a normal span
                tokens.push({
                    content: text.substr(i, first - i),
                    type: normal
                });
                i = first;
            }

            // Math mode:
            // This simply sets a state, so we can continue parsing 
            // for other things inside the math mode
            if (first == mathStart) {
                let isDouble = text[i + 1] == '$';
                let match = isDouble ? "$$" : "$";
                let nmr = isDouble ? 2 : 1;
                tokens.push({
                    content: text.substr(i, nmr),
                    type: MATH
                });
                i += nmr;

                if (mathSingleOpen) mathSingleOpen = false;
                else if (!isDouble && !mathDoubleOpen) mathSingleOpen = true;

                if (mathDoubleOpen) mathDoubleOpen = false;
                else if (isDouble) mathDoubleOpen = true;
            }

            // Symbol simply parses a single symbol.
            else if (first == symbolStart) {
                tokens.push({
                    content: text.substr(i, 1),
                    type: SYMBOL
                });

                i = i + 1;
            }

            // Comment consumes rest of line as COMMENT token
            else if (first == commentStart) {
                let end = text.indexOf("\n", i);
                if (end == -1) {
                    tokens.push({
                        content: text.substr(i),
                        type: COMMENT
                    });
                    break;
                } else {
                    tokens.push({
                        content: text.substr(i, end - i),
                        type: COMMENT
                    });
                    i = end;
                }
            }

            // Command, handles special commands as well.
            else if (first == commandStart) {
                const VERB = "\\verb";
                const BEGIN_VERB = "\\begin{verbatim}";
                const END_VERB = "\\end{verbatim}";

                // Check if we're at a \verb
                if (text.substr(i, VERB.length) == VERB) {
                    let delim = text[i + VERB.length];
                    let end1 = text.indexOf(delim, i + VERB.length + 1);
                    let end2 = text.indexOf("\n", i + VERB.length + 1);
                    if (end1 == -1) end1 = end2;
                    let end = Math.min(end1, end2);

                    tokens.push({
                        content: "\\verb",
                        type: COMMAND
                    });

                    if (end == -1) {
                        tokens.push({
                            content: text.substr(i + VERB.length),
                            type: VERBATIM
                        });

                        break;
                    } else {
                        tokens.push({
                            content: text.substr(i + VERB.length, end - i - VERB.length + 1),
                            type: VERBATIM
                        });

                        i = end + 1;
                    }

                }

                // Check if we're at a \begin{verbatim}
                else if (text.substr(i, BEGIN_VERB.length) == BEGIN_VERB) {
                    let end = text.indexOf(END_VERB, i);

                    tokens.push({
                        content: "\\begin",
                        type: COMMAND
                    });

                    tokens.push({
                        content: "{",
                        type: SYMBOL
                    });

                    tokens.push({
                        content: "verbatim",
                        type: NORMAL
                    });

                    tokens.push({
                        content: "}",
                        type: SYMBOL
                    });

                    if (end == -1) {
                        tokens.push({
                            content: text.substr(i + BEGIN_VERB.length),
                            type: VERBATIM
                        });

                        break;
                    } else {
                        tokens.push({
                            content: text.substr(i + BEGIN_VERB.length, end - i - BEGIN_VERB.length),
                            type: VERBATIM
                        });

                        i = end;
                    }
                }

                // Otherwise normal control sequence
                else {
                    let len = 1;
                    for (; len + i < text.length; len++) {
                        let c = text[i + len];
                        if (!(c >= 'a' && c <= 'z' || c >= 'A' && c < 'Z')) {
                            if (len == 1) len = 2;
                            break;
                        }
                    }

                    tokens.push({
                        content: text.substr(i, len),
                        type: COMMAND
                    });

                    i += len;
                }
            }
        }

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
}

customElements.define("latex-text-editor", LaTeXTextEditor);