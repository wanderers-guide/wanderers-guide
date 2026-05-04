import { Backslash, whitespaceChars } from "./strings.js";
export class Scanner {
    chars;
    i;
    def;
    constructor(def) {
        this.def = def;
        this.chars = [...def];
        this.i = 0;
    }
    /** Get lookahead and advance scanner by one */
    shift() {
        return (this.chars[this.i++] ?? "");
    }
    get lookahead() {
        return (this.chars[this.i] ?? "");
    }
    get nextLookahead() {
        return this.chars[this.i + 1] ?? "";
    }
    get length() {
        return this.chars.length;
    }
    shiftUntil(condition) {
        let shifted = "";
        while (this.lookahead) {
            if (condition(this, shifted))
                break;
            else
                shifted += this.shift();
        }
        return shifted;
    }
    shiftUntilEscapable(condition) {
        let shifted = "";
        while (this.lookahead) {
            if (this.lookahead === Backslash) {
                this.shift();
                if (condition(this, shifted))
                    shifted += this.shift();
                else if (this.lookahead === Backslash)
                    shifted += this.shift();
                else
                    shifted += `${Backslash}${this.shift()}`;
            }
            else if (condition(this, shifted))
                break;
            else
                shifted += this.shift();
        }
        return shifted;
    }
    shiftUntilLookahead(charOrSet) {
        return typeof charOrSet === "string" ?
            this.shiftUntil(s => s.lookahead === charOrSet)
            : this.shiftUntil(s => s.lookahead in charOrSet);
    }
    shiftUntilNonWhitespace() {
        return this.shiftUntil(() => !(this.lookahead in whitespaceChars));
    }
    jumpToIndex(i) {
        this.i = i < 0 ? this.length + i : i;
    }
    jumpForward(count) {
        this.i += count;
    }
    get location() {
        return this.i;
    }
    get unscanned() {
        return this.chars.slice(this.i, this.length).join("");
    }
    get scanned() {
        return this.chars.slice(0, this.i).join("");
    }
    sliceChars(start, end) {
        return this.chars.slice(start, end).join("");
    }
    lookaheadIs(char) {
        return this.lookahead === char;
    }
    lookaheadIsIn(tokens) {
        return this.lookahead in tokens;
    }
}
export const writeUnmatchedGroupCloseMessage = (char, unscanned) => `Unmatched ${char}${(unscanned === "" ? "" : ` before ${unscanned}`)}`;
export const writeUnclosedGroupMessage = (missingChar) => `Missing ${missingChar}`;
