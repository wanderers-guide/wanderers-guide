import type { BaseRoot } from "@ark/schema";
import type { BigintLiteral, ErrorMessage, NumberLiteral, Scanner, trim } from "@ark/util";
import type { DateLiteral } from "../../../attributes.ts";
import type { RootedRuntimeState } from "../../reduce/dynamic.ts";
import type { EnclosingLiteralStartToken, EnclosingLiteralTokens, StringLiteral } from "../operand/enclosed.ts";
type UnitLiteralKeyword = "null" | "undefined" | "true" | "false";
export type UnitLiteral = UnenclosedUnitLiteral | EnclosedUnitLiteral;
export type UnenclosedUnitLiteral = BigintLiteral | NumberLiteral | UnitLiteralKeyword;
export type EnclosedUnitLiteral = StringLiteral | DateLiteral;
export type ParsedDefaultableProperty = readonly [BaseRoot, "=", unknown];
export declare const parseDefault: (s: RootedRuntimeState) => ParsedDefaultableProperty;
export type parseDefault<root, unscanned extends string> = trim<unscanned> extends infer defaultExpression extends string ? defaultExpression extends UnenclosedUnitLiteral ? [
    root,
    "=",
    defaultExpression
] : defaultExpression extends (`${infer start extends EnclosingLiteralStartToken}${string}`) ? defaultExpression extends `${start}${infer nextUnscanned}` ? isValidEnclosedLiteral<start, nextUnscanned> extends true ? [
    root,
    "=",
    defaultExpression
] : ErrorMessage<writeNonLiteralDefaultMessage<defaultExpression>> : never : ErrorMessage<writeNonLiteralDefaultMessage<defaultExpression>> : never;
export type isValidEnclosedLiteral<start extends EnclosingLiteralStartToken, unscanned extends string> = Scanner.shiftUntilEscapable<unscanned, EnclosingLiteralTokens[start], ""> extends Scanner.shiftResult<string, infer nextUnscanned> ? nextUnscanned extends EnclosingLiteralTokens[start] ? true : false : false;
export declare const writeNonLiteralDefaultMessage: <defaultDef extends string>(defaultDef: defaultDef) => writeNonLiteralDefaultMessage<defaultDef>;
export type writeNonLiteralDefaultMessage<defaultDef extends string> = `Default value '${defaultDef}' must be a literal value`;
export {};
