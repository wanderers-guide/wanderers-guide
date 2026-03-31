import { z } from 'zod';
import { ProficiencyTypeSchema, VariableStoreSchema } from './variables';
import {
  SourceKeySchema,
  SourceValueSchema,
  AvailabilitySchema,
  RaritySchema,
  SizeSchema,
  ActionCostSchema,
  AbilityBlockTypeSchema,
  ContentTypeSchema,
  ItemGroupSchema,
  ItemMetaCategorySchema,
  ItemMetaGroupSchema,
} from './shared';
import { OperationSchema, OperationResultSchema } from './operations';
import type { Operation } from './operations';

// Re-export all shared primitives so @schemas/content and @schemas/content consumers
// continue to resolve these types without change.
export {
  SourceKeySchema,
  SourceValueSchema,
  AvailabilitySchema,
  RaritySchema,
  SizeSchema,
  ActionCostSchema,
  AbilityBlockTypeSchema,
  ContentTypeSchema,
  SpellSectionTypeSchema,
  ItemGroupSchema,
  ItemMetaCategorySchema,
  ItemMetaCategoryWeaponSchema,
  ItemMetaCategoryArmorSchema,
  ItemMetaGroupSchema,
  ItemMetaGroupWeaponSchema,
  ItemMetaGroupArmorSchema,
} from './shared';
export type {
  SourceKey,
  SourceValue,
  Availability,
  Rarity,
  Size,
  ActionCost,
  AbilityBlockType,
  ContentType,
  SpellSectionType,
  ItemGroup,
  ItemMetaCategory,
  ItemMetaCategoryWeapon,
  ItemMetaCategoryArmor,
  ItemMetaGroup,
  ItemMetaGroupWeapon,
  ItemMetaGroupArmor,
} from './shared';

// ─── Trait ────────────────────────────────────────────────────────────────────

export const TraitSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  description: z.string(),
  meta_data: z
    .object({
      deprecated: z.boolean().optional(),
      important: z.boolean().optional(),
      creature_trait: z.boolean().optional(),
      unselectable: z.boolean().optional(),
      class_trait: z.boolean().optional(),
      ancestry_trait: z.boolean().optional(),
      archetype_trait: z.boolean().optional(),
      versatile_heritage_trait: z.boolean().optional(),
      companion_type_trait: z.boolean().optional(),
    })
    .nullable(),
  content_source_id: z.number(),
});
export type Trait = z.infer<typeof TraitSchema>;

// ─── Condition ────────────────────────────────────────────────────────────────

export const ConditionSchema = z.object({
  name: z.string(),
  description: z.string(),
  value: z.number().optional(),
  source: z.string().optional(),
  for_object: z.boolean(),
  for_creature: z.boolean(),
  pathfinder_only: z.boolean().optional(),
  starfinder_only: z.boolean().optional(),
});
export type Condition = z.infer<typeof ConditionSchema>;

// ─── Spell Slots ──────────────────────────────────────────────────────────────

export const SpellSlotSchema = z.object({
  rank: z.number(),
  source: z.string(),
  spell_id: z.number().optional(),
  exhausted: z.boolean().optional(),
  color: z.string().optional(),
});
export type SpellSlot = z.infer<typeof SpellSlotSchema>;

export const SpellSlotRecordSchema = SpellSlotSchema.extend({ id: z.string() });
export type SpellSlotRecord = z.infer<typeof SpellSlotRecordSchema>;

export const SpellListEntrySchema = z.object({
  spell_id: z.number(),
  rank: z.number(),
  source: z.string(),
});
export type SpellListEntry = z.infer<typeof SpellListEntrySchema>;

export const SpellInnateEntrySchema = z.object({
  spell_id: z.number(),
  rank: z.number(),
  tradition: z.string(),
  casts_max: z.number(),
  casts_current: z.number(),
});
export type SpellInnateEntry = z.infer<typeof SpellInnateEntrySchema>;

export const CastingSourceSchema = z.object({
  name: z.string(),
  type: z.string(),
  tradition: z.string(),
  attribute: z.string(),
});
export type CastingSource = z.infer<typeof CastingSourceSchema>;

// ─── Item (self-referential) ──────────────────────────────────────────────────

