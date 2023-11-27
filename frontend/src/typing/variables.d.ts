
export interface Proficiency {
  readonly type: "proficiency";
  value: ProficiencyType;
}
export type ProficiencyType = "U" | "T" | "E" | "M" | "L";
export type ExtendedProficiencyType = ProficiencyType | '1' | '-1';

export interface Attribute {
  readonly type: "attribute";
  value: number;
  partial: boolean;
}
export type AttributeValue = { value: number; partial: boolean };

export type Variable = VariableNum | VariableStr | VariableBool | VariableProf | VariableAttr | VariableListStr;
export type VariableType = "num" | "str" | "bool" | "prof" | "attr" | "list-str";

interface VariableBase {
  name: string;
  readonly type: VariableType;
  value: number | string | boolean | Proficiency | Attribute;
}

export interface VariableNum extends VariableBase {
  readonly type: "num";
  value: number;
  isId?: boolean;
}

export interface VariableStr extends VariableBase {
  readonly type: "str";
  value: string;
}

export interface VariableBool extends VariableBase {
  readonly type: "bool";
  value: boolean;
}

export interface VariableProf extends VariableBase {
  readonly type: "prof";
  value: Proficiency;
}

export interface VariableAttr extends VariableBase {
  readonly type: "attr";
  value: Attribute;
}

export interface VariableListStr extends VariableBase {
  readonly type: 'list-str';
  value: string[];
}
