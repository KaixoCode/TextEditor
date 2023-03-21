const NORMAL = "normal";
const SYMBOL = "symbol";

class ExampleTextEditor extends TextEditor {
    constructor() {
        super();

        this.overwrite = ["}", "]", ")"];
        this.autoComplete = { "{": "}", "[": "]", "(": ")" };
        this.highlightMatching = [
            [
                [{ type: SYMBOL, content: "{" }],
                [{ type: SYMBOL, content: "}" }]
            ],
            [
                [{ type: SYMBOL, content: "(" }],
                [{ type: SYMBOL, content: ")" }]
            ],
            [
                [{ type: SYMBOL, content: "[" }],
                [{ type: SYMBOL, content: "]" }]
            ],
        ];
    }

    tokenize(text) {
        let tokens = [];
        for (let i = 0; i < text.length;) {
            let symbolStart = text.findFirstOf(/[$-/:-?{-~!"^_`\[\]]/, i);

            let first = symbolStart;

            if (first === Number.MAX_VALUE) {
                tokens.push({
                    content: text.substr(i),
                    type: NORMAL
                });
                break;
            } else {
                tokens.push({
                    content: text.substr(i, first - i),
                    type: NORMAL
                });

                i = first;

                tokens.push({
                    content: text.substr(i, 1),
                    type: SYMBOL
                });

                i = i + 1;
            }
        }

        return tokens;
    }
}

customElements.define("example-text-editor", ExampleTextEditor);