import {
  findTraitByName,
  getContent,
  getContentStore,
  getEnabledContentSourceIds,
} from '@content/content-controller';
import { AbilityBlock, Language, Spell } from '@typing/content';
import {
  OperationType,
  OperationGiveAbilityBlock,
  OperationAdjValue,
  OperationSetValue,
  OperationCreateValue,
  OperationConditional,
  OperationSelect,
  OperationGiveSpell,
  OperationRemoveAbilityBlock,
  OperationRemoveSpell,
  OperationGiveLanguage,
  OperationRemoveLanguage,
  OperationSelectFilters,
  OperationSelectFiltersAbilityBlock,
  OperationSelectFiltersSpell,
  OperationSelectFiltersLanguage,
  OperationSelectOption,
  OperationSelectOptionType,
  OperationSelectOptionAbilityBlock,
  OperationSelectOptionSpell,
  OperationSelectOptionLanguage,
  OperationSelectOptionAdjValue,
  OperationSelectOptionCustom,
  Operation,
} from '@typing/operations';
import _, { filter } from 'lodash';

export const createDefaultOperation = (type: OperationType) => {
  if (type === 'giveAbilityBlock') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        type: 'feat',
        abilityBlockId: -1,
      },
    } satisfies OperationGiveAbilityBlock;
  } else if (type === 'adjValue') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        variable: '',
        value: 0,
      },
    } satisfies OperationAdjValue;
  } else if (type === 'setValue') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        variable: '',
        value: false,
      },
    } satisfies OperationSetValue;
  } else if (type === 'createValue') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        variable: '',
        value: '',
        type: 'str',
      },
    } satisfies OperationCreateValue;
  } else if (type === 'conditional') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        conditions: [],
        trueOperations: undefined,
        falseOperations: undefined,
      },
    } satisfies OperationConditional;
  } else if (type === 'select') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        title: '',
        description: '',
        modeType: 'PREDEFINED',
        optionType: 'ABILITY_BLOCK',
        optionsPredefined: [],
        optionsFilters: undefined,
        // {
        //   id: crypto.randomUUID(),
        //   type: 'ABILITY_BLOCK',
        //   level: {
        //     min: undefined,
        //     max: undefined,
        //   },
        //   traits: undefined,
        // },
      },
    } satisfies OperationSelect;
  } else if (type === 'giveSpell') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        spellId: -1,
      },
    } satisfies OperationGiveSpell;
  } else if (type === 'removeAbilityBlock') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        type: 'feat',
        abilityBlockId: -1,
      },
    } satisfies OperationRemoveAbilityBlock;
  } else if (type === 'removeSpell') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        spellId: -1,
      },
    } satisfies OperationRemoveSpell;
  } else if (type === 'giveLanguage') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        languageId: -1,
      },
    } satisfies OperationGiveLanguage;
  } else if (type === 'removeLanguage') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        languageId: -1,
      },
    } satisfies OperationRemoveLanguage;
  } else {
    throw new Error(`Unknown operation type: ${type}`);
  }
};

export interface ObjectWithUUID {
  [key: string]: any;
  _select_uuid: string;
}

export async function determineFilteredSelectionList(
  operationUUID: string,
  filters: OperationSelectFilters
): Promise<ObjectWithUUID[]> {
  if (filters.type === 'ABILITY_BLOCK') {
    return await getAbilityBlockList(operationUUID, filters);
  } else if (filters.type === 'SPELL') {
    return await getSpellList(operationUUID, filters);
  } else if (filters.type === 'LANGUAGE') {
    return await getLanguageList(operationUUID, filters);
  }
  return [];
}

async function getAbilityBlockList(
  operationUUID: string,
  filters: OperationSelectFiltersAbilityBlock
) {
  let abilityBlocks = [...(await getContentStore<AbilityBlock>('ability-block')).values()];

  if (filters.level.min !== undefined) {
    abilityBlocks = abilityBlocks.filter(
      (ab) => ab.level !== undefined && ab.level >= filters.level.min!
    );
  }
  if (filters.level.max !== undefined) {
    abilityBlocks = abilityBlocks.filter(
      (ab) => ab.level !== undefined && ab.level >= filters.level.max!
    );
  }
  if (filters.traits !== undefined) {
    const traits = await Promise.all(
      filters.traits.map((trait) => findTraitByName(trait, getEnabledContentSourceIds()))
    );
    const traitIds = traits.filter((trait) => trait).map((trait) => trait!.id);

    // Filter out ability blocks that don't have all the traits
    abilityBlocks = abilityBlocks.filter((ab) => {
      if (!ab.traits && traitIds.length > 0) {
        return false;
      }
      if (
        (!ab.traits && traitIds.length === 0) ||
        (ab.traits && ab.traits.length === 0 && traitIds.length === 0)
      ) {
        return true;
      }
      const intersection = _.intersection(ab.traits ?? [], traitIds);
      return intersection.length === traitIds.length;
    });
  }

  return abilityBlocks.map((ab) => {
    return {
      ...ab,
      _select_uuid: `${operationUUID}~${ab.id}`,
    };
  });
}

