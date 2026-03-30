import { z } from 'zod';

import { AbilityBlockTypeSchema, ContentTypeSchema, RaritySchema } from './shared';
import {
  ExtendedProficiencyTypeSchema,
  ExtendedProficiencyValueSchema,
  ExtendedVariableValueSchema,
  StoreIDSchema,
  VariableSchema,
  VariableTypeSchema,
  VariableValueSchema,
} from './variables';

// ─── ObjectWithUUID ───────────────────────────────────────────────────────────
// Runtime-flexible content entity that carries selection metadata.
// .catchall(z.any()) models the [key: string]: any index signature.

export const ObjectWithUUIDSchema = z.object({
  _select_uuid: z.string(),
  _content_type: ContentTypeSchema,
  _meta_data: z.record(z.string(), z.any()).optional(),
}).catchall(z.any());
export type ObjectWithUUID = z.infer<typeof ObjectWithUUIDSchema>;

// ─── Enums ────────────────────────────────────────────────────────────────────

export const OperationTypeSchema = z.enum([
  'adjValue',
  'addBonusToValue',
  'setValue',
  'createValue',
  'bindValue',
  'giveAbilityBlock',
  'removeAbilityBlock',
  'giveLanguage',
  'removeLanguage',
  'conditional',
  'select',
  'giveSpell',
  'removeSpell',
  'giveItem',
  'giveTrait',
  'giveSpellSlot',
  'injectSelectOption',
  'injectText',
  'sendNotification',
  'defineCastingSource',
]);
export type OperationType = z.infer<typeof OperationTypeSchema>;

export const ConditionOperatorSchema = z.enum([
  '',
  'INCLUDES',
  'NOT_INCLUDES',
  'EQUALS',
  'NOT_EQUALS',
  'LESS_THAN',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUALS',
  'LESS_THAN_OR_EQUALS',
]);
export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const OperationSelectOptionTypeSchema = z.enum([
  'CUSTOM',
  'ABILITY_BLOCK',
  'SPELL',
  'LANGUAGE',
  'TRAIT',
  'ADJ_VALUE',
]);
export type OperationSelectOptionType = z.infer<typeof OperationSelectOptionTypeSchema>;

// ─── Spell Metadata ───────────────────────────────────────────────────────────

export const SpellMetadataSchema = z.object({
  type: z.enum(['NORMAL', 'FOCUS', 'INNATE']),
  castingSource: z.string().optional(),
  rank: z.number().optional(),
  tradition: z.enum(['ARCANE', 'OCCULT', 'PRIMAL', 'DIVINE']).optional(),
  casts: z.number().optional(),
});
export type SpellMetadata = z.infer<typeof SpellMetadataSchema>;

export const GiveSpellDataSchema = SpellMetadataSchema.extend({ spellId: z.number() });
export type GiveSpellData = z.infer<typeof GiveSpellDataSchema>;

// ─── Condition Check ──────────────────────────────────────────────────────────

export const ConditionCheckDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: VariableSchema.optional(),
  type: VariableTypeSchema.optional(),
  operator: ConditionOperatorSchema,
  value: z.string(),
});
export type ConditionCheckData = z.infer<typeof ConditionCheckDataSchema>;

// ─── Operation Options ────────────────────────────────────────────────────────

export const OperationOptionsSchema = z.object({
  doOnlyValueCreation: z.boolean().optional(),
  doConditionals: z.boolean().optional(),
  doOnlyConditionals: z.boolean().optional(),
  onlyConditionalsWhitelist: z.array(z.string()).optional(),
});
export type OperationOptions = z.infer<typeof OperationOptionsSchema>;

// ─── Non-recursive individual operation schemas ───────────────────────────────

export const OperationAdjValueSchema = z.object({
  id: z.string(),
  type: z.literal('adjValue'),
  data: z.object({ variable: z.string(), value: ExtendedVariableValueSchema }),
});
export type OperationAdjValue = z.infer<typeof OperationAdjValueSchema>;

export const OperationAddBonusToValueSchema = z.object({
  id: z.string(),
  type: z.literal('addBonusToValue'),
  data: z.object({
    variable: z.string(),
    value: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
    text: z.string(),
  }),
});
export type OperationAddBonusToValue = z.infer<typeof OperationAddBonusToValueSchema>;

export const OperationSetValueSchema = z.object({
  id: z.string(),
  type: z.literal('setValue'),
  data: z.object({ variable: z.string(), value: VariableValueSchema }),
});
export type OperationSetValue = z.infer<typeof OperationSetValueSchema>;

