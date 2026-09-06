import type { Character } from '@schemas/content';
import { cloneDeep, isEqual, isPlainObject } from 'lodash-es';
import { SAVED_CHARACTER_FIELDS } from './character-save-buffer';

type CharacterMerge = { character: Character; conflicts: string[] };

/** Preserve edits made after an uncertain write, including deliberate returns to the old value. */
export function mergeCharacterSave(
  base: Record<string, unknown> | null,
  local: Record<string, unknown> | null,
  remote: Character,
  submitted?: Record<string, unknown>
): CharacterMerge {
  if (!submitted) return mergeCharacterOnConflict(base, local, remote);
  const attempt = mergeCharacterOnConflict(base, submitted, remote);
  const latest = mergeCharacterOnConflict(submitted, local, attempt.character);
  return { character: latest.character, conflicts: [...new Set([...attempt.conflicts, ...latest.conflicts])] };
}

/** Merge independent nested edits; retain local values at explicitly reported conflicts. */
export function mergeCharacterOnConflict(
  base: Record<string, unknown> | null,
  local: Record<string, unknown> | null,
  remote: Character
): CharacterMerge {
  const conflicts: string[] = [];
  if (!base || !local) return { character: cloneDeep(remote), conflicts };

  const mergeValue = (ancestor: unknown, mine: unknown, theirs: unknown, path: string, depth: number): unknown => {
    if (isEqual(mine, ancestor)) return cloneDeep(theirs);
    if (isEqual(theirs, ancestor) || isEqual(mine, theirs)) return cloneDeep(mine);
    if (depth < 64 && isRecord(mine) && isRecord(theirs) && (isRecord(ancestor) || ancestor === undefined)) {
      const previous = isRecord(ancestor) ? ancestor : {};
      return Object.fromEntries(
        [...new Set([...Object.keys(previous), ...Object.keys(mine), ...Object.keys(theirs)])].map((key) => [
          key,
          mergeValue(previous[key], mine[key], theirs[key], `${path}.${key}`, depth + 1),
        ])
      );
    }
    // Inventory/companion entries have stable IDs. Merge by ID, never array position.
    if (depth < 64 && Array.isArray(ancestor) && Array.isArray(mine) && Array.isArray(theirs)) {
      const prior = keyedEntries(ancestor),
        left = keyedEntries(mine),
        right = keyedEntries(theirs);
      if (prior && left && right) {
        const priorIds = [...prior.keys()];
        const leftOrder = [...left.keys()].filter((id) => prior.has(id));
        const rightOrder = [...right.keys()].filter((id) => prior.has(id));
        const leftReordered = !isEqual(
          leftOrder,
          priorIds.filter((id) => left.has(id))
        );
        const rightReordered = !isEqual(
          rightOrder,
          priorIds.filter((id) => right.has(id))
        );
        if (leftReordered && rightReordered && !isEqual(leftOrder, rightOrder)) conflicts.push(`${path} (order)`);
        const order = leftReordered ? [...left.keys(), ...right.keys()] : [...right.keys(), ...left.keys()];
        return [...new Set(order)]
          .map((id) => mergeValue(prior.get(id), left.get(id), right.get(id), `${path}[${id}]`, depth + 1))
          .filter((value) => value !== undefined);
      }
    }
    conflicts.push(path);
    return cloneDeep(mine);
  };

  const character = cloneDeep(remote);
  for (const field of SAVED_CHARACTER_FIELDS) {
    Object.assign(character, { [field]: mergeValue(base[field], local[field], remote[field], field, 0) });
  }
  return { character, conflicts };
}

/** Restrict traversal to JSON records, excluding prototypes and special objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

/** Duplicate or missing IDs make an array atomic; guessing identity would lose entries. */
function keyedEntries(values: unknown[]): Map<string | number, Record<string, unknown>> | null {
  const result = new Map<string | number, Record<string, unknown>>();
  for (const value of values) {
    if (!isRecord(value) || (typeof value.id !== 'string' && typeof value.id !== 'number') || result.has(value.id))
      return null;
    result.set(value.id, value);
  }
  return result;
}