export interface Item {
  id: number;
  created_at: string;
  name: string;
  price: { cp?: number | string; sp?: number | string; gp?: number | string; pp?: number | string } | null;
  bulk: string | null;
  level: number;
  rarity: z.infer<typeof RaritySchema>;
  availability?: z.infer<typeof AvailabilitySchema> | null;
  traits: number[] | null;
  description: string;
  group: z.infer<typeof ItemGroupSchema>;
  hands: string | null;
  size: z.infer<typeof SizeSchema>;
  craft_requirements: string | null;
  usage: string | null;
  meta_data: {
    deprecated?: boolean;
    image_url?: string;
    base_item?: string | null;
    base_item_content?: Item;
    category?: z.infer<typeof ItemMetaCategorySchema> | '';
    group?: z.infer<typeof ItemMetaGroupSchema> | '';
    damage?: { damageType?: string; dice?: number | string; die?: string | null; extra?: string } | null;
    attack_bonus?: number;
    ac_bonus?: number;
    check_penalty?: number | string;
    speed_penalty?: number | string;
    dex_cap?: number;
    strength?: number | null;
    bulk: { capacity?: number | string; held_or_stowed?: number | string; ignored?: number | string };
    charges?: { current?: number; max?: number };
    container_default_items?: { id: number; name: string; quantity: number }[];
    hardness?: number | string;
    hp?: number | string;
    hp_max?: number | string;
    broken_threshold?: number | string;
    is_shoddy?: boolean;
    unselectable?: boolean;
    quantity?: number;
    material?: { grade?: string | null; type?: string | null };
    range?: number | string | null;
    reload?: string | null;
    runes?: {
      striking?: number;
      resilient?: number;
      potency?: number;
      property?: { name: string; id: number; rune?: Item }[];
    };
    starfinder?: {
      capacity?: string;
      usage?: number;
      grade?: 'COMMERCIAL' | 'TACTICAL' | 'ADVANCED' | 'SUPERIOR' | 'ELITE' | 'ULTIMATE' | 'PARAGON' | null;
      slots?: { name: string; id: number; upgrade?: Item }[];
    };
    foundry?: {
      rules?: Record<string, any> | any[];
      tags?: Record<string, any>;
      bonus?: number;
      bonus_damage?: number;
      container_id?: string | null;
      splash_damage?: number;
      stack_group?: string;
      items?: Record<string, any>[];
    };
  } | null;
  operations: Operation[] | null;
  content_source_id: number;
  version: string;
}

export const ItemSchema: z.ZodType<Item> = z.lazy(() =>
  z.object({
    id: z.number(),
    created_at: z.string(),
    name: z.string(),
    price: z
      .object({
        cp: z.union([z.number(), z.string()]).optional(),
        sp: z.union([z.number(), z.string()]).optional(),
        gp: z.union([z.number(), z.string()]).optional(),
        pp: z.union([z.number(), z.string()]).optional(),
      })
      .nullable(),
    bulk: z.string().nullable(),
    level: z.number(),
    rarity: RaritySchema,
    availability: AvailabilitySchema.nullable().optional(),
    traits: z.array(z.number()).nullable(),
    description: z.string(),
    group: ItemGroupSchema,
    hands: z.string().nullable(),
    size: SizeSchema,
    craft_requirements: z.string().nullable(),
    usage: z.string().nullable(),
    meta_data: z
      .object({
        deprecated: z.boolean().optional(),
        image_url: z.string().optional(),
        base_item: z.string().nullable().optional(),
        base_item_content: z.lazy(() => ItemSchema).optional(),
        category: ItemMetaCategorySchema.optional().or(z.literal('')),
        group: ItemMetaGroupSchema.optional().or(z.literal('')),
        damage: z
          .object({
            damageType: z.string().optional(),
            dice: z.union([z.number(), z.string()]).optional(),
            die: z.string().nullable().optional(),
            extra: z.string().optional(),
          })
          .nullable()
          .optional(),
        attack_bonus: z.number().optional(),
        ac_bonus: z.number().optional(),
        check_penalty: z.union([z.number(), z.string()]).optional(),
        speed_penalty: z.union([z.number(), z.string()]).optional(),
        dex_cap: z.number().optional(),
        strength: z.number().nullable().optional(),
        bulk: z.object({
          capacity: z.union([z.number(), z.string()]).optional(),
          held_or_stowed: z.union([z.number(), z.string()]).optional(),
          ignored: z.union([z.number(), z.string()]).optional(),
        }),
        charges: z
          .object({
            current: z.number().optional(),
            max: z.number().optional(),
          })
          .optional(),
        container_default_items: z
          .array(z.object({ id: z.number(), name: z.string(), quantity: z.number() }))
          .optional(),
        hardness: z.union([z.number(), z.string()]).optional(),
        hp: z.union([z.number(), z.string()]).optional(),
        hp_max: z.union([z.number(), z.string()]).optional(),
        broken_threshold: z.union([z.number(), z.string()]).optional(),
        is_shoddy: z.boolean().optional(),
        unselectable: z.boolean().optional(),
        quantity: z.number().optional(),
        material: z
          .object({ grade: z.string().nullable().optional(), type: z.string().nullable().optional() })
          .optional(),
        range: z.union([z.number(), z.string()]).nullable().optional(),
        reload: z.string().nullable().optional(),
        runes: z
          .object({
            striking: z.number().optional(),
            resilient: z.number().optional(),
            potency: z.number().optional(),
            property: z
              .array(
                z.object({
                  name: z.string(),
                  id: z.number(),
                  rune: z.lazy(() => ItemSchema).optional(),
                })
              )
              .optional(),
          })
          .optional(),
        starfinder: z
          .object({
            capacity: z.string().optional(),
            usage: z.number().optional(),
            grade: z
              .enum(['COMMERCIAL', 'TACTICAL', 'ADVANCED', 'SUPERIOR', 'ELITE', 'ULTIMATE', 'PARAGON'])
              .optional()
              .nullable(),
            slots: z
              .array(
                z.object({
                  name: z.string(),
                  id: z.number(),
                  upgrade: z.lazy(() => ItemSchema).optional(),
                })
              )
              .optional(),
          })
          .optional(),
        foundry: z
          .object({
            rules: z.union([z.record(z.string(), z.any()), z.array(z.any())]).optional(),
            tags: z.record(z.string(), z.any()).optional(),
            bonus: z.number().optional(),
            bonus_damage: z.number().optional(),
            container_id: z.string().nullable().optional(),
            splash_damage: z.number().optional(),
            stack_group: z.string().optional(),
            items: z.array(z.record(z.string(), z.any())).optional(),
          })
          .optional(),
      })
      .nullable(),
    operations: z.array(OperationSchema).nullable(),
    content_source_id: z.number(),
    version: z.string(),
  })
);

