export type ProficiencyType = 'U' | 'T' | 'E' | 'M' | 'L';
export type ExtendedProficiencyType = ProficiencyType | '1' | '-1';

export type ProficiencyValue = { value: ProficiencyType; attribute?: string };
export type ExtendedProficiencyValue = { value: ExtendedProficiencyType; attribute?: string };
export type AttributeValue = { value: number; partial?: boolean };

export type StoreID = 'CHARACTER' | string;
export type VariableStore = {
  variables: Record<string, Variable>;
  bonuses: Record<string, { value?: number; type?: string; text: string; source: string; timestamp: number }[]>;
  history: Record<string, { to: VariableValue; from: VariableValue | null; source: string; timestamp: number }[]>;
};

export type Variable = VariableNum | VariableStr | VariableBool | VariableProf | VariableAttr | VariableListStr;
export type VariableType = 'num' | 'str' | 'bool' | 'prof' | 'attr' | 'list-str';
export type VariableValue = number | string | boolean | ProficiencyValue | AttributeValue | string[];

interface VariableBase {
  name: string;
  readonly type: VariableType;
  value: VariableValue;
}

export interface VariableNum extends VariableBase {
  readonly type: 'num';
  value: number;
}

export interface VariableStr extends VariableBase {
  readonly type: 'str';
  value: string;
}

export interface VariableBool extends VariableBase {
  readonly type: 'bool';
  value: boolean;
}

export interface VariableProf extends VariableBase {
  readonly type: 'prof';
  value: ProficiencyValue;
}

export interface VariableAttr extends VariableBase {
  readonly type: 'attr';
  value: AttributeValue;
}

export interface VariableListStr extends VariableBase {
  readonly type: 'list-str';
  value: string[];
}
