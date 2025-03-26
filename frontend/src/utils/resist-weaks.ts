import { StoreID, VariableListStr } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';
import { compileExpressions } from '@variables/variable-utils';
import { toLabel } from './strings';

export function displayResistWeak(id: StoreID, text: string) {
  return toLabel(compileExpressions(id, text.replace(',', ' '), true)?.replace(' 0', ' 1') ?? '');
}

export function getResistWeaks(id: StoreID, type: 'RESISTANCES' | 'WEAKNESSES') {
  const rwVar = getVariable<VariableListStr>(id, type);

  const rwMap = new Map<string, string>();
  for (const rw of rwVar?.value ?? []) {
    const [key, value] = rw.split(',');
    let compiledValue = compileExpressions(id, value.trim(), true) ?? '';

    // Minimum value of 1
    if (compiledValue === '0') {
      compiledValue = '1';
    }

    if (isNaN(parseInt(compiledValue))) {
      if (rwMap.get(key) === 'REMOVE') {
        continue;
      }

      // If it's a string, just set it
      rwMap.set(key, compiledValue);
    } else {
      if (parseInt(compiledValue) === -1) {
        rwMap.set(key, 'REMOVE');
        continue;
      }

      // It's a number
      if (rwMap.get(key)) {
        const currentValue = parseInt(rwMap.get(key) ?? '');
        // If they're both numbers, update if the new value is greater
        if (!isNaN(currentValue) && parseInt(compiledValue) > currentValue) {
          rwMap.set(key, compiledValue);
        }
      } else {
        // No key yet
        rwMap.set(key, compiledValue);
      }
    }
  }

  const results = [];
  for (const [key, value] of rwMap) {
    if (value === 'REMOVE') {
      continue;
    }
    results.push(toLabel(`${key} ${value}`));
  }

  return results;
}
