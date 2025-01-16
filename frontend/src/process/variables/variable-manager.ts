import {
  Variable,
  VariableAttr,
  StoreID,
  VariableProf,
  VariableStore,
  VariableType,
  VariableValue,
  VariableNum,
  ExtendedVariableValue,
} from '@typing/variables';
import {
  isAttributeValue,
  isProficiencyType,
  isVariableAttr,
  isVariableBool,
  isVariableNum,
  isVariableProf,
  isVariableStr,
  maxProficiencyType,
  newVariable,
  isListStr,
  isVariableListStr,
  isExtendedProficiencyType,
  nextProficiencyType,
  prevProficiencyType,
  isProficiencyValue,
  isExtendedProficiencyValue,
  compileExpressions,
} from './variable-utils';
import * as _ from 'lodash-es';
import { throwError } from '@utils/notifications';

export const HIDDEN_VARIABLES = [
  'SKILL_LORE____',
  'CASTING_SOURCES',
  'SPELL_SLOTS',
  'SPELL_DATA',
  'PROF_WITHOUT_LEVEL',
  'INJECT_SELECT_OPTIONS',
  'INJECT_TEXT',
];

const DEFAULT_VARIABLES: Record<string, Variable> = {
  ATTRIBUTE_STR: newVariable('attr', 'ATTRIBUTE_STR'),
  ATTRIBUTE_DEX: newVariable('attr', 'ATTRIBUTE_DEX'),
  ATTRIBUTE_CON: newVariable('attr', 'ATTRIBUTE_CON'),
  ATTRIBUTE_INT: newVariable('attr', 'ATTRIBUTE_INT'),
  ATTRIBUTE_WIS: newVariable('attr', 'ATTRIBUTE_WIS'),
  ATTRIBUTE_CHA: newVariable('attr', 'ATTRIBUTE_CHA'),

  SAVE_FORT: newVariable('prof', 'SAVE_FORT', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_CON',
  }),
  SAVE_REFLEX: newVariable('prof', 'SAVE_REFLEX', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_DEX',
  }),
  SAVE_WILL: newVariable('prof', 'SAVE_WILL', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_WIS',
  }),

  SKILL_ACROBATICS: newVariable('prof', 'SKILL_ACROBATICS', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_DEX',
  }),
  SKILL_ARCANA: newVariable('prof', 'SKILL_ARCANA', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_INT',
  }),
  SKILL_ATHLETICS: newVariable('prof', 'SKILL_ATHLETICS', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_STR',
  }),
  SKILL_CRAFTING: newVariable('prof', 'SKILL_CRAFTING', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_INT',
  }),
  SKILL_DECEPTION: newVariable('prof', 'SKILL_DECEPTION', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_DIPLOMACY: newVariable('prof', 'SKILL_DIPLOMACY', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_INTIMIDATION: newVariable('prof', 'SKILL_INTIMIDATION', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_MEDICINE: newVariable('prof', 'SKILL_MEDICINE', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_WIS',
  }),
  SKILL_NATURE: newVariable('prof', 'SKILL_NATURE', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_WIS',
  }),
  SKILL_OCCULTISM: newVariable('prof', 'SKILL_OCCULTISM', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_INT',
  }),
  SKILL_PERFORMANCE: newVariable('prof', 'SKILL_PERFORMANCE', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_RELIGION: newVariable('prof', 'SKILL_RELIGION', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_WIS',
  }),
  SKILL_SOCIETY: newVariable('prof', 'SKILL_SOCIETY', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_INT',
  }),
  SKILL_STEALTH: newVariable('prof', 'SKILL_STEALTH', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_DEX',
  }),
  SKILL_SURVIVAL: newVariable('prof', 'SKILL_SURVIVAL', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_WIS',
  }),
  SKILL_THIEVERY: newVariable('prof', 'SKILL_THIEVERY', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_DEX',
  }),
  SKILL_LORE____: newVariable('prof', 'SKILL_LORE____', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_INT',
  }), // Hidden

  SPELL_ATTACK: newVariable('prof', 'SPELL_ATTACK'),
  SPELL_DC: newVariable('prof', 'SPELL_DC'),
  CASTING_SOURCES: newVariable('list-str', 'CASTING_SOURCES'), // Hidden
  SPELL_SLOTS: newVariable('list-str', 'SPELL_SLOTS'), // Hidden
  SPELL_DATA: newVariable('list-str', 'SPELL_DATA'), // Hidden
  FOCUS_POINT_BONUS: newVariable('num', 'FOCUS_POINT_BONUS'),

  LIGHT_ARMOR: newVariable('prof', 'LIGHT_ARMOR'),
  MEDIUM_ARMOR: newVariable('prof', 'MEDIUM_ARMOR'),
  HEAVY_ARMOR: newVariable('prof', 'HEAVY_ARMOR'),
  UNARMORED_DEFENSE: newVariable('prof', 'UNARMORED_DEFENSE'),

  SIMPLE_WEAPONS: newVariable('prof', 'SIMPLE_WEAPONS'),
  MARTIAL_WEAPONS: newVariable('prof', 'MARTIAL_WEAPONS'),
  ADVANCED_WEAPONS: newVariable('prof', 'ADVANCED_WEAPONS'),
  UNARMED_ATTACKS: newVariable('prof', 'UNARMED_ATTACKS'),

  PERCEPTION: newVariable('prof', 'PERCEPTION', {
    value: 'U',
    increases: 0,
    attribute: 'ATTRIBUTE_WIS',
  }),
  CLASS_DC: newVariable('prof', 'CLASS_DC'),
  LEVEL: newVariable('num', 'LEVEL'),
  SIZE: newVariable('str', 'SIZE'),
  CORE_LANGUAGES: newVariable('list-str', 'CORE_LANGUAGES'),

  PROF_WITHOUT_LEVEL: newVariable('bool', 'PROF_WITHOUT_LEVEL', false), // Hidden

  MAX_HEALTH_ANCESTRY: newVariable('num', 'MAX_HEALTH_ANCESTRY'),
  MAX_HEALTH_CLASS_PER_LEVEL: newVariable('num', 'MAX_HEALTH_CLASS_PER_LEVEL'),
  MAX_HEALTH_BONUS: newVariable('num', 'MAX_HEALTH_BONUS'),

  AC_BONUS: newVariable('num', 'AC_BONUS'),
  // ARMOR_CHECK_PENALTY: newVariable('num', 'ARMOR_CHECK_PENALTY'),
  // ARMOR_SPEED_PENALTY: newVariable('num', 'ARMOR_SPEED_PENALTY'),
  // DEX_CAP: newVariable('num', 'DEX_CAP'),
  // UNARMORED: newVariable('bool', 'UNARMORED'),

  SPEED: newVariable('num', 'SPEED'),
  SPEED_FLY: newVariable('num', 'SPEED_FLY'),
  SPEED_CLIMB: newVariable('num', 'SPEED_CLIMB'),
  SPEED_BURROW: newVariable('num', 'SPEED_BURROW'),
  SPEED_SWIM: newVariable('num', 'SPEED_SWIM'),

  // Senses // use `<NAME>, 30` to indicate a range. Can include variable math
  SENSES_PRECISE: newVariable('list-str', 'SENSES_PRECISE', ['NORMAL_VISION']),
  SENSES_IMPRECISE: newVariable('list-str', 'SENSES_IMPRECISE', ['HEARING']),
  SENSES_VAGUE: newVariable('list-str', 'SENSES_VAGUE', ['SMELL']),

  // Resistances, Weaknesses, and Immunities // use `<NAME>, {{level/2}}` to indicate an amount. Can include variable math
  RESISTANCES: newVariable('list-str', 'RESISTANCES'),
  WEAKNESSES: newVariable('list-str', 'WEAKNESSES'),
  IMMUNITIES: newVariable('list-str', 'IMMUNITIES'),

  // List variables, just storing the names (as uppercase)
  SENSE_NAMES: newVariable('list-str', 'SENSE_NAMES'),
  MODE_NAMES: newVariable('list-str', 'MODE_NAMES'),
  CLASS_NAMES: newVariable('list-str', 'CLASS_NAMES'),
  ANCESTRY_NAMES: newVariable('list-str', 'ANCESTRY_NAMES'),
  BACKGROUND_NAMES: newVariable('list-str', 'BACKGROUND_NAMES'),
  HERITAGE_NAMES: newVariable('list-str', 'HERITAGE_NAMES'),
  FEAT_NAMES: newVariable('list-str', 'FEAT_NAMES'),
  SPELL_NAMES: newVariable('list-str', 'SPELL_NAMES'),
  LANGUAGE_NAMES: newVariable('list-str', 'LANGUAGE_NAMES'),
  CLASS_FEATURE_NAMES: newVariable('list-str', 'CLASS_FEATURE_NAMES'),
  PHYSICAL_FEATURE_NAMES: newVariable('list-str', 'PHYSICAL_FEATURE_NAMES'),
  EXTRA_ITEM_NAMES: newVariable('list-str', 'EXTRA_ITEM_NAMES', ['FIST']),

  //
  // List variables, storing the IDs
  SENSE_IDS: newVariable('list-str', 'SENSE_IDS'),
  MODE_IDS: newVariable('list-str', 'MODE_IDS'),
  CLASS_IDS: newVariable('list-str', 'CLASS_IDS'),
  ANCESTRY_IDS: newVariable('list-str', 'ANCESTRY_IDS'),
  BACKGROUND_IDS: newVariable('list-str', 'BACKGROUND_IDS'),
  HERITAGE_IDS: newVariable('list-str', 'HERITAGE_IDS'),
  FEAT_IDS: newVariable('list-str', 'FEAT_IDS'),
  SPELL_IDS: newVariable('list-str', 'SPELL_IDS'),
  LANGUAGE_IDS: newVariable('list-str', 'LANGUAGE_IDS'),
  CLASS_FEATURE_IDS: newVariable('list-str', 'CLASS_FEATURE_IDS'),
  PHYSICAL_FEATURE_IDS: newVariable('list-str', 'PHYSICAL_FEATURE_IDS'),
  EXTRA_ITEM_IDS: newVariable('list-str', 'EXTRA_ITEM_IDS', ['9252']), // Hardcoded Fist ID

  // Used for tracking traits. We create new traits so that they're run first
  //TRAIT_ANCESTRY_<>_IDS: newVariable('num', 'TRAIT_ANCESTRY_<>_IDS'),
  //TRAIT_CLASS_<>_IDS: newVariable('num', 'TRAIT_CLASS_<>_IDS'),
  //TRAIT_ARCHETYPE_<>_IDS: newVariable('num', 'TRAIT_ARCHETYPE_<>_IDS'),

  BULK_LIMIT_BONUS: newVariable('num', 'BULK_LIMIT_BONUS'),
  INVEST_LIMIT_BONUS: newVariable('num', 'INVEST_LIMIT_BONUS'),
  IMPLANT_LIMIT_BONUS: newVariable('num', 'IMPLANT_LIMIT_BONUS'),

  // Injected Selection Options
  INJECT_SELECT_OPTIONS: newVariable('list-str', 'INJECT_SELECT_OPTIONS'), // Hidden

  // Injected Text
  INJECT_TEXT: newVariable('list-str', 'INJECT_TEXT'), // Hidden

  // Blacklisted Ability Blocks
  BLACKLIST_ABILITY_BLOCKS: newVariable('list-str', 'BLACKLIST_ABILITY_BLOCKS'),
  BLACKLIST_TRAITS: newVariable('list-str', 'BLACKLIST_TRAITS'),
  BLACKLIST_SPELLS: newVariable('list-str', 'BLACKLIST_SPELLS'),
  BLACKLIST_ITEMS: newVariable('list-str', 'BLACKLIST_ITEMS'),

  // Specializations
  WEAPON_SPECIALIZATION: newVariable('bool', 'WEAPON_SPECIALIZATION'),
  WEAPON_SPECIALIZATION_GREATER: newVariable('bool', 'WEAPON_SPECIALIZATION_GREATER'),
  ARMOR_SPECIALIZATION_LIGHT: newVariable('bool', 'ARMOR_SPECIALIZATION_LIGHT'),
  ARMOR_SPECIALIZATION_MEDIUM: newVariable('bool', 'ARMOR_SPECIALIZATION_MEDIUM'),
  ARMOR_SPECIALIZATION_HEAVY: newVariable('bool', 'ARMOR_SPECIALIZATION_HEAVY'),

  // Pass WEAPON_GROUP_ in as a list
  WEAPON_CRITICAL_SPECIALIZATIONS: newVariable('list-str', 'WEAPON_CRITICAL_SPECIALIZATIONS'),

  // List of weapon names, group names, or trait IDs
  // All weapons that match are, for the purposes of proficiency, treated as simple weapons if
  // they are martial weapons, and as martial weapons if they are advanced weapons.
  WEAPON_FAMILIARITY: newVariable('list-str', 'WEAPON_FAMILIARITY'),

  // When wielding a weapon you aren't proficient with, treat your level as your proficiency bonus.
  MARTIAL_EXPERIENCE: newVariable('bool', 'MARTIAL_EXPERIENCE'),

  // Ignore the reduction to your Speed from any armor you wear & reduce any speed penalties by 5 feet.
  UNBURDENED_IRON: newVariable('bool', 'UNBURDENED_IRON'),

  // Your proficiency bonus to untrained skills is equal to <>. ex. {{level/2}}
  UNTRAINED_IMPROVISATION: newVariable('str', 'UNTRAINED_IMPROVISATION'),

  // When you take Multilingual, you gain 3 languages instead of 2.
  IMPROVED_MULTILINGUAL: newVariable('bool', 'IMPROVED_MULTILINGUAL'),

  // When you attack with a finesse melee weapon, you can use Dex mod for damage instead of Str mod.
  USE_DEX_FOR_MELEE_FINESSE: newVariable('bool', 'USE_DEX_FOR_MELEE_FINESSE'),

  // The minimum number of damage dice you can have for a weapon.
  MINIMUM_WEAPON_DAMAGE_DICE: newVariable('num', 'MINIMUM_WEAPON_DAMAGE_DICE', 1),

  ATTACK_ROLLS_BONUS: newVariable('num', 'ATTACK_ROLLS_BONUS'),
  ATTACK_DAMAGE_BONUS: newVariable('num', 'ATTACK_DAMAGE_BONUS'),

  DEX_ATTACK_ROLLS_BONUS: newVariable('num', 'DEX_ATTACK_ROLLS_BONUS'),
  DEX_ATTACK_DAMAGE_BONUS: newVariable('num', 'DEX_ATTACK_DAMAGE_BONUS'),
  STR_ATTACK_ROLLS_BONUS: newVariable('num', 'STR_ATTACK_ROLLS_BONUS'),
  STR_ATTACK_DAMAGE_BONUS: newVariable('num', 'STR_ATTACK_DAMAGE_BONUS'),

  RANGED_ATTACK_ROLLS_BONUS: newVariable('num', 'RANGED_ATTACK_ROLLS_BONUS'),
  RANGED_ATTACK_DAMAGE_BONUS: newVariable('num', 'RANGED_ATTACK_DAMAGE_BONUS'),

  MELEE_ATTACK_ROLLS_BONUS: newVariable('num', 'MELEE_ATTACK_ROLLS_BONUS'),
  MELEE_ATTACK_DAMAGE_BONUS: newVariable('num', 'MELEE_ATTACK_DAMAGE_BONUS'),

  WEAPON_GROUP_AXE: newVariable('prof', 'WEAPON_GROUP_AXE'),
  WEAPON_GROUP_BOMB: newVariable('prof', 'WEAPON_GROUP_BOMB'),
  WEAPON_GROUP_BOW: newVariable('prof', 'WEAPON_GROUP_BOW'),
  WEAPON_GROUP_BRAWLING: newVariable('prof', 'WEAPON_GROUP_BRAWLING'),
  WEAPON_GROUP_CLUB: newVariable('prof', 'WEAPON_GROUP_CLUB'),
  WEAPON_GROUP_CROSSBOW: newVariable('prof', 'WEAPON_GROUP_CROSSBOW'),
  WEAPON_GROUP_DART: newVariable('prof', 'WEAPON_GROUP_DART'),
  WEAPON_GROUP_FIREARM: newVariable('prof', 'WEAPON_GROUP_FIREARM'),
  WEAPON_GROUP_FLAIL: newVariable('prof', 'WEAPON_GROUP_FLAIL'),
  WEAPON_GROUP_HAMMER: newVariable('prof', 'WEAPON_GROUP_HAMMER'),
  WEAPON_GROUP_KNIFE: newVariable('prof', 'WEAPON_GROUP_KNIFE'),
  WEAPON_GROUP_PICK: newVariable('prof', 'WEAPON_GROUP_PICK'),
  WEAPON_GROUP_POLEARM: newVariable('prof', 'WEAPON_GROUP_POLEARM'),
  WEAPON_GROUP_SHIELD: newVariable('prof', 'WEAPON_GROUP_SHIELD'),
  WEAPON_GROUP_SLING: newVariable('prof', 'WEAPON_GROUP_SLING'),
  WEAPON_GROUP_SPEAR: newVariable('prof', 'WEAPON_GROUP_SPEAR'),
  WEAPON_GROUP_SWORD: newVariable('prof', 'WEAPON_GROUP_SWORD'),
  WEAPON_GROUP_LASER: newVariable('prof', 'WEAPON_GROUP_LASER'),
  WEAPON_GROUP_PROJECTILE: newVariable('prof', 'WEAPON_GROUP_PROJECTILE'),
  // WEAPON_GROUP____: newVariable('prof', 'WEAPON_GROUP____'),
  // WEAPON____: newVariable('prof', 'WEAPON____'),

  // Divisions are categories of weapons without a specific group.
  // Example: Gun. Which is any ranged weapon with the analog or tech trait.
  WEAPON_DIVISION_GUN: newVariable('prof', 'WEAPON_DIVISION_GUN'),
  WEAPON_DIVISION_GUN_SIMPLE: newVariable('prof', 'WEAPON_DIVISION_GUN_SIMPLE'),
  WEAPON_DIVISION_GUN_MARTIAL: newVariable('prof', 'WEAPON_DIVISION_GUN_MARTIAL'),
  WEAPON_DIVISION_GUN_ADVANCED: newVariable('prof', 'WEAPON_DIVISION_GUN_ADVANCED'),

  ARMOR_GROUP_CLOTH: newVariable('prof', 'ARMOR_GROUP_CLOTH'),
  ARMOR_GROUP_CHAIN: newVariable('prof', 'ARMOR_GROUP_CHAIN'),
  ARMOR_GROUP_COMPOSITE: newVariable('prof', 'ARMOR_GROUP_COMPOSITE'),
  ARMOR_GROUP_LEATHER: newVariable('prof', 'ARMOR_GROUP_LEATHER'),
  ARMOR_GROUP_PLATE: newVariable('prof', 'ARMOR_GROUP_PLATE'),
  // ARMOR_GROUP____: newVariable('prof', 'ARMOR_GROUP____'),
  // ARMOR____: newVariable('prof', 'ARMOR____'),

  PAGE_CONTEXT: newVariable('str', 'PAGE_CONTEXT', 'OUTSIDE'),
  PATHFINDER: newVariable('bool', 'PATHFINDER', false),
  STARFINDER: newVariable('bool', 'STARFINDER', false),
  ORGANIZED_PLAY: newVariable('bool', 'ORGANIZED_PLAY', false),

  ACTIVE_MODES: newVariable('list-str', 'ACTIVE_MODES', []),

  PRIMARY_SHEET_TABS: newVariable('list-str', 'PRIMARY_SHEET_TABS', [
    'skills-actions',
    'inventory',
    'feats-features',
    'details',
    'notes',
  ]),
};

const variableMap = new Map<string, VariableStore>();

// let variables = _.cloneDeep(DEFAULT_VARIABLES);
// let variableBonuses: Record<
//   string,
//   { value?: number; type?: string; text: string; source: string; timestamp: number }[]
// > = {};
// let variableHistory: Record<
//   string,
//   { to: VariableValue; from: VariableValue | null; source: string; timestamp: number }[]
// > = {};

// 2_status_
// +2 status bonus
// Map<string, { value?: number, type: string, text: string }[]>

export function getVariableStore(id: StoreID) {
  if (!variableMap.has(id)) {
    variableMap.set(id, {
      variables: _.cloneDeep(DEFAULT_VARIABLES),
      bonuses: {},
      history: {},
    });
  }
  return variableMap.get(id)!;
}

/**
 * Gets all variables
 * @returns - all variables
 */
export function getVariables(id: StoreID) {
  return getVariableStore(id).variables;
}

/**
 * Gets a variable
 * @param name - name of the variable to get
 * @returns - the variable
 */
export function getVariable<T = Variable>(id: StoreID, name: string): T | null {
  return _.cloneDeep(getVariables(id)[name]) as T | null;
}

/**
 * Gets the bonuses for a variable
 * @param name - name of the variable to get
 * @returns - the bonus array, compiles any string expressions
 */