export const OperationCreateValueSchema = z.object({
  id: z.string(),
  type: z.literal('createValue'),
  data: z.object({ variable: z.string(), type: VariableTypeSchema, value: VariableValueSchema }),
});
export type OperationCreateValue = z.infer<typeof OperationCreateValueSchema>;

export const OperationBindValueSchema = z.object({
  id: z.string(),
  type: z.literal('bindValue'),
  data: z.object({
    variable: z.string(),
    value: z.object({ storeId: StoreIDSchema, variable: z.string() }),
  }),
});
export type OperationBindValue = z.infer<typeof OperationBindValueSchema>;

export const OperationGiveAbilityBlockSchema = z.object({
  id: z.string(),
  type: z.literal('giveAbilityBlock'),
  data: z.object({ type: AbilityBlockTypeSchema, abilityBlockId: z.number() }),
});
export type OperationGiveAbilityBlock = z.infer<typeof OperationGiveAbilityBlockSchema>;

export const OperationRemoveAbilityBlockSchema = z.object({
  id: z.string(),
  type: z.literal('removeAbilityBlock'),
  data: z.object({ type: AbilityBlockTypeSchema, abilityBlockId: z.number() }),
});
export type OperationRemoveAbilityBlock = z.infer<typeof OperationRemoveAbilityBlockSchema>;

export const OperationGiveLanguageSchema = z.object({
  id: z.string(),
  type: z.literal('giveLanguage'),
  data: z.object({ languageId: z.number() }),
});
export type OperationGiveLanguage = z.infer<typeof OperationGiveLanguageSchema>;

export const OperationRemoveLanguageSchema = z.object({
  id: z.string(),
  type: z.literal('removeLanguage'),
  data: z.object({ languageId: z.number() }),
});
export type OperationRemoveLanguage = z.infer<typeof OperationRemoveLanguageSchema>;

export const OperationGiveSpellSchema = z.object({
  id: z.string(),
  type: z.literal('giveSpell'),
  data: GiveSpellDataSchema,
});
export type OperationGiveSpell = z.infer<typeof OperationGiveSpellSchema>;

export const OperationRemoveSpellSchema = z.object({
  id: z.string(),
  type: z.literal('removeSpell'),
  data: z.object({ spellId: z.number() }),
});
export type OperationRemoveSpell = z.infer<typeof OperationRemoveSpellSchema>;

export const OperationGiveSpellSlotSchema = z.object({
  id: z.string(),
  type: z.literal('giveSpellSlot'),
  data: z.object({
    castingSource: z.string(),
    slots: z.array(z.object({ lvl: z.number(), rank: z.number(), amt: z.number() })),
  }),
});
export type OperationGiveSpellSlot = z.infer<typeof OperationGiveSpellSlotSchema>;

export const OperationGiveItemSchema = z.object({
  id: z.string(),
  type: z.literal('giveItem'),
  data: z.object({ itemId: z.number() }),
});
export type OperationGiveItem = z.infer<typeof OperationGiveItemSchema>;

export const OperationGiveTraitSchema = z.object({
  id: z.string(),
  type: z.literal('giveTrait'),
  data: z.object({ traitId: z.number() }),
});
export type OperationGiveTrait = z.infer<typeof OperationGiveTraitSchema>;

export const OperationInjectTextSchema = z.object({
  id: z.string(),
  type: z.literal('injectText'),
  data: z.object({
    type: z.union([ContentTypeSchema, AbilityBlockTypeSchema]),
    id: z.number(),
    text: z.string(),
  }),
});
export type OperationInjectText = z.infer<typeof OperationInjectTextSchema>;

export const OperationSendNotificationSchema = z.object({
  id: z.string(),
  type: z.literal('sendNotification'),
  data: z.object({ title: z.string(), message: z.string(), color: z.string() }),
});
export type OperationSendNotification = z.infer<typeof OperationSendNotificationSchema>;

export const OperationDefineCastingSourceSchema = z.object({
  id: z.string(),
  type: z.literal('defineCastingSource'),
  data: z.object({ variable: z.literal('CASTING_SOURCES'), value: VariableValueSchema }),
});
export type OperationDefineCastingSource = z.infer<typeof OperationDefineCastingSourceSchema>;

export const OperationInjectSelectOptionSchema = z.object({
  id: z.string(),
  type: z.literal('injectSelectOption'),
  data: z.object({ variable: z.literal('INJECT_SELECT_OPTIONS'), value: VariableValueSchema }),
});
export type OperationInjectSelectOption = z.infer<typeof OperationInjectSelectOptionSchema>;

// ─── Select Filter schemas (non-recursive — inferred) ─────────────────────────

export const OperationSelectFiltersAbilityBlockSchema = z.object({
  id: z.string(),
  type: z.literal('ABILITY_BLOCK'),
  level: z.object({ min: z.number().optional(), max: z.number().optional() }),
  traits: z.array(z.union([z.string(), z.number()])).optional(),
  abilityBlockType: AbilityBlockTypeSchema.optional(),
  isFromClass: z.boolean().optional(),
  isFromAncestry: z.boolean().optional(),
  isFromArchetype: z.boolean().optional(),
});
export type OperationSelectFiltersAbilityBlock = z.infer<typeof OperationSelectFiltersAbilityBlockSchema>;

export const OperationSelectFiltersSpellSchema = z.object({
  id: z.string(),
  type: z.literal('SPELL'),
  level: z.object({ min: z.number().optional(), max: z.number().optional() }),
  traits: z.array(z.string()).optional(),
  traditions: z.array(z.string()).optional(),
  spellData: SpellMetadataSchema.optional(),
});
export type OperationSelectFiltersSpell = z.infer<typeof OperationSelectFiltersSpellSchema>;

export const OperationSelectFiltersLanguageSchema = z.object({
  id: z.string(),
  type: z.literal('LANGUAGE'),
  rarity: RaritySchema.optional(),
  core: z.boolean().optional(),
});
export type OperationSelectFiltersLanguage = z.infer<typeof OperationSelectFiltersLanguageSchema>;

export const OperationSelectFiltersTraitSchema = z.object({
  id: z.string(),
  type: z.literal('TRAIT'),
  isAncestry: z.boolean().optional(),
  isCreature: z.boolean().optional(),
  isClass: z.boolean().optional(),
});
export type OperationSelectFiltersTrait = z.infer<typeof OperationSelectFiltersTraitSchema>;

export const OperationSelectFiltersAdjValueSchema = z.object({
  id: z.string(),
  type: z.literal('ADJ_VALUE'),
  group: z.enum(['ATTRIBUTE', 'SKILL', 'ADD-LORE', 'WEAPON-GROUP', 'WEAPON', 'ARMOR-GROUP', 'ARMOR']),
  value: z.union([VariableValueSchema, ExtendedProficiencyValueSchema]),
});
export type OperationSelectFiltersAdjValue = z.infer<typeof OperationSelectFiltersAdjValueSchema>;

export const OperationSelectFiltersSchema = z.union([
  OperationSelectFiltersAbilityBlockSchema,
  OperationSelectFiltersSpellSchema,
  OperationSelectFiltersLanguageSchema,
  OperationSelectFiltersTraitSchema,
  OperationSelectFiltersAdjValueSchema,
]);
export type OperationSelectFilters = z.infer<typeof OperationSelectFiltersSchema>;

// ─── Select Option non-recursive variants (inferred) ─────────────────────────

export const OperationSelectOptionAbilityBlockSchema = z.object({
  id: z.string(),
  type: z.literal('ABILITY_BLOCK'),
  operation: OperationGiveAbilityBlockSchema,
});
export type OperationSelectOptionAbilityBlock = z.infer<typeof OperationSelectOptionAbilityBlockSchema>;

export const OperationSelectOptionSpellSchema = z.object({
  id: z.string(),
  type: z.literal('SPELL'),
  operation: OperationGiveSpellSchema,
});
export type OperationSelectOptionSpell = z.infer<typeof OperationSelectOptionSpellSchema>;

export const OperationSelectOptionLanguageSchema = z.object({
  id: z.string(),
  type: z.literal('LANGUAGE'),
  operation: OperationGiveLanguageSchema,
});
export type OperationSelectOptionLanguage = z.infer<typeof OperationSelectOptionLanguageSchema>;

export const OperationSelectOptionAdjValueSchema = z.object({
  id: z.string(),
  type: z.literal('ADJ_VALUE'),
  operation: OperationAdjValueSchema,
});
export type OperationSelectOptionAdjValue = z.infer<typeof OperationSelectOptionAdjValueSchema>;

// ─── Recursive types — must be declared manually for z.lazy() ────────────────
// Zod cannot infer types that reference themselves. The explicit `type` declarations
// below are the source of truth; the schemas below are annotated with ZodType<T>.

export type OperationSelectOptionCustom = {
  id: string;
  type: 'CUSTOM';
  title: string;
  description: string;
  operations?: Operation[];
};

export type OperationSelectOption =
  | OperationSelectOptionCustom
  | OperationSelectOptionAbilityBlock
  | OperationSelectOptionSpell
  | OperationSelectOptionLanguage
  | OperationSelectOptionAdjValue;

export type OperationConditional = {
  id: string;
  type: 'conditional';
  data: {
    conditions: ConditionCheckData[];
    trueOperations?: Operation[];
    falseOperations?: Operation[];
  };
};

