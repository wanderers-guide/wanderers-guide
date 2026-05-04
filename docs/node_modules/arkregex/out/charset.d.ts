import type { Backslash, ErrorMessage, noSuggest, Scanner, writeUnclosedGroupMessage } from "@ark/util";
import type { parseEscapedChar, StringDigit } from "./escape.ts";
import type { s, State } from "./state.ts";
export type parseCharset<s extends State, unscanned extends string> = Scanner.shiftUntilEscapable<unscanned, "]", Backslash> extends (Scanner.shiftResult<infer scanned, infer nextUnscanned>) ? nextUnscanned extends `]${infer remaining}` ? scanned extends Scanner.shift<"^", string> ? s.shiftQuantifiable<s, string, remaining> : parseNonNegatedCharset<scanned, never, null> extends (infer result extends string) ? [
    result
] extends [never] ? s.error<emptyCharacterSetMessage> : s.shiftQuantifiable<s, result, remaining> : never : s.error<writeUnclosedGroupMessage<"]">> : never;
type parseNonNegatedCharset<chars extends string, set extends string, lastChar extends string | null> = parseChar<chars> extends Scanner.shiftResult<infer result, infer unscanned> ? result extends UnescapedDashMarker ? parseDash<unscanned, set, lastChar> : result extends ErrorMessage ? result : parseNonNegatedCharset<unscanned, set | result, result> : set;
type parseDash<unscanned extends string, set extends string, lastChar extends string | null> = lastChar extends string ? parseChar<unscanned> extends (Scanner.shiftResult<infer rangeEnd, infer next>) ? parseNonNegatedCharset<next, set | inferRange<lastChar, rangeEnd>, null> : // trailing -, treat as literal
set | "-" : parseNonNegatedCharset<unscanned, set | "-", "-">;
type inferRange<start extends string, end extends string> = start | end extends StringDigit ? `${bigint}` : string;
type UnescapedDashMarker = noSuggest<"dash">;
type parseChar<unscanned extends string> = unscanned extends Scanner.shift<infer lookahead, infer next> ? lookahead extends Backslash ? next extends Scanner.shift<infer escaped, infer postEscaped> ? Scanner.shiftResult<parseEscapedChar<escaped>, postEscaped> : never : Scanner.shiftResult<lookahead extends "-" ? UnescapedDashMarker : lookahead, next> : null;
export declare const emptyCharacterSetMessage = "Empty character set [] is unsatisfiable";
export type emptyCharacterSetMessage = typeof emptyCharacterSetMessage;
export {};
