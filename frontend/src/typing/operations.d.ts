
import { Variable, AttributeValue, ProficiencyType } from "./variables";
import { AbilityBlockType } from './content';

export type Operation =
  | OperationAdjValue
  | OperationSetValue
  | OperationCreateValue
  | OperationGiveAbilityBlock
  | OperationRemoveAbilityBlock
  | OperationConditional
  | OperationSelect
  | OperationGiveSpell
  | OperationRemoveSpell;
export type OperationType =
  | "adjValue"
  | "setValue"
  | "createValue"
  | "giveAbilityBlock"
  | "removeAbilityBlock"
  | "conditional"
  | "select"
  | "giveSpell"
  | "removeSpell";


interface OperationBase {
  readonly id: string;
  readonly type: OperationType;
  data: Record<string, any>;
}

export interface OperationAdjValue extends OperationBase {
  readonly type: "adjValue";
  data: {
    variable: string;
    value: number | string | boolean;
  };
}

export interface OperationSetValue extends OperationBase {
  readonly type: "setValue";
  data: {
    variable: string;
    value: number | string | boolean | AttributeValue | ProficiencyType;
  };
}

export interface OperationCreateValue extends OperationBase {
  readonly type: "createValue";
  data: {
    variable: string;
    type: VariableType;
    value: number | string | boolean | AttributeValue | ProficiencyType;
  };
}

export interface OperationGiveAbilityBlock extends OperationBase {
  readonly type: 'giveAbilityBlock';
  data: {
    type: AbilityBlockType; // purely for display purposes
    abilityBlockId: number;
  };
}

export interface OperationRemoveAbilityBlock extends OperationBase {
  readonly type: 'removeAbilityBlock';
  data: {
    type: AbilityBlockType; // purely for display purposes
    abilityBlockId: number;
  };
}

export interface OperationConditional extends OperationBase {
  readonly type: "conditional";
  data: {
    condition: {}; // TODO
    trueOperation?: Operation;
    falseOperation?: Operation;
  };
}

export interface OperationGiveSpell extends OperationBase {
  readonly type: "giveSpell";
  data: {
    spellId: number;
  };
}

export interface OperationRemoveSpell extends OperationBase {
  readonly type: "removeSpell";
  data: {
    spellId: number;
  };
}

export interface OperationSelect extends OperationBase {
  readonly type: "select";
  data: {
    title: string;
    description: string;
    optionType: OperationSelectOptionType;
    options: OperationSelectOption[];
  };
}

/**
 * OperationSelectOption
 */
export type OperationSelectOption =
  | OperationSelectOptionCustom
  | OperationSelectOptionAbilityBlock
  | OperationSelectOptionSpell
  | OperationSelectOptionAttribute
  | OperationSelectOptionLanguage
  | OperationSelectOptionProficiency;
export type OperationSelectOptionType =
  | "CUSTOM"
  | "ABILITY_BLOCK"
  | "SPELL"
  | "ATTRIBUTE"
  | "LANGUAGE"
  | "PROFICIENCY";


interface OperationSelectOptionBase {
  readonly id: string;
  readonly type: OperationSelectOptionType;
}

interface OperationSelectOptionCustom extends OperationSelectOptionBase {
  readonly type: "CUSTOM";
  title: string;
  description: string;
  operations: Operation[];
}

interface OperationSelectOptionAbilityBlock extends OperationSelectOptionBase {
  readonly type: "ABILITY_BLOCK";
  operation: OperationGiveAbilityBlock;
}

interface OperationSelectOptionSpell extends OperationSelectOptionBase {
  readonly type: "SPELL";
  operation: OperationGiveSpell;
}

interface OperationSelectOptionAttribute extends OperationSelectOptionBase {
  readonly type: "ATTRIBUTE";
  operation: OperationAdjValue;
}

interface OperationSelectOptionLanguage extends OperationSelectOptionBase {
  readonly type: "LANGUAGE";
  //operation: OperationSetValue; TODO
}

interface OperationSelectOptionProficiency extends OperationSelectOptionBase {
  readonly type: "PROFICIENCY";
  operation: OperationAdjValue;
}
