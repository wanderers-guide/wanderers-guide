import type { BaseRoot, IntersectionNode } from "@ark/schema";
import { Callable, type applyElementLabels, type conform, type Fn, type get } from "@ark/util";
import type { distill } from "./attributes.ts";
import type { type } from "./keywords/keywords.ts";
import type { validateInnerDefinition } from "./parser/definition.ts";
import type { inferTupleLiteral, validateTupleLiteral } from "./parser/tupleLiteral.ts";
import type { InternalScope, Scope } from "./scope.ts";
import type { Type } from "./type.ts";
export interface FnParser<$ = {}> {
    <const args extends readonly unknown[], paramsT extends readonly unknown[] = inferTupleLiteral<args extends readonly [...infer params, ":", unknown] ? params : args, $, {}>, returnT = args extends readonly [...unknown[], ":", infer returnDef] ? type.infer<returnDef, $> : unknown>(...args: {
        [i in keyof args]: conform<args[i], get<validateFnArgs<args, $>, i>>;
    }): <internalSignature extends (...args: distill.Out<paramsT>) => distill.In<returnT>, externalSignature extends Fn = (...args: applyElementLabels<distill.In<paramsT>, Parameters<internalSignature>>) => args extends readonly [...unknown[], ":", unknown] ? distill.Out<returnT> : ReturnType<internalSignature>>(implementation: internalSignature) => TypedFn<externalSignature, $, args extends readonly [...unknown[], ":", unknown] ? Return.introspectable : {}>;
    /**
     * The {@link Scope} in which definitions passed to this function will be parsed.
     */
    $: Scope<$>;
    /**
     * An alias of `fn` with no type-level validation or inference.
     *
     * Useful when wrapping `fn` or using it to parse a dynamic definition.
     */
    raw: RawFnParser;
}
export type RawFnParser = (...args: unknown[]) => (...args: unknown[]) => unknown;
export declare class InternalFnParser extends Callable<(...args: unknown[]) => Fn> {
    constructor($: InternalScope);
}
export declare namespace TypedFn {
    type meta = {
        introspectableReturn?: true;
    };
}
export interface TypedFn<signature extends Fn = Fn, $ = {}, meta extends TypedFn.meta = {}> extends Callable<signature> {
    expression: string;
    params: signature extends Fn<infer params> ? Type<params, $> : never;
    returns: Type<meta extends Return.introspectable ? ReturnType<signature> : unknown, $>;
}
export declare class InternalTypedFn extends Callable<(...args: unknown[]) => unknown> {
    raw: Fn;
    params: IntersectionNode;
    returns: BaseRoot;
    expression: string;
    constructor(raw: Fn, params: IntersectionNode, returns: BaseRoot);
}
export declare namespace Return {
    interface introspectable {
        introspectableReturn: true;
    }
}
type validateFnArgs<args, $> = args extends readonly unknown[] ? args extends readonly [...infer paramDefs, ":", infer returnDef] ? readonly [
    ...validateFnParamDefs<paramDefs, $>,
    ":",
    type.validate<returnDef, $>
] : validateFnParamDefs<args, $> : never;
type validateFnParamDefs<paramDefs extends readonly unknown[], $> = paramDefs extends validateTupleLiteral<paramDefs, $, {}> ? paramDefs : paramDefs extends {
    [i in keyof paramDefs]: paramDefs[i] extends "..." ? paramDefs[i] : validateInnerDefinition<paramDefs[i], $, {}>;
} ? validateTupleLiteral<paramDefs, $, {}> : {
    [i in keyof paramDefs]: validateInnerDefinition<paramDefs[i], $, {}>;
};
export declare const badFnReturnTypeMessage = "\":\" must be followed by exactly one return type e.g:\nfn(\"string\", \":\", \"number\")(s => s.length)";
export {};
