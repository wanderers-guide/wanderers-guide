import { z } from 'zod';
export declare const StringArraySchema: z.ZodArray<z.ZodString, "many">;
export declare function assertIsNumber(val: unknown): asserts val is number;
export declare function assertIsDefined<T>(val: T): asserts val is NonNullable<T>;
export declare function assertIsStringArray(val: unknown): asserts val is Array<string>;
