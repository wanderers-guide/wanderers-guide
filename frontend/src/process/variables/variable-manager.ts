import {
  Variable,
  VariableAttr,
  VariableProf,
  VariableType,
  VariableValue,
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
} from './variable-utils';
import _ from 'lodash';
import { throwError } from '@utils/notifications';

const DEFAULT_VARIABLES: Record<string, Variable> = {
  PAGE_CONTEXT: newVariable('str', 'PAGE_CONTEXT', 'OUTSIDE'),

  ATTRIBUTE_STR: newVariable('attr', 'ATTRIBUTE_STR'),
  ATTRIBUTE_DEX: newVariable('attr', 'ATTRIBUTE_DEX'),
  ATTRIBUTE_CON: newVariable('attr', 'ATTRIBUTE_CON'),
  ATTRIBUTE_INT: newVariable('attr', 'ATTRIBUTE_INT'),
  ATTRIBUTE_WIS: newVariable('attr', 'ATTRIBUTE_WIS'),
  ATTRIBUTE_CHA: newVariable('attr', 'ATTRIBUTE_CHA'),

  SAVE_FORT: newVariable('prof', 'SAVE_FORT', { value: 'U', attribute: 'ATTRIBUTE_CON' }),
  SAVE_REFLEX: newVariable('prof', 'SAVE_REFLEX', { value: 'U', attribute: 'ATTRIBUTE_DEX' }),
  SAVE_WILL: newVariable('prof', 'SAVE_WILL', { value: 'U', attribute: 'ATTRIBUTE_WIS' }),

  SKILL_ACROBATICS: newVariable('prof', 'SKILL_ACROBATICS', {
    value: 'U',
    attribute: 'ATTRIBUTE_DEX',
  }),
  SKILL_ARCANA: newVariable('prof', 'SKILL_ARCANA', { value: 'U', attribute: 'ATTRIBUTE_INT' }),
  SKILL_ATHLETICS: newVariable('prof', 'SKILL_ATHLETICS', {
    value: 'U',
    attribute: 'ATTRIBUTE_STR',
  }),
  SKILL_CRAFTING: newVariable('prof', 'SKILL_CRAFTING', { value: 'U', attribute: 'ATTRIBUTE_INT' }),
  SKILL_DECEPTION: newVariable('prof', 'SKILL_DECEPTION', {
    value: 'U',
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_DIPLOMACY: newVariable('prof', 'SKILL_DIPLOMACY', {
    value: 'U',
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_INTIMIDATION: newVariable('prof', 'SKILL_INTIMIDATION', {
    value: 'U',
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_MEDICINE: newVariable('prof', 'SKILL_MEDICINE', { value: 'U', attribute: 'ATTRIBUTE_WIS' }),
  SKILL_NATURE: newVariable('prof', 'SKILL_NATURE', { value: 'U', attribute: 'ATTRIBUTE_WIS' }),
  SKILL_OCCULTISM: newVariable('prof', 'SKILL_OCCULTISM', {
    value: 'U',
    attribute: 'ATTRIBUTE_INT',
  }),
  SKILL_PERFORMANCE: newVariable('prof', 'SKILL_PERFORMANCE', {
    value: 'U',
    attribute: 'ATTRIBUTE_CHA',
  }),
  SKILL_RELIGION: newVariable('prof', 'SKILL_RELIGION', { value: 'U', attribute: 'ATTRIBUTE_WIS' }),
  SKILL_SOCIETY: newVariable('prof', 'SKILL_SOCIETY', { value: 'U', attribute: 'ATTRIBUTE_INT' }),
  SKILL_STEALTH: newVariable('prof', 'SKILL_STEALTH', { value: 'U', attribute: 'ATTRIBUTE_DEX' }),
  SKILL_SURVIVAL: newVariable('prof', 'SKILL_SURVIVAL', { value: 'U', attribute: 'ATTRIBUTE_WIS' }),
  SKILL_THIEVERY: newVariable('prof', 'SKILL_THIEVERY', { value: 'U', attribute: 'ATTRIBUTE_DEX' }),
  SKILL_LORE____: newVariable('prof', 'SKILL_LORE____', { value: 'U', attribute: 'ATTRIBUTE_INT' }),

  SPELL_ATTACK: newVariable('prof', 'SPELL_ATTACK'), // TODO: add attribute
  SPELL_DC: newVariable('prof', 'SPELL_DC'), // TODO: add attribute

  LIGHT_ARMOR: newVariable('prof', 'LIGHT_ARMOR'),
  MEDIUM_ARMOR: newVariable('prof', 'MEDIUM_ARMOR'),
  HEAVY_ARMOR: newVariable('prof', 'HEAVY_ARMOR'),
  UNARMORED_DEFENSE: newVariable('prof', 'UNARMORED_DEFENSE'),

  SIMPLE_WEAPONS: newVariable('prof', 'SIMPLE_WEAPONS'),
  MARTIAL_WEAPONS: newVariable('prof', 'MARTIAL_WEAPONS'),
  ADVANCED_WEAPONS: newVariable('prof', 'ADVANCED_WEAPONS'),
  UNARMED_ATTACKS: newVariable('prof', 'UNARMED_ATTACKS'),

  PERCEPTION: newVariable('prof', 'PERCEPTION', { value: 'U', attribute: 'ATTRIBUTE_WIS' }),
  CLASS_DC: newVariable('prof', 'CLASS_DC'), // TODO: add attribute
  LEVEL: newVariable('num', 'LEVEL'),
  SIZE: newVariable('str', 'SIZE'),
  CORE_LANGUAGE_NAMES: newVariable('list-str', 'CORE_LANGUAGE_NAMES'),
  //FOCUS_POINTS: newVariable('num', 'FOCUS_POINTS'),

  MAX_HEALTH_ANCESTRY: newVariable('num', 'MAX_HEALTH_ANCESTRY'),
  MAX_HEALTH_CLASS_PER_LEVEL: newVariable('num', 'MAX_HEALTH_CLASS_PER_LEVEL'),
  MAX_HEALTH_BONUS: newVariable('num', 'MAX_HEALTH_BONUS'),
  HEALTH: newVariable('num', 'HEALTH'),
  TEMP_HEALTH: newVariable('num', 'TEMP_HEALTH'),

  AC: newVariable('num', 'AC'),
  ARMOR_CHECK_PENALTY: newVariable('num', 'ARMOR_CHECK_PENALTY'),
  ARMOR_SPEED_PENALTY: newVariable('num', 'ARMOR_SPEED_PENALTY'),
  DEX_CAP: newVariable('num', 'DEX_CAP'),
  UNARMORED: newVariable('bool', 'UNARMORED'),

  SPEED: newVariable('num', 'SPEED'),
  SPEED_FLY: newVariable('num', 'SPEED_FLY'),
  SPEED_CLIMB: newVariable('num', 'SPEED_CLIMB'),
  SPEED_BURROW: newVariable('num', 'SPEED_BURROW'),
  SPEED_SWIM: newVariable('num', 'SPEED_SWIM'),

  // List variables, just storing the names
  SENSE_NAMES: newVariable('list-str', 'SENSE_NAMES'),
  CLASS_NAMES: newVariable('list-str', 'CLASS_NAMES'),
  ANCESTRY_NAMES: newVariable('list-str', 'ANCESTRY_NAMES'),
  BACKGROUND_NAMES: newVariable('list-str', 'BACKGROUND_NAMES'),
  HERITAGE_NAMES: newVariable('list-str', 'HERITAGE_NAMES'),
  FEAT_NAMES: newVariable('list-str', 'FEAT_NAMES'),
  SPELL_NAMES: newVariable('list-str', 'SPELL_NAMES'),
  LANGUAGE_NAMES: newVariable('list-str', 'LANGUAGE_NAMES'),
  CLASS_FEATURE_NAMES: newVariable('list-str', 'CLASS_FEATURE_NAMES'),
  PHYSICAL_FEATURE_NAMES: newVariable('list-str', 'PHYSICAL_FEATURE_NAMES'),
  //
  // List variables, storing the IDs
  SENSE_IDS: newVariable('list-str', 'SENSE_IDS'),
  CLASS_IDS: newVariable('list-str', 'CLASS_IDS'),
  ANCESTRY_IDS: newVariable('list-str', 'ANCESTRY_IDS'),
  BACKGROUND_IDS: newVariable('list-str', 'BACKGROUND_IDS'),
  HERITAGE_IDS: newVariable('list-str', 'HERITAGE_IDS'),
  FEAT_IDS: newVariable('list-str', 'FEAT_IDS'),
  SPELL_IDS: newVariable('list-str', 'SPELL_IDS'),
  LANGUAGE_IDS: newVariable('list-str', 'LANGUAGE_IDS'),
  CLASS_FEATURE_IDS: newVariable('list-str', 'CLASS_FEATURE_IDS'),
  PHYSICAL_FEATURE_IDS: newVariable('list-str', 'PHYSICAL_FEATURE_IDS'),

  // BULK_LIMIT: newVariable("num", "BULK_LIMIT"),
  // INVEST_LIMIT: newVariable("num", "INVEST_LIMIT"),

  // ATTACKS: newVariable("num", "ATTACKS"),
  // ATTACKS_DMG_DICE: newVariable("str", "ATTACKS_DMG_DICE"),
  // ATTACKS_DMG_BONUS: newVariable("num", "ATTACKS_DMG_BONUS"),

  // MELEE_ATTACKS: newVariable("num", "MELEE_ATTACKS"),
  // MELEE_ATTACKS_DMG_DICE: newVariable("str", "MELEE_ATTACKS_DMG_DICE"),
  // MELEE_ATTACKS_DMG_BONUS: newVariable("num", "MELEE_ATTACKS_DMG_BONUS"),
  // AGILE_MELEE_ATTACKS_DMG_BONUS: newVariable("num", "AGILE_MELEE_ATTACKS_DMG_BONUS"),
  // NON_AGILE_MELEE_ATTACKS_DMG_BONUS: newVariable("num", "NON_AGILE_MELEE_ATTACKS_DMG_BONUS"),

  // RANGED_ATTACKS: newVariable("num", "RANGED_ATTACKS"),
  // RANGED_ATTACKS_DMG_DICE: newVariable("str", "RANGED_ATTACKS_DMG_DICE"),
  // RANGED_ATTACKS_DMG_BONUS: newVariable("num", "RANGED_ATTACKS_DMG_BONUS"),

  // WEAPON____: newVariable("str", "WEAPON____"),
  // WEAPON_GROUP____: newVariable("str", "WEAPON_GROUP____"),

  // RESISTANCES: newVariable("str", "RESISTANCES"),
  // WEAKNESSES: newVariable("str", "WEAKNESSES"),
};

let variables = _.cloneDeep(DEFAULT_VARIABLES);
let variableBonuses: Record<
  string,
  { value?: number; type?: string; text: string; source: string; timestamp: number }[]
> = {};
let variableHistory: Record<
  string,
  { to: VariableValue; from: VariableValue | null; source: string; timestamp: number }[]
> = {};

// 2_status_
// +2 status bonus
// Map<string, { value?: number, type: string, text: string }[]>

/**
 * Gets all variables
 * @returns - all variables
 */
export function getVariables() {
  return _.cloneDeep(variables);
}

/**
 * Gets a variable
 * @param name - name of the variable to get
 * @returns - the variable
 */
export function getVariable<T = Variable>(name: string): T | null {
  return _.cloneDeep(variables[name]) as T | null;
}

/**
 * Gets the bonuses for a variable
 * @param name - name of the variable to get
 * @returns - the bonus array
 */
export function getVariableBonuses(name: string) {
  return _.cloneDeep(variableBonuses[name]) ?? [];
}

export function addVariableBonus(
  name: string,
  value: number | undefined,
  type: string | undefined,
  text: string,
  source: string
) {
  if (!variableBonuses[name]) {
    variableBonuses[name] = [];
  }
  variableBonuses[name].push({ value, type, text, source, timestamp: Date.now() });
}

/**
 * Gets the history for a variable
 * @param name - name of the variable to get
 * @returns - the bonus array
 */
export function getVariableHistory(name: string) {
  return _.cloneDeep(variableHistory[name]) ?? [];
}

function addVariableHistory(
  name: string,
  to: VariableValue,
  from: VariableValue | null,
  source: string
) {
  if (!variableHistory[name]) {
    variableHistory[name] = [];
  }
  variableHistory[name].push({ to, from, source, timestamp: Date.now() });
}

/**
 * Adds a variable
 * @param type - type of the variable
 * @param name - name of the variable
 * @param defaultValue - optional, default value of the variable
 * @returns - the variable that was added
 */
export function addVariable(
  type: VariableType,
  name: string,
  defaultValue?: VariableValue,
  source?: string
) {
  const variable = newVariable(type, name, defaultValue);
  variables[variable.name] = variable;

  // Add to history
  addVariableHistory(variable.name, variable.value, null, source ?? 'Created');

  return _.cloneDeep(variable);
}

/**
 * Removes a variable
 * @param name - name of the variable to remove
 */
export function removeVariable(name: string) {
  delete variables[name];
}

/**
 * Resets all variables to their default values
 */
export function resetVariables() {
  variables = _.cloneDeep(DEFAULT_VARIABLES);
  variableBonuses = {};
  variableHistory = {};
}

/**
 * Sets a variable to a given value
 * @param name - name of the variable to set
 * @param value - VariableValue
 */
export function setVariable(name: string, value: VariableValue, source?: string) {
  let variable = variables[name];
  const oldValue = _.cloneDeep(variable.value);

  if (!variable) throwError(`Invalid variable name: ${name}`);
  if (isVariableNum(variable) && _.isNumber(+value)) {
    variable.value = parseInt(`${value}`);
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
  } else if (isVariableProf(variable) && isProficiencyType(value)) {
    variable.value = value;
  } else {
    throwError(`Invalid value for variable: ${name}, ${value}`);
  }

  // Add to history
  addVariableHistory(variable.name, variable.value, oldValue, source ?? 'Updated');
}

/**
 * Adjusts a variable by a given amount
 * @param name - name of the variable to adjust
 * @param amount - can be a number, string, or boolean
 */
export function adjVariable(name: string, amount: any, source?: string) {
  let variable = variables[name];
  const oldValue = _.cloneDeep(variable.value);

  if (!variable) throwError(`Invalid variable name: ${name}`);
  if (isVariableNum(variable) && _.isNumber(+amount)) {
    variable.value += parseInt(amount);
  } else if (isVariableStr(variable) && _.isString(amount)) {
    variable.value += amount;
  } else if (isVariableBool(variable) && _.isBoolean(amount)) {
    variable.value = variable.value && amount;
  } else if (isVariableAttr(variable) && _.isNumber(+amount)) {
    amount = parseInt(amount);
    if (amount !== 0 && amount !== 1 && amount !== -1) {
      throwError(
        `Invalid variable adjustment amount for attribute: ${amount} (must be 0, 1, or -1)`
      );
    }
    // Add boosts or flaws, use partial if it's a boost and value is 4+
    if (variable.value.value >= 4 && amount === 1) {
      if (variable.value.partial) {
        variable.value.value += 1;
        variable.value.partial = false;
      } else {
        variable.value.partial = true;
      }
    } else {
      variable.value.value += amount;
    }
  } else if (isVariableListStr(variable) && _.isString(amount)) {
    variable.value = _.uniq([...variable.value, amount]);
  } else if (isVariableProf(variable)) {
    if (isProficiencyType(amount)) {
      variable.value = maxProficiencyType(variable.value, amount);
    } else if (isExtendedProficiencyType(amount)) {
      if (amount === '1') {
        variable.value = nextProficiencyType(variable.value) ?? variable.value;
      } else if (amount === '-1') {
        variable.value = prevProficiencyType(variable.value) ?? variable.value;
      } else {
        throwError(`Invalid adjust amount for prof: ${name}, ${amount}`);
      }
    }
  } else {
    throwError(`Invalid adjust amount for variable: ${name}, ${amount}`);
  }

  // Add to history
  addVariableHistory(variable.name, variable.value, oldValue, source ?? 'Adjusted');
}

export function getAllSkillVariables(): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables())) {
    if (variable.name.startsWith('SKILL_')) {
      variables.push(variable);
    }
  }
  return variables as VariableProf[];
}

export function getAllSaveVariables(): VariableProf[] {
  const variables = [];
  for (const variable of Object.values(getVariables())) {
    if (variable.name.startsWith('SAVE_')) {
      variables.push(variable);
    }
  }
  return variables as VariableProf[];
}

export function getAllAttributeVariables(): VariableAttr[] {
  const variables = [];
  for (const variable of Object.values(getVariables())) {
    if (variable.name.startsWith('ATTRIBUTE_')) {
      variables.push(variable);
    }
  }
  return variables as VariableAttr[];
}