export type OperationSelect = {
  id: string;
  type: 'select';
  data: {
    title?: string;
    description?: string;
    modeType: 'PREDEFINED' | 'FILTERED';
    optionType: OperationSelectOptionType;
    optionsPredefined?: OperationSelectOption[];
    optionsFilters?: OperationSelectFilters;
  };
};

export type Operation =
  | OperationAdjValue
  | OperationAddBonusToValue
  | OperationSetValue
  | OperationCreateValue
  | OperationBindValue
  | OperationGiveAbilityBlock
  | OperationRemoveAbilityBlock
  | OperationConditional
  | OperationSelect
  | OperationGiveLanguage
  | OperationRemoveLanguage
  | OperationGiveSpell
  | OperationRemoveSpell
  | OperationGiveSpellSlot
  | OperationGiveItem
  | OperationGiveTrait
  | OperationInjectSelectOption
  | OperationInjectText
  | OperationSendNotification
  | OperationDefineCastingSource;

export type OperationResult = {
  selection?: {
    id: string;
    title?: string;
    description?: string;
    options: ObjectWithUUID[];
    skillAdjustment?: z.infer<typeof ExtendedProficiencyTypeSchema>;
  };
  result?: {
    source?: ObjectWithUUID;
    results: OperationResult[];
  };
} | null;

// ─── Schemas for recursive types (annotated with ZodType<T>) ─────────────────

export const OperationSchema: z.ZodType<Operation> = z.lazy(() =>
  z.union([
    OperationAdjValueSchema,
    OperationAddBonusToValueSchema,
    OperationSetValueSchema,
    OperationCreateValueSchema,
    OperationBindValueSchema,
    OperationGiveAbilityBlockSchema,
    OperationRemoveAbilityBlockSchema,
    z.object({
      id: z.string(),
      type: z.literal('conditional'),
      data: z.object({
        conditions: z.array(ConditionCheckDataSchema),
        trueOperations: z.array(z.lazy(() => OperationSchema)).optional(),
        falseOperations: z.array(z.lazy(() => OperationSchema)).optional(),
      }),
    }),
    z.object({
      id: z.string(),
      type: z.literal('select'),
      data: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        modeType: z.enum(['PREDEFINED', 'FILTERED']),
        optionType: OperationSelectOptionTypeSchema,
        optionsPredefined: z
          .array(
            z.union([
              z.object({
                id: z.string(),
                type: z.literal('CUSTOM'),
                title: z.string(),
                description: z.string(),
                operations: z.array(z.lazy(() => OperationSchema)).optional(),
              }),
              OperationSelectOptionAbilityBlockSchema,
              OperationSelectOptionSpellSchema,
              OperationSelectOptionLanguageSchema,
              OperationSelectOptionAdjValueSchema,
            ])
          )
          .optional(),
        optionsFilters: OperationSelectFiltersSchema.optional(),
      }),
    }),
    OperationGiveLanguageSchema,
    OperationRemoveLanguageSchema,
    OperationGiveSpellSchema,
    OperationRemoveSpellSchema,
    OperationGiveSpellSlotSchema,
    OperationGiveItemSchema,
    OperationGiveTraitSchema,
    OperationInjectSelectOptionSchema,
    OperationInjectTextSchema,
    OperationSendNotificationSchema,
    OperationDefineCastingSourceSchema,
  ])
);

export const OperationSelectOptionCustomSchema: z.ZodType<OperationSelectOptionCustom> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.literal('CUSTOM'),
    title: z.string(),
    description: z.string(),
    operations: z.array(OperationSchema).optional(),
  })
);

export const OperationSelectOptionSchema: z.ZodType<OperationSelectOption> = z.union([
  OperationSelectOptionCustomSchema,
  OperationSelectOptionAbilityBlockSchema,
  OperationSelectOptionSpellSchema,
  OperationSelectOptionLanguageSchema,
  OperationSelectOptionAdjValueSchema,
]);

export const OperationResultSchema: z.ZodType<OperationResult> = z.lazy(() =>
  z
    .object({
      selection: z
        .object({
          id: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          options: z.array(ObjectWithUUIDSchema),
          skillAdjustment: ExtendedProficiencyTypeSchema.optional(),
        })
        .optional(),
      result: z
        .object({
          source: ObjectWithUUIDSchema.optional(),
          results: z.array(z.lazy(() => OperationResultSchema)),
        })
        .optional(),
    })
    .nullable()
);

// ─── InjectedSelectOption ─────────────────────────────────────────────────────

export const InjectedSelectOptionSchema = z.object({
  opId: z.string(),
  option: OperationSelectOptionCustomSchema,
});
export type InjectedSelectOption = z.infer<typeof InjectedSelectOptionSchema>;
