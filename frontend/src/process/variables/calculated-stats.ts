import { getBestArmor, getFlatInvItems, isItemEquippable, isItemInvestable } from '@items/inv-utils';
import { Item, Character, InventoryItem, LivingEntity } from '@typing/content';
import { ProficiencyType, StoreID, VariableListStr } from '@typing/variables';
import { SetterOrUpdater } from 'recoil';
import { addVariable, getVariable, getVariables, setVariable } from './variable-manager';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from './variable-display';
import { labelToVariable, variableToLabel } from './variable-utils';

export function saveCalculatedStats(
  id: StoreID,
  entity: LivingEntity,
  setEntity: SetterOrUpdater<LivingEntity | null>
) {
  setTimeout(() => {
    const maxHealth = getFinalHealthValue(id);
    const maxStamina = 0;
    const maxResolve = 0;
    const ac = getFinalAcValue(id, getBestArmor(id, entity.inventory)?.item);
    const finalProfs: Record<string, { total: number; type: ProficiencyType }> = {};

    // Get calculated proficiencies
    for (const name of Object.keys(getVariables(id))) {
      const variable = getVariable(id, name);
      if (variable?.type !== 'prof') continue;
      if (variable.name.includes('___')) continue;

      const value = getFinalProfValue(id, name);
      const type = variable.value.value;

      finalProfs[name] = {
        total: parseInt(value),
        type: type,
      };
    }

    const calcStats = {
      hp_max: maxHealth,
      stamina_max: maxStamina,
      resolve_max: maxResolve,
      ac: ac,
      profs: finalProfs,
    };

    if (JSON.stringify(calcStats) === JSON.stringify(entity.meta_data?.calculated_stats ?? {})) return;

    // Save the calculated stats
    console.log('Saving calculated stats', calcStats);
    setEntity((c) => {
      if (!c) return c;
      return {
        ...c,
        meta_data: {
          ...c.meta_data,
          calculated_stats: calcStats,
        },
      };
    });
  }, 100);
}

export function setCalculatedStatsInStore(id: StoreID, entity: LivingEntity) {
  const calcStats = entity.meta_data?.calculated_stats;
  if (!calcStats) return;

  if (calcStats.ac !== undefined) {
    addVariable(id, 'num', `CS:AC`, calcStats.ac, 'Calculated Stats');
  }
  if (calcStats.hp_max !== undefined) {
    addVariable(id, 'num', `CS:HP_MAX`, calcStats.hp_max, 'Calculated Stats');
  }
  if (calcStats.resolve_max !== undefined) {
    addVariable(id, 'num', `CS:RESOLVE_MAX`, calcStats.resolve_max, 'Calculated Stats');
  }
  if (calcStats.stamina_max !== undefined) {
    addVariable(id, 'num', `CS:STAMINA_MAX`, calcStats.stamina_max, 'Calculated Stats');
  }
  for (const name of Object.keys(calcStats.profs)) {
    const { total, type } = calcStats.profs[name];
    addVariable(id, 'num', `CS:${labelToVariable(name)}`, total, 'Calculated Stats');
  }
}