// ─── Inventory (self-referential) ─────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  item: Item;
  is_formula: boolean;
  is_equipped: boolean;
  is_invested: boolean;
  is_implanted: boolean;
  container_contents: InventoryItem[];
}

export const InventoryItemSchema: z.ZodType<InventoryItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    item: ItemSchema,
    is_formula: z.boolean(),
    is_equipped: z.boolean(),
    is_invested: z.boolean(),
    is_implanted: z.boolean(),
    container_contents: z.array(z.lazy(() => InventoryItemSchema)),
  })
);

export const InventorySchema = z.object({
  coins: z.object({
    cp: z.number(),
    sp: z.number(),
    gp: z.number(),
    pp: z.number(),
  }),
  items: z.array(InventoryItemSchema),
});
export type Inventory = z.infer<typeof InventorySchema>;

// ─── Spell ────────────────────────────────────────────────────────────────────

export const SpellSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  rank: z.number(),
  traditions: z.array(z.string()),
  rarity: RaritySchema,
  availability: AvailabilitySchema.nullable(),
  cast: z.union([ActionCostSchema, z.string()]),
  traits: z.array(z.number()).nullable(),
  defense: z.string().nullable(),
  cost: z.string().nullable(),
  trigger: z.string().nullable(),
  requirements: z.string().nullable(),
  range: z.string().nullable(),
  area: z.string().nullable(),
  targets: z.string().nullable(),
  duration: z.string().nullable(),
  description: z.string(),
  heightened: z
    .object({
      text: z.array(z.object({ amount: z.string(), text: z.string() })).optional(),
      // Foundry system.heightening — opaque passthrough, shape varies by type ('interval' / 'fixed')
      data: z.record(z.string(), z.any()).optional(),
    })
    .nullable(),
  meta_data: z.object({
    focus: z.boolean().optional(),
    damage: z.array(z.object({})).optional(),
    type: z.string().optional(),
    ritual: z.record(z.string(), z.any()).or(z.boolean()).optional(),
    foundry: z.record(z.string(), z.any()).optional(),
    unselectable: z.boolean().optional(),
    deprecated: z.boolean().optional(),
    image_url: z.string().optional(),
  }),
  content_source_id: z.number(),
  version: z.string(),
});
export type Spell = z.infer<typeof SpellSchema>;

// ─── AbilityBlock ─────────────────────────────────────────────────────────────

export const AbilityBlockSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  operations: z.array(OperationSchema).nullable(),
  name: z.string(),
  actions: ActionCostSchema,
  level: z.number().nullable(),
  rarity: RaritySchema,
  availability: AvailabilitySchema.nullable().optional(),
  prerequisites: z.array(z.string()).nullable(),
  frequency: z.string().nullable(),
  cost: z.string().nullable(),
  trigger: z.string().nullable(),
  requirements: z.string().nullable(),
  access: z.string().nullable(),
  description: z.string(),
  special: z.string().nullable(),
  type: AbilityBlockTypeSchema,
  meta_data: z
    .object({
      unselectable: z.boolean().optional(),
      deprecated: z.boolean().optional(),
      can_select_multiple_times: z.boolean().optional(),
      skill: z.union([z.string(), z.array(z.string())]).optional(),
      image_url: z.string().optional(),
      foundry: z.record(z.string(), z.any()).optional(),
    })
    .nullable(),
  traits: z.array(z.number()).nullable(),
  content_source_id: z.number(),
  version: z.string().nullable(),
});
export type AbilityBlock = z.infer<typeof AbilityBlockSchema>;

// ─── Class ────────────────────────────────────────────────────────────────────

export const ClassSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  rarity: RaritySchema,
  description: z.string(),
  operations: z.array(OperationSchema).nullable(),
  skill_training_base: z.number(),
  trait_id: z.number(),
  artwork_url: z.string().nullable(),
  deprecated: z.boolean().nullable(),
  content_source_id: z.number(),
  version: z.string(),
});
export type Class = z.infer<typeof ClassSchema>;

// ─── ClassArchetype ───────────────────────────────────────────────────────────

export const ClassArchetypeSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  class_id: z.number(),
  archetype_id: z.number().nullable(),
  name: z.string(),
  rarity: RaritySchema,
  description: z.string(),
  artwork_url: z.string().nullable(),
  operations: z.array(OperationSchema).nullable(),
  feature_adjustments: z
    .array(
      z.object({
        fa_id: z.string(),
        type: z.enum(['ADD', 'REPLACE', 'REMOVE']),
        prev_id: z.number().optional(),
        data: AbilityBlockSchema.optional(),
      })
    )
    .nullable(),
  override_skill_training_base: z.number().nullable(),
  override_class_operations: z.boolean().nullable(),
  content_source_id: z.number(),
  deprecated: z.boolean().nullable(),
  version: z.string(),
});
export type ClassArchetype = z.infer<typeof ClassArchetypeSchema>;

// ─── Archetype ────────────────────────────────────────────────────────────────

export const ArchetypeSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  rarity: RaritySchema,
  description: z.string(),
  trait_id: z.number(),
  artwork_url: z.string().nullable(),
  content_source_id: z.number(),
  deprecated: z.boolean().nullable(),
  version: z.string(),
  dedication_feat_id: z.number().nullable(),
});
export type Archetype = z.infer<typeof ArchetypeSchema>;

// ─── VersatileHeritage ────────────────────────────────────────────────────────

export const VersatileHeritageSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  rarity: RaritySchema,
  description: z.string(),
  trait_id: z.number(),
  artwork_url: z.string().nullable(),
  content_source_id: z.number(),
  deprecated: z.boolean().nullable(),
  version: z.string(),
  heritage_id: z.number(),
});
export type VersatileHeritage = z.infer<typeof VersatileHeritageSchema>;

// ─── Ancestry ─────────────────────────────────────────────────────────────────

export const AncestrySchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  rarity: RaritySchema,
  description: z.string(),
  trait_id: z.number(),
  artwork_url: z.string().nullable(),
  content_source_id: z.number(),
  deprecated: z.boolean().nullable(),
  version: z.string(),
  operations: z.array(OperationSchema).nullable(),
});
export type Ancestry = z.infer<typeof AncestrySchema>;

// ─── Background ───────────────────────────────────────────────────────────────

export const BackgroundSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  rarity: RaritySchema,
  description: z.string(),
  artwork_url: z.string().nullable(),
  operations: z.array(OperationSchema).nullable(),
  deprecated: z.boolean().nullable(),
  content_source_id: z.number(),
  version: z.string(),
});
export type Background = z.infer<typeof BackgroundSchema>;

// ─── Language ─────────────────────────────────────────────────────────────────

export const LanguageSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  speakers: z.string().nullable(),
  script: z.string().nullable(),
  description: z.string(),
  content_source_id: z.number(),
  deprecated: z.boolean().nullable(),
  rarity: RaritySchema,
  availability: AvailabilitySchema.nullable(),
});
export type Language = z.infer<typeof LanguageSchema>;

// ─── Dice ─────────────────────────────────────────────────────────────────────

export const DiceSchema = z.object({
  id: z.string(),
  type: z.string(),
  theme: z.string(),
  bonus: z.number(),
  label: z.string(),
});
export type Dice = z.infer<typeof DiceSchema>;

// ─── SenseWithRange ───────────────────────────────────────────────────────────

export const SenseWithRangeSchema = z.object({
  sense: AbilityBlockSchema.optional(),
  senseName: z.string(),
  range: z.string(),
  type: z.enum(['precise', 'imprecise', 'vague']).optional(),
});
export type SenseWithRange = z.infer<typeof SenseWithRangeSchema>;

// ─── SocietyAdventureEntry ────────────────────────────────────────────────────

export const SocietyAdventureEntrySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  event: z.string().optional(),
  event_code: z.string().optional(),
  date: z.number().optional(),
  character_level: z.number().optional(),
  gm_organized_play_id: z.string().optional(),
  chronicle_code: z.string().optional(),
  boons: z.string().optional(),
  xp_gained: z.number().optional(),
  rep_gained: z.number().optional(),
  items_snapshot: z.array(ItemSchema),
  conditions_snapshot: z.array(ConditionSchema),
  items_sold: z.array(ItemSchema),
  items_bought: z.array(ItemSchema),
  items_total_buy: z.number().optional(),
  items_total_sell: z.number().optional(),
  items_total_extra: z.number().optional(),
  conditions_gained: z.array(ConditionSchema),
  conditions_cleared: z.array(ConditionSchema),
  notes: z.string().optional(),
});
export type SocietyAdventureEntry = z.infer<typeof SocietyAdventureEntrySchema>;

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const JSONContentSchema = z.any(); // TipTap JSONContent

const NotesSchema = z.object({
  pages: z.array(
    z.object({
      name: z.string(),
      icon: z.string(),
      color: z.string(),
      contents: JSONContentSchema,
    })
  ),
});

const RollHistorySchema = z.object({
  rolls: z.array(
    z.object({
      type: z.string(),
      label: z.string(),
      result: z.number(),
      bonus: z.number(),
      timestamp: z.number(),
    })
  ),
});

const DicePresetsSchema = z.object({
  default_theme: z.string().optional(),
  opened_default_presets: z.boolean().optional(),
  presets: z.array(z.object({ id: z.string(), name: z.string(), dice: z.array(DiceSchema) })).optional(),
});

const CharacterOptionsSchema = z.object({
  is_public: z.boolean().optional(),
  auto_detect_prerequisites: z.boolean().optional(),
  auto_heighten_spells: z.boolean().optional(),
  class_archetypes: z.boolean().optional(),
  custom_operations: z.boolean().optional(),
  dice_roller: z.boolean().optional(),
  ignore_bulk_limit: z.boolean().optional(),
  alternate_ancestry_boosts: z.boolean().optional(),
  voluntary_flaws: z.boolean().optional(),
  organized_play: z.boolean().optional(),
});

const CharacterVariantsSchema = z.object({
  ancestry_paragon: z.boolean().optional(),
  proficiency_without_level: z.boolean().optional(),
  proficiency_half_level: z.boolean().optional(),
  stamina: z.boolean().optional(),
  free_archetype: z.boolean().optional(),
  dual_class: z.boolean().optional(),
  gradual_attribute_boosts: z.boolean().optional(),
  automatic_bonus_progression: z.boolean().optional(),
});

// ─── LivingEntity ─────────────────────────────────────────────────────────────

