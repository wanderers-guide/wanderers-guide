import {
  Operation,
  OperationSelect,
  OperationSelectOptionAdjValue,
  OperationSelectOptionCustom,
} from '@typing/operations';
import { ReactNode } from 'react';
import { getVariable } from './variable-manager';
import { AttributeValue, ProficiencyType, Variable, VariableType } from '@typing/variables';
import { isAttribute, isProficiencyType, maxProficiencyType, proficiencyTypeToLabel, variableToLabel } from './variable-utils';
import _ from 'lodash';
import { listToLabel } from '@utils/strings';
import { SelectContentButton } from '@common/select/SelectContent';
import { OperationResult } from '@operations/operation-runner';
import { SetterOrUpdater } from 'recoil';
import { Character } from '@typing/content';
import { Box } from '@mantine/core';

type CharacterState = [Character | null, SetterOrUpdater<Character | null>];

export function getStatBlockDisplay(
  variableNames: string[],
  operations: Operation[],
  mode: 'READ' | 'READ/WRITE',
  writeDetails?: {
    operationResults: OperationResult[];
    characterState: CharacterState;
    primarySource: string;
  }
) {
  let output: { ui: ReactNode; operation: OperationSelect | null }[] = [];
  const foundSet: Set<string> = new Set();

  for (const variableName of variableNames) {
    const { ui, operation } = getStatDisplay(variableName, operations, mode, writeDetails);
    if (ui && !foundSet.has(ui.toString())) {
      output.push({ ui, operation });
      foundSet.add(ui.toString());
    }
  }
  return output;
}


/**
 * Gives a UI display for the given variable. If the variable is a selection and in READ/WRITE mode,
 * it returns the selector display for that. Also returns the operation that makes the change if it's a selection.
 * @param variableName
 * @param operations
 * @param mode
 * @returns - {ui: ReactNode, operation?: Operation}
 */
export function getStatDisplay(
  variableName: string,
  operations: Operation[],
  mode: 'READ' | 'READ/WRITE',
  writeDetails?: {
    operationResults: OperationResult[];
    characterState: CharacterState;
    primarySource: string;
  }
): { ui: ReactNode; operation: OperationSelect | null } {
  const variable = getVariable(variableName);
  if (!variable) return { ui: null, operation: null };

  let bestOperation: Operation | null = null;
  let bestValue: string | number | boolean | AttributeValue | null = null;

  const setBestValue = (value: string | number | boolean | AttributeValue) => {
    if (bestValue === null) {
      bestValue = value;
      return true;
    }
    if (variable.type === 'num') {
      if (value > bestValue) {
        bestValue = value;
        return true;
      }
    } else if (variable.type === 'str') {
      bestValue = value;
      return true;
    } else if (variable.type === 'bool') {
      if (value === true) {
        bestValue = value;
        return true;
      }
    } else if (variable.type === 'prof') {
      bestValue = maxProficiencyType(bestValue as ProficiencyType, value as ProficiencyType);
      if (bestValue === value) return true;
    } else if (variable.type === 'attr') {
      const bestValueAttr = bestValue as AttributeValue;
      const operationValueAttr = value as AttributeValue;
      if (operationValueAttr.value > bestValueAttr.value) {
        bestValue = value;
        return true;
      } else if (operationValueAttr.value === bestValueAttr.value) {
        if (operationValueAttr.partial) {
          bestValue = value;
          return true;
        }
      }
    } else if (variable.type === 'list-str') {
      bestValue = value;
      return true;
    }
    return false;
  };

  for (const operation of operations) {
    if (operation.type === 'adjValue' || operation.type === 'setValue') {
      if (operation.data.variable === variableName) {
        setBestValue(operation.data.value);
      }
    } else if (operation.type === 'select') {
      if (operation.data.optionType === 'ADJ_VALUE') {
        // Check all the options in the select
        for (const option of (operation.data.optionsPredefined ??
          []) as OperationSelectOptionAdjValue[]) {
          if (option.operation.data.variable === variableName) {
            const changed = setBestValue(option.operation.data.value);
            if (changed) bestOperation = operation;
          }
        }
      } else if (operation.data.optionType === 'CUSTOM') {
        // Check all operations in all the options in the select
        for (const option of (operation.data.optionsPredefined ??
          []) as OperationSelectOptionCustom[]) {
          for (const subop of option.operations ?? []) {
            if (subop.type === 'adjValue' || subop.type === 'setValue') {
              if (subop.data.variable === variableName) {
                const changed = setBestValue(subop.data.value);
                if (changed) bestOperation = operation;
              }
            }
          }
        }
      }
    }
  }

  return {
    ui: getDisplay(bestValue, bestOperation, variable, mode, writeDetails),
    operation: bestOperation,
  };
}

