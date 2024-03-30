import { Operation } from './operations';

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'UNIQUE';
type Size = 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE' | 'GARGANTUAN';
type ActionCost =
  | 'ONE-ACTION'
  | 'TWO-ACTIONS'
  | 'THREE-ACTIONS'
  | 'REACTION'
  | 'FREE-ACTION'
  | 'ONE-TO-TWO-ACTIONS'
  | 'ONE-TO-THREE-ACTIONS'
  | 'TWO-TO-THREE-ACTIONS'
  | null;
type AbilityBlockType = 'action' | 'feat' | 'physical-feature' | 'sense' | 'class-feature';
type ContentType =
  | 'trait'
  | 'item'
  | 'spell'
  | 'class'
  | 'ability-block'
  | 'ancestry'
  | 'creature'
  | 'background'
  | 'language'
  | 'content-source';

// All requests follow JSend specification (https://github.com/omniti-labs/jsend) //
type JSendResponse = JSendResponseSuccess | JSendResponseFail | JSendResponseError;
interface JSendResponseSuccess {
  status: 'success';
  data: NonNullable<any>;
}
interface JSendResponseFail {
  status: 'fail';
  data: NonNullable<any>;
}
interface JSendResponseError {
  status: 'error';
  message: string;
  data?: NonNullable<any>;
  code?: number;
}

interface PublicUser {
  id: number;
  user_id: string;
  created_at: string;
  display_name: string;
  image_url?: string;
  background_image_url?: string;
  site_theme?: {
    color: string;
  };
  is_admin: boolean;
  is_mod: boolean;
  patreon?: {
    patreon_user_id?: string;
    patreon_name?: string;
    patreon_email?: string;
    tier?: 'ADVOCATE' | 'WANDERER' | 'LEGEND' | 'GAME-MASTER';
    access_token?: string;
    refresh_token?: string;
    game_master?: {
      access_code?: string;
      virtual_tier?: {
        game_master_user_id: string;
        game_master_name: string;
        added_at: string;
      };
    };
  };
  deactivated: boolean;
  summary?: string;
  subscribed_content_sources?: { source_id: number; source_name: string; added_at: string }[];
}

interface Trait {
  id: number;
  created_at: string;
  name: string;
  description: string;
  meta_data?: {
    important?: boolean;
    creature_trait?: boolean;
    unselectable?: boolean;
    class_trait?: boolean;
    ancestry_trait?: boolean;
  };
  content_source_id: number;
}

interface ContentUpdate {
  id: number;
  created_at: string;
  user_id: string;
  type: ContentType;
  ref_id?: number;
  action: 'UPDATE' | 'CREATE' | 'DELETE';
  data: Record<string, any>;
  content_source_id: number;
  status: {
    state: 'PENDING' | 'APPROVED' | 'REJECTED';
    discord_user_id?: string;
    discord_user_name?: string;
  };
  upvotes: {
    discord_user_id: string;
  }[];
  downvotes: {
    discord_user_id: string;
  }[];
  discord_msg_id?: string;
}

interface Item {
  id: number;
  created_at: string;
  name: string;
  price?: {
    cp?: number;
    sp?: number;
    gp?: number;
    pp?: number;
  };
  bulk?: string;
  level: number;
  rarity: Rarity;
  traits?: number[];
  description: string;
  group: ItemGroup;
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
  defense?: string;
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
  traits: number[];
  inventory?: Inventory;
  notes?: {
    contents: JSONContent;
  };
  details: {
    image_url?: string;
    background_image_url?: string;
    conditions?: Condition[];
    description: string;
  };
  roll_history?: Record<string, any>; // TODO
  operations: Operation[] | undefined;
  abilities?: AbilityBlock[];
  spells?: {
    slots: SpellSlot[];
    list: SpellListEntry[];
    // The number of focus points
    focus_point_current: number;
    // Used for tracking how many times an innate spell has been cast
    innate_casts: SpellInnateEntry[];
  };
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
  operations: Operation[] | undefined;
  skill_training_base: number;
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
  meta_data: {}; // TODO
  traits?: number[];
  content_source_id: number;
  version?: string;
}

interface Character {
  id: number;
  created_at: string;
  user_id: string;
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
  details: Record<string, any>; // TODO
  campaign_id?: number;
  roll_history: Record<string, any>; // TODO
  custom_operations: Operation[];
  meta_data: Record<string, any>; // TODO
  options: Record<string, any>; // TODO
  variants: Record<string, any>; // TODO
  content_sources: Record<string, any>; // TODO
  operation_data: Record<string, any>; // TODO
  spells: Record<string, any>; // TODO
  companions: Record<string, any>; // TODO
}

interface Campaign {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  description: string;
  notes?: {
    pages: {
      name: string;
      icon: string;
      color: string;
      contents: JSONContent;
    }[];
  };
  recommended_options?: Record<string, any>; // TODO
  recommended_variants?: Record<string, any>; // TODO
  recommended_content_sources?: {
    enabled?: number[];
  };
  custom_operations?: Operation[];
  meta_data?: {
    image_url?: string;
  };
}

interface Encounter {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  campaign_id?: number;
  combatants: {
    list: (Creature | Character)[];
  };
  meta_data: {
    description?: string;
    party_level?: number;
    party_size?: number;
  };
}

interface ContentSource {
  id: number;
  created_at: string;
  name: string;
  foundry_id: string;
  url: string;
  description: string;
  operations: Operation[];
  user_id: string;
  contact_info: string;
  require_key: boolean;
  is_published: boolean;
  required_content_sources: number[];
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
  trait_id: number;
  artwork_url: string;
  content_source_id: number;
  version: string;
  operations: Operation[] | undefined;
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
