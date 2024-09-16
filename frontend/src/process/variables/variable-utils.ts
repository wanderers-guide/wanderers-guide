import { throwError } from '@utils/notifications';
import * as _ from 'lodash-es';
import { isBoolean, isNumber, isString } from 'lodash-es';
import {
  AttributeValue,
  ExtendedProficiencyType,
  ExtendedProficiencyValue,
  ProficiencyType,
  ProficiencyValue,
  StoreID,
  Variable,
  VariableAttr,
  VariableBool,
  VariableListStr,
  VariableNum,
  VariableProf,
  VariableStr,
  VariableType,
  VariableValue,
} from 'src/typing/variables';
import { getVariables } from './variable-manager';
import { evaluate, to } from 'mathjs/number';
import { getFinalVariableValue } from './variable-display';
import { titleCase } from 'title-case';
import { toLabel } from '@utils/strings';

export function newVariable(type: VariableType, name: string, defaultValue?: VariableValue): Variable {
  if (type === 'attr') {
    return {
      name,
      type,
      value: {
        value: isAttributeValue(defaultValue) ? defaultValue.value : 0,
        partial: isAttributeValue(defaultValue) ? defaultValue.partial : false,
      },
    } satisfies VariableAttr;
  }
  if (type === 'num') {
    return {
      name,
      type,
      value: isNumber(defaultValue) ? defaultValue : 0,
    } satisfies VariableNum;
  }
  if (type === 'str') {
    return {
      name,
      type,
      value: isString(defaultValue) ? defaultValue : '',
    } satisfies VariableStr;
  }
  if (type === 'bool') {
    return {
      name,
      type,
      value: isBoolean(defaultValue) ? defaultValue : false,
    } satisfies VariableBool;
  }
  if (type === 'prof') {
    return {
      name,
      type,
      value: {
        value: isProficiencyValue(defaultValue) ? defaultValue.value : 'U',
        increases: isProficiencyValue(defaultValue) ? defaultValue.increases : 0,
        attribute: isProficiencyValue(defaultValue) ? defaultValue.attribute : undefined,
      },
    } satisfies VariableProf;
  }
  if (type === 'list-str') {
    return {
      name,
      type,
      value: isListStr(defaultValue) ? defaultValue : [],
    } satisfies VariableListStr;
  }
  throwError(`Invalid variable type: ${type}`);
  return {} as Variable;
}

export function variableToLabel(variable: Variable) {
  return toLabel(variable.name);
}

export function labelToVariable(label: string, trim = true) {
  if (trim) {
    label = label.trim();
  }
  let cleanedString = label
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z_\s]/g, '');
  cleanedString = cleanedString.replace(/\s+/g, '_');
  return cleanedString;
}

export function compactLabels(text: string) {
  const OVERRIDE_CHANGES = {
    Fortitude: 'Fort',
    Strength: 'Str',
    Dexterity: 'Dex',
    Constitution: 'Con',
    Intelligence: 'Int',
    Wisdom: 'Wis',
    Charisma: 'Cha',
  };
  let label = text.trim();
  for (const [key, value] of Object.entries(OVERRIDE_CHANGES)) {
    label = label.replace(key, value);
  }
  return label;
}

export function lengthenLabels(text: string) {
  const OVERRIDE_CHANGES = {
    Fort: 'Fortitude',

    Str: 'Strength',
    Dex: 'Dexterity',
    Con: 'Constitution',
    Int: 'Intelligence',
    Wis: 'Wisdom',
    Cha: 'Charisma',

    STR: 'Strength',
    DEX: 'Dexterity',
    CON: 'Constitution',
    INT: 'Intelligence',
    WIS: 'Wisdom',
    CHA: 'Charisma',
  };
  let label = text.trim();
  for (const [key, value] of Object.entries(OVERRIDE_CHANGES)) {
    label = label.replace(key, value);
  }
  return label;
}

export function maxProficiencyType(profType1: ProficiencyType, profType2: ProficiencyType): ProficiencyType {
  const convertToNum = (profType: ProficiencyType) => {
    if (profType === 'U') return 0;
    if (profType === 'T') return 1;
    if (profType === 'E') return 2;
    if (profType === 'M') return 3;
    if (profType === 'L') return 4;
    throwError(`Invalid proficiency type: ${profType}`);
    return 0;
  };
  return convertToNum(profType1) > convertToNum(profType2) ? profType1 : profType2;
}

export function compileProficiencyType(prof: ProficiencyValue | undefined) {
  if (!prof) return 'U';
  let value = prof.value;
  const positive = prof.increases > 0;
  for (let i = 0; i < Math.abs(prof.increases); i++) {
    if (positive) {
      value = nextProficiencyType(value) ?? value;
    } else {
      value = prevProficiencyType(value) ?? value;
    }
  }
  return value;
}

export function isProficiencyTypeGreaterOrEqual(profType1: ProficiencyType, profType2: ProficiencyType) {
  return maxProficiencyType(profType1, profType2) === profType1;
}

export function proficiencyTypeToModifier(profType: ProficiencyType) {
  if (profType === 'U') return 0;
  if (profType === 'T') return 2;
  if (profType === 'E') return 4;
  if (profType === 'M') return 6;
  if (profType === 'L') return 8;
  throwError(`Invalid proficiency type: ${profType}`);
  return 0;
}