function getDisplay(
  value: string | number | boolean | AttributeValue | null,
  operation: OperationSelect | null,
  variable: Variable,
  mode: 'READ' | 'READ/WRITE',
  writeDetails?: {
    operationResults: OperationResult[],
    characterState: CharacterState,
    primarySource: string,
  }
): ReactNode {
  if (value === null) return null;

  const result = operation?.id
    ? writeDetails?.operationResults.find((r) => r?.selection?.id === operation?.id)
    : null;

  // Handle attributes
  if (isAttribute(value) || (_.isNumber(+value) && variable.type === 'attr')) {
    if (operation) {
      if (mode === 'READ/WRITE') {
        return (
          <Box py={0}>
            <SelectContentButton
              type={'ability-block'}
              onClick={(option) => {
                updateCharacter(
                  writeDetails?.characterState,
                  `${writeDetails?.primarySource}_${operation.id}`,
                  option._select_uuid
                );
              }}
              onClear={() => {
                updateCharacter(
                  writeDetails?.characterState,
                  `${writeDetails?.primarySource}_${operation.id}`,
                  ''
                );
              }}
              selectedId={result?.result?.source?.id}
              options={{
                overrideOptions: result?.selection?.options,
                overrideLabel: result?.selection?.title || 'Select an Option',
                abilityBlockType:
                  (result?.selection?.options ?? []).length > 0
                    ? result?.selection?.options[0].type
                    : undefined,
                skillAdjustment: result?.selection?.skillAdjustment,
              }}
            />
          </Box>
        );
      } else {
        const attrs = getVarList(operation, 'attr');
        return <>{listToLabel(attrs, 'or')}</>;
      }
    } else {
      return <>{variableToLabel(variable)}</>;
    }
  }

  // Handle profs
  if (_.isString(value) && isProficiencyType(value)) {
    if (operation) {
      if (mode === 'READ/WRITE') {
        return (
          <Box py={5}>
            <SelectContentButton
              type={'ability-block'}
              onClick={(option) => {
                updateCharacter(
                  writeDetails?.characterState,
                  `${writeDetails?.primarySource}_${operation.id}`,
                  option._select_uuid
                );
              }}
              onClear={() => {
                updateCharacter(
                  writeDetails?.characterState,
                  `${writeDetails?.primarySource}_${operation.id}`,
                  ''
                );
              }}
              selectedId={result?.result?.source?.id}
              options={{
                overrideOptions: result?.selection?.options,
                overrideLabel: result?.selection?.title || 'Select an Option',
                abilityBlockType:
                  (result?.selection?.options ?? []).length > 0
                    ? result?.selection?.options[0].type
                    : undefined,
                skillAdjustment: result?.selection?.skillAdjustment,
              }}
            />
          </Box>
        );
      } else {
        // Display as `Trained in your choice of Acrobatics or Athletics`
        const profs = getVarList(operation, 'prof');
        return (
          <>
            {proficiencyTypeToLabel(value)} in your choice of {listToLabel(profs, 'or')}
          </>
        );
      }
    } else {
      // Display as `Expert in Fortitude`
      return `${proficiencyTypeToLabel(value)} in ${variableToLabel(variable)}`;
    }
  }

  // Handle numbers
  if (variable.type === 'num') {
    if (operation) {
      return (
        <Box py={5}>
          <SelectContentButton
            type={'ability-block'}
            onClick={(option) => {
              updateCharacter(
                writeDetails?.characterState,
                `${writeDetails?.primarySource}_${operation.id}`,
                option._select_uuid
              );
            }}
            onClear={() => {
              updateCharacter(
                writeDetails?.characterState,
                `${writeDetails?.primarySource}_${operation.id}`,
                ''
              );
            }}
            selectedId={result?.result?.source?.id}
            options={{
              overrideOptions: result?.selection?.options,
              overrideLabel: result?.selection?.title || 'Select an Option',
              abilityBlockType:
                (result?.selection?.options ?? []).length > 0
                  ? result?.selection?.options[0].type
                  : undefined,
              skillAdjustment: result?.selection?.skillAdjustment,
            }}
          />
        </Box>
      );
    } else {
      return <>{value}</>;
    }
  }

  return null;
}


/**
 * Gets a list of all the variables that are being changed by this select operation.
 * @param operation 
 * @returns - List of labels of variables
 */
function getVarList(operation: OperationSelect, type: VariableType): string[] {

  const labels: string[] = [];

  if (operation.data.optionType === 'ADJ_VALUE') {
    for (const option of (operation.data.optionsPredefined ??
      []) as OperationSelectOptionAdjValue[]) {
      const variable = getVariable(option.operation.data.variable);
      if (variable && variable.type === type) {
        labels.push(variableToLabel(variable));
      }
    }
  } else if (operation.data.optionType === 'CUSTOM') {
    for (const option of (operation.data.optionsPredefined ??
      []) as OperationSelectOptionCustom[]) {
      for (const subop of option.operations ?? []) {
        if (subop.type === 'adjValue' || subop.type === 'setValue') {
          const variable = getVariable(subop.data.variable);
          if (variable && variable.type === type) {
            labels.push(variableToLabel(variable));
          }
        }
      }
    }
  }

  return labels.sort();
}

function updateCharacter(characterState: CharacterState | undefined, path: string, value: string) {
  if (!characterState) return;
  const [character, setCharacter] = characterState;
  setCharacter((prev) => {
    if (!prev) return prev;
    const newSelections = { ...prev.operation_data?.selections };
    if (!value) {
      delete newSelections[path];
    } else {
      newSelections[path] = value;
    }
    return {
      ...prev,
      operation_data: {
        ...prev.operation_data,
        selections: newSelections,
      },
    };
  });
}