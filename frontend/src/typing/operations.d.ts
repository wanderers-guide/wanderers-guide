import {
  Variable,
  VariableType,
  AttributeValue,
  ProficiencyType,
  ExtendedProficiencyValue,
  ExtendedVariableValue,
  VariableValue,
  StoreID,
} from './variables';
import { AbilityBlockType, Rarity, Item, AbilityBlock, ContentSource, ContentType } from './content';
import { OperationResult } from './../process/operations/operation-runner';

export type OperationCharacterResultPackage = {
  contentSourceResults: {
    baseSource: ContentSource;
    baseResults: OperationResult[];
  }[];
  characterResults: OperationResult[];
  classResults: OperationResult[];
  class2Results: OperationResult[];
  classFeatureResults: {
    baseSource: AbilityBlock;
    baseResults: OperationResult[];
  }[];
  ancestryResults: OperationResult[];
  ancestrySectionResults: {
    baseSource: AbilityBlock;
    baseResults: OperationResult[];
  }[];
  backgroundResults: OperationResult[];
  itemResults: {
    baseSource: Item;
    baseResults: OperationResult[];
  }[];
};

export type OperationCreatureResultPackage = {
  creatureResults: OperationResult[];
  abilityResults: {
    baseSource: AbilityBlock;
    baseResults: OperationResult[];
  }[];
  itemResults: {
    baseSource: Item;
    baseResults: OperationResult[];
  }[];
};

export type Operation =
  | OperationAdjValue
  | OperationAddBonusToValue
  | OperationSetValue
  | OperationCreateValue
  | OperationBindValue
  | OperationGiveAbilityBlock
  | OperationRemoveAbilityBlock
  | OperationConditional
  | OperationSelect
  | OperationGiveLanguage
  | OperationRemoveLanguage
  | OperationGiveSpell
  | OperationRemoveSpell
  | OperationGiveSpellSlot
  | OperationGiveItem
  | OperationGiveTrait
  | OperationInjectSelectOption
  | OperationInjectText
  | OperationDefineCastingSource;

export type OperationType =
  | 'adjValue'
  | 'addBonusToValue'
  | 'setValue'
  | 'createValue'
  | 'bindValue'
  | 'giveAbilityBlock'
  | 'removeAbilityBlock'
  | 'giveLanguage'
  | 'removeLanguage'
  | 'conditional'
  | 'select'
  | 'giveSpell'
  | 'removeSpell'
  | 'giveItem'
  | 'giveTrait'
  | 'giveSpellSlot'
  | 'injectSelectOption'
  | 'injectText'
  | 'defineCastingSource';

interface OperationBase {
  readonly id: string;
  readonly type: OperationType;
  data: Record<string, any>;
}

export interface OperationAdjValue extends OperationBase {
  readonly type: 'adjValue';
  data: {
    variable: string;
    value: ExtendedVariableValue;
  };
}

export interface OperationAddBonusToValue extends OperationBase {
  readonly type: 'addBonusToValue';
  data: {
    variable: string;
    value?: number | string;
    type?: string;
    text: string;
  };
}

export interface OperationSetValue extends OperationBase {
  readonly type: 'setValue';
  data: {
    variable: string;
    value: VariableValue;
  };
}

export interface OperationBindValue extends OperationBase {
  readonly type: 'bindValue';
  data: {
    variable: string;
    value: { storeId: StoreID; variable: string };
  };
}

export interface OperationCreateValue extends OperationBase {
  readonly type: 'createValue';
  data: {
    variable: string;
    type: VariableType;
    value: VariableValue;
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
    conditions: ConditionCheckData[];
    trueOperations?: Operation[];
    falseOperations?: Operation[];
  };
}

export type ConditionCheckData = {
  id: string;
  name: string;
  data?: Variable;
  type?: VariableType;
  operator: ConditionOperator;
  value: string;
};

export type ConditionOperator =
  | ''
  | 'INCLUDES'
  | 'NOT_INCLUDES'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'LESS_THAN'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUALS'
  | 'LESS_THAN_OR_EQUALS';

export interface GiveSpellData extends SpellMetadata {
  spellId: number;
}

