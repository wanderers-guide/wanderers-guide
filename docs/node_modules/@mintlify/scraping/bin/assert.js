import { z } from 'zod';
export const StringArraySchema = z.array(z.string());
export function assertIsNumber(val) {
    z.number().parse(val);
}
export function assertIsDefined(val) {
    if (val === undefined || val === null)
        throw new Error('Value is nullable.');
}
export function assertIsStringArray(val) {
    StringArraySchema.parse(val);
}
//# sourceMappingURL=assert.js.map