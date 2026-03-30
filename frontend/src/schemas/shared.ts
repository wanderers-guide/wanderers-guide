import { z } from 'zod';

// Primitive enums and scalar types shared by both content.schema and operations.schema.
// Neither schema file imports from the other for these — they import from here instead,
// which breaks the content ↔ operations circular dependency entirely.

// ─── Source ───────────────────────────────────────────────────────────────────

export const SourceKeySchema = z.enum(['PAGE', 'INFO']);
export type SourceKey = z.infer<typeof SourceKeySchema>;

export const SourceValueSchema = z.union([
  z.array(z.number()),
  z.literal('ALL-USER-ACCESSIBLE'),
  z.literal('ALL-OFFICIAL-PUBLIC'),
  z.literal('ALL-HOMEBREW-PUBLIC'),
  z.literal('ALL-PUBLIC'),
  z.literal('ALL-HOMEBREW-ACCESSIBLE'),
]);
export type SourceValue = z.infer<typeof SourceValueSchema>;

// ─── Availability / Rarity / Size ─────────────────────────────────────────────

export const AvailabilitySchema = z.enum(['STANDARD', 'LIMITED', 'RESTRICTED']);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const RaritySchema = z.enum(['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE']);
export type Rarity = z.infer<typeof RaritySchema>;

export const SizeSchema = z.enum(['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN']);
export type Size = z.infer<typeof SizeSchema>;

// ─── ActionCost ───────────────────────────────────────────────────────────────

export const ActionCostSchema = z
  .enum([
    'ONE-ACTION',
    'TWO-ACTIONS',
    'THREE-ACTIONS',
    'REACTION',
    'FREE-ACTION',
    'ONE-TO-TWO-ACTIONS',
    'ONE-TO-THREE-ACTIONS',
    'TWO-TO-THREE-ACTIONS',
    'TWO-TO-TWO-ROUNDS',
    'TWO-TO-THREE-ROUNDS',
    'THREE-TO-TWO-ROUNDS',
    'THREE-TO-THREE-ROUNDS',
  ])
  .nullable();
export type ActionCost = z.infer<typeof ActionCostSchema>;

// ─── AbilityBlockType ─────────────────────────────────────────────────────────

export const AbilityBlockTypeSchema = z.enum([
  'action',
  'feat',
  'physical-feature',
  'sense',
  'class-feature',
  'heritage',
  'mode',
]);
export type AbilityBlockType = z.infer<typeof AbilityBlockTypeSchema>;

// ─── ContentType ──────────────────────────────────────────────────────────────

export const ContentTypeSchema = z.enum([
  'trait',
  'item',
  'spell',
  'class',
  'archetype',
  'versatile-heritage',
  'class-archetype',
  'ability-block',
  'creature',
  'ancestry',
  'background',
  'language',
  'content-source',
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

// ─── SpellSectionType ─────────────────────────────────────────────────────────

export const SpellSectionTypeSchema = z.enum([
  'PREPARED',
  'SPONTANEOUS',
  'FOCUS',
  'INNATE',
  'RITUAL',
  'STAFF',
  'WAND',
  'SPELLHEART',
]);
export type SpellSectionType = z.infer<typeof SpellSectionTypeSchema>;

// ─── Item Meta ────────────────────────────────────────────────────────────────

export const ItemGroupSchema = z.enum(['GENERAL', 'WEAPON', 'ARMOR', 'SHIELD', 'RUNE', 'UPGRADE', 'MATERIAL']);
export type ItemGroup = z.infer<typeof ItemGroupSchema>;

export const ItemMetaCategoryWeaponSchema = z.enum(['simple', 'martial', 'advanced', 'unarmed_attack']);
export type ItemMetaCategoryWeapon = z.infer<typeof ItemMetaCategoryWeaponSchema>;

export const ItemMetaCategoryArmorSchema = z.enum(['light', 'medium', 'heavy', 'unarmored_defense']);
export type ItemMetaCategoryArmor = z.infer<typeof ItemMetaCategoryArmorSchema>;

export const ItemMetaCategorySchema = z.union([ItemMetaCategoryWeaponSchema, ItemMetaCategoryArmorSchema]);
export type ItemMetaCategory = z.infer<typeof ItemMetaCategorySchema>;

export const ItemMetaGroupWeaponSchema = z.enum([
  'axe', 'bomb', 'bow', 'brawling', 'club', 'crossbow', 'dart', 'firearm', 'flail', 'hammer',
  'knife', 'pick', 'polearm', 'projectile', 'shield', 'sling', 'spear', 'sword',
  'corrosive', 'cryo', 'flame', 'grenade', 'laser', 'mental', 'missile', 'plasma', 'poison',
  'shock', 'sniper', 'sonic',
]);
export type ItemMetaGroupWeapon = z.infer<typeof ItemMetaGroupWeaponSchema>;

export const ItemMetaGroupArmorSchema = z.enum([
  'chain', 'composite', 'leather', 'plate', 'skeletal', 'wood',
  'cloth', 'ceramic', 'polymer',
]);
export type ItemMetaGroupArmor = z.infer<typeof ItemMetaGroupArmorSchema>;

export const ItemMetaGroupSchema = z.union([ItemMetaGroupWeaponSchema, ItemMetaGroupArmorSchema]);
export type ItemMetaGroup = z.infer<typeof ItemMetaGroupSchema>;