export type SpellMetadata = {
  type: 'NORMAL' | 'FOCUS' | 'INNATE';
  castingSource?: string;
  rank?: number;
  tradition?: 'ARCANE' | 'OCCULT' | 'PRIMAL' | 'DIVINE';
  casts?: number;
};

export interface OperationGiveSpell extends OperationBase {
  readonly type: 'giveSpell';
  data: GiveSpellData;
}

export interface OperationRemoveSpell extends OperationBase {
  readonly type: 'removeSpell';
  data: {
    spellId: number;
  };
}

export interface OperationGiveSpellSlot extends OperationBase {
  readonly type: 'giveSpellSlot';
  data: {
    castingSource: string;
    slots: { lvl: number; rank: number; amt: number }[];
  };
}

export interface OperationDefineCastingSource extends OperationAdjValue {
  readonly type: 'defineCastingSource';
  data: {
    variable: 'CASTING_SOURCES';
    value: VariableValue;
  };
}

export interface OperationInjectSelectOption extends OperationAdjValue {
  readonly type: 'injectSelectOption';
  data: {
    variable: 'INJECT_SELECT_OPTIONS';
    value: VariableValue;
  };
}

export interface OperationInjectText extends OperationBase {
  readonly type: 'injectText';
  data: {
    type: ContentType | AbilityBlockType;
    id: number;
    text: string;
  };
}

export interface OperationGiveLanguage extends OperationBase {
  readonly type: 'giveLanguage';
  data: {
    languageId: number;
  };
}

export interface OperationGiveItem extends OperationBase {
  readonly type: 'giveItem';
  data: {
    itemId: number;
  };
}

export interface OperationGiveTrait extends OperationBase {
  readonly type: 'giveTrait';
  data: {
    traitId: number;
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
    description?: string; // Not used
    modeType: 'PREDEFINED' | 'FILTERED';
    optionType: OperationSelectOptionType;
    optionsPredefined?: OperationSelectOption[];
    optionsFilters?: OperationSelectFilters;
  };
}

export type OperationSelectOptionType = 'CUSTOM' | 'ABILITY_BLOCK' | 'SPELL' | 'LANGUAGE' | 'TRAIT' | 'ADJ_VALUE';

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

export interface OperationSelectOptionCustom extends OperationSelectOptionBase {
  readonly type: 'CUSTOM';
  title: string;
  description: string;
  operations?: Operation[];
}

interface OperationSelectOptionAbilityBlock extends OperationSelectOptionBase {
  readonly type: 'ABILITY_BLOCK';
  operation: OperationGiveAbilityBlock;
}

interface OperationSelectOptionSpell extends OperationSelectOptionBase {
  readonly type: 'SPELL';
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
  | OperationSelectFiltersLanguage
  | OperationSelectFiltersTrait
  | OperationSelectFiltersAdjValue;

interface OperationSelectFiltersBase {
  readonly id: string;
  readonly type: OperationSelectOptionType;
}

interface OperationSelectFiltersAbilityBlock extends OperationSelectFiltersBase {
  readonly type: 'ABILITY_BLOCK';
  level: {
    min?: number;
    max?: number;
  };
  traits?: (string | number)[];
  abilityBlockType?: AbilityBlockType;
  isFromClass?: boolean;
  isFromAncestry?: boolean;
  isFromArchetype?: boolean;
}

interface OperationSelectFiltersSpell extends OperationSelectFiltersBase {
  readonly type: 'SPELL';
  level: {
    min?: number;
    max?: number;
  };
  traits?: string[];
  traditions?: string[];

  spellData?: SpellMetadata;
}

interface OperationSelectFiltersLanguage extends OperationSelectFiltersBase {
  readonly type: 'LANGUAGE';
  rarity?: Rarity;
  core?: boolean;
}

interface OperationSelectFiltersTrait extends OperationSelectFiltersBase {
  readonly type: 'TRAIT';
  isAncestry?: boolean;
  isCreature?: boolean;
  isClass?: boolean;
}

interface OperationSelectFiltersAdjValue extends OperationSelectFiltersBase {
  readonly type: 'ADJ_VALUE';
  group: 'ATTRIBUTE' | 'SKILL' | 'ADD-LORE' | 'WEAPON-GROUP' | 'WEAPON' | 'ARMOR-GROUP' | 'ARMOR';
  value: VariableValue | ExtendedProficiencyValue;
}
