import { Item } from '@typing/content';
import { StoreID, VariableNum } from '@typing/variables';
import { getFinalProfValue, getFinalVariableValue, getVariableBreakdown } from '@variables/variable-display';
import { getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';

function getProfTotal(id: StoreID, item: Item) {
  const category = item.meta_data?.category ?? 'light';
  let categoryProfTotal = 0;
  if (category === 'light') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `LIGHT_ARMOR`));
  } else if (category === 'medium') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `MEDIUM_ARMOR`));
  } else if (category === 'heavy') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `HEAVY_ARMOR`));
  } else if (category === 'unarmored_defense') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `UNARMORED_DEFENSE`));
  }

  const group = item.meta_data?.group ?? 'leather';
  let groupProfTotal = 0;
  if (group === 'leather') {
    groupProfTotal = parseInt(getFinalProfValue(id, `ARMOR_GROUP_LEATHER`));
  } else if (group === 'composite') {
    groupProfTotal = parseInt(getFinalProfValue(id, `ARMOR_GROUP_COMPOSITE`));
  } else if (group === 'chain') {
    groupProfTotal = parseInt(getFinalProfValue(id, `ARMOR_GROUP_CHAIN`));
  } else if (group === 'cloth') {
    groupProfTotal = parseInt(getFinalProfValue(id, `ARMOR_GROUP_CLOTH`));
  } else if (group === 'plate') {
    groupProfTotal = parseInt(getFinalProfValue(id, `ARMOR_GROUP_PLATE`));
  }

  const individualProfTotal = parseInt(getFinalProfValue(id, `ARMOR_${labelToVariable(item.name)}`));

  return Math.max(categoryProfTotal, groupProfTotal, individualProfTotal);
}

export function getAcParts(id: StoreID, item?: Item) {
  const breakdown = getVariableBreakdown(id, 'AC_BONUS');
  const hasConditionals = breakdown.conditionals.length > 0;

  if (!item) {
    // If wearing nothing, that's 10 + dex + prof + bonus
    const categoryProfTotal = parseInt(getFinalProfValue(id, `UNARMORED_DEFENSE`));
    const individualProfTotal = parseInt(getFinalProfValue(id, `ARMOR_NONE`));
    const profTotal = Math.max(categoryProfTotal, individualProfTotal);

    const bonusAc = getFinalVariableValue(id, 'AC_BONUS').total;
    const dexMod = getFinalVariableValue(id, 'ATTRIBUTE_DEX').total;
    return {
      profBonus: profTotal,
      bonusAc: bonusAc,
      dexBonus: dexMod,
      armorBonus: 0,
      checkPenalty: 0,
      speedPenalty: 0,
      hasConditionals,
      breakdown,
    };
  }

  const profBonus = getProfTotal(id, item);
  const bonusAc = getFinalVariableValue(id, 'AC_BONUS').total;
  const strMod = getFinalVariableValue(id, 'ATTRIBUTE_STR').total;
  let dexBonus = getFinalVariableValue(id, 'ATTRIBUTE_DEX').total;
  const armorBonus = item.meta_data?.ac_bonus ?? 0;
  const dexCap = item.meta_data?.dex_cap ?? 0;
  const strengthReq = item.meta_data?.strength ?? 0;
  let checkPenalty = -1 * Math.abs(item.meta_data?.check_penalty ?? 0);
  let speedPenalty = -1 * Math.abs(item.meta_data?.speed_penalty ?? 0);

  if (strMod >= strengthReq) {
    checkPenalty = 0;
    speedPenalty += 5;
    if (speedPenalty > 0) {
      speedPenalty = 0;
    }
  }

  if (dexBonus > dexCap) {
    dexBonus = dexCap;
  }

  return {
    profBonus,
    bonusAc,
    dexBonus,
    armorBonus,
    checkPenalty,
    speedPenalty,
    hasConditionals,
    breakdown,
  };
}
