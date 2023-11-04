import {
  OperationAdjValue,
  OperationConditional,
  OperationCreateValue,
  OperationGiveAbilityBlock,
  OperationGiveSpell,
  OperationRemoveAbilityBlock,
  OperationRemoveSpell,
  OperationSelect,
  OperationSetValue,
  OperationType,
} from '@typing/operations';
import _ from 'lodash';

export function runOperations() {
  /*
    Algo:

    - Run value creation for content_source
    - Run value creation for character
    - Run value creation for class
    - Run value creation for ancestry
    - Run value creation for background
    - Run value creation for items

    (skip value creation for these)
    - Run content_source
    - Run character
    - Run class
    - Run ancestry
    - Run background
    - Run items

    - Run conditionals content_source
    - Run conditionals character
    - Run conditionals class
    - Run conditionals ancestry
    - Run conditionals background
    - Run conditionals items


    Operation Selections:

    We only need metadata for the select operator.!!
    Needs to save that we had a selection somewhere, needs to support nested selects.

    ## Key -> Value
    The key doesn't use index anywhere, which is good - it means that metadata won't ever be applies out of sync.

    - Primary Source ID (ex. ancestry-hertiage). Anywhere we start to execute operations needs to have a unique primary source ID.
    - Select operation UUID. Can be multiple, separated by "_"

    ex.
    - background_<UUID>
    - ancestry-heritage_<UUID>_<UUID>_<UUID>
      algo.
        Ancestry heritage has an operation runner with that unique primary source ID.
        Check the operations for a select with the first UUID. If no option is selected


  */

  setSelections([
    {
      key: 'ancestry-heritage_1_34_67',
      value: 9,
    },
    {
      key: 'ancestry-heritage_1',
      value: 1,
    },
    {
      key: 'ancestry-heritage_2_45',
      value: 13,
    },
    {
      key: 'ancestry-heritage_1_45',
      value: 10,
    },
    {
      key: 'ancestry-heritage_1_45_3',
      value: 8,
    },
    {
      key: 'ancestry-heritage',
      value: 22,
    },
  ]);

}


interface SelectionTreeNode {
  value: number | null;
  children: Record<string, SelectionTreeNode>;
}

const selectionTree: SelectionTreeNode = { value: null, children: {} };

/**
 * 
 * @param key - Key, format: <primary source ID>_<UUID>_<UUID>_<UUID>...
 * @param value - Index of selection option array choice
 *                (TODO: Should this be the operation's UUID instead?)
 */
function setSelections(metadata: { key: string, value: number }[]){
  for (const item of metadata) {
    addToSelectionTree(selectionTree, item.key, item.value);
  }
}

function addToSelectionTree(root: SelectionTreeNode, key: string, value: number): void {
  const subIds = key.split('_');
  let currentNode = root;

  for (const subId of subIds) {
    if (!currentNode.children[subId]) {
      currentNode.children[subId] = { value: null, children: {} };
    }
    currentNode = currentNode.children[subId];
  }

  currentNode.value = value;
}


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
        condition: {},
        trueOperation: undefined,
        falseOperation: undefined,
      },
    } satisfies OperationConditional;
  } else if (type === 'select') {
    return {
      id: crypto.randomUUID(),
      type: type,
      data: {
        title: '',
        description: '',
        optionType: 'CUSTOM',
        options: [],
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
  }
};
