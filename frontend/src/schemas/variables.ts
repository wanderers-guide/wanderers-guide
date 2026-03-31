import { z } from 'zod';

// ─── Proficiency ──────────────────────────────────────────────────────────────

export const ProficiencyTypeSchema = z.enum(['U', 'T', 'E', 'M', 'L']);
export type ProficiencyType = z.infer<typeof ProficiencyTypeSchema>;

export const ExtendedProficiencyTypeSchema = z.enum(['U', 'T', 'E', 'M', 'L', '1', '-1']);
export type ExtendedProficiencyType = z.infer<typeof ExtendedProficiencyTypeSchema>;

export const CompiledProficiencyValueSchema = z.object({
  value: ProficiencyTypeSchema,
  attribute: z.string().nullish(),
});
export type CompiledProficiencyValue = z.infer<typeof CompiledProficiencyValueSchema>;

export const ProficiencyValueSchema = z.object({
  value: ProficiencyTypeSchema,
  increases: z.number().optional(),
  attribute: z.string().optional(),
});
export type ProficiencyValue = z.infer<typeof ProficiencyValueSchema>;

export const ExtendedProficiencyValueSchema = z.object({
  value: ExtendedProficiencyTypeSchema,
  attribute: z.string().nullish(),
});
export type ExtendedProficiencyValue = z.infer<typeof ExtendedProficiencyValueSchema>;

export const AttributeValueSchema = z.object({
  value: z.number(),
  partial: z.boolean().nullish(),
});
export type AttributeValue = z.infer<typeof AttributeValueSchema>;

// ─── Store ────────────────────────────────────────────────────────────────────

// 'CHARACTER' | string collapses to string — keep as string at runtime
export const StoreIDSchema = z.string();
export type StoreID = 'CHARACTER' | string;

// ─── Variable Types ───────────────────────────────────────────────────────────

export const VariableTypeSchema = z.enum(['num', 'str', 'bool', 'prof', 'attr', 'list-str']);
export type VariableType = z.infer<typeof VariableTypeSchema>;

export const VariableValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  ProficiencyValueSchema,
  AttributeValueSchema,
  z.array(z.string()),
]);
export type VariableValue = z.infer<typeof VariableValueSchema>;

export const ExtendedVariableValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  ExtendedProficiencyValueSchema,
  AttributeValueSchema,
  z.array(z.string()),
]);
export type ExtendedVariableValue = z.infer<typeof ExtendedVariableValueSchema>;

// ─── Variable Variants ────────────────────────────────────────────────────────

export const VariableNumSchema = z.object({
  name: z.string(),
  type: z.literal('num'),
  value: z.number(),
});
export type VariableNum = z.infer<typeof VariableNumSchema>;

export const VariableStrSchema = z.object({
  name: z.string(),
  type: z.literal('str'),
  value: z.string(),
});
export type VariableStr = z.infer<typeof VariableStrSchema>;

export const VariableBoolSchema = z.object({
  name: z.string(),
  type: z.literal('bool'),
  value: z.boolean(),
});
export type VariableBool = z.infer<typeof VariableBoolSchema>;

export const VariableProfSchema = z.object({
  name: z.string(),
  type: z.literal('prof'),
  value: ProficiencyValueSchema,
});
export type VariableProf = z.infer<typeof VariableProfSchema>;

export const VariableAttrSchema = z.object({
  name: z.string(),
  type: z.literal('attr'),
  value: AttributeValueSchema,
});
export type VariableAttr = z.infer<typeof VariableAttrSchema>;

export const VariableListStrSchema = z.object({
  name: z.string(),
  type: z.literal('list-str'),
  value: z.array(z.string()),
});
export type VariableListStr = z.infer<typeof VariableListStrSchema>;

export const VariableSchema = z.discriminatedUnion('type', [
  VariableNumSchema,
  VariableStrSchema,
  VariableBoolSchema,
  VariableProfSchema,
  VariableAttrSchema,
  VariableListStrSchema,
]);
export type Variable = z.infer<typeof VariableSchema>;

// ─── Variable Store ───────────────────────────────────────────────────────────

export const VariableStoreSchema = z.object({
  variables: z.record(z.string(), VariableSchema),
  bonuses: z.record(
    z.string(),
    z.array(
      z.object({
        value: z.union([z.number(), z.string()]).nullish(),
        type: z.string().nullish(),
        text: z.string(),
        source: z.string(),
        timestamp: z.number(),
      })
    )
  ),
  history: z.record(
    z.string(),
    z.array(
      z.object({
        to: VariableValueSchema,
        from: VariableValueSchema.nullable(),
        source: z.string(),
        timestamp: z.number(),
      })
    )
  ),
});
export type VariableStore = z.infer<typeof VariableStoreSchema>;
