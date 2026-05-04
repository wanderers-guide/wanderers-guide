import { type Scanner, type WhitespaceChar } from "@ark/util";
import type { RuntimeState } from "../../reduce/dynamic.ts";
import type { StaticState, s } from "../../reduce/static.ts";
import type { BaseCompletions } from "../../string.ts";
import { parseEnclosed, type EnclosingQuote, type EnclosingStartToken } from "./enclosed.ts";
import { parseUnenclosed } from "./unenclosed.ts";
export declare const parseOperand: (s: RuntimeState) => void;
export type parseOperand<s extends StaticState, $, args> = s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ? lookahead extends "(" ? s.reduceGroupOpen<s, unscanned> : lookahead extends EnclosingStartToken ? parseEnclosed<s, lookahead, unscanned> : lookahead extends WhitespaceChar ? parseOperand<s.scanTo<s, unscanned>, $, args> : lookahead extends "d" ? unscanned extends (Scanner.shift<infer enclosing extends EnclosingQuote, infer nextUnscanned>) ? parseEnclosed<s, `d${enclosing}`, nextUnscanned> : parseUnenclosed<s, $, args> : parseUnenclosed<s, $, args> : s.completion<`${s["scanned"]}${BaseCompletions<$, args>}`>;
