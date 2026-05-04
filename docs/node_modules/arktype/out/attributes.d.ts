import type { ArkError, ArkErrors, Morph } from "@ark/schema";
import { type anyOrNever, type array, type Brand, type equals, type Hkt, type intersectArrays, type isSafelyMappable, type merge, type optionalKeyOf, type Primitive, type show, type unionKeyOf, type unionToTuple } from "@ark/util";
import type { arkPrototypes } from "./keywords/constructors.ts";
import type { type } from "./keywords/keywords.ts";
import type { Type } from "./type.ts";
export type { arkPrototypes as object } from "./keywords/constructors.ts";
export type Comparator = "<" | "<=" | ">" | ">=" | "==";
export type RegexLiteral<source extends string = string> = `/${source}/`;
export type DateLiteral<source extends string = string> = `d"${source}"` | `d'${source}'`;
export type LimitLiteral = number | DateLiteral;
export type normalizeLimit<limit> = limit extends DateLiteral<infer source> ? source : limit extends number | string ? limit : never;
export type distill<t, side extends distill.Side> = finalizeDistillation<t, _distill<t, side>>;
export declare namespace distill {
    type Side = "in" | "out" | "introspectableOut";
    type In<t> = distill<t, "in">;
    type Out<t> = distill<t, "out">;
    namespace introspectable {
        type Out<t> = distill<t, "introspectableOut">;
    }
}
type finalizeDistillation<t, distilled> = equals<t, distilled> extends true ? t : distilled;
type _distill<t, side extends distill.Side> = t extends undefined ? t : [t] extends [anyOrNever] ? t : unknown extends t ? unknown : t extends Brand<infer base> ? side extends "in" ? base : t : t extends TerminallyInferredObject | Primitive ? t : t extends Function ? t extends (...args: never) => anyOrNever ? t : t extends InferredMorph<infer i, infer o> ? distillIo<i, o, side> : t : t extends Default<infer constraint> ? _distill<constraint, side> : t extends array ? distillArray<t, side> : isSafelyMappable<t> extends true ? distillMappable<t, side> : t;
type distillMappable<o, side extends distill.Side> = side extends "in" ? show<{
    [k in keyof o as k extends inferredDefaultKeyOf<o> ? never : k]: _distill<o[k], side>;
} & {
    [k in inferredDefaultKeyOf<o>]?: _distill<o[k], side>;
}> : {
    [k in keyof o]: _distill<o[k], side>;
};
type distillIo<i, o extends Out, side extends distill.Side> = side extends "out" ? _distill<o["t"], side> : side extends "in" ? _distill<i, side> : o extends To<infer validatedOut> ? _distill<validatedOut, side> : unknown;
type unwrapInput<t> = t extends InferredMorph<infer i> ? t extends anyOrNever ? t : i : t;
type inferredDefaultKeyOf<o> = keyof o extends infer k ? k extends keyof o ? unwrapInput<o[k]> extends Default<infer t> ? [
    t
] extends [anyOrNever] ? never : k : never : never : never;
type distillArray<t extends array, side extends distill.Side> = t[number][] extends t ? alignReadonly<_distill<t[number], side>[], t> : distillNonArraykeys<t, alignReadonly<distillArrayFromPrefix<[...t], side, []>, t>, side>;
type alignReadonly<result extends unknown[], original extends array> = original extends unknown[] ? result : Readonly<result>;
type distillNonArraykeys<originalArray extends array, distilledArray, side extends distill.Side> = keyof originalArray extends keyof distilledArray ? distilledArray : distilledArray & _distill<{
    [k in keyof originalArray as k extends keyof distilledArray ? never : k]: originalArray[k];
}, side>;
type distillArrayFromPrefix<t extends array, side extends distill.Side, prefix extends array> = t extends readonly [infer head, ...infer tail] ? distillArrayFromPrefix<tail, side, [
    side,
    head
] extends ["in", Default] ? [...prefix, _distill<head, side>?] : [...prefix, _distill<head, side>]> : [...prefix, ...distillArrayFromPostfix<t, side, []>];
type distillArrayFromPostfix<t extends array, side extends distill.Side, postfix extends array> = t extends readonly [...infer init, infer last] ? distillArrayFromPostfix<init, side, [_distill<last, side>, ...postfix]> : [...{
    [i in keyof t]: _distill<t[i], side>;
}, ...postfix];
type BuiltinTerminalObjectKind = Exclude<arkPrototypes.NonDegenerateName, "Array" | "Function">;
/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObject = arkPrototypes.instanceOf<BuiltinTerminalObjectKind> | ArkEnv.prototypes;
export type inferPredicate<t, predicate> = predicate extends (data: any, ...args: any[]) => data is infer narrowed ? narrowed : t;
export type inferNaryPipe<morphs extends readonly Morph[]> = _inferNaryPipe<morphs, unknown>;
type _inferNaryPipe<remaining extends readonly unknown[], result> = remaining extends (readonly [infer head extends Morph, ...infer tail extends Morph[]]) ? _inferNaryPipe<tail, inferMorph<result, head>> : result;
export type inferNaryIntersection<types extends readonly unknown[]> = number extends types["length"] ? _inferNaryIntersection<unionToTuple<types[number]>, unknown> : _inferNaryIntersection<types, unknown>;
type _inferNaryIntersection<remaining extends readonly unknown[], result> = remaining extends readonly [infer head, ...infer tail] ? _inferNaryIntersection<tail, inferIntersection<result, head>> : result;
export type inferNaryMerge<types extends readonly unknown[]> = number extends types["length"] ? _inferUnorderedMerge<types> : _inferNaryMerge<types, {}>;
type _inferUnorderedMerge<types extends readonly unknown[], optionalKey extends PropertyKey = optionalAtLeastOnceUnionKeyOf<types[number]>, requiredKey extends PropertyKey = Exclude<unionKeyOf<types[number]>, optionalKey>> = show<{
    [k in requiredKey]: types[number] extends infer v ? v extends unknown ? k extends keyof v ? v[k] : never : never : never;
} & {
    [k in optionalKey]?: types[number] extends infer v ? v extends unknown ? k extends keyof v ? v[k] : never : never : never;
}>;
/** Coalesce keys that exist and are optional on one or more branches of a union */
type optionalAtLeastOnceUnionKeyOf<t> = t extends unknown ? optionalKeyOf<t> : never;
type _inferNaryMerge<remaining extends readonly unknown[], result> = remaining extends (readonly [infer head, ...infer tail extends readonly unknown[]]) ? _inferNaryMerge<tail, merge<result, head>> : result;
export type inferMorphOut<morph extends Morph> = Exclude<ReturnType<morph>, ArkError | ArkErrors>;
declare const isMorphOutKey: " isMorphOut";
export interface Out<o = any> {
    [isMorphOutKey]: true;
    t: o;
    introspectable: boolean;
}
export interface To<o = any> extends Out<o> {
    introspectable: true;
}
export type InferredMorph<i = never, o extends Out = Out> = (In: i) => o;
declare const defaultsToKey: " defaultsTo";
export type Default<t = unknown, v = unknown> = {
    [defaultsToKey]: [t, v];
};
export type withDefault<t, v, undistributed = t> = t extends InferredMorph ? addDefaultToMorph<t, v> : Default<Exclude<undistributed, InferredMorph>, v>;
type addDefaultToMorph<t extends InferredMorph, v> = [
    normalizeMorphDistribution<t>
] extends [InferredMorph<infer i, infer o>] ? (In: Default<i, v>) => o : never;
type normalizeMorphDistribution<t, undistributedIn = t extends InferredMorph<infer i> ? i : never, undistributedOut extends Out = t extends InferredMorph<never, infer o> ? [
    o
] extends [To<infer unwrappedOut>] ? To<unwrappedOut> : o : never> = (Extract<t, InferredMorph> extends anyOrNever ? never : Extract<t, InferredMorph> extends InferredMorph<infer i, infer o> ? [
    undistributedOut
] extends [o] ? (In: undistributedIn) => undistributedOut : [undistributedIn] extends [i] ? (In: undistributedIn) => undistributedOut : t : never) | Exclude<t, InferredMorph> extends infer _ ? _ : never;
export type defaultFor<t = unknown> = (Primitive extends t ? Primitive : t extends Primitive ? t : never) | (() => t);
export type termOrType<t> = t | Type<t, any>;
export type inferIntersection<l, r> = normalizeMorphDistribution<_inferIntersection<l, r, false>>;
export type inferMorph<t, morph extends Morph> = morph extends type.cast<infer tMorph> ? inferPipe<t, tMorph> : inferMorphOut<morph> extends infer out ? (In: distill.In<t>) => Out<out> : never;
export type inferPipe<l, r> = normalizeMorphDistribution<_inferIntersection<l, r, true>>;
type _inferIntersection<l, r, piped extends boolean> = [
    l & r
] extends [infer t extends anyOrNever] ? t : l extends InferredMorph<infer lIn, infer lOut> ? r extends InferredMorph<never, infer rOut> ? piped extends true ? (In: lIn) => rOut : never : piped extends true ? (In: lIn) => To<r> : (In: _inferIntersection<lIn, r, false>) => lOut : r extends InferredMorph<infer rIn, infer rOut> ? (In: _inferIntersection<rIn, l, false>) => rOut : [l, r] extends [object, object] ? intersectObjects<l, r, piped> extends infer result ? result : never : l & r;
interface MorphableIntersection<piped extends boolean> extends Hkt<[unknown, unknown]> {
    body: _inferIntersection<this[0], this[1], piped>;
}
type intersectObjects<l, r, piped extends boolean> = l extends array ? r extends array ? intersectArrays<l, r, MorphableIntersection<piped>> : // for an intersection with exactly one array operand like { name: string } & string[],
l & r : r extends array ? l & r : keyof l & keyof r extends never ? show<l & r> : show<{
    [k in keyof l]: k extends keyof r ? _inferIntersection<l[k], r[k], piped> : l[k];
} & {
    [k in keyof r]: k extends keyof l ? _inferIntersection<l[k], r[k], piped> : r[k];
}>;
