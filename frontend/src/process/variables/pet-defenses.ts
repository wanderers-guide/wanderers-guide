import { Character, Creature } from '@schemas/content';
import { PetOwnerDefenses, StoreID, VariableNum } from '@schemas/variables';
import { getBestArmor } from '@items/inv-utils';
import { getFinalAcValue, getFinalProfValue } from './variable-helpers';
import {
  exportVariableStore,
  getPetOwnerDefenses,
  getVariable,
  readVariableStoreView,
  setPetOwnerDefenses,
} from './variable-manager';

type PetDefense = keyof PetOwnerDefenses;
const PET_DEFENSES: PetDefense[] = ['AC_BONUS', 'SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL'];
const PET_TRAIT_ID = 4265;
const NATIVE_PET_IDS = new Set([12086, 12109]);

/**
 * A saved native ID can outlive its template operations. Require the native producer's
 * baseline, and exclude the absolute four-defense block produced by stat-block editors.
 * Appended relative adjustments and renamed templates retain inheritance.
 */
function usesNativePetDefenses(creature: Creature): boolean {
  if (!NATIVE_PET_IDS.has(creature.id) || creature.content_source_id !== 1) return false;
  const operations = creature.operations ?? [];
  const hasImprovisation = operations.some(
    (operation) =>
      operation.type === 'setValue' &&
      operation.data.variable === 'UNTRAINED_IMPROVISATION' &&
      operation.data.value === '{{level}}'
  );
  const hasHealthBaseline = operations.some(
    (operation) =>
      operation.type === 'setValue' &&
      operation.data.variable === 'MAX_HEALTH_CLASS_PER_LEVEL' &&
      operation.data.value === 5
  );
  const hasPetTrait = operations.some(
    (operation) => operation.type === 'giveTrait' && operation.data.traitId === PET_TRAIT_ID
  );
  const hasAbsoluteAc = operations.some(
    (operation) =>
      operation.type === 'adjValue' &&
      operation.data.variable === 'AC_BONUS' &&
      typeof operation.data.value === 'number'
  );
  const hasAbsoluteSaves = PET_DEFENSES.slice(1).every((defense) =>
    operations.some(
      (operation) =>
        operation.type === 'addBonusToValue' &&
        operation.data.variable === defense &&
        !operation.data.type &&
        !operation.data.text &&
        typeof operation.data.value === 'string' &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(operation.data.value.trim())
    )
  );
  return hasImprovisation && hasHealthBaseline && hasPetTrait && !(hasAbsoluteAc && hasAbsoluteSaves);
}

/** Actual calculated trait identity, rather than a companion's name or store prefix. */
function isPet(id: StoreID): boolean {
  const trait = getVariable<VariableNum>(id, 'TRAIT_ANCESTRY_PET_IDS');
  return id !== 'CHARACTER' && trait?.type === 'num' && trait.value === PET_TRAIT_ID;
}

/** All four finite numeric fields are required; zero saves are valid and absence is not a default baseline. */
function readDefenseContext(id: StoreID): PetOwnerDefenses | null {
  const values = getPetOwnerDefenses(id);
  return values && PET_DEFENSES.every((defense) => Number.isFinite(values[defense])) ? values : null;
}

/**
 * Derive fresh owner defenses before raw circumstance/status effects, including indirect attribute effects.
 * The synchronous view reuses normal armor, investment, proficiency and save arithmetic and restores the live store.
 */
export function publishPetOwnerDefenses(character: Character): void {
  const view = exportVariableStore('CHARACTER');
  for (const name of Object.keys(view.bonuses)) {
    view.bonuses[name] = view.bonuses[name].filter((bonus) => {
      const type = bonus.type?.trim().toLowerCase();
      return type !== 'circumstance' && type !== 'status';
    });
  }
  // The character completion pipeline applies PWL later; honor its request in this read-only view.
  const withoutLevel = view.variables.PROF_WITHOUT_LEVEL;
  if (withoutLevel?.type === 'bool') {
    withoutLevel.value = withoutLevel.value || !!character.variants?.proficiency_without_level;
  }
  const values: PetOwnerDefenses = readVariableStoreView('CHARACTER', view, () => ({
    AC_BONUS: getFinalAcValue('CHARACTER', getBestArmor('CHARACTER', character.inventory)?.item),
    SAVE_FORT: Number(getFinalProfValue('CHARACTER', 'SAVE_FORT')),
    SAVE_REFLEX: Number(getFinalProfValue('CHARACTER', 'SAVE_REFLEX')),
    SAVE_WILL: Number(getFinalProfValue('CHARACTER', 'SAVE_WILL')),
  }));
  if (PET_DEFENSES.some((defense) => !Number.isFinite(values[defense]))) return;
  setPetOwnerDefenses('CHARACTER', values);
}

/**
 * Copy this calculation's complete owner context once, after all creature grants have run.
 * Only verified native Pet templates inherit. Imported stat blocks can contain absolute defense adjustments.
 * Unbound catalog previews retain their existing calculation path; neither defaults nor saved CS supply inheritance.
 */
export function copyPetOwnerDefenses(id: StoreID, creature: Creature): void {
  if (!usesNativePetDefenses(creature) || !isPet(id)) return;
  const values = readDefenseContext('CHARACTER');
  if (!values) return;
  setPetOwnerDefenses(id, values);
}

/** Read the Pet's own copied context, so a later owner edit cannot change an already calculated child. */
export function getInheritedPetDefense(id: StoreID, variableName: string): number | null {
  if (!isPet(id)) return null;
  const defense = PET_DEFENSES.find((name) => name === variableName);
  return defense ? (readDefenseContext(id)?.[defense] ?? null) : null;
}