export const LivingEntitySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  level: z.number(),
  experience: z.number(),
  inventory: InventorySchema.nullable(),
  hp_current: z.number(),
  hp_temp: z.number(),
  stamina_current: z.number(),
  resolve_current: z.number(),
  details: z
    .object({
      image_url: z.string().optional(),
      background_image_url: z.string().optional(),
      conditions: z.array(ConditionSchema).optional(),
    })
    .nullable(),
  notes: NotesSchema.nullable(),
  roll_history: RollHistorySchema.nullable(),
  spells: z
    .object({
      slots: z.array(SpellSlotSchema),
      list: z.array(SpellListEntrySchema),
      focus_point_current: z.number(),
      innate_casts: z.array(SpellInnateEntrySchema),
    })
    .nullable(),
  operation_data: z
    .object({
      selections: z.record(z.string(), z.string()).optional(),
      notes: z.record(z.string(), z.string()).optional(),
    })
    .nullable(),
  meta_data: z
    .object({
      active_modes: z.array(z.string()).optional(),
      given_item_ids: z.array(z.number()).optional(),
      reset_hp: z.boolean().optional(),
      calculated_stats: z
        .object({
          hp_max: z.number().optional(),
          stamina_max: z.number().optional(),
          resolve_max: z.number().optional(),
          ac: z.number().optional(),
          profs: z.record(z.string(), z.object({ total: z.number(), type: ProficiencyTypeSchema })),
        })
        .optional(),
    })
    .nullable(),
});
export type LivingEntity = z.infer<typeof LivingEntitySchema>;

// ─── Creature ─────────────────────────────────────────────────────────────────

export const CreatureSchema = LivingEntitySchema.extend({
  id: z.number(),
  created_at: z.string(),
  rarity: RaritySchema,
  details: z.object({
    image_url: z.string().optional(),
    background_image_url: z.string().optional(),
    conditions: z.array(ConditionSchema).optional(),
    description: z.string(),
    adjustment: z.enum(['ELITE', 'WEAK']).optional(),
  }),
  operations: z.array(OperationSchema).nullable(),
  abilities_base: z.array(AbilityBlockSchema).nullable(),
  abilities_added: z.array(z.number()).nullable(),
  content_source_id: z.number(),
  deprecated: z.boolean().nullable(),
  version: z.string(),
});
export type Creature = z.infer<typeof CreatureSchema>;

// ─── Character ────────────────────────────────────────────────────────────────

export const CharacterSchema = LivingEntitySchema.extend({
  id: z.number(),
  created_at: z.string(),
  campaign_id: z.number().nullable(),
  user_id: z.string(),
  hero_points: z.number(),
  details: z
    .object({
      image_url: z.string().optional(),
      background_image_url: z.string().optional(),
      conditions: z.array(ConditionSchema).optional(),
      dice: DicePresetsSchema.optional(),
      sheet_theme: z.object({ color: z.string() }).optional(),
      api_clients: z
        .object({
          client_access: z.array(
            z.object({
              publicUserId: z.string(),
              clientId: z.string(),
              addedAt: z.number(),
            })
          ),
        })
        .optional(),
      ancestry: AncestrySchema.optional(),
      background: BackgroundSchema.optional(),
      class: ClassSchema.optional(),
      class_archetype: ClassArchetypeSchema.optional(),
      class_2: ClassSchema.optional(),
      class_archetype_2: ClassArchetypeSchema.optional(),
      info: z
        .object({
          appearance: z.string().optional(),
          personality: z.string().optional(),
          alignment: z.string().optional(),
          beliefs: z.string().optional(),
          age: z.string().optional(),
          height: z.string().optional(),
          weight: z.string().optional(),
          gender: z.string().optional(),
          pronouns: z.string().optional(),
          faction: z.string().optional(),
          reputation: z.number().optional(),
          ethnicity: z.string().optional(),
          nationality: z.string().optional(),
          birthplace: z.string().optional(),
          organized_play_id: z.string().optional(),
          organized_play_adventures: z.array(SocietyAdventureEntrySchema).optional(),
        })
        .optional(),
    })
    .nullable(),
  custom_operations: z.array(OperationSchema).nullable(),
  options: CharacterOptionsSchema.nullable(),
  variants: CharacterVariantsSchema.nullable(),
  content_sources: z.object({ enabled: z.array(z.number()).optional() }).nullable(),
  companions: z.object({ list: z.array(CreatureSchema).optional() }).nullable(),
});
export type Character = z.infer<typeof CharacterSchema>;

// ─── Campaign ─────────────────────────────────────────────────────────────────

