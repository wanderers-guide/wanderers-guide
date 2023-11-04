
import { Variable, VariableType } from "@typing/variables";
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
} from './variable-utils';
import _ from "lodash";
import { throwError } from "@utils/notifications";

const DEFAULT_VARIABLES: Record<string, Variable> = {
  ATTRIBUTE_STR: newVariable('attr', 'ATTRIBUTE_STR'),
  ATTRIBUTE_DEX: newVariable('attr', 'ATTRIBUTE_DEX'),
  ATTRIBUTE_CON: newVariable('attr', 'ATTRIBUTE_CON'),
  ATTRIBUTE_INT: newVariable('attr', 'ATTRIBUTE_INT'),
  ATTRIBUTE_WIS: newVariable('attr', 'ATTRIBUTE_WIS'),
  ATTRIBUTE_CHA: newVariable('attr', 'ATTRIBUTE_CHA'),

  SAVE_FORT: newVariable('prof', 'SAVE_FORT'),
  SAVE_REFLEX: newVariable('prof', 'SAVE_REFLEX'),
  SAVE_WILL: newVariable('prof', 'SAVE_WILL'),

  SKILL_ACROBATICS: newVariable('prof', 'SKILL_ACROBATICS'),
  SKILL_ARCANA: newVariable('prof', 'SKILL_ARCANA'),
  SKILL_ATHLETICS: newVariable('prof', 'SKILL_ATHLETICS'),
  SKILL_CRAFTING: newVariable('prof', 'SKILL_CRAFTING'),
  SKILL_DECEPTION: newVariable('prof', 'SKILL_DECEPTION'),
  SKILL_DIPLOMACY: newVariable('prof', 'SKILL_DIPLOMACY'),
  SKILL_INTIMIDATION: newVariable('prof', 'SKILL_INTIMIDATION'),
  SKILL_MEDICINE: newVariable('prof', 'SKILL_MEDICINE'),
  SKILL_NATURE: newVariable('prof', 'SKILL_NATURE'),
  SKILL_OCCULTISM: newVariable('prof', 'SKILL_OCCULTISM'),
  SKILL_PERFORMANCE: newVariable('prof', 'SKILL_PERFORMANCE'),
  SKILL_RELIGION: newVariable('prof', 'SKILL_RELIGION'),
  SKILL_SOCIETY: newVariable('prof', 'SKILL_SOCIETY'),
  SKILL_STEALTH: newVariable('prof', 'SKILL_STEALTH'),
  SKILL_SURVIVAL: newVariable('prof', 'SKILL_SURVIVAL'),
  SKILL_THIEVERY: newVariable('prof', 'SKILL_THIEVERY'),

  SPELL_ATTACK_ARCANE: newVariable('prof', 'SPELL_ATTACK_ARCANE'),
  SPELL_ATTACK_DIVINE: newVariable('prof', 'SPELL_ATTACK_DIVINE'),
  SPELL_ATTACK_OCCULT: newVariable('prof', 'SPELL_ATTACK_OCCULT'),
  SPELL_ATTACK_PRIMAL: newVariable('prof', 'SPELL_ATTACK_PRIMAL'),

  SPELL_DC_ARCANE: newVariable('prof', 'SPELL_DC_ARCANE'),
  SPELL_DC_DIVINE: newVariable('prof', 'SPELL_DC_DIVINE'),
  SPELL_DC_OCCULT: newVariable('prof', 'SPELL_DC_OCCULT'),
  SPELL_DC_PRIMAL: newVariable('prof', 'SPELL_DC_PRIMAL'),

  LIGHT_ARMOR: newVariable('prof', 'LIGHT_ARMOR'),
  MEDIUM_ARMOR: newVariable('prof', 'MEDIUM_ARMOR'),
  HEAVY_ARMOR: newVariable('prof', 'HEAVY_ARMOR'),
  UNARMORED_DEFENSE: newVariable('prof', 'UNARMORED_DEFENSE'),

  SIMPLE_WEAPONS: newVariable('prof', 'SIMPLE_WEAPONS'),
  MARTIAL_WEAPONS: newVariable('prof', 'MARTIAL_WEAPONS'),
  ADVANCED_WEAPONS: newVariable('prof', 'ADVANCED_WEAPONS'),
  UNARMED_ATTACKS: newVariable('prof', 'UNARMED_ATTACKS'),

  PERCEPTION: newVariable('prof', 'PERCEPTION'),
  CLASS_DC: newVariable('prof', 'CLASS_DC'),
  LEVEL: newVariable('num', 'LEVEL'),
  //FOCUS_POINTS: newVariable('num', 'FOCUS_POINTS'),

  MAX_HEALTH: newVariable('num', 'MAX_HEALTH'),
  MAX_HEALTH_PER_LEVEL: newVariable('num', 'MAX_HEALTH_PER_LEVEL'),
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
  SENSES: newVariable('list-str', 'SENSES'),
  CLASSES: newVariable('list-str', 'CLASSES'),
  ANCESTRIES: newVariable('list-str', 'ANCESTRIES'),
  BACKGROUNDS: newVariable('list-str', 'BACKGROUNDS'),
  HERITAGES: newVariable('list-str', 'HERITAGES'),
  FEATS: newVariable('list-str', 'FEATS'),
  SPELLS: newVariable('list-str', 'SPELLS'),
  LANGUAGES: newVariable('list-str', 'LANGUAGES'),
  CLASS_FEATURES: newVariable('list-str', 'CLASS_FEATURES'),
  //

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

  // WEAPON_XXX: newVariable("str", "WEAPON_XXX"),

  // RESISTANCES: newVariable("str", "RESISTANCES"),
  // WEAKNESSES: newVariable("str", "WEAKNESSES"),
};

