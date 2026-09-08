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

  const healthConflicts = healthTransitionConflicts(base, local, remote);
  // Companion HP can depend on the owner's level even when its own row is unchanged.
  const previousCompanions = companionEntries(base);
  const localCompanions = companionEntries(local);
  const remoteCompanions = companionEntries(remote);
  const companionConflicts = new Map<string | number, HealthConflict[]>();
  let keepLocalLevel = healthConflicts.includes('Drained');
  for (const [id, previous] of previousCompanions ?? []) {
    const mine = localCompanions?.get(id);
    const theirs = remoteCompanions?.get(id);
    if (mine && theirs) {
      const coupled = healthTransitionConflicts(previous, mine, theirs, [base.level, local.level, remote.level]);
      companionConflicts.set(id, coupled);
      if (coupled.includes('Drained') && mine.level === -100) keepLocalLevel = true;
    }
  }
  // Choosing that local owner level also excludes new remote companion events
  // calculated with a different level. Existing Drained remains a read-only value.
  if (keepLocalLevel && !isEqual(local.level, remote.level)) {
    if (
      !healthConflicts.includes('Drained') &&
      healthState(remote, undefined).drained > healthState(base, undefined).drained
    )
      healthConflicts.push('Drained');
    for (const [id, coupled] of companionConflicts) {
      const previous = previousCompanions?.get(id);
      const theirs = remoteCompanions?.get(id);
      if (
        previous &&
        theirs?.level === -100 &&
        !coupled.includes('Drained') &&
        healthState(theirs, remote.level).drained > healthState(previous, base.level).drained
      )
        coupled.push('Drained');
    }
  }
  conflicts.push(...healthConflictPaths(healthConflicts));
  for (const [id, coupled] of companionConflicts) {
    conflicts.push(...healthConflictPaths(coupled, `companions.list[${id}].`));
  }

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
  retainLocalHealth(character, local, healthConflicts);
  if (keepLocalLevel) Object.assign(character, { level: cloneDeep(local.level) });
  const mergedCompanions = companionEntries(character);
  for (const [id, coupled] of companionConflicts) {
    const merged = mergedCompanions?.get(id);
    const mine = localCompanions?.get(id);
    if (merged && mine) retainLocalHealth(merged, mine, coupled);
  }
  return { character, conflicts };
}

type HealthConflict = 'Drained' | 'Dying/Wounded';

type HealthState = {
  hp: unknown;
  level: unknown;
  drained: number;
  dying: number | null;
  wounded: number | null;
};

/**
 * These conditions and their HP consequences are one edit, even when numeric HP
 * happens to match another writer's damage. Report ambiguity without replaying events.
 */
function healthTransitionConflicts(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  ownerLevels?: [unknown, unknown, unknown]
): HealthConflict[] {
  if (!('hp_current' in base) || !('hp_current' in local) || !('hp_current' in remote)) return [];
  const previous = healthState(base, ownerLevels?.[0]);
  const mine = healthState(local, ownerLevels?.[1]);
  const theirs = healthState(remote, ownerLevels?.[2]);
  const conflicts: HealthConflict[] = [];
  const priorDrained = [previous.hp, previous.level, previous.drained];
  const localDrained = [mine.hp, mine.level, mine.drained];
  const remoteDrained = [theirs.hp, theirs.level, theirs.drained];
  if (
    !isEqual(localDrained, remoteDrained) &&
    ((mine.drained > previous.drained && !isEqual(remoteDrained, priorDrained)) ||
      (theirs.drained > previous.drained && !isEqual(localDrained, priorDrained)))
  ) {
    conflicts.push('Drained');
  }

  const priorDying = [previous.hp, previous.dying, previous.wounded];
  const localDying = [mine.hp, mine.dying, mine.wounded];
  const remoteDying = [theirs.hp, theirs.dying, theirs.wounded];
  const changesRecovery = (next: HealthState): boolean =>
    next.dying !== previous.dying || ((next.hp === 0) !== (previous.hp === 0) && next.wounded !== previous.wounded);
  if (
    !isEqual(localDying, remoteDying) &&
    ((changesRecovery(mine) && !isEqual(remoteDying, priorDying)) ||
      (changesRecovery(theirs) && !isEqual(localDying, priorDying)))
  ) {
    conflicts.push('Dying/Wounded');
  }
  return conflicts;
}

/** Describe coupled fields using the same human-readable conflict paths as ordinary merges. */
function healthConflictPaths(conflicts: HealthConflict[], path = ''): string[] {
  return conflicts.map(
    (condition) => `${path}hp_current + ${condition === 'Drained' ? 'level + ' : ''}details.conditions (${condition})`
  );
}

/** Keep the local action coherent for explicit resolution, without losing unrelated remote fields. */
function retainLocalHealth(
  merged: Record<string, unknown>,
  local: Record<string, unknown>,
  conflicts: HealthConflict[]
): void {
  if (!conflicts.length) return;
  const names = new Set(
    conflicts.flatMap((condition) => (condition === 'Drained' ? ['Drained'] : ['Dying', 'Wounded', 'Unconscious']))
  );
  const localDetails = isRecord(local.details) ? local.details : {};
  const mergedDetails = isRecord(merged.details) ? merged.details : {};
  const localConditions = Array.isArray(localDetails.conditions) ? localDetails.conditions : [];
  const mergedConditions = Array.isArray(mergedDetails.conditions) ? mergedDetails.conditions : [];
  const belongsToAction = (condition: unknown): boolean =>
    isRecord(condition) && typeof condition.name === 'string' && names.has(condition.name);
  Object.assign(merged, {
    hp_current: cloneDeep(local.hp_current),
    ...(conflicts.includes('Drained') ? { level: cloneDeep(local.level) } : {}),
    details: {
      ...mergedDetails,
      conditions: cloneDeep([
        ...mergedConditions.filter((condition) => !belongsToAction(condition)),
        ...localConditions.filter(belongsToAction),
      ]),
    },
  });
  const localMetadata = isRecord(local.meta_data) ? local.meta_data : {};
  const mergedMetadata = isRecord(merged.meta_data) ? merged.meta_data : {};
  if ('reset_hp' in localMetadata || 'reset_hp' in mergedMetadata) {
    Object.assign(merged, { meta_data: { ...mergedMetadata, reset_hp: localMetadata.reset_hp } });
  }
}

/** Only the strongest explicit rank matters; these three conditions have no derived sources. */
function healthState(entity: Record<string, unknown>, ownerLevel: unknown): HealthState {
  const conditions =
    isRecord(entity.details) && Array.isArray(entity.details.conditions) ? entity.details.conditions : [];
  const rank = (name: string): number | null => {
    let strongest: number | null = null;
    for (const condition of conditions) {
      if (!isRecord(condition) || condition.name !== name) continue;
      const value = typeof condition.value === 'number' && Number.isFinite(condition.value) ? condition.value : 0;
      strongest = Math.max(strongest ?? 0, value);
    }
    return strongest;
  };
  return {
    hp: entity.hp_current,
    level: entity.level === -100 ? ownerLevel : entity.level,
    drained: rank('Drained') ?? 0,
    dying: rank('Dying'),
    wounded: rank('Wounded'),
  };
}

/** Match companion snapshots by stable ID; malformed lists retain the ordinary atomic-array conflict. */
function companionEntries(entity: Record<string, unknown>): ReturnType<typeof keyedEntries> {
  return isRecord(entity.companions) && Array.isArray(entity.companions.list)
    ? keyedEntries(entity.companions.list)
    : null;
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