export const CampaignSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  join_key: z.string(),
  notes: NotesSchema.nullable(),
  recommended_options: CharacterOptionsSchema.nullable(),
  recommended_variants: CharacterVariantsSchema.nullable(),
  recommended_content_sources: z.object({ enabled: z.array(z.number()).optional() }).nullable(),
  custom_operations: z.array(OperationSchema).nullable(),
  meta_data: z
    .object({
      settings: z
        .object({
          show_party_member_status: z.enum(['OFF', 'STATUS', 'DETAILED']).optional(),
        })
        .optional(),
      image_url: z.string().optional(),
      dice: DicePresetsSchema.optional(),
      roll_history: RollHistorySchema.optional(),
    })
    .nullable(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

// ─── CampaignSessionIdea ──────────────────────────────────────────────────────

export const CampaignSessionIdeaSchema = z.object({
  name: z.string(),
  outline: z.string(),
  actions: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      type: z.enum(['NPC', 'ENCOUNTER']),
    })
  ),
});
export type CampaignSessionIdea = z.infer<typeof CampaignSessionIdeaSchema>;

// ─── CampaignNPC ──────────────────────────────────────────────────────────────

export const CampaignNPCSchema = z.object({
  name: z.string(),
  description: z.string(),
  level: z.number(),
  class: z.string(),
  background: z.string(),
  ancestry: z.string(),
});
export type CampaignNPC = z.infer<typeof CampaignNPCSchema>;

// ─── Encounter & Combatant ────────────────────────────────────────────────────

export const CombatantSchema = z.object({
  _id: z.string(),
  type: z.enum(['CREATURE', 'CHARACTER']),
  ally: z.boolean(),
  initiative: z.number().optional(),
  creature: CreatureSchema.optional(),
  character: z.number().optional(),
  data: LivingEntitySchema.optional(),
});
export type Combatant = z.infer<typeof CombatantSchema>;

export const EncounterSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  user_id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  campaign_id: z.number().nullable(),
  combatants: z.object({ list: z.array(CombatantSchema) }),
  meta_data: z.object({
    description: z.string().optional(),
    party_level: z.number().optional(),
    party_size: z.number().optional(),
  }),
});
export type Encounter = z.infer<typeof EncounterSchema>;

// ─── PublicUser ───────────────────────────────────────────────────────────────

export const PublicUserSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  created_at: z.string(),
  display_name: z.string(),
  image_url: z.string().nullable(),
  background_image_url: z.string().nullable(),
  site_theme: z
    .object({
      color: z.string().optional(),
      dyslexia_font: z.boolean().optional(),
      view_operations: z.boolean().optional(),
      zoom: z.number().optional(),
    })
    .nullable(),
  is_admin: z.boolean(),
  is_mod: z.boolean(),
  is_developer: z.boolean().nullable(),
  is_community_paragon: z.boolean().nullable(),
  patreon: z
    .object({
      patreon_user_id: z.string().optional(),
      patreon_name: z.string().optional(),
      patreon_email: z.string().optional(),
      tier: z.enum(['ADVOCATE', 'WANDERER', 'LEGEND', 'GAME-MASTER']).optional(),
      access_token: z.string().optional(),
      refresh_token: z.string().optional(),
      game_master: z
        .object({
          access_code: z.string().optional(),
          virtual_tier: z
            .object({
              game_master_user_id: z.string(),
              game_master_name: z.string(),
              added_at: z.string(),
            })
            .optional(),
        })
        .optional(),
    })
    .nullable(),
  api: z
    .object({
      clients: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            image_url: z.string().optional(),
            api_key: z.string(),
          })
        )
        .optional(),
    })
    .nullable(),
  deactivated: z.boolean(),
  summary: z.string().nullable(),
  organized_play_id: z.string().nullable(),
  subscribed_content_sources: z
    .array(
      z.object({
        source_id: z.number(),
        source_name: z.string(),
        added_at: z.string(),
      })
    )
    .nullable(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

// ─── ContentSource ────────────────────────────────────────────────────────────

export const ContentSourceSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  name: z.string(),
  foundry_id: z.string().nullable(),
  url: z.string().nullable(),
  description: z.string(),
  operations: z.array(OperationSchema).nullable(),
  user_id: z.string().nullable(),
  contact_info: z.string().nullable(),
  require_key: z.boolean(),
  keys: z.object({ access_key: z.string().optional() }).nullable(),
  is_published: z.boolean(),
  deprecated: z.boolean().nullable(),
  required_content_sources: z.array(z.number()).nullable(),
  group: z.string().nullable(),
  artwork_url: z.string().nullable(),
  meta_data: z.object({ counts: z.record(z.string(), z.number()).optional() }).nullable(),
});
export type ContentSource = z.infer<typeof ContentSourceSchema>;

// ─── ContentUpdate ────────────────────────────────────────────────────────────

