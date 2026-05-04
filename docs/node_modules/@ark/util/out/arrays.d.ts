import type { GuardablePredicate } from "./functions.ts";
import type { anyOrNever, conform } from "./generics.ts";
import type { isDisjoint } from "./intersections.ts";
import type { parseNonNegativeInteger } from "./numbers.ts";
type DuplicateData<val = unknown> = {
    element: val;
    indices: number[];
};
/**
 * Extracts duplicated elements and their indices from an array, returning them.
 *
 * Note that given `a === b && b === c`, then `c === a` must be `true` for this to give accurate results.
 *
 * @param arr The array to extract duplicate elements from.
 */ export declare const getDuplicatesOf: <const arr extends array>(arr: arr, opts?: ComparisonOptions<arr[number]>) => DuplicateData<arr[number]>[];
export type pathToString<segments extends string[], delimiter extends string = "/"> = segments extends [] ? "/" : join<segments, delimiter>;
export declare const join: <segments extends array<string>, delimiter extends string>(segments: segments, delimiter: delimiter) => join<segments, delimiter>;
export type join<segments extends array<string>, delimiter extends string, result extends string = ""> = segments extends (readonly [infer head extends string, ...infer tail extends string[]]) ? join<tail, delimiter, result extends "" ? head : `${result}${delimiter}${head}`> : result;
export declare const getPath: (root: unknown, path: string[]) => unknown;
export declare const intersectUniqueLists: <item>(l: readonly item[], r: readonly item[]) => item[];
export type filter<t extends array, constraint, result extends unknown[] = []> = t extends readonly [infer head, ...infer tail] ? filter<tail, constraint, head extends constraint ? [...result, head] : result> : result;
export type array<t = unknown> = readonly t[];
export declare namespace array {
    type multiply<t extends array, count extends number> = _multiply<t, [
    ], count, [
    ]>;
    type _multiply<base extends array, result extends array, count extends number, i extends 1[]> = i["length"] extends count ? result : _multiply<base, [...result, ...base], count, [...i, 1]>;
    type repeat<element, count extends number> = buildFromSegments<element, [
    ], exponentials.max<count>, count>;
    type buildFromSegments<element, result extends 1[], segments extends 1[][], count extends number, next extends 1[] = [...result, ...segments[0]]> = next["length"] extends count ? {
        [i in keyof next]: element;
    } : `${count}` extends keyof next ? buildFromSegments<element, result, nextSegments<segments>, count> : buildFromSegments<element, next, nextSegments<segments>, count>;
    type nextSegments<segments extends 1[][]> = segments extends [unknown, ...infer nextSegments extends 1[][]] ? nextSegments : never;
    type minLength<element, minLength extends number> = readonly [
        ...multiply<[element], minLength>,
        ...element[]
    ];
}
export type listable<t> = t | readonly t[];
export type flattenListable<t> = t extends array<infer element> ? element : t;
export type longerThan<t extends array, n extends number> = `${n}` extends keyof t ? true : false;
export type CollapsingList<t = unknown> = readonly [] | t | readonly [t, t, ...t[]];
export type headOf<t extends array> = t[0];
export type tailOf<t extends array> = t extends readonly [unknown, ...infer tail] ? tail : never;
export type lastIndexOf<t extends array> = tailOf<t>["length"];
export type lastOf<t extends array> = t[lastIndexOf<t>];
export type initOf<t extends array> = t extends readonly [...infer init, unknown] ? init : never;
export type numericStringKeyOf<t extends array> = Extract<keyof t, `${number}`>;
export type arrayIndexOf<a extends array> = keyof a extends infer k ? parseNonNegativeInteger<k & string> : never;
export type liftArray<t> = t extends array ? [
    t
] extends [anyOrNever] ? t[] : t : t[];
export declare const liftArray: <t>(data: t) => liftArray<t>;
/**
 * Splits an array into two arrays based on the result of a predicate
 *
 * @param predicate - The guard function used to determine which items to include.
 * @returns A tuple containing two arrays:
 * 				- the first includes items for which `predicate` returns true
 * 				- the second includes items for which `predicate` returns false
 *
 * @example
 * const list = [1, "2", "3", 4, 5];
 * const [numbers, strings] = spliterate(list, (x) => typeof x === "number");
 * // Type: number[]
 * // Output: [1, 4, 5]
 * console.log(evens);
 * // Type: string[]
 * // Output: ["2", "3"]
 * console.log(odds);
 */
export declare const spliterate: <item, included extends item>(arr: readonly item[], predicate: GuardablePredicate<item, included>) => [included: included[], excluded: [item] extends [included] ? item[] : Exclude<item, included>[]];
export declare const ReadonlyArray: new <T>(...args: ConstructorParameters<typeof Array<T>>) => ReadonlyArray<T>;
export declare const includes: <a extends array>(array: a, element: unknown) => element is a[number];
export declare const range: (length: number, offset?: number) => number[];
export type AppendOptions = {
    /** If true, adds the element to the beginning of the array instead of the end */
    prepend?: boolean;
};
/**
 * Adds a value or array to an array, returning the concatenated result
 */
