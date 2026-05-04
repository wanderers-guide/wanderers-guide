import type { brand } from "./generics.ts";
import type { CastableBase } from "./records.ts";
export declare class InternalArktypeError extends Error {
}
export declare const throwInternalError: (message: string) => never;
export declare const throwError: (message: string, ctor?: new (message: string) => Error) => never;
export declare class ParseError extends Error {
    readonly name = "ParseError";
}
export declare const throwParseError: (message: string) => never;
/**
 *  TypeScript won't suggest strings beginning with a space as properties.
 *  Useful for symbol-like string properties.
 */
export declare const noSuggest: <s extends string>(s: s) => noSuggest<s>;
/**
 *  TypeScript won't suggest strings beginning with a space as properties.
 *  Useful for symbol-like string properties.
 */
export type noSuggest<s extends string = string> = ` ${s}`;
/** Unrendered character (U+200B) used to mark a string type */
export declare const ZeroWidthSpace = "\u200B";
/** Unrendered character (U+200B) used to mark a string type */
export type ZeroWidthSpace = typeof ZeroWidthSpace;
export type ErrorMessage<message extends string = string> = `${message}${ZeroWidthSpace}`;
export interface ErrorType<ctx extends {} = {}> extends CastableBase<ctx> {
    [brand]: "ErrorType";
}
export type Completion<text extends string = string> = `${text}${ZeroWidthSpace}${ZeroWidthSpace}`;