export const ContentUpdateSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  user_id: z.string(),
  type: ContentTypeSchema,
  ref_id: z.number().nullable(),
  action: z.enum(['UPDATE', 'CREATE', 'DELETE']),
  data: z.record(z.string(), z.any()),
  content_source_id: z.number(),
  status: z.object({
    state: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    discord_user_id: z.string().optional(),
    discord_user_name: z.string().optional(),
  }),
  upvotes: z.array(z.object({ discord_user_id: z.string() })),
  downvotes: z.array(z.object({ discord_user_id: z.string() })),
  discord_msg_id: z.string().nullable(),
});
export type ContentUpdate = z.infer<typeof ContentUpdateSchema>;

// ─── ContentPackage ───────────────────────────────────────────────────────────

export const ContentPackageSchema = z.object({
  ancestries: z.array(AncestrySchema),
  backgrounds: z.array(BackgroundSchema),
  classes: z.array(ClassSchema),
  abilityBlocks: z.array(AbilityBlockSchema),
  items: z.array(ItemSchema),
  languages: z.array(LanguageSchema),
  spells: z.array(SpellSchema),
  traits: z.array(TraitSchema),
  creatures: z.array(CreatureSchema),
  archetypes: z.array(ArchetypeSchema),
  versatileHeritages: z.array(VersatileHeritageSchema),
  classArchetypes: z.array(ClassArchetypeSchema),
  sources: z.array(ContentSourceSchema).optional(),
  defaultSources: z.record(SourceKeySchema, SourceValueSchema),
});
export type ContentPackage = z.infer<typeof ContentPackageSchema>;

// ─── Operation Result Packages ────────────────────────────────────────────────
// Defined here (not in operations.schema) because they reference full content
// entity schemas (ContentSource, AbilityBlock, Item). No circular dependency
// exists — content imports from operations, not the other way around.

export const OperationCharacterResultPackageSchema = z.object({
  contentSourceResults: z.array(
    z.object({ baseSource: ContentSourceSchema, baseResults: z.array(OperationResultSchema) })
  ),
  characterResults: z.array(OperationResultSchema),
  classResults: z.array(OperationResultSchema),
  class2Results: z.array(OperationResultSchema),
  classFeatureResults: z.array(
    z.object({ baseSource: AbilityBlockSchema, baseResults: z.array(OperationResultSchema) })
  ),
  ancestryResults: z.array(OperationResultSchema),
  ancestrySectionResults: z.array(
    z.object({ baseSource: AbilityBlockSchema, baseResults: z.array(OperationResultSchema) })
  ),
  backgroundResults: z.array(OperationResultSchema),
  itemResults: z.array(z.object({ baseSource: ItemSchema, baseResults: z.array(OperationResultSchema) })),
});
export type OperationCharacterResultPackage = z.infer<typeof OperationCharacterResultPackageSchema>;

export const OperationCreatureResultPackageSchema = z.object({
  creatureResults: z.array(OperationResultSchema),
  abilityResults: z.array(z.object({ baseSource: AbilityBlockSchema, baseResults: z.array(OperationResultSchema) })),
  itemResults: z.array(z.object({ baseSource: ItemSchema, baseResults: z.array(OperationResultSchema) })),
});
export type OperationCreatureResultPackage = z.infer<typeof OperationCreatureResultPackageSchema>;

export const OperationResultDataSchema = z.object({
  store: VariableStoreSchema,
  ors: z.union([OperationCharacterResultPackageSchema, OperationCreatureResultPackageSchema]),
});
export type OperationResultData = z.infer<typeof OperationResultDataSchema>;

// ─── Operation Execution ──────────────────────────────────────────────────────
// Defined here because it references Character, Creature, and ContentPackage —
// all defined above. The runtime schema uses the real entity schemas (not z.any()),
// giving full validation of execution payloads.

export type OperationExecution =
  | { type: 'CHARACTER'; data: { character: Character; content: ContentPackage; context: string } }
  | { type: 'CREATURE'; data: { id: string; creature: Creature; content: ContentPackage } };

export const OperationExecutionSchema: z.ZodType<OperationExecution> = z.union([
  z.object({
    type: z.literal('CHARACTER'),
    data: z.object({ character: CharacterSchema, content: ContentPackageSchema, context: z.string() }),
  }),
  z.object({
    type: z.literal('CREATURE'),
    data: z.object({ id: z.string(), creature: CreatureSchema, content: ContentPackageSchema }),
  }),
]);