export declare const append: <to extends unknown[] | undefined, value extends appendableValue<to>>(to: to, value: value, opts?: AppendOptions) => to & {};
export type appendableValue<to extends array | undefined> = to extends array<infer element> ? element extends array ? array<element> : listable<element> : never;
/**
 * Concatenates an element or list with a readonly list
 */
export declare const conflatenate: <element>(to: readonly element[] | undefined | null, elementOrList: appendableValue<readonly element[]> | undefined | null) => readonly element[];
/**
 * Concatenates a variadic list of elements or lists with a readonly list
 */
export declare const conflatenateAll: <element>(...elementsOrLists: (listable<element> | undefined | null)[]) => readonly element[];
export interface ComparisonOptions<t = unknown> {
    isEqual?: (l: t, r: t) => boolean;
}
/**
 * Appends a value or concatenates an array to an array if it is not already included, returning the array
 */
export declare const appendUnique: <to extends unknown[]>(to: to | undefined, value: NoInfer<Readonly<to> | to[number]>, opts?: ComparisonOptions<to[number]>) => to;
export type groupableKeyOf<o> = keyof o extends infer k ? k extends keyof o ? o[k] extends PropertyKey ? k : never : never : never;
export type groupBy<element, discriminant extends groupableKeyOf<element>> = {
    [k in element[discriminant] & PropertyKey]?: (element extends unknown ? isDisjoint<element[discriminant], k> extends true ? never : element : never)[];
} & unknown;
export declare const groupBy: <element, discriminant extends groupableKeyOf<element>>(array: readonly element[], discriminant: discriminant) => groupBy<element, discriminant>;
export declare const arrayEquals: <element>(l: array<element>, r: array<element>, opts?: ComparisonOptions<element>) => boolean;
export type validateExhaustiveKeys<keys extends readonly PropertyKey[], expectedKey extends PropertyKey> = keys extends readonly [infer head, ...infer tail extends PropertyKey[]] ? readonly [
    conform<head, expectedKey>,
    ...validateExhaustiveKeys<tail, Exclude<expectedKey, head>>
] : [expectedKey] extends [never] ? [] : [expectedKey];
export type applyElementLabels<t extends readonly unknown[], labels extends readonly unknown[]> = labels extends [unknown, ...infer labelsTail] ? t extends readonly [infer head, ...infer tail] ? readonly [
    ...labelElement<head, labels>,
    ...applyElementLabels<tail, labelsTail>
] : applyOptionalElementLabels<Required<t>, labels> : t;
type applyOptionalElementLabels<t extends readonly unknown[], labels extends readonly unknown[]> = labels extends readonly [unknown, ...infer labelsTail] ? t extends readonly [infer head, ...infer tail] ? [
    ...labelOptionalElement<head, labels>,
    ...applyOptionalElementLabels<tail, labelsTail>
] : applyRestElementLabels<t, labels> : t;
type applyRestElementLabels<t extends readonly unknown[], labels extends readonly unknown[]> = t extends readonly [] ? [] : labels extends readonly [unknown, ...infer tail] ? [
    ...labelOptionalElement<t[0], labels>,
    ...applyRestElementLabels<t, tail>
] : t;
type labelElement<element, labels extends readonly unknown[]> = labels extends readonly [unknown] ? {
    [K in keyof labels]: element;
} : labels extends readonly [...infer head, unknown] ? labelElement<element, head> : [_: element];
type labelOptionalElement<element, label extends readonly unknown[]> = label extends readonly [unknown] ? {
    [K in keyof label]?: element;
} : label extends readonly [...infer head, unknown] ? labelOptionalElement<element, head> : [_?: element];
export type setIndex<arr extends readonly unknown[], i extends number, to extends arr[number]> = arr extends arr[number][] ? _setIndex<arr, i, to, []> : Readonly<_setIndex<arr, i, to, []>>;
type _setIndex<arr extends readonly unknown[], i extends number, to extends arr[number], result extends arr[number][]> = arr extends readonly [infer head, ...infer tail] ? _setIndex<tail, i, to, [...result, result["length"] extends i ? to : head]> : result;
type zero = [];
type one = [1];
type two = [1, 1];
type three = [...two, ...two];
type four = [...three, ...three];
type five = [...four, ...four];
type six = [...five, ...five];
type seven = [...six, ...six];
type eight = [...seven, ...seven];
type nine = [...eight, ...eight];
type ten = [...nine, ...nine];
type eleven = [...ten, ...ten];
type twelve = [...eleven, ...eleven];
type thirteen = [...twelve, ...twelve];
type fourteen = [...thirteen, ...thirteen];
type exponentials = [
    fourteen,
    thirteen,
    twelve,
    eleven,
    ten,
    nine,
    eight,
    seven,
    six,
    five,
    four,
    three,
    two,
    one,
    zero
];
declare namespace exponentials {
    type max<n extends number> = _max<n, exponentials>;
    type _max<n extends number, filtered extends unknown[]> = `${n}` extends keyof filtered[0] ? _max<n, tailOf<filtered>> : filtered;
}
export {};
