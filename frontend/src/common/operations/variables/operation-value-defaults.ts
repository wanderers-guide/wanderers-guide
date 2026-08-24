import {
  AttributeValue,
  ExtendedProficiencyValue,
  ExtendedVariableValue,
  ProficiencyValue,
  VariableType,
  VariableValue,
} from '@schemas/variables';

/**
 * Default values for the operation editors, keyed by the type of the variable an operation
 * points at.
 *
 * These exist so that re-pointing an operation at a different variable can reset its value to
 * something the new variable actually accepts. Without that reset the operation keeps the
 * previous value — e.g. a `false` left over from a bool variable landing on a list-str one —
 * and the operations engine then throws `Invalid value for variable: ...` at runtime, which
 * breaks every sheet or drawer that runs it.
 */

/**
 * The value an "Override Value" (setValue) operation should hold for a variable of this type.
 *
 * Each branch mirrors the shape its matching <SetValueInput /> branch reads back.
 */
export function getDefaultSetValue(variableType: VariableType): VariableValue {
  if (variableType === 'attr') return { value: 0, partial: false } as AttributeValue;
  if (variableType === 'num') return 0;
  if (variableType === 'bool') return false;
  if (variableType === 'prof') return { value: 'U' } as ProficiencyValue;
  // list-str values are stored as a JSON string (the input is a <JsonInput />), so the empty
  // default is the *string* '[]' rather than a bare array.
  if (variableType === 'list-str') return '[]';
  return '';
}

/**
 * The value an "Adjust Value" (adjValue) operation should hold for a variable of this type.
 *
 * Note this differs from the setValue defaults: adjValue appends to a list-str rather than
 * replacing it, so its empty default is a plain '' rather than an empty JSON array.
 */
export function getDefaultAdjValue(variableType: VariableType): ExtendedVariableValue {
  if (variableType === 'attr') return { value: 0 } as AttributeValue;
  if (variableType === 'num') return 0;
  if (variableType === 'bool') return false;
  if (variableType === 'prof') return { value: 'U', increases: 0 } as ExtendedProficiencyValue;
  return '';
}
