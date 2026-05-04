import { type Scanner } from "@ark/util";
import type { RootedRuntimeState } from "../../reduce/dynamic.ts";
import type { StaticState, s } from "../../reduce/static.ts";
import { type TerminatingChar } from "../tokens.ts";
export declare const parseDivisor: (s: RootedRuntimeState) => void;
export type parseDivisor<s extends StaticState, unscanned extends string> = Scanner.shiftUntil<Scanner.skipWhitespace<unscanned>, TerminatingChar> extends Scanner.shiftResult<infer scanned, infer nextUnscanned> ? scanned extends `${infer divisor extends number}` ? divisor extends 0 ? s.error<writeInvalidDivisorMessage<0>> : s.setRoot<s, [s["root"], "%", divisor], nextUnscanned> : s.error<writeInvalidDivisorMessage<scanned>> : never;
export declare const writeInvalidDivisorMessage: <divisor extends string | number>(divisor: divisor) => writeInvalidDivisorMessage<divisor>;
export type writeInvalidDivisorMessage<divisor extends string | number> = `% operator must be followed by a non-zero integer literal (was ${divisor})`;