async function getSpellList(operationUUID: string, filters: OperationSelectFiltersSpell) {
  let spells = [...(await getContentStore<Spell>('spell')).values()];

  if (filters.level.min !== undefined) {
    spells = spells.filter((spell) => spell.rank >= filters.level.min!);
  }
  if (filters.level.max !== undefined) {
    spells = spells.filter((spell) => spell.rank >= filters.level.max!);
  }
  if (filters.traits !== undefined) {
    const traits = await Promise.all(
      filters.traits.map((trait) => findTraitByName(trait, getEnabledContentSourceIds()))
    );
    const traitIds = traits.filter((trait) => trait).map((trait) => trait!.id);

    // Filter out spells that don't have all the traits
    spells = spells.filter((spell) => {
      if (!spell.traits && traitIds.length > 0) {
        return false;
      }
      if (
        (!spell.traits && traitIds.length === 0) ||
        (spell.traits && spell.traits.length === 0 && traitIds.length === 0)
      ) {
        return true;
      }
      const intersection = _.intersection(spell.traits ?? [], traitIds);
      return intersection.length === traitIds.length;
    });
  }
  if (filters.traditions !== undefined) {
    spells = spells.filter((spell) => {
      const intersection = _.intersection(spell.traditions, filters.traditions ?? []);
      return intersection.length === filters.traditions!.length;
    });
  }

  return spells.map((spell) => {
    return {
      ...spell,
      _select_uuid: `${operationUUID}~${spell.id}`,
    };
  });
}

async function getLanguageList(operationUUID: string, filters: OperationSelectFiltersLanguage) {
  let languages = [...(await getContentStore<Language>('language')).values()];

  if (filters.rarity) {
    languages = languages.filter((language) => language.rarity === filters.rarity);
  }
  if (filters.core) {
    // TODO: Implement core filter
    //languages = languages.filter((language) => language.core === filters.core);
  }

  return languages.map((language) => {
    return {
      ...language,
      _select_uuid: `${operationUUID}~${language.id}`,
    };
  });
}

export async function determinePredefinedSelectionList(
  type: OperationSelectOptionType,
  options: OperationSelectOption[]
): Promise<ObjectWithUUID[]> {
  if (type === 'ABILITY_BLOCK') {
    return await getAbilityBlockPredefinedList(options as OperationSelectOptionAbilityBlock[]);
  } else if (type === 'SPELL') {
    return await getSpellPredefinedList(options as OperationSelectOptionSpell[]);
  } else if (type === 'LANGUAGE') {
    return await getLanguagePredefinedList(options as OperationSelectOptionLanguage[]);
  } else if (type === 'ADJ_VALUE') {
    return await getAdjValuePredefinedList(options as OperationSelectOptionAdjValue[]);
  } else if (type === 'CUSTOM') {
    return await getCustomPredefinedList(options as OperationSelectOptionCustom[]);
  }
  return [];
}

async function getAbilityBlockPredefinedList(options: OperationSelectOptionAbilityBlock[]) {
  const abilityBlocks = await Promise.all(
    options.map((option) =>
      getContent<AbilityBlock>('ability-block', option.operation.data.abilityBlockId)
    )
  );

  const result = [];
  for (const abilityBlock of abilityBlocks) {
    if (abilityBlock) {
      const option = options.find((option) => option.operation.data.abilityBlockId === abilityBlock.id);
      result.push({
        ...abilityBlock,
        _select_uuid: option!.id,
      });
    }
  }
  return result;
}

async function getSpellPredefinedList(options: OperationSelectOptionSpell[]) {
  const spells = await Promise.all(
    options.map((option) => getContent<Spell>('spell', option.operation.data.spellId))
  );

  const result = [];
  for (const spell of spells) {
    if (spell) {
      const option = options.find((option) => option.operation.data.spellId === spell.id);
      result.push({
        ...spell,
        _select_uuid: option!.id,
      });
    }
  }
  return result;
}

async function getLanguagePredefinedList(options: OperationSelectOptionLanguage[]) {
  const languages = await Promise.all(
    options.map((option) => getContent<Language>('language', option.operation.data.languageId))
  );

  const result = [];
  for (const language of languages) {
    if (language) {
      const option = options.find((option) => option.operation.data.languageId === language.id);
      result.push({
        ...language,
        _select_uuid: option!.id,
      });
    }
  }
  return result;
}

async function getAdjValuePredefinedList(options: OperationSelectOptionAdjValue[]) {
  return options.map((option) => {
    return {
      _select_uuid: option.operation.id,
      value: option.operation.data.value,
      variable: option.operation.data.variable,
    };
  });
}

async function getCustomPredefinedList(options: OperationSelectOptionCustom[]) {
  return options.map((option) => {
    return {
      _select_uuid: option.id,
      title: option.title,
      description: option.description,
      operations: option.operations,
    };
  });
}
