export class InternalArktypeError extends Error {
}
export const throwInternalError = message => throwError(message, InternalArktypeError);
export const throwError = (message, ctor = Error) => {
    throw new ctor(message);
};
export class ParseError extends Error {
    name = "ParseError";
}
export const throwParseError = message => throwError(message, ParseError);
/**
 *  TypeScript won't suggest strings beginning with a space as properties.
 *  Useful for symbol-like string properties.
 */
export const noSuggest = (s) => ` ${s}`;
/** Unrendered character (U+200B) used to mark a string type */
export const ZeroWidthSpace = "\u{200B}";
