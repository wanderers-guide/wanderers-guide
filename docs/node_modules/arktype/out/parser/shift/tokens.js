import { isKeyOf, whitespaceChars } from "@ark/util";
export const terminatingChars = {
    "<": 1,
    ">": 1,
    "=": 1,
    "|": 1,
    "&": 1,
    ")": 1,
    "[": 1,
    "%": 1,
    ",": 1,
    ":": 1,
    "?": 1,
    "#": 1,
    ...whitespaceChars
};
export const finalizingLookaheads = {
    ">": 1,
    ",": 1,
    "": 1,
    "=": 1,
    "?": 1
};
export const lookaheadIsFinalizing = (lookahead, unscanned) => lookahead === ">" ?
    unscanned[0] === "=" ?
        // >== would only occur in an expression like Array<number>==5
        // otherwise, >= would only occur as part of a bound like number>=5
        unscanned[1] === "="
        // if > is the end of a generic instantiation, the next token will be
        // an operator or the end of the string
        : unscanned.trimStart() === "" ||
            isKeyOf(unscanned.trimStart()[0], terminatingChars)
    // "=" is a finalizer on its own (representing a default value),
    // but not with a second "=" (an equality comparator)
    : lookahead === "=" ? unscanned[0] !== "="
        // "," and "?" are unambiguously finalizers
        : lookahead === "," || lookahead === "?";
