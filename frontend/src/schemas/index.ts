import { z } from 'zod';
import { ContentTypeSchema, AbilityBlockTypeSchema, ActionCostSchema } from './shared';
import { OperationSchema } from './operations';

// ─── ImageOption ──────────────────────────────────────────────────────────────

export const ImageOptionSchema = z.object({
  name: z.string().optional(),
  url: z.string(),
  source: z.string().optional(),
  source_url: z.string().optional(),
});
export type ImageOption = z.infer<typeof ImageOptionSchema>;

// ─── DrawerType ───────────────────────────────────────────────────────────────

export const DrawerTypeSchema = z.union([
  ContentTypeSchema,
  AbilityBlockTypeSchema,
  z.enum([
    'generic',
    'condition',
    'character',
    'manage-coins',
    'inv-item',
    'cast-spell',
    'add-spell',
    'stat-prof',
    'stat-attr',
    'stat-hp',
    'stat-ac',
    'stat-weapon',
    'stat-speed',
    'stat-perception',
    'stat-resist-weak',
  ]),
]);
export type DrawerType = z.infer<typeof DrawerTypeSchema>;

// ─── GenericData ──────────────────────────────────────────────────────────────

export const GenericDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  operations: z.array(OperationSchema).optional(),
  showOperations: z.boolean().optional(),
  onSelect: z.function().optional(),
});
export type GenericData = z.infer<typeof GenericDataSchema>;

// ─── UploadResult ─────────────────────────────────────────────────────────────

export const UploadResultSchema = z.object({
  success: z.boolean(),
  id: z.number().optional(),
});
export type UploadResult = z.infer<typeof UploadResultSchema>;

// ─── GranularCreature ─────────────────────────────────────────────────────────
// Transfer object for AI-generated / imported creature stat blocks.

const SpellEntrySchema = z.object({
  name: z.string(),
  rank: z.number(),
  notes: z.string().optional(),
});

const CastsPerDaySchema = z.union([z.literal('AT-WILL'), z.literal('CONSTANT'), z.number()]);

const TraditionSchema = z.enum(['ARCANE', 'DIVINE', 'PRIMAL', 'OCCULT']);

export const GranularCreatureSchema = z.object({
  name: z.string().optional(),
  level: z.number().optional(),
  imageUrl: z.string().optional(),
  size: z.string(),
  rarity: z.string(),
  traits: z.array(z.string()).optional(),
  perception: z.object({
    value: z.number(),
    senses: z
      .array(
        z.object({
          name: z.string(),
          range: z.number().optional(),
          acuity: z.enum(['precise', 'imprecise', 'vague']).optional(),
        })
      )
      .optional(),
    notes: z.string().optional(),
  }),
  languages: z
    .object({
      value: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  skills: z.array(z.object({ name: z.string(), bonus: z.number() })).optional(),
  attributes: z.array(z.object({ name: z.string(), value: z.number() })),
  items: z.array(z.object({ name: z.string(), quantity: z.number(), notes: z.string().optional() })).optional(),
  speeds: z.array(z.object({ name: z.string(), value: z.number(), notes: z.string().optional() })),
  resistances: z
    .array(
      z.object({
        type: z.string(),
        value: z.number(),
        doubleAgainst: z.array(z.string()).optional(),
        exceptions: z.array(z.string()).optional(),
      })
    )
    .optional(),
  weaknesses: z
    .array(
      z.object({
        type: z.string(),
        value: z.number(),
        doubleAgainst: z.array(z.string()).optional(),
        exceptions: z.array(z.string()).optional(),
      })
    )
    .optional(),
  immunities: z.array(z.object({ type: z.string(), exceptions: z.array(z.string()).optional() })).optional(),
  ac: z.object({ value: z.number(), notes: z.string().optional() }),
  saves: z.object({
    fort: z.object({ value: z.number(), notes: z.string().optional() }),
    ref: z.object({ value: z.number(), notes: z.string().optional() }),
    will: z.object({ value: z.number(), notes: z.string().optional() }),
    generalNotes: z.string().optional(),
  }),
  hp: z.object({ value: z.number(), notes: z.string().optional() }),
  abilities: z
    .array(
      z.object({
        name: z.string(),
        action: ActionCostSchema.nullish(),
        traits: z.array(z.string()).nullish(),
        description: z.string(),
        frequency: z.string().nullish(),
        trigger: z.string().nullish(),
        requirements: z.string().nullish(),
        special: z.string().nullish(),
      })
    )
    .optional(),
  attacks: z
    .array(
      z.object({
        attackType: z.enum(['melee', 'ranged']),
        action: z.literal('ONE-ACTION'),
        name: z.string(),
        attackBonus: z.object({
          attack1st: z.number(),
          attack2nd: z.number().optional(),
          attack3rd: z.number().optional(),
        }),
        traits: z.array(z.string()).optional(),
        damage: z.object({
          amountOfDice: z.number(),
          dieType: z.enum(['d4', 'd6', 'd8', 'd10', 'd12']),
          damageBonus: z.number().optional(),
          damageType: z.string(),
          extraEffects: z.array(z.string()).optional(),
        }),
        misc: z.object({ range: z.number().optional(), reload: z.number().optional() }).optional(),
      })
    )
    .optional(),
  spellcasting: z
    .object({
      innate: z
        .object({
          tradition: TraditionSchema,
          dc: z.number().optional(),
          attackBonus: z.number().optional(),
          spells: z.array(
            SpellEntrySchema.extend({
              castsPerDay: CastsPerDaySchema.optional(),
            })
          ),
          cantripsHeighteningRank: z.number(),
        })
        .optional(),
      focus: z
        .object({
          type: z.string(),
          dc: z.number().optional(),
          attackBonus: z.number().optional(),
          focusPoints: z.number(),
          spells: z.array(SpellEntrySchema),
          cantripsHeighteningRank: z.number(),
        })
        .optional(),
      spontaneous: z
        .object({
          tradition: TraditionSchema,
          dc: z.number().optional(),
          attackBonus: z.number().optional(),
          slots: z.array(z.object({ rank: z.number(), amount: z.number() })),
          spells: z.array(SpellEntrySchema),
          cantripsHeighteningRank: z.number(),
        })
        .optional(),
      prepared: z
        .object({
          tradition: TraditionSchema,
          dc: z.number().optional(),
          attackBonus: z.number().optional(),
          spells: z.array(SpellEntrySchema.extend({ amount: z.number() })),
          cantripsHeighteningRank: z.number(),
        })
        .optional(),
      rituals: z
        .object({
          dc: z.number().optional(),
          attackBonus: z.number().optional(),
          spells: z.array(SpellEntrySchema),
        })
        .optional(),
    })
    .optional(),
  description: z.string().optional(),
});
export type GranularCreature = z.infer<typeof GranularCreatureSchema>;
