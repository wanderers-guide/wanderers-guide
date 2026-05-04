import type { BaseRoot, GenericAst, genericParamNames, GenericRoot } from "@ark/schema";
import { writeUnclosedGroupMessage, type array, type ErrorMessage, type join } from "@ark/util";
import type { RuntimeState } from "../../reduce/dynamic.ts";
import type { s, StaticState } from "../../reduce/static.ts";
import type { parseUntilFinalizer } from "../../string.ts";
export declare const parseGenericArgs: (name: string, g: GenericRoot, s: RuntimeState) => BaseRoot[];
export type parseGenericArgs<name extends string, g extends GenericAst, unscanned extends string, $, args> = _parseGenericArgs<name, g, unscanned, $, args, [], []>;
declare const _parseGenericArgs: (name: string, g: GenericRoot, s: RuntimeState, argNodes: BaseRoot[]) => BaseRoot[];
export type ParsedArgs<result extends unknown[] = unknown[], unscanned extends string = string> = {
    result: result;
    unscanned: unscanned;
};
type _parseGenericArgs<name extends string, g extends GenericAst, unscanned extends string, $, args, argDefs extends string[], argAsts extends unknown[]> = parseUntilFinalizer<s.initialize<unscanned>, $, args> extends (infer finalArgState extends StaticState) ? {
    defs: [
        ...argDefs,
        finalArgState["scanned"] extends `${infer def}${"," | ">"}` ? def : finalArgState["scanned"]
    ];
    asts: [...argAsts, finalArgState["root"]];
    unscanned: finalArgState["unscanned"];
} extends ({
    defs: infer nextDefs extends string[];
    asts: infer nextAsts extends unknown[];
    unscanned: infer nextUnscanned extends string;
}) ? finalArgState["finalizer"] extends ">" ? nextAsts["length"] extends g["paramsAst"]["length"] ? ParsedArgs<nextAsts, nextUnscanned> : s.error<writeInvalidGenericArgCountMessage<name, genericParamNames<g["paramsAst"]>, nextDefs>> : finalArgState["finalizer"] extends "," ? _parseGenericArgs<name, g, nextUnscanned, $, args, nextDefs, nextAsts> : finalArgState["finalizer"] extends ErrorMessage ? finalArgState : s.error<writeUnclosedGroupMessage<">">> : never : never;
export declare const writeInvalidGenericArgCountMessage: <name extends string, params extends array<string>, argDefs extends array<string>>(name: name, params: params, argDefs: argDefs) => writeInvalidGenericArgCountMessage<name, params, argDefs>;
export type writeInvalidGenericArgCountMessage<name extends string, params extends array<string>, argDefs extends array<string>> = `${name}<${join<params, ", ">}> requires exactly ${params["length"]} args (got ${argDefs["length"]}${argDefs["length"] extends (0) ? "" : `: ${join<argDefs, ",">}`})`;
export {};
