import type { ErrorMessage, inferred } from "@ark/util";
import type { RegexExecArray } from "./execArray.ts";
import type { parseState } from "./parse.ts";
import type { State } from "./state.ts";
export type IndexedCaptures = Array<string | undefined>;
export type NamedCaptures = Record<string, string | undefined>;
export type UnicodeFlag = "v" | "u";
export type Flags = `${"d" | ""}${"g" | ""}${"i" | ""}${"m" | ""}${"s" | ""}${UnicodeFlag | ""}${"y" | ""}`;
export type RegexContext = {
    flags?: Flags;
    captures?: IndexedCaptures;
    names?: NamedCaptures;
};
export interface Regex<out pattern extends string = string, out ctx extends RegexContext = RegexContext> extends RegExp {
    [inferred]: pattern;
    infer: pattern;
    inferCaptures: ctx["captures"] extends IndexedCaptures ? ctx["captures"] : [];
    inferNamedCaptures: ctx["names"] extends NamedCaptures ? ctx["names"] : {};
    flags: ctx["flags"] extends Flags ? ctx["flags"] : "";
    test(s: string): s is pattern;
    exec(s: string): RegexExecArray<[
        pattern,
        ...this["inferCaptures"]
    ], this["inferNamedCaptures"], this["flags"]> | null;
    exec(s: string): never;
}
export interface RegexParser {
    <src extends string, flags extends Flags = "">(src: regex.validate<src, flags>, flags?: flags): regex.parse<src, flags>;
    as: <pattern extends string = string, ctx extends RegexContext = {}>(src: string, flags?: Flags) => Regex<pattern, ctx>;
}
export declare const regex: RegexParser;
export type regex<pattern extends string = string, ctx extends RegexContext = RegexContext> = Regex<pattern, ctx>;
export declare namespace regex {
    type infer<src extends string, flags extends Flags = ""> = parse<src, flags> extends Regex<infer pattern> ? pattern : never;
    type validate<src extends string, flags extends Flags = ""> = parse<src, flags> extends infer e extends ErrorMessage ? e : src;
    type parse<src extends string, flags extends Flags = ""> = parseState<State.initialize<src, flags>>;
}
