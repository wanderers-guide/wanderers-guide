import type { KeySet } from "./records.ts";
import { Backslash, type WhitespaceChar } from "./strings.ts";
export declare class Scanner<lookahead extends string = string> {
    chars: string[];
    i: number;
    def: string;
    constructor(def: string);
    /** Get lookahead and advance scanner by one */
    shift(): this["lookahead"];
    get lookahead(): lookahead;
    get nextLookahead(): string;
    get length(): number;
    shiftUntil(condition: Scanner.UntilCondition): string;
    shiftUntilEscapable(condition: Scanner.UntilCondition): string;
    shiftUntilLookahead(charOrSet: string | KeySet): string;
    shiftUntilNonWhitespace(): string;
    jumpToIndex(i: number): void;
    jumpForward(count: number): void;
    get location(): number;
    get unscanned(): string;
    get scanned(): string;
    sliceChars(start: number, end?: number): string;
    lookaheadIs<char extends lookahead>(char: char): this is Scanner<char>;
    lookaheadIsIn<keySet extends KeySet>(tokens: keySet): this is Scanner<Extract<keyof keySet, string>>;
}
export declare namespace Scanner {
    type UntilCondition = (scanner: Scanner, shifted: string) => boolean;
    type shift<lookahead extends string, unscanned extends string> = `${lookahead}${unscanned}`;
    type shiftUntil<unscanned extends string, terminator extends string, appendTo extends string = ""> = unscanned extends shift<infer lookahead, infer nextUnscanned> ? lookahead extends terminator ? [
        appendTo,
        unscanned
    ] : shiftUntil<nextUnscanned, terminator, `${appendTo}${lookahead}`> : [appendTo, ""];
    type shiftUntilEscapable<unscanned extends string, terminator extends string, escapeEscape extends Backslash | "", appendTo extends string = ""> = unscanned extends shift<infer lookahead, infer nextUnscanned> ? lookahead extends terminator ? [appendTo, unscanned] : lookahead extends Backslash ? nextUnscanned extends (shift<infer nextLookahead, infer postEscapedUnscanned>) ? shiftUntilEscapable<postEscapedUnscanned, terminator, escapeEscape, `${appendTo}${nextLookahead extends terminator ? "" : nextLookahead extends Backslash ? escapeEscape : Backslash}${nextLookahead}`> : [`${appendTo}${Backslash}`, ""] : shiftUntilEscapable<nextUnscanned, terminator, escapeEscape, `${appendTo}${lookahead}`> : [appendTo, ""];
    type shiftUntilNot<unscanned extends string, nonTerminator extends string, appendTo extends string = ""> = unscanned extends shift<infer lookahead, infer nextUnscanned> ? lookahead extends nonTerminator ? shiftUntilNot<nextUnscanned, nonTerminator, `${appendTo}${lookahead}`> : [appendTo, unscanned] : [appendTo, ""];
    type skipWhitespace<unscanned extends string> = shiftUntilNot<unscanned, WhitespaceChar>[1];
    type shiftResult<scanned extends string, unscanned extends string> = [
        scanned,
        unscanned
    ];
}
export declare const writeUnmatchedGroupCloseMessage: <char extends string, unscanned extends string>(char: char, unscanned: unscanned) => writeUnmatchedGroupCloseMessage<char, unscanned>;
export type writeUnmatchedGroupCloseMessage<char extends string, unscanned extends string> = `Unmatched ${char}${unscanned extends "" ? "" : ` before ${unscanned}`}`;
export declare const writeUnclosedGroupMessage: <missingChar extends string>(missingChar: missingChar) => writeUnclosedGroupMessage<missingChar>;
export type writeUnclosedGroupMessage<missingChar extends string> = `Missing ${missingChar}`;
