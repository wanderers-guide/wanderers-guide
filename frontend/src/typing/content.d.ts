import { Operation } from './operations';

type ContentPackage = {
  ancestries: Ancestry[];
  backgrounds: Background[];
  classes: Class[];
  abilityBlocks: AbilityBlock[];
  items: Item[];
  languages: Language[];
  spells: Spell[];
  traits: Trait[];
  creatures: Creature[];
  sources?: ContentSource[];
};

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
  | 'TWO-TO-TWO-ROUNDS'
  | 'TWO-TO-THREE-ROUNDS'
  | 'THREE-TO-TWO-ROUNDS'
  | 'THREE-TO-THREE-ROUNDS'
  | null;
type AbilityBlockType = 'action' | 'feat' | 'physical-feature' | 'sense' | 'class-feature' | 'heritage';
type ContentType =
  | 'trait'
  | 'item'
  | 'spell'
  | 'class'
  | 'ability-block'
  | 'creature'
  | 'ancestry'
  | 'background'
  | 'language'
  | 'content-source';

interface SpellSlot {
  rank: number;
  source: string;
  spell_id?: number;
  exhausted?: boolean;
  color?: string;
}

interface SpellListEntry {
  spell_id: number;
  rank: number;
  source: string;
}

interface SpellInnateEntry {
  spell_id: number;
  rank: number;
  tradition: string;
  casts_max: number;
  casts_current: number;
}

interface CastingSource {
  name: string;
  type: string;
  tradition: string;
  attribute: string;
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

interface Condition {
  name: string;
  description: string;
  value?: number;
  source?: string;
  for_character: boolean;
  for_object: boolean;
  for_creature: boolean;
}

type ItemGroup = 'GENERAL' | 'WEAPON' | 'ARMOR' | 'SHIELD' | 'RUNE' | 'MATERIAL';
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
  meta_data?: {
    image_url?: string;
    base_item?: string;
    category?: string;
    damage?: {
      damageType: string;
      dice: number;
      die: string;
      extra?: string;
    };
    attack_bonus?: number; // For weapons
    ac_bonus?: number; // For armor & shield
    check_penalty?: number; // For armor
    speed_penalty?: number; // For armor
    dex_cap?: number; // For armor
    strength?: number; // For armor
    bulk: {
      capacity?: number;
      held_or_stowed?: number;
      ignored?: number;
    };
    group?: string;
    hardness?: number;
    hp?: number;
    hp_max?: number;
    broken_threshold?: number;
    is_shoddy?: boolean; // TODO: Rules for this
    unselectable?: boolean;
    quantity?: number;
    material?: {
      grade?: string;
      type?: string;
    };
    range?: number;
    reload?: string;
    runes?: {
      striking?: number;
      resilient?: number;
      potency?: number;
      property?: { name: string; id: number }[];
    };
    foundry: {
      rules?: Record<string, any>;
      tags?: Record<string, any>;
      bonus?: number;
      bonus_damage?: number;
      container_id?: string;
      splash_damage?: number;
      stack_group?: string;
      items?: Record<string, any>[];
    };
  };
  operations?: Operation[];
  content_source_id: number;
  version: string;
}

interface InventoryItem {
  id: string;
  item: Item;
  is_formula: boolean;
  is_equipped: boolean;
  is_invested: boolean;
  container_contents: InventoryItem[];
}
interface Inventory {
  coins: {
    cp: number;
    sp: number;
    gp: number;
    pp: number;
  };
  // unarmed_attacks: {
  //   item: Item;
  // }[];
  items: InventoryItem[];
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
  heightened?: {
    text: {
      amount: string;
      text: string;
    }[];
    data: Record<string, any>; // TODO
  };
  meta_data: {
    damage?: Record<string, any>;
    type?: string;
    ritual?: Record<string, any>;
    foundry?: Record<string, any>;
    unselectable?: boolean;
    image_url?: string;
  };
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
  operations?: Operation[] | undefined;
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
    unselectable?: boolean;
    skill?: string | string[];
    image_url?: string;
    // auto_adjustments?: Record<string, string>; TODO:
    foundry?: Record<string, any>;
  };
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
  inventory?: Inventory;
  notes?: {
    pages: {
      name: string;
      icon: string;
      color: string;
      contents: JSONContent;
    }[];
  };
  details?: {
    image_url?: string;
    background_image_url?: string;
    sheet_theme?: {
      color: string;
    };
    ancestry?: Ancestry;
    background?: Background;
    class?: Class;
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
      ethnicity?: string;
      nationality?: string;
      birthplace?: string;
      organized_play_id?: string;
    };
    conditions?: Condition[];
  };
  campaign_id?: number;
  roll_history?: Record<string, any>; // TODO
  custom_operations?: Operation[];
  meta_data?: {
    reset_hp?: boolean;
  };
  options?: {
    is_public?: boolean;
    auto_detect_prerequisites?: boolean;
    auto_heighten_spells?: boolean;
    class_archetypes?: boolean;
    custom_operations?: boolean;
    ignore_bulk_limit?: boolean;
  };
  variants?: {
    ancestry_paragon?: boolean;
    proficiency_without_level?: boolean;
    proficiency_half_level?: boolean;
    stamina?: boolean;
    free_archetype?: boolean;
    dual_class?: boolean;
  };
  content_sources?: {
    enabled?: number[];
  };
  operation_data?: {
    selections?: Record<string, string>; // background_<selector op UUID>.. -> <select option op UUID>
    notes?: Record<string, string>; // <op UUID> -> string
  };
  spells?: {
    slots: SpellSlot[];
    list: SpellListEntry[];
    // List of ritual spells, by id
    rituals: number[];
    // The number of focus points
    focus_point_current: number;
    // Used for tracking how many times an innate spell has been cast
    innate_casts: SpellInnateEntry[];
  };
  companions?: Record<string, any>; // TODO
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

interface ContentSource {
  id: number;
  created_at: string;
  name: string;
  foundry_id: string;
  url: string;
  description: string;
  operations?: Operation[];
  user_id: string;
  contact_info: string;
  require_key: boolean;
  is_published: boolean;
  required_content_sources: number[];
  group: string;
  meta_data?: {
    counts?: Record<ContentType | AbilityBlockType, number>;
  };
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
  artwork_url: string;
  operations: Operation[] | undefined;
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
