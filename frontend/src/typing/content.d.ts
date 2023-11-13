import { Operation } from "./operations";

type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "UNIQUE";
type Size = "TINY" | "SMALL" | "MEDIUM" | "LARGE" | "HUGE" | "GARGANTUAN";
type ActionCost =
  | "ONE-ACTION"
  | "TWO-ACTIONS"
  | "THREE-ACTIONS"
  | "REACTION"
  | "FREE-ACTION"
  | "ONE-TO-TWO-ACTIONS"
  | "ONE-TO-THREE-ACTIONS"
  | "TWO-TO-THREE-ACTIONS"
  | null;
type AbilityBlockType = 'action' | 'feat' | 'physical-feature' | 'sense' | 'class-feature' | 'heritage';
type ContentType =
  | "trait"
  | "item"
  | "spell"
  | "class"
  | "ability-block"
  | "creature"
  | "ancestry"
  | "background"
  | "language"
  | "content-source";

interface Trait {
  id: number;
  created_at: string;
  name: string;
  description: string;
  meta_data?: {
    important?: boolean;
    creature_trait?: boolean;
    unselectable?: boolean;
  };
  content_source_id: number;
}

interface Item {
  id: number;
  created_at: string;
  name: string;
  price?: Record<string, any>;
  bulk?: string;
  level: number;
  rarity: Rarity;
  traits?: number[];
  description: string;
  type: string;
  hands?: string;
  size: Size;
  craft_requirements?: string;
  usage?: string;
  meta_data?: Record<string, any>; // TODO
  operations?: Operation[];
  content_source_id: number;
  version: string;
}

interface Spell {
  id: number;
  created_at: string;
  name: string;
  rank: number;
  traditions: string[];
  rarity: Rarity;
  cast: ActionCost | string;
  traits?: number[];
  defenses?: string;
  cost?: string;
  trigger?: string;
  requirements?: string;
  range?: string;
  area?: string;
  targets?: string;
  duration?: string;
  description: string;
  heightened?: {}; // TODO
  meta_data: Record<string, any>; // TODO
  content_source_id: number;
  version: string;
}

interface Creature {
  id: number;
  created_at: string;
  name: string;
  level: number;
  rarity: Rarity;
  size: Size;
  traits?: number[];
  family_type?: string;
  senses?: string;
  languages?: Record<string, any>; // TODO
  skills?: Record<string, any>; // TODO
  items?: Record<string, any>; // TODO
  attributes?: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  stats?: Record<string, any>; // TODO
  immunities?: Record<string, any>; // TODO
  weaknesses?: Record<string, any>; // TODO
  resistances?: Record<string, any>; // TODO
  interaction_abilities?: Record<string, any>; // TODO
  offensive_abilities?: Record<string, any>; // TODO
  defensive_abilities?: Record<string, any>; // TODO
  speeds?: Record<string, any>; // TODO
  attacks?: Record<string, any>; // TODO
  spellcasting?: Record<string, any>; // TODO
  description: string;
  meta_data?: Record<string, any>; // TODO
  content_source_id: number;
  version: string;
}

interface Class {
  id: number;
  created_at: string;
  name: string;
  rarity: Rarity;
  description: string;
  operations: Operation[];
  key_attribute: string;
  hp: number;
  trait_id: number;
  artwork_url: string;
  content_source_id: number;
  version: string;
}

interface AbilityBlock {
  id: number;
  created_at: string;
  operations?: Operation[];
  name: string;
  actions: ActionCost;
  level?: number;
  rarity: Rarity;
  prerequisites?: string[];
  frequency?: string;
  cost?: string;
  trigger?: string;
  requirements?: string;
  access?: string;
  description: string;
  special?: string;
  type: AbilityBlockType;
  meta_data?: {
    skill?: string;
    image_url?: string;
    foundry?: Record<string, any>;
  };
  traits?: number[];
  content_source_id: number;
  version?: string;
}

interface Character {
  id: number;
  created_at: string;
  user_id: number;
  name: string;
  level: number;
  experience: number;
  hp_current: number;
  hp_temp: number;
  hero_points: number;
  stamina_current: number;
  resolve_current: number;
  inventory: Record<string, any>; // TODO
  notes: Record<string, any>; // TODO
  details?: {
    image_url?: string;
    background_image_url?: string;
    sheet_theme?: {
      color: string;
    },
    ancestry?: Ancestry;
    background?: Background;
    class?: Class;
    heritage?: AbilityBlock;
  };
  roll_history?: Record<string, any>; // TODO
  custom_operations?: Operation[];
  meta_data?: Record<string, any>; // TODO
  options?: Record<string, any>; // TODO
  variants?: Record<string, any>; // TODO
  content_sources?: {
    enabled?: number[];
  };
  operation_data: {
    selections: Record<string, string>; // background_<selector op UUID>.. -> <select option op UUID>
    notes: Record<string, string>; // <op UUID> -> string
  };
  spells?: Record<string, any>; // TODO
  companions?: Record<string, any>; // TODO
}

interface ContentSource {
  id: number;
  created_at: string;
  name: string;
  foundry_id: string;
  url: string;
  description: string;
  operations: Operation[];
  user_id: number;
  contact_info: string;
  require_key: boolean;
  is_published: boolean;
  required_content_sources: number[];
  group: string;
  meta_data?: {
    counts?: Record<ContentType | AbilityBlockType, number>;
  };
}

interface Ancestry {
  id: number;
  created_at: string;
  name: string;
  rarity: Rarity;
  description: string;
  hp: number;
  size: Size;
  speed: number;
  trait_id: number;
  traits_other: number[];
  artwork_url: string;
  content_source_id: number;
  version: string;
  operations: Operation[];
}

type Background = {
  id: number;
  created_at: string;
  name: string;
  rarity: Rarity;
  description: string;
  operations: Operation[];
  content_source_id: number;
  version: string;
};

type Language = {
  id: number;
  created_at: string;
  name: string;
  speakers: string;
  script: string;
  description: string;
  content_source_id: number;
  rarity: Rarity;
};
