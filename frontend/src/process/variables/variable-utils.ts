import { ActionCost } from "@typing/content";
import { throwError } from "@utils/notifications";
import { isBoolean, isNumber, isString } from "lodash";
import {
  Attribute,
  AttributeValue,
  Proficiency,
  ProficiencyType,
  Variable,
  VariableAttr,
  VariableBool,
  VariableListStr,
  VariableNum,
  VariableProf,
  VariableStr,
  VariableType,
} from "src/typing/variables";

export function newVariable(
  type: VariableType,
  name: string,
  defaultValue?: any
): Variable {
  if (type === "attr") {
    return {
      name,
      type,
      value: {
        type: "attribute",
        value: isAttributeValue(defaultValue) ? defaultValue.value : 0,
        partial: isAttributeValue(defaultValue) ? defaultValue.partial : false,
      },
    } satisfies VariableAttr;
  }
  if (type === "num") {
    return {
      name,
      type,
      value: isNumber(defaultValue) ? defaultValue : 0,
    } satisfies VariableNum;
  }
  if (type === "str") {
    return {
      name,
      type,
      value: isString(defaultValue) ? defaultValue : "",
    } satisfies VariableStr;
  }
  if (type === "bool") {
    return {
      name,
      type,
      value: isBoolean(defaultValue) ? defaultValue : false,
    } satisfies VariableBool;
  }
  if (type === "prof") {
    return {
      name,
      type,
      value: {
        type: "proficiency",
        value: isProficiencyType(defaultValue) ? defaultValue : "U",
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

export function maxProficiencyType(
  profType1: ProficiencyType,
  profType2: ProficiencyType
): ProficiencyType {
  const convertToNum = (profType: ProficiencyType) => {
    if (profType === "U") return 0;
    if (profType === "T") return 1;
    if (profType === "E") return 2;
    if (profType === "M") return 3;
    if (profType === "L") return 4;
    throwError(`Invalid proficiency type: ${profType}`);
    return 0;
  };
  return convertToNum(profType1) > convertToNum(profType2)
    ? profType1
    : profType2;
}

export function isAttribute(value: Attribute | any): value is Attribute {
  return (value as Attribute).type === "attribute";
}
export function isAttributeValue(value: any): value is AttributeValue {
  return isNumber(value?.value) && isBoolean(value?.partial);
}
export function isProficiency(value: Proficiency | any): value is Proficiency {
  return (value as Proficiency).type === "proficiency";
}
export function isProficiencyType(value?: string): value is ProficiencyType {
  return ["U", "T", "E", "M", "L"].includes(value ?? "");
}
export function isActionCost(value: string | null): value is ActionCost {
  return [
    "ONE-ACTION",
    "TWO-ACTIONS",
    "THREE-ACTIONS",
    "REACTION",
    "FREE-ACTION",
    "ONE-TO-TWO-ACTIONS",
    "ONE-TO-THREE-ACTIONS",
    "TWO-TO-THREE-ACTIONS",
    null,
  ].includes(value);
}
export function isListStr(value?: string[]): value is string[] {
  return Array.isArray(value) && value.every((v) => isString(v));
};

export function isVariableNum(value: Variable | any): value is VariableNum {
  return (value as VariableNum).type === "num";
}
export function isVariableStr(value: Variable | any): value is VariableStr {
  return (value as VariableStr).type === "str";
}
export function isVariableBool(value: Variable | any): value is VariableBool {
  return (value as VariableBool).type === "bool";
}
export function isVariableProf(value: Variable | any): value is VariableProf {
  return (value as VariableProf).type === "prof";
}
export function isVariableAttr(value: Variable | any): value is VariableAttr {
  return (value as VariableAttr).type === "attr";
}
export function isVariableListStr(value: Variable | any): value is VariableListStr {
  return (value as VariableListStr).type === 'list-str';
}