/**
 * Domain types for the Pathbuilder importer: the normalized shape that the
 * WG-side importer consumes.
 *
 * The wire format is not declared here. It lives as Zod schemas in
 * @schemas/pathbuilder and these types describe data that has already been
 * validated.
 */

import type { PathbuilderAbility, PathbuilderCustomFile } from '@schemas/pathbuilder';

export type {
  PathbuilderAbility,
  PathbuilderArmor,
  PathbuilderCharacterData,
  PathbuilderDerivedBuild,
  PathbuilderContainer,
  PathbuilderCustomEffect,
  PathbuilderCustomFile,
  PathbuilderCustomFileEntry,
  PathbuilderEquipmentEntry,
  PathbuilderPlayerWeapon,
  PathbuilderShareBuild,
  PathbuilderShareResponse,
  PathbuilderShield,
  PathbuilderSpellEntry,
} from '@schemas/pathbuilder';

export type ResolutionKind = 'standard' | 'custom' | 'unresolved';

export type ResolvedItemRef = {
  kind: ResolutionKind;
  name: string;
  raw: string;
  uuid?: string;
  quantity: number;
  custom?: PathbuilderCustomFile;
  /** Original semantic kind when the Pathbuilder reference could not be resolved. */
  unresolvedKind?: UnresolvedRef['kind'];
};

export type ResolvedWeapon = ResolvedItemRef & {
  potency: number;
  striking: number;
  strikingLabel?: string;
  runes: string[];
  twoHanded: boolean;
  attackAbility?: PathbuilderAbility;
};

export type ResolvedFeatSelection = {
  slot: string;
  level?: number;
  category?: string;
  qualifier?: string;
  name: string;
  raw: string;
};

export type ResolvedSpecialSelection = {
  slot: string;
  prompt: string;
  value: string;
};

export type ResolvedAbilityBoost = {
  level: number;
  ability: PathbuilderAbility;
  origin: 'levelled' | 'ancestry' | 'background';
};

export type ResolvedSkillIncrease = {
  level: number;
  skill: string;
};

export type ResolvedContainer = {
  id: string;
  name: string;
  isBackpack: boolean;
  items: ResolvedItemRef[];
};

export type ResolvedSpell = {
  name: string;
  spellListIndex?: number;
  heighten: number;
  rawKey: string;
  /** WG casting source id/name when json.php exposes the spellcasting entry. */
  source?: string;
  tradition?: string;
};

export type ResolvedCustomBuff = {
  uuid: string;
  stacks: number;
  custom?: PathbuilderCustomFile;
  name: string;
};

export type UnresolvedRef = {
  kind: 'weapon' | 'armor' | 'shield' | 'equipment' | 'buff' | 'spell-source' | 'variant' | 'container';
  ref: string;
  reason: string;
};

export type ResolvedBuild = {
  buildId: string;
  formatVersion?: string;
  identity: {
    name: string;
    level: number;
    ancestry?: string;
    heritage?: string;
    className?: string;
    keyAbility?: PathbuilderAbility;
    background?: string;
    gender?: string;
    alignment?: string;
    deity?: string;
    age?: string;
  };
  variants: {
    ancestry_paragon: boolean;
    free_archetype: boolean;
    gradual_attribute_boosts: boolean;
  };
  abilityBoosts: ResolvedAbilityBoost[];
  skillIncreases: ResolvedSkillIncrease[];
  trainedSkills: string[];
  feats: ResolvedFeatSelection[];
  specialSelections: ResolvedSpecialSelection[];
  weapons: ResolvedWeapon[];
  armor?: ResolvedItemRef;
  armorRunes: string[];
  armorPotency: number;
  /** Resilient-rune rank from trusted Pathbuilder armor state; null means unknown. */
  armorResilience: number | null;
  shield?: ResolvedItemRef;
  looseEquipment: ResolvedItemRef[];
  containers: ResolvedContainer[];
  spells: ResolvedSpell[];
  activeCustomBuffs: ResolvedCustomBuff[];
  customFiles: Map<string, PathbuilderCustomFile>;
  notes?: string;
  coins: { cp: number; sp: number; gp: number; pp: number };
  languages: string[];
  unresolved: UnresolvedRef[];
  hints: string[];
};
