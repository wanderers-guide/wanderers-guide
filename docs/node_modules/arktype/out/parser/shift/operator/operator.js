import { isKeyOf, whitespaceChars } from "@ark/util";
import { lookaheadIsFinalizing } from "../tokens.js";
import { comparatorStartChars, parseBound } from "./bounds.js";
import { parseBrand } from "./brand.js";
import { parseDivisor } from "./divisor.js";
export const parseOperator = (s) => {
    const lookahead = s.scanner.shift();
    return (lookahead === "" ? s.finalize("")
        : lookahead === "[" ?
            s.scanner.shift() === "]" ?
                s.setRoot(s.root.array())
                : s.error(incompleteArrayTokenMessage)
            : lookahead === "|" ?
                s.scanner.lookahead === ">" ?
                    s.shiftedByOne().pushRootToBranch("|>")
                    : s.pushRootToBranch(lookahead)
                : lookahead === "&" ? s.pushRootToBranch(lookahead)
                    : lookahead === ")" ? s.finalizeGroup()
                        : lookaheadIsFinalizing(lookahead, s.scanner.unscanned) ?
                            s.finalize(lookahead)
                            : isKeyOf(lookahead, comparatorStartChars) ? parseBound(s, lookahead)
                                : lookahead === "%" ? parseDivisor(s)
                                    : lookahead === "#" ? parseBrand(s)
                                        : lookahead in whitespaceChars ? parseOperator(s)
                                            : s.error(writeUnexpectedCharacterMessage(lookahead)));
};
export const writeUnexpectedCharacterMessage = (char, shouldBe = "") => `'${char}' is not allowed here${shouldBe && ` (should be ${shouldBe})`}`;
export const incompleteArrayTokenMessage = `Missing expected ']'`;
