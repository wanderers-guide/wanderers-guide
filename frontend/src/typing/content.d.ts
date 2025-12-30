import { Operation } from './operations';
import { ProficiencyType } from './variables';

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
  archetypes: Archetype[];
  versatileHeritages: VersatileHeritage[];
  classArchetypes: ClassArchetype[];
  sources?: ContentSource[];
};

type Availability = 'STANDARD' | 'LIMITED' | 'RESTRICTED';
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
type AbilityBlockType = 'action' | 'feat' | 'physical-feature' | 'sense' | 'class-feature' | 'heritage' | 'mode';
type ContentType =
  | 'trait'
  | 'item'
  | 'spell'
  | 'class'
  | 'archetype'
  | 'versatile-heritage'
  | 'class-archetype'
  | 'ability-block'
  | 'creature'
  | 'ancestry'
  | 'background'
  | 'language'
  | 'content-source';

interface SpellSlotRecord extends SpellSlot {
  id: string;
}

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

type SpellSectionType = 'PREPARED' | 'SPONTANEOUS' | 'FOCUS' | 'INNATE' | 'RITUAL' | 'STAFF' | 'WAND';

interface Trait {
  id: number;
  created_at: string;
  name: string;
  description: string;
  meta_data?: {
    deprecated?: boolean;
    important?: boolean;
    creature_trait?: boolean;
    unselectable?: boolean;
    class_trait?: boolean;
    ancestry_trait?: boolean;
    archetype_trait?: boolean;
    versatile_heritage_trait?: boolean;
    companion_type_trait?: boolean;
  };
  content_source_id: number;
}

interface Condition {
  name: string;
  description: string;
  value?: number;
  source?: string;
  for_object: boolean;
  for_creature: boolean;
  pathfinder_only?: boolean;
  starfinder_only?: boolean;
}

type ItemGroup = 'GENERAL' | 'WEAPON' | 'ARMOR' | 'SHIELD' | 'RUNE' | 'UPGRADE' | 'MATERIAL';
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
  meta_data?: {
    deprecated?: boolean;
    image_url?: string;
    base_item?: string;
    base_item_content?: Item;
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
    charges?: {
      current?: number;
      max?: number;
    };
    container_default_items?: { id: number; name: string; quantity: number }[];
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
      property?: { name: string; id: number; rune?: Item }[];
    };
    starfinder?: {
      capacity?: string;
      usage?: number;
      grade?: 'COMMERCIAL' | 'TACTICAL' | 'ADVANCED' | 'SUPERIOR' | 'ELITE' | 'ULTIMATE' | 'PARAGON';
      slots?: { name: string; id: number; upgrade?: Item }[];
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
  is_implanted: boolean;
  container_contents: InventoryItem[];
}
interface Inventory {
  coins: {
    cp: number;
    sp: number;
    gp: number;
    pp: number;
  };
  items: InventoryItem[];
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
  heightened?: {
    text: {
      amount: string;
      text: string;
    }[];
    data: Record<string, any>; // TODO
  };
  meta_data: {
    focus?: boolean;
    damage?: Record<string, any>;
    type?: string;
    ritual?: Record<string, any>;
    foundry?: Record<string, any>;
    unselectable?: boolean;
    deprecated?: boolean;
    image_url?: string;
  };
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
  deprecated?: boolean;
  content_source_id: number;
  version: string;
}

interface ClassArchetype {
  id: number;
  created_at: string;
  class_id: number;
  name: string;
  rarity: Rarity;
  description: string;
  artwork_url: string;
  operations?: Operation[] | undefined;
  feature_adjustments?: {
    fa_id: string;
    type: 'ADD' | 'REPLACE' | 'REMOVE';
    prev_id?: number;
    data?: AbilityBlock;
  }[];
  content_source_id: number;
  deprecated?: boolean;
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
  deprecated?: boolean;
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
  deprecated?: boolean;
  version: string;
  heritage_id: number;
}

interface AbilityBlock {
  id: number;
  created_at: string;
  operations?: Operation[] | undefined;
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
  meta_data?: {
    unselectable?: boolean;
    deprecated?: boolean;
    can_select_multiple_times?: boolean;
    skill?: string | string[];
    image_url?: string;
    // auto_adjustments?: Record<string, string>; TODO:
    foundry?: Record<string, any>;
  };
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
    active_modes?: string[];
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
    adjustment?: 'ELITE' | 'WEAK';
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
    api_clients?: {
      client_access: { publicUserId: string; clientId: string; addedAt: number }[];
    };
    ancestry?: Ancestry;
    background?: Background;
    class?: Class;
    class_archetype?: ClassArchetype;
    class_2?: Class;
    class_archetype_2?: ClassArchetype;
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
    automatic_bonus_progression?: boolean;
  };
  content_sources?: {
    enabled?: number[];
  };
  companions?: {
    list?: Creature[];
  };
}

interface Campaign {
  id: number;
  created_at: string;
  user_id: string;
  name: string;
  description?: string;
  join_key: string;
  notes?: {
    pages: {
      name: string;
      icon: string;
      color: string;
      contents: JSONContent;
    }[];
  };
  recommended_options?: {
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
  recommended_variants?: {
    ancestry_paragon?: boolean;
    proficiency_without_level?: boolean;
    proficiency_half_level?: boolean;
    stamina?: boolean;
    free_archetype?: boolean;
    dual_class?: boolean;
    gradual_attribute_boosts?: boolean;
    automatic_bonus_progression?: boolean;
  };
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

interface CampaignSessionIdea {
  name: string;
  outline: string;
  actions: {
    name: string;
    description: string;
    type: 'NPC' | 'ENCOUNTER';
  }[];
}

interface CampaignNPC {
  name: string;
  description: string;
  level: number;
  class: string;
  background: string;
  ancestry: string;
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

interface Combatant {
  _id: string;
  type: 'CREATURE' | 'CHARACTER';
  ally: boolean;
  initiative: number | undefined;
  creature?: Creature;
  character?: number;
  data?: LivingEntity;
}

interface PublicUser {
  id: number;
  user_id: string;
  created_at: string;
  display_name: string;
  image_url?: string;
  background_image_url?: string;
  site_theme?: {
    color?: string;
    dyslexia_font?: boolean;
    view_operations?: boolean;
    zoom?: number;
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
  api?: {
    clients?: {
      id: string;
      name: string;
      description?: string;
      image_url?: string;
      api_key: string;
    }[];
  }; // oauth/access?client_id={}&character_id={}
  // Open a confirm access page.
  // Adds the { publicUserId, clientId }
  deactivated: boolean;
  summary?: string;
  organized_play_id?: string;
  subscribed_content_sources?: { source_id: number; source_name: string; added_at: string }[];
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
  deprecated?: boolean;
  required_content_sources?: number[];
  group: string;
  artwork_url?: string;
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
  deprecated?: boolean;
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
  deprecated?: boolean;
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
  deprecated?: boolean;
  rarity: Rarity;
  availability?: Availability;
};

type SenseWithRange = {
  sense?: AbilityBlock;
  senseName: string;
  range: string;
  type?: 'precise' | 'imprecise' | 'vague';
};

type Dice = {
  id: string;
  type: string;
  theme: string;
  bonus: number;
  label: string;
};

interface SocietyAdventureEntry {
  id?: string;
  name?: string;
  event?: string;
  event_code?: string;
  date?: number;
  character_level?: number;
  gm_organized_play_id?: string;
  chronicle_code?: string;
  boons?: string;
  xp_gained?: number;
  rep_gained?: number;
  items_snapshot: Item[];
  conditions_snapshot: Condition[];
  items_sold: Item[];
  items_bought: Item[];
  items_total_buy?: number;
  items_total_sell?: number;
  items_total_extra?: number;
  conditions_gained: Condition[];
  conditions_cleared: Condition[];
  notes?: string;
}
