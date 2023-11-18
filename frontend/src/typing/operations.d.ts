
import { Variable, AttributeValue, ProficiencyType } from "./variables";
import { AbilityBlockType, Rarity } from './content';

export type Operation =
  | OperationAdjValue
  | OperationSetValue
  | OperationCreateValue
  | OperationGiveAbilityBlock
  | OperationRemoveAbilityBlock
  | OperationConditional
  | OperationSelect
  | OperationGiveLanguage
  | OperationRemoveLanguage
  | OperationGiveSpell
  | OperationRemoveSpell;
export type OperationType =
  | "adjValue"
  | "setValue"
  | "createValue"
  | "giveAbilityBlock"
  | "removeAbilityBlock"
  | "giveLanguage"
  | "removeLanguage"
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
  readonly type: 'conditional';
  data: {
    conditions: ConditionalCheckData[];
    trueOperations?: Operation[];
    falseOperations?: Operation[];
  };
}

export type ConditionCheckData = {
  name: string;
  data?: Variable;
  operator: ConditionOperator;
  value: string;
};

export type ConditionOperator = '' | 'INCLUDES' | 'EQUALS' | 'NOT_EQUALS' | 'LESS_THAN' | 'GREATER_THAN';

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

export interface OperationGiveLanguage extends OperationBase {
  readonly type: 'giveLanguage';
  data: {
    languageId: number;
  };
}

export interface OperationRemoveLanguage extends OperationBase {
  readonly type: 'removeLanguage';
  data: {
    languageId: number;
  };
}

export interface OperationSelect extends OperationBase {
  readonly type: 'select';
  data: {
    title?: string;
    description?: string;// Not used
    modeType: 'PREDEFINED' | 'FILTERED';
    optionType: OperationSelectOptionType;
    optionsPredefined?: OperationSelectOption[];
    optionsFilters?: OperationSelectFilters;
  };
}

export type OperationSelectOptionType =
  | 'CUSTOM'
  | 'ABILITY_BLOCK'
  | 'SPELL'
  | 'LANGUAGE'
  | 'ADJ_VALUE';

/**
 * OperationSelectOption
 */
export type OperationSelectOption =
  | OperationSelectOptionCustom
  | OperationSelectOptionAbilityBlock
  | OperationSelectOptionSpell
  | OperationSelectOptionAdjValue
  | OperationSelectOptionLanguage;

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

interface OperationSelectOptionLanguage extends OperationSelectOptionBase {
  readonly type: 'LANGUAGE';
  operation: OperationGiveLanguage;
}

interface OperationSelectOptionAdjValue extends OperationSelectOptionBase {
  readonly type: 'ADJ_VALUE';
  operation: OperationAdjValue;
}


/**
 * OperationSelectFilter
 */
export type OperationSelectFilters =
  | OperationSelectFiltersAbilityBlock
  | OperationSelectFiltersSpell
  | OperationSelectFiltersLanguage;

interface OperationSelectFiltersBase {
  readonly id: string;
  readonly type: OperationSelectOptionType;
}

interface OperationSelectFiltersAbilityBlock extends OperationSelectFiltersBase {
  readonly type: 'ABILITY_BLOCK';
  level: {
    min?: number;
    max?: number;
  },
  traits?: string[];
  // TODO: add more filters
}

interface OperationSelectFiltersSpell extends OperationSelectFiltersBase {
  readonly type: 'SPELL';
  level: {
    min?: number;
    max?: number;
  };
  traits?: string[];
  traditions?: string[];
  // TODO: add more filters
}

interface OperationSelectFiltersLanguage extends OperationSelectFiltersBase {
  readonly type: 'LANGUAGE';
  rarity?: Rarity;
  core?: boolean;
}