export function getVariableBonuses(
  id: StoreID,
  name: string
): {
  value?: number | undefined;
  type?: string | undefined;
  text: string;
  source: string;
  timestamp: number;
}[] {
  const rawBonuses = _.cloneDeep(getVariableStore(id).bonuses[name]) ?? [];

  return rawBonuses.map((bonus) => {
    if (_.isString(bonus.value)) {
      const c = parseInt(compileExpressions(id, bonus.value.trim(), true) ?? '');
      return {
        ...bonus,
        value: c,
      };
    }
    return {
      ...bonus,
      value: bonus.value,
    };
  });
}

export function addVariableBonus(
  id: StoreID,
  name: string,
  value: string | number | undefined,
  type: string | undefined,
  text: string,
  source: string
) {
  if (!getVariableStore(id).bonuses[name]) {
    getVariableStore(id).bonuses[name] = [];
  }

  // If there's already a bonus with the same value, type, text, and source, don't add it
  if (
    getVariableStore(id).bonuses[name].some(
      (bonus) => bonus.value === value && bonus.type === type && bonus.text === text && bonus.source === source
    )
  ) {
    return;
  }

  getVariableStore(id).bonuses[name].push({
    value,
    type,
    text,
    source,
    timestamp: Date.now(),
  });
}

/**
 * Gets the history for a variable
 * @param name - name of the variable to get
 * @returns - the bonus array
 */
export function getVariableHistory(id: StoreID, name: string) {
  return _.cloneDeep(getVariableStore(id).history[name]) ?? [];
}

function addVariableHistory(id: StoreID, name: string, to: VariableValue, from: VariableValue, source: string) {
  if (_.isEqual(from, to)) return;
  if (!getVariableStore(id).history[name]) {
    getVariableStore(id).history[name] = [];
  }
  getVariableStore(id).history[name].push({
    to: _.cloneDeep(to),
    from: _.cloneDeep(from),
    source,
    timestamp: Date.now(),
  });
}

/**
 * Adds a variable
 * @param type - type of the variable
 * @param name - name of the variable
 * @param defaultValue - optional, default value of the variable
 * @returns - the variable that was added
 */
export function addVariable(
  id: StoreID,
  type: VariableType,
  name: string,
  defaultValue?: VariableValue,
  source?: string
) {
  let variable = getVariables(id)[name];
  if (variable) {
    // Already exists
    if (defaultValue && type === 'prof') {
      adjVariable(id, name, defaultValue, source);
    }
  } else {
    // New variable
    variable = newVariable(type, name, defaultValue);
    getVariables(id)[variable.name] = variable;

    // Add to history
    //addVariableHistory(variable.name, variable.value, null, source ?? 'Created');
  }
  return _.cloneDeep(variable);
}

/**
 * Removes a variable
 * @param name - name of the variable to remove
 */
export function removeVariable(id: StoreID, name: string) {
  delete getVariables(id)[name];
}

/**
 * Resets all variables to their default values
 */
export function resetVariables(id?: StoreID) {
  if (id) {
    variableMap.delete(id);
  } else {
    variableMap.clear();
  }
}

/**
 * Sets a variable to a given value
 * @param name - name of the variable to set
 * @param value - VariableValue
 */
export function setVariable(id: StoreID, name: string, value: VariableValue, source?: string) {
  let variable = getVariables(id)[name];
  if (!variable) {
    throwError(`Invalid variable name: ${name}`);
  }
  const oldValue = _.cloneDeep(variable.value);

  if (isVariableNum(variable) && _.isNumber(+value)) {
    // Some variables have a special rule where we take the higher value instead of overwriting
    // This is a hack for sure and hopefully won't be too confusing for homebrewers
    // It's to make things like HP for dual-class PCs work
    const SPECIAL_TAKE_HIGHER_VARS = ['MAX_HEALTH_CLASS_PER_LEVEL', getAllSpeedVariables(id).map((v) => v.name)];
    //
    if (SPECIAL_TAKE_HIGHER_VARS.includes(name)) {
      variable.value = Math.max(variable.value, parseInt(`${value}`));
    } else {
      variable.value = parseInt(`${value}`);
    }
  } else if (isVariableStr(variable) && _.isString(value)) {
    variable.value = value;
  } else if (isVariableBool(variable) && _.isBoolean(value)) {
    variable.value = value;
  } else if (isVariableListStr(variable) && isListStr(value)) {
    if (_.isString(value)) {
      value = JSON.parse(value);
    }
    variable.value = _.uniq(value as string[]);
  } else if (isVariableAttr(variable) && isAttributeValue(value)) {
    variable.value.value = value.value;
    variable.value.partial = value.partial;
  } else if (isVariableProf(variable) && isProficiencyValue(value)) {
    if (isProficiencyType(value.value)) {
      variable.value.value = value.value;
    }
    if (value.attribute) {
      variable.value.attribute = value.attribute;
    }
  } else {
    throwError(`Invalid value for variable: ${name}, ${value}`);
  }

  // Add to history
  addVariableHistory(id, variable.name, variable.value, oldValue, source ?? 'Updated');
}

/**
 * Adjusts a variable by a given amount
 * @param name - name of the variable to adjust
 * @param amount - new value to adjust by
 */
export function adjVariable(id: StoreID, name: string, amount: VariableValue | ExtendedVariableValue, source?: string) {
  let variable = getVariables(id)[name];
  if (!variable) {
    throwError(`Invalid variable name: ${name}`);
  }
  const oldValue = _.cloneDeep(variable.value);

  if (isVariableProf(variable)) {
    if (isProficiencyValue(amount) || isExtendedProficiencyValue(amount)) {
      const { value, attribute } = amount;
      if (isProficiencyType(value)) {
        variable.value.value = maxProficiencyType(variable.value.value, value);
      } else if (isExtendedProficiencyType(value)) {
        if (value === '1') {
          variable.value.increases += 1;
        } else if (value === '-1') {
          variable.value.increases -= 1;
        } else {
          throwError(`Invalid adjust amount for extended prof: ${name}, ${JSON.stringify(amount)}`);
        }
      }
      if (attribute) {
        variable.value.attribute = attribute;
      }
    } else {
      throwError(`Invalid adjust amount for prof: ${name}, ${JSON.stringify(amount)}`);
    }
  } else if (isVariableAttr(variable) && isAttributeValue(amount)) {
    if (_.isNumber(+amount.value)) {
      const value = parseInt(`${amount.value}`);
      if (value !== 0 && value !== 1 && value !== -1) {
        throwError(`Invalid variable adjustment amount for attribute: ${value} (must be 0, 1, or -1)`);
      }
      // Add boosts or flaws, use partial if it's a boost and value is 4+
      if (variable.value.value >= 4 && value === 1) {
        if (variable.value.partial) {
          variable.value.value += 1;
          variable.value.partial = false;
        } else {
          variable.value.partial = true;
        }
      } else {
        variable.value.value += value;
      }
    }
    if (amount.partial) {
      variable.value.partial = amount.partial;
    }
  } else if (isVariableNum(variable) && _.isNumber(+amount)) {
    variable.value += parseInt(`${amount}`);
  } else if (isVariableStr(variable) && _.isString(amount)) {
    variable.value += amount;
  } else if (isVariableBool(variable) && _.isBoolean(amount)) {
    variable.value = amount ? true : variable.value;
  } else if (isVariableListStr(variable) && _.isString(amount)) {
    variable.value = _.uniq([...variable.value, amount]);
  } else {
    throwError(`Invalid adjust amount for variable: ${name}, ${JSON.stringify(amount)}`);
  }

  // Add to history
  addVariableHistory(id, variable.name, variable.value, oldValue, source ?? 'Adjusted');
}

export function getAllSkillVariables(id: StoreID): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('SKILL_') && variable.type === 'prof') {
      variables.push(variable);
    }
  }
  return (variables as VariableProf[]).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllSaveVariables(id: StoreID): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('SAVE_') && variable.type === 'prof') {
      variables.push(variable);
    }
  }
  return variables as VariableProf[];
}

export function getAllAttributeVariables(id: StoreID): VariableAttr[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('ATTRIBUTE_') && variable.type === 'attr') {
      variables.push(variable);
    }
  }
  return variables as VariableAttr[];
}

export function getAllWeaponGroupVariables(id: StoreID): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('WEAPON_GROUP_') && variable.type === 'prof') {
      variables.push(variable);
    }
  }
  return variables as VariableProf[];
}

export function getAllArmorGroupVariables(id: StoreID): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('ARMOR_GROUP_') && variable.type === 'prof') {
      variables.push(variable);
    }
  }
  return variables as VariableProf[];
}

export function getAllWeaponVariables(id: StoreID): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('WEAPON_') && !variable.name.startsWith('WEAPON_GROUP_') && variable.type === 'prof') {
      variables.push(variable);
    }
  }
  return variables as VariableProf[];
}

export function getAllArmorVariables(id: StoreID): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('ARMOR_') && !variable.name.startsWith('ARMOR_GROUP_') && variable.type === 'prof') {
      variables.push(variable);
    }
  }
  return variables as VariableProf[];
}

export function getAllSpeedVariables(id: StoreID): VariableNum[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if ((variable.name.startsWith('SPEED_') || variable.name === 'SPEED') && variable.type === 'num') {
      variables.push(variable);
    }
  }
  return variables as VariableNum[];
}

export function getAllAncestryTraitVariables(id: StoreID): VariableNum[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('TRAIT_ANCESTRY_') && variable.type === 'num') {
      variables.push(variable);
    }
  }
  return variables as VariableNum[];
}

export function getAllClassTraitVariables(id: StoreID): VariableNum[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('TRAIT_CLASS_') && variable.type === 'num') {
      variables.push(variable);
    }
  }
  return variables as VariableNum[];
}

export function getAllArchetypeTraitVariables(id: StoreID): VariableNum[] {
  const variables = [];
  for (const variable of Object.values(getVariables(id))) {
    if (variable.name.startsWith('TRAIT_ARCHETYPE_') && variable.type === 'num') {
      variables.push(variable);
    }
  }
  return variables as VariableNum[];
}
