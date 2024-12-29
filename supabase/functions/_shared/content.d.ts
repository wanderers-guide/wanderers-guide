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
type AbilityBlockType =
  | 'action'
  | 'feat'
  | 'physical-feature'
  | 'sense'
  | 'class-feature'
  | 'heritage'
  | 'mode';
type ContentType =
  | 'trait'
  | 'item'
  | 'spell'
  | 'class'
  | 'archetype'
  | 'versatile-heritage'
  | 'ability-block'
  | 'creature'
  | 'ancestry'
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
  is_developer?: boolean;
  is_community_paragon?: boolean;
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
  organized_play_id?: string;
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
    archetype_trait?: boolean;
    versatile_heritage_trait?: boolean;
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
  availability?: Availability;
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
  availability?: Availability;
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

interface Archetype {
  id: number;
  created_at: string;
  name: string;
  rarity: Rarity;
  description: string;
  trait_id: number;
  artwork_url: string;
  content_source_id: number;
  version: string;
  dedication_feat_id?: number;
}

interface VersatileHeritage {
  id: number;
  created_at: string;
  name: string;
  rarity: Rarity;
  description: string;
  trait_id: number;
  artwork_url: string;
  content_source_id: number;
  version: string;
  heritage_id: number;
}

interface AbilityBlock {
  id: number;
  created_at: string;
  operations?: Operation[];
  name: string;
  actions: ActionCost;
  level?: number;
  rarity: Rarity;
  availability?: Availability;
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

interface LivingEntity {
  id?: number;
  name: string;
  level: number;
  experience: number;
  inventory?: Inventory;
  hp_current: number;
  hp_temp: number;
  stamina_current: number;
  resolve_current: number;
  details?: {
    image_url?: string;
    background_image_url?: string;
    conditions?: Condition[];
  };
  notes?: {
    pages: {
      name: string;
      icon: string;
      color: string;
      contents: JSONContent;
    }[];
  };
  roll_history?: {
    rolls: {
      type: string;
      label: string;
      result: number;
      bonus: number;
      timestamp: number;
    }[];
  };
  spells?: {
    slots: SpellSlot[];
    list: SpellListEntry[];
    // The number of focus points
    focus_point_current: number;
    // Used for tracking how many times an innate spell has been cast
    innate_casts: SpellInnateEntry[];
  };
  operation_data?: {
    selections?: Record<string, string>; // background_<selector op UUID>.. -> <select option op UUID>
    notes?: Record<string, string>; // TODO <op UUID> -> string
  };
  meta_data?: {
    given_item_ids?: number[];
    reset_hp?: boolean;
    calculated_stats?: {
      hp_max?: number;
      stamina_max?: number;
      resolve_max?: number;
      ac?: number;
      profs: Record<string, { total: number; type: ProficiencyType }>;
    };
  };
}

interface Creature extends LivingEntity {
  id: number;
  created_at: string;
  rarity: Rarity;
  details: {
    image_url?: string;
    background_image_url?: string;
    conditions?: Condition[];
    description: string;
  };
  operations: Operation[] | undefined;
  abilities_base?: AbilityBlock[];
  abilities_added?: number[];
  content_source_id: number;
  deprecated?: boolean;
  version: string;
}

interface Character extends LivingEntity {
  id: number;
  created_at: string;
  campaign_id?: number | null;
  user_id: string;
  hero_points: number;
  details?: {
    image_url?: string;
    background_image_url?: string;
    conditions?: Condition[];
    dice?: {
      default_theme?: string;
      opened_default_presets?: boolean;
      presets?: {
        id: string;
        name: string;
        dice: Dice[];
      }[];
    };
    sheet_theme?: {
      color: string;
    };
    ancestry?: Ancestry;
    background?: Background;
    class?: Class;
    class_2?: Class;
    info?: {
      appearance?: string;
      personality?: string;
      alignment?: string;
      beliefs?: string;
      age?: string;
      height?: string;
      weight?: string;
      gender?: string;
      pronouns?: string;
      faction?: string;
      reputation?: number;
      ethnicity?: string;
      nationality?: string;
      birthplace?: string;
      organized_play_id?: string;
      organized_play_adventures?: SocietyAdventureEntry[];
    };
  };
  campaign_id?: number;
  custom_operations?: Operation[];
  options?: {
    is_public?: boolean;
    auto_detect_prerequisites?: boolean;
    auto_heighten_spells?: boolean;
    class_archetypes?: boolean;
    custom_operations?: boolean;
    dice_roller?: boolean;
    ignore_bulk_limit?: boolean;
    alternate_ancestry_boosts?: boolean;
    voluntary_flaws?: boolean;
    organized_play?: boolean;
  };
  variants?: {
    ancestry_paragon?: boolean;
    proficiency_without_level?: boolean;
    proficiency_half_level?: boolean;
    stamina?: boolean;
    free_archetype?: boolean;
    dual_class?: boolean;
    gradual_attribute_boosts?: boolean;
  };
  content_sources?: {
    enabled?: number[];
  };
  companions?: Record<string, any>; // TODO
}

interface Campaign {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  description: {
    contents: JSONContent;
  };
  join_key: string;
  notes?: {
    pages: {
      name: string;
      icon: string;
      color: string;
      contents: JSONContent;
    }[];
    sessions: {
      id: string;
      name: string;
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
    settings?: {
      show_party_member_status?: 'OFF' | 'STATUS' | 'DETAILED';
    };
    image_url?: string;
    dice?: {
      default_theme?: string;
      opened_default_presets?: boolean;
      presets?: {
        id: string;
        name: string;
        dice: Dice[];
      }[];
    };
    roll_history?: {
      rolls: {
        type: string;
        label: string;
        result: number;
        bonus: number;
        timestamp: number;
      }[];
    };
  };
}

interface Encounter {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  campaign_id?: number;
  combatants: {
    list: Combatant[];
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
  foundry_id?: string;
  url: string;
  description: string;
  operations?: Operation[];
  user_id: string;
  contact_info: string;
  require_key: boolean;
  keys?: {
    access_key?: string;
  };
  is_published: boolean;
  required_content_sources: number[];
  group: string;
  artwork_url?: string;
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
  availability?: Availability;
};
