import { type Scanner } from "@ark/util";
import type { regex } from "arkregex";
import type { InferredAst } from "../../ast/infer.ts";
import type { RuntimeState } from "../../reduce/dynamic.ts";
import type { StaticState, s } from "../../reduce/static.ts";
export type StringLiteral<contents extends string = string> = DoubleQuotedStringLiteral<contents> | SingleQuotedStringLiteral<contents>;
export type DoubleQuotedStringLiteral<contents extends string = string> = `"${contents}"`;
export type SingleQuotedStringLiteral<contents extends string = string> = `'${contents}'`;
export declare const parseEnclosed: (s: RuntimeState, enclosing: EnclosingStartToken) => void;
export type parseEnclosed<s extends StaticState, enclosingStart extends EnclosingStartToken, unscanned extends string> = Scanner.shiftUntilEscapable<unscanned, EnclosingTokens[enclosingStart], ""> extends Scanner.shiftResult<infer scanned, infer nextUnscanned> ? nextUnscanned extends "" ? s.error<writeUnterminatedEnclosedMessage<scanned, enclosingStart>> : s.setRoot<s, InferredAst<enclosingStart extends EnclosingQuote ? scanned : enclosingStart extends "/" ? regex.infer<scanned> : Date, `${enclosingStart}${scanned}${EnclosingTokens[enclosingStart]}`>, nextUnscanned extends Scanner.shift<string, infer unscanned> ? unscanned : ""> : never;
export declare const enclosingQuote: {
    readonly "'": 1;
    readonly '"': 1;
};
export type EnclosingQuote = keyof typeof enclosingQuote;
export declare const enclosingChar: {
    readonly "/": 1;
    readonly "'": 1;
    readonly '"': 1;
};
export declare const enclosingLiteralTokens: {
    readonly "d'": "'";
    readonly 'd"': "\"";
    readonly "'": "'";
    readonly '"': "\"";
};
export type EnclosingLiteralTokens = typeof enclosingLiteralTokens;
export type EnclosingLiteralStartToken = keyof EnclosingLiteralTokens;
export declare const enclosingTokens: {
    readonly "/": "/";
    readonly "d'": "'";
    readonly 'd"': "\"";
    readonly "'": "'";
    readonly '"': "\"";
};
export type EnclosingTokens = typeof enclosingTokens;
export type EnclosingStartToken = keyof EnclosingTokens;
export type EnclosingEndToken = EnclosingTokens[keyof EnclosingTokens];
export declare const untilLookaheadIsClosing: Record<EnclosingEndToken, Scanner.UntilCondition>;
declare const enclosingCharDescriptions: {
    readonly '"': "double-quote";
    readonly "'": "single-quote";
    readonly "/": "forward slash";
};
type enclosingCharDescriptions = typeof enclosingCharDescriptions;
export declare const writeUnterminatedEnclosedMessage: <fragment extends string, enclosingStart extends EnclosingStartToken>(fragment: fragment, enclosingStart: enclosingStart) => writeUnterminatedEnclosedMessage<fragment, enclosingStart>;
export type writeUnterminatedEnclosedMessage<fragment extends string, enclosingStart extends EnclosingStartToken> = `${enclosingStart}${fragment} requires a closing ${enclosingCharDescriptions[EnclosingTokens[enclosingStart]]}`;
export {};
