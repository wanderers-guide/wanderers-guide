import type { ContentType, AbilityBlockType } from './content';

export type ImageOption = {
  name?: string;
  url: string;
  source?: string;
  source_url?: string;
};

export type DrawerType =
  | ContentType
  | AbilityBlockType
  | 'generic'
  | 'condition'
  | 'character'
  | 'manage-coins'
  | 'inv-item'
  | 'cast-spell'
  | 'add-spell'
  | 'stat-prof'
  | 'stat-attr'
  | 'stat-hp'
  | 'stat-ac'
  | 'stat-weapon'
  | 'stat-speed'
  | 'stat-perception'
  | 'stat-resist-weak';

export type UploadResult = {
  success: boolean;
  id?: number;
};

export interface GranularCreature {
  name?: string;
  level?: number;
  imageUrl?: string;
  size: 'MEDIUM' | string;
  rarity: 'COMMON' | string;
  traits?: string[];
  perception: {
    value: number;
    senses?: { name: string; range?: number; acuity?: 'precise' | 'imprecise' | 'vague' }[];
    notes?: string;
  };
  languages: {
    value?: string[];
    notes?: string;
  };
  skills?: { name: string; bonus: number }[];
  attributes: { name: string; value: number }[];
  items?: {
    name: string;
    quantity: number;
    notes?: string;
  }[];
  speeds: {
    name: string;
    value: number;
    notes?: string;
  }[];
  resistances?: {
    type: string;
    value: number;
    doubleAgainst?: string[];
    exceptions?: string[];
  }[];
  weaknesses?: {
    type: string;
    value: number;
    doubleAgainst?: string[];
    exceptions?: string[];
  }[];
  immunities?: {
    type: string;
    exceptions?: string[];
  }[];
  ac: {
    value: number;
    notes?: string;
  };
  saves: {
    fort: {
      value: number;
      notes?: string;
    };
    ref: {
      value: number;
      notes?: string;
    };
    will: {
      value: number;
      notes?: string;
    };
    generalNotes?: string;
  };
  hp: {
    value: number;
    notes?: string;
  };
  abilities?: {
    name: string;
    action?:
      | null
      | 'ONE-ACTION'
      | 'TWO-ACTIONS'
      | 'THREE-ACTIONS'
      | 'REACTION'
      | 'FREE-ACTION'
      | 'ONE-TO-TWO-ACTIONS'
      | 'ONE-TO-THREE-ACTIONS'
      | 'TWO-TO-THREE-ACTIONS'
      | 'TWO-TO-TWO-ROUNDS'
      | 'TWO-TO-THREE-ROUNDS'
      | 'THREE-TO-TWO-ROUNDS'
      | 'THREE-TO-THREE-ROUNDS';
    traits?: string[]; // listed as (traits, separated by commas)
    description: string; // ability's effect
    frequency?: string;
    trigger?: string;
    requirements?: string;
    special?: string;
  }[];
  attacks?: {
    attackType: 'melee' | 'ranged';
    action: 'ONE-ACTION';
    name: string;
    attackBonus: { attack1st: number; attack2nd?: number; attack3rd?: number };
    traits?: string[];
    damage: {
      amountOfDice: number;
      dieType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12';
      damageType: string;
      damageBonus?: number;
      extraEffects?: string[];
    };
    misc?: {
      range?: number;
      reload?: number;
    };
  }[];
  spellcasting?: {
    innate?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        castsPerDay?: 'AT-WILL' | 'CONSTANT' | number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    focus?: {
      type: string; // normal, domain, order, hex, etc.
      dc?: number;
      attackBonus?: number;
      focusPoints: 1 | number;
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    spontaneous?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      slots: {
        rank: number;
        amount: number;
      }[];
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    prepared?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        amount: 1 | number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    rituals?: {
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
    };
  };
  description?: string;
}
