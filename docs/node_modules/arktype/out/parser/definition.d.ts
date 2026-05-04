import { type BaseParseContext, type BaseRoot } from "@ark/schema";
import { type anyOrNever, type array, type ErrorMessage, type Fn, type ifEmptyObjectLiteral, type objectKindOrDomainOf, type Primitive } from "@ark/util";
import type { type } from "../keywords/keywords.ts";
import type { InnerParseResult } from "../scope.ts";
import type { shallowDefaultableMessage, shallowOptionalMessage, validateString } from "./ast/validate.ts";
import { type inferObjectLiteral, type validateObjectLiteral } from "./objectLiteral.ts";
import type { isDefaultable, OptionalPropertyDefinition } from "./property.ts";
import { type BaseCompletions, type inferString } from "./string.ts";
import { type inferTupleExpression, type maybeValidateTupleExpression, type TupleExpression } from "./tupleExpressions.ts";
import { type inferTupleLiteral, type validateTupleLiteral } from "./tupleLiteral.ts";
export declare const parseInnerDefinition: (def: unknown, ctx: BaseParseContext) => InnerParseResult;
export declare const parseObject: (def: object, ctx: BaseParseContext) => BaseRoot;
export type inferDefinition<def, $, args> = [
    def
] extends [anyOrNever] ? def : def extends type.cast<infer t> ? ifEmptyObjectLiteral<def, object, t> : def extends ThunkCast<infer t> ? t : def extends string ? inferString<def, $, args> : def extends array ? inferTuple<def, $, args> : def extends RegExp ? string : def extends object ? inferObjectLiteral<def, $, args> : never;
export type validateDefinition<def, $, args> = null extends undefined ? ErrorMessage<`'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'`> : [def] extends [anyOrNever] ? def : def extends OptionalPropertyDefinition ? ErrorMessage<shallowOptionalMessage> : isDefaultable<def, $, args> extends true ? ErrorMessage<shallowDefaultableMessage> : validateInnerDefinition<def, $, args>;
export type validateInnerDefinition<def, $, args> = [
    def
] extends [Terminal] ? def : def extends string ? validateString<def, $, args> : unknown extends def ? BaseCompletions<$, args> | {} : def extends readonly unknown[] ? validateTuple<def, $, args> : def extends BadDefinitionType ? ErrorMessage<writeBadDefinitionTypeMessage<objectKindOrDomainOf<def>>> : validateObjectLiteral<def, $, args>;
export declare const parseTuple: (def: array, ctx: BaseParseContext) => BaseRoot;
export type validateTuple<def extends array, $, args> = maybeValidateTupleExpression<def, $, args> extends infer result ? result extends null ? validateTupleLiteral<def, $, args> : result : never;
export type inferTuple<def extends array, $, args> = def extends TupleExpression ? inferTupleExpression<def, $, args> : inferTupleLiteral<def, $, args>;
type Terminal = type.cast<unknown> | Fn | RegExp;
export type ThunkCast<t = unknown> = () => type.cast<t>;
type BadDefinitionType = Exclude<Primitive, string>;
export declare const writeBadDefinitionTypeMessage: <actual extends string>(actual: actual) => writeBadDefinitionTypeMessage<actual>;
type writeBadDefinitionTypeMessage<actual extends string> = `Type definitions must be strings or objects (was ${actual})`;
export {};
