import { Item } from '@schemas/content';
import { StoreID, VariableBool, VariableNum } from '@schemas/variables';
import { hasTraitType } from '@utils/traits';
import {
  getCombinedVariableValue,
  getFinalVariableValue,
  getProfValueParts,
  ModifierBonus,
} from '@variables/variable-helpers';
import { getVariable, getVariableBonuses } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';

function getProfTotal(id: StoreID, item?: Item) {
  const category = item?.meta_data?.category ?? 'light';
  const companion = hasTraitType('COMPANION', item?.traits ?? undefined);
  const categoryVariables: Record<string, string> = {
    light: companion ? 'LIGHT_BARDING' : 'LIGHT_ARMOR',
    medium: 'MEDIUM_ARMOR',
    heavy: companion ? 'HEAVY_BARDING' : 'HEAVY_ARMOR',
    unarmored_defense: 'UNARMORED_DEFENSE',
  };
  const variables = item
    ? [
        categoryVariables[category],
        `ARMOR_GROUP_${labelToVariable(item.meta_data?.group ?? 'leather')}`,
        `ARMOR_${labelToVariable(item.name)}`,
      ].filter((name): name is string => !!name)
    : ['UNARMORED_DEFENSE', 'ARMOR_NONE'];
  const total = Math.max(
    ...variables.map((name) => {
      const parts = getProfValueParts(id, name);
      return parts
        ? parts.profValue + parts.level
        : getVariable<VariableBool>('CHARACTER', 'PROF_WITHOUT_LEVEL')?.value
          ? -2
          : 0;
    })
  );
  return { total, variables };
}

/** Armor potency increases the armor's item bonus before it competes with other item bonuses. */
function getAcModifiers(id: StoreID, item?: Item) {
  const proficiency = getProfTotal(id, item);
  const bonuses: ModifierBonus[] = getVariableBonuses(id, 'AC_BONUS');
  let armorItemBonus = item?.meta_data?.ac_bonus ?? 0;
  const potency = Math.min(item?.meta_data?.runes?.potency ?? 0, 4);
  // Equipment operations grant invested armor runes under the item's source name. Only combine an
  // active grant, so merely owning an uninvested rune does not activate its magic here.
  const potencyIndex =
    potency > 0 && item
      ? bonuses.findIndex(
          (bonus) =>
            bonus.source === item.name &&
            bonus.value === potency &&
            bonus.type?.trim().toLowerCase() === 'item' &&
            !bonus.text
        )
      : -1;
  if (potencyIndex >= 0) {
    armorItemBonus += potency;
    bonuses.splice(potencyIndex, 1);
  }
  if (armorItemBonus) bonuses.push({ value: armorItemBonus, type: 'item', text: '', source: item!.name });
  const modifiers = getCombinedVariableValue(id, proficiency.variables, bonuses);
  const baseValue = modifiers.value + (getVariable<VariableNum>(id, 'AC_BONUS')?.value ?? 0);
  const armorBonus =
    armorItemBonus > 0 && modifiers.bmap.get('item bonus')?.value === armorItemBonus ? armorItemBonus : 0;
  const remainingBonuses = new Map(modifiers.bmap);
  // The armor item bonus has its own term in the AC equation. Do not display it twice.
  if (armorBonus) remainingBonuses.delete('item bonus');
  const bonusAc = baseValue + modifiers.bonus - armorBonus;
  return {
    profBonus: proficiency.total,
    armorBonus,
    bonusAc,
    hasConditionals: modifiers.conditionals.length > 0,
    breakdown: {
      bonuses: remainingBonuses,
      bonusValue: modifiers.bonus - armorBonus,
      baseValue,
      conditionals: modifiers.conditionals,
    },
  };
}

export function getAcParts(id: StoreID, item?: Item) {
  const modifiers = getAcModifiers(id, item);
  let dexBonus = getFinalVariableValue(id, 'ATTRIBUTE_DEX').total;
  if (!item) {
    return { ...modifiers, dexBonus, checkPenalty: 0, speedPenalty: 0 };
  }

  const strMod = getFinalVariableValue(id, 'ATTRIBUTE_STR').total;
  const dexCap = item.meta_data?.dex_cap ?? 0;
  const strengthReq = item.meta_data?.strength ?? 0;
  let checkPenalty = -1 * Math.abs(Number(item.meta_data?.check_penalty ?? 0));
  let speedPenalty = -1 * Math.abs(Number(item.meta_data?.speed_penalty ?? 0));

  // Some abilities meet armor Strength requirements with Con instead (ex. SF2e Walking Armory)
  const strReqMod = getVariable<VariableBool>(id, 'USE_CON_FOR_ARMOR_STR_REQ')?.value
    ? getFinalVariableValue(id, 'ATTRIBUTE_CON').total
    : strMod;

  if (strReqMod >= strengthReq) {
    checkPenalty = 0;
    speedPenalty = Math.min(0, speedPenalty + 5);
  }
  dexBonus = Math.min(dexBonus, dexCap);

  return { ...modifiers, dexBonus, checkPenalty, speedPenalty };
}