export function nextProficiencyType(profType: ProficiencyType): ProficiencyType | null {
  if (profType === 'U') return 'T';
  if (profType === 'T') return 'E';
  if (profType === 'E') return 'M';
  if (profType === 'M') return 'L';
  if (profType === 'L') return null;
  throwError(`Invalid proficiency type: ${profType}`);
  return 'U';
}

export function prevProficiencyType(profType: ProficiencyType): ProficiencyType | null {
  if (profType === 'U') return null;
  if (profType === 'T') return 'U';
  if (profType === 'E') return 'T';
  if (profType === 'M') return 'E';
  if (profType === 'L') return 'M';
  throwError(`Invalid proficiency type: ${profType}`);
  return 'U';
}

export function proficiencyTypeToLabel(type: ProficiencyType | ExtendedProficiencyType) {
  if (type === 'U') return 'Untrained';
  if (type === 'T') return 'Trained';
  if (type === 'E') return 'Expert';
  if (type === 'M') return 'Master';
  if (type === 'L') return 'Legendary';
  if (type === '1') return 'increase';
  if (type === '-1') return 'decrease';
  throwError(`Invalid extended proficiency type: ${type}`);
  return '';
}

export function labelToProficiencyType(label: string): ProficiencyType | null {
  const type = label.trim().toUpperCase();
  if (type === 'UNTRAINED') return 'U';
  if (type === 'TRAINED') return 'T';
  if (type === 'EXPERT') return 'E';
  if (type === 'MASTER') return 'M';
  if (type === 'LEGENDARY') return 'L';
  return null;
}

export function findVariable<T = Variable>(id: StoreID, type: VariableType, label: string): T | null {
  const VAR_FORMATTED = labelToVariable(label);
  const variable = Object.values(getVariables(id)).find(
    (variable) =>
      variable.type === type && (variable.name === VAR_FORMATTED || variable.name.endsWith(`_${VAR_FORMATTED}`))
  );
  return (variable ?? null) as T | null;
}

export function getProficiencyTypeValue(profType: ProficiencyType) {
  if (profType === 'U') return 0;
  if (profType === 'T') return 2;
  if (profType === 'E') return 4;
  if (profType === 'M') return 6;
  if (profType === 'L') return 8;
  throwError(`Invalid proficiency type: ${profType}`);
  return 0;
}

export function isProficiencyValue(value: any): value is ProficiencyValue {
  return isProficiencyType(value?.value) && (isString(value?.attribute) || value?.attribute === undefined);
}
export function isExtendedProficiencyValue(value: any): value is ExtendedProficiencyValue {
  return isExtendedProficiencyType(value?.value) && (isString(value?.attribute) || value?.attribute === undefined);
}
export function isAttributeValue(value: any): value is AttributeValue {
  return isNumber(value?.value) && (isBoolean(value?.partial) || value?.partial === undefined);
}
export function isProficiencyType(value?: any): value is ProficiencyType {
  return ['U', 'T', 'E', 'M', 'L'].includes(value ?? '');
}
export function isExtendedProficiencyType(value?: string): value is ExtendedProficiencyType {
  return ['U', 'T', 'E', 'M', 'L', '1', '-1'].includes(value ?? '');
}
export function isListStr(value?: any): value is string[] {
  if (_.isString(value)) {
    try {
      value = JSON.parse(value);
    } catch (e) {
      value = null;
    }
  }
  return Array.isArray(value) && value.every((v) => isString(v));
}

export function isVariableNum(value: Variable | any): value is VariableNum {
  return (value as VariableNum).type === 'num';
}
export function isVariableStr(value: Variable | any): value is VariableStr {
  return (value as VariableStr).type === 'str';
}
export function isVariableBool(value: Variable | any): value is VariableBool {
  return (value as VariableBool).type === 'bool';
}
export function isVariableProf(value: Variable | any): value is VariableProf {
  return (value as VariableProf).type === 'prof';
}
export function isVariableAttr(value: Variable | any): value is VariableAttr {
  return (value as VariableAttr).type === 'attr';
}
export function isVariableListStr(value: Variable | any): value is VariableListStr {
  return (value as VariableListStr).type === 'list-str';
}

/**
 * Compiles various mathmatical expressions in a string, converting variables to their values as well.
 * @param id - The store ID.
 * @param text - The text to compile.
 * @param round - Whether to round the final value down.
 */
export function compileExpressions(id: StoreID, text?: string, round = false) {
  if (!text?.trim()) return text;
  const expressions = text.match(/{{[^}]+}}/g);
  if (!expressions) return text;

  const variables = Object.keys(getVariables(id));

  for (const expression of expressions) {
    let compiledExpression = expression.slice(2, -2);
    compiledExpression = compiledExpression.replace(/\\/g, '');
    for (const variable of variables) {
      if (variable.trim() === '') continue;
      if (compiledExpression.toUpperCase().includes(variable.toUpperCase())) {
        const finalValue = getFinalVariableValue(id, variable).total;
        compiledExpression = compiledExpression.replace(new RegExp(`\\b${variable}\\b`, 'gi'), finalValue.toString());
      }
    }

    try {
      let evaluatedExpression = evaluate(compiledExpression);
      if (round && isNumber(evaluatedExpression)) {
        // Always round down in TTRPGs
        evaluatedExpression = Math.floor(evaluatedExpression);
      }
      text = text.replace(expression, evaluatedExpression);
    } catch (e) {
      console.error(e);
      text = text.replace(expression, '<< ERROR >>');
    }
  }

  return text;
}