let variables = _.cloneDeep(DEFAULT_VARIABLES);

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
export function getVariable(name: string) {
  return _.cloneDeep(variables[name]);
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
  defaultValue?: any
) {
  const variable = newVariable(type, name, defaultValue);
  variables[variable.name] = variable;
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
}

/**
 * Sets a variable to a given value
 * @param name - name of the variable to set
 * @param value - can be a number, string, boolean, AttributeValue, or ProficiencyType
 */
export function setVariable(name: string, value: any) {
  let variable = variables[name];
  if (isVariableNum(variable) && _.isNumber(value)) {
    variable.value = value;
  } else if (isVariableStr(variable) && _.isString(value)) {
    variable.value = value;
  } else if (isVariableBool(variable) && _.isBoolean(value)) {
    variable.value = value;
  } else if (isVariableListStr(variable) && isListStr(value)) {
    variable.value = _.uniq(value);
  } else if (isVariableAttr(variable) && isAttributeValue(value)) {
    variable.value.value = value.value;
    variable.value.partial = value.partial;
  } else if (isVariableProf(variable) && isProficiencyType(value)) {
    variable.value.value = value;
  } else {
    throwError(`Invalid value for variable: ${name}, ${value}`);
  }
}

/**
 * Adjusts a variable by a given amount
 * @param name - name of the variable to adjust
 * @param amount - can be a number, string, or boolean
 */
export function adjVariable(name: string, amount: any) {
  let variable = variables[name];
  if (isVariableNum(variable) && _.isNumber(amount)) {
    variable.value += amount;
  } else if (isVariableStr(variable) && _.isString(amount)) {
    variable.value += amount;
  } else if (isVariableBool(variable) && _.isBoolean(amount)) {
    variable.value = variable.value && amount;
  } else if (isVariableAttr(variable) && _.isNumber(amount)) {
    if (amount !== 0 && amount !== 1 && amount !== -1) {
      throwError(`Invalid variable adjustment amount for attribute: ${amount} (must be 0, 1, or -1)`);
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
  } else if (isVariableProf(variable) && isProficiencyType(amount)) {
    variable.value.value = maxProficiencyType(variable.value.value, amount);
  } else {
    throwError(`Invalid adjust amount for variable: ${name}, ${amount}`);
  }
}
