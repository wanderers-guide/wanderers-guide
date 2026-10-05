import { OperationSelectOptionCustom } from '@schemas/operations';
import { StoreID } from '@schemas/variables';
import { hashData } from '@utils/numbers';
import { getAllSkillVariables } from '@variables/variable-manager';
import { compileProficiencyType, variableToLabel } from '@variables/variable-utils';
import { getRootSelection, SelectionTreeNode } from './selection-tree';

const ASSURANCE_SELECT = '1e323240-f76f-42e9-bf07-7339bdab53a5';

/** Assurance must see skill grants from every source before applying its selected benefit. */
export function requiresFinalSkillSelection(operationId: string): boolean {
  return operationId === ASSURANCE_SELECT;
}
const FIRST_PATH_SELECT = '5b0d50cc-9092-43fb-a81e-b4557ac76338';
const SECOND_PATH_SELECT = '7a648adc-919d-4c4b-82c0-203217dfd2d7';
const THIRD_PATH_SELECT = '6a3c177c-4375-40e9-bfef-18a78185bae8';
const PATH_SAVES: Record<string, string> = {
  '34e52358-f924-4624-be83-7a64c639fd32': 'SAVE_FORT',
  '7e2da8f8-0de2-4a48-b000-5a0f646b02e1': 'SAVE_REFLEX',
  '8d179308-3f02-48af-9367-79dd4cf70d01': 'SAVE_WILL',
};

/** Read an earlier path's saved choice without counting the current feature's own proficiency grant. */
function selectedPathSave(operationId: string, node: SelectionTreeNode = getRootSelection()): string | undefined {
  const selected = node.children[operationId]?.value;
  if (selected && PATH_SAVES[selected]) return PATH_SAVES[selected];
  for (const child of Object.values(node.children)) {
    const save = selectedPathSave(operationId, child);
    if (save) return save;
  }
  return undefined;
}

/** Preserve authored choice IDs while enforcing the rules of these specific custom selectors. */
export function applyCustomSelectionRules(
  id: StoreID,
  operationId: string,
  options: OperationSelectOptionCustom[]
): OperationSelectOptionCustom[] {
  if (operationId === SECOND_PATH_SELECT || operationId === THIRD_PATH_SELECT) {
    const first = selectedPathSave(FIRST_PATH_SELECT);
    const second = selectedPathSave(SECOND_PATH_SELECT);
    return options.filter((option) => {
      const increase = option.operations?.find((operation) => operation.type === 'adjValue');
      const save = increase?.data.variable;
      return operationId === SECOND_PATH_SELECT ? save !== first : !!save && (save === first || save === second);
    });
  }
  if (operationId !== ASSURANCE_SELECT) return options;

  const trained = getAllSkillVariables(id).filter((skill) => compileProficiencyType(skill.value) !== 'U');
  const lores = trained.filter((skill) => skill.name.startsWith('SKILL_LORE_'));
  const template = options
    .flatMap((option) => option.operations ?? [])
    .find((operation) => operation.type === 'addBonusToValue');
  return options.flatMap((option) => {
    if (option.title === 'Lore') {
      // Lore has always been a saved top-level choice. Keep that choice and bind it to a specific trained Lore.
      if (lores.length === 0 || !template) return [];
      const loreOptions: OperationSelectOptionCustom[] = lores.map((lore) => ({
        id: String(hashData({ assuranceLore: lore.name })),
        type: 'CUSTOM',
        title: variableToLabel(lore),
        description: '',
        operations: [
          {
            ...template,
            id: String(hashData({ assuranceBonus: lore.name })),
            data: { ...template.data, variable: lore.name },
          },
        ],
      }));
      return [
        {
          ...option,
          operations:
            lores.length === 1
              ? loreOptions[0].operations
              : [
                  {
                    id: `${operationId}-lore`,
                    type: 'select',
                    data: {
                      title: 'Select a Lore Skill',
                      modeType: 'PREDEFINED',
                      optionType: 'CUSTOM',
                      optionsPredefined: loreOptions,
                    },
                  },
                ],
        },
      ];
    }
    const bonus = option.operations?.find((operation) => operation.type === 'addBonusToValue');
    return bonus && trained.some((skill) => skill.name === bonus.data.variable) ? [option] : [];
  });
}
