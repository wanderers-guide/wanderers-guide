
// import { z } from 'zod';

// // Define zod schemas for your OperationType
// const OperationType = z.enum([
//   'adjValue',
//   'setValue',
//   'createValue',
//   'giveAbilityBlock',
//   'removeAbilityBlock',
//   'conditional',
//   'select',
//   'giveSpell',
//   'removeSpell',
// ]);

// // Define zod schemas for common data fields
// const OperationBase = z.object({
//   id: z.string(),
//   type: OperationType,
//   data: z.record(z.any()),
// });

// // Define zod schemas for specific operation types
// const OperationAdjValue = OperationBase.merge(
//   z.object({
//     type: z.literal('adjValue'),
//     data: z.object({
//       variable: z.string(),
//       value: z.union([z.number(), z.string(), z.boolean()]),
//     }),
//   })
// );

// const OperationSetValue = OperationBase.merge(
//   z.object({
//     type: z.literal('setValue'),
//     data: z.object({
//       variable: z.string(),
//       value: z.union([z.number(), z.string(), z.boolean()]),
//     }),
//   })
// );

// const OperationCreateValue = OperationBase.merge(
//   z.object({
//     type: z.literal('createValue'),
//     data: z.object({
//       variable: z.string(),
//       value: z.union([z.number(), z.string(), z.boolean()]),
//     }),
//   })
// );

// const OperationGiveAbilityBlock = OperationBase.merge(
//   z.object({
//     type: z.literal('giveAbilityBlock'),
//     data: z.object({
//       type: z.unknown(), // Change this to the appropriate type (AbilityBlockType)
//       abilityBlockId: z.number(),
//     }),
//   })
// );

// const OperationRemoveAbilityBlock = OperationBase.merge(
//   z.object({
//     type: z.literal('removeAbilityBlock'),
//     data: z.object({
//       type: z.unknown(), // Change this to the appropriate type (AbilityBlockType)
//       abilityBlockId: z.number(),
//     }),
//   })
// );

// const OperationConditional = OperationBase.merge(
//   z.object({
//     type: z.literal('conditional'),
//     data: z.object({
//       condition: z.record(z.any()), // Define the condition schema
//       trueOperation: z.optional(Operation), // You can reference the Operation schema here
//       falseOperation: z.optional(Operation), // You can reference the Operation schema here
//     }),
//   })
// );

// const OperationGiveSpell = OperationBase.merge(
//   z.object({
//     type: z.literal('giveSpell'),
//     data: z.object({
//       spellId: z.number(),
//     }),
//   })
// );

// const OperationRemoveSpell = OperationBase.merge(
//   z.object({
//     type: z.literal('removeSpell'),
//     data: z.object({
//       spellId: z.number(),
//     }),
//   })
// );

// const OperationSelectOptionBase = z.object({
//   type: z.enum(['CUSTOM', 'ABILITY_BLOCK', 'SPELL', 'ATTRIBUTE', 'LANGUAGE', 'PROFICIENCY']),
// });

// const OperationSelectOptionCustom = OperationSelectOptionBase.merge(
//   z.object({
//     type: z.literal('CUSTOM'),
//     title: z.string(),
//     description: z.string(),
//     operations: z.array(Operation),
//   })
// );

// const OperationSelectOptionAbilityBlock = OperationSelectOptionBase.merge(
//   z.object({
//     type: z.literal('ABILITY_BLOCK'),
//     operation: OperationGiveAbilityBlock,
//   })
// );

// const OperationSelectOptionSpell = OperationSelectOptionBase.merge(
//   z.object({
//     type: z.literal('SPELL'),
//     operation: OperationGiveSpell,
//   })
// );

// const OperationSelectOptionAttribute = OperationSelectOptionBase.merge(
//   z.object({
//     type: z.literal('ATTRIBUTE'),
//     operation: OperationAdjValue,
//   })
// );

// const OperationSelectOptionLanguage = OperationSelectOptionBase.merge(
//   z.object({
//     type: z.literal('LANGUAGE'),
//     // Define the schema for LANGUAGE type if needed
//   })
// );

// const OperationSelectOptionProficiency = OperationSelectOptionBase.merge(
//   z.object({
//     type: z.literal('PROFICIENCY'),
//     operation: OperationAdjValue,
//   })
// );

// // Define the main Operation schema
// const Operation = z.union([
//   OperationAdjValue,
//   OperationSetValue,
//   OperationCreateValue,
//   OperationGiveAbilityBlock,
//   OperationRemoveAbilityBlock,
//   OperationConditional,
//   OperationSelect,
//   OperationGiveSpell,
//   OperationRemoveSpell,
// ]);