import { Item } from '@typing/content';
import { StoreID, VariableBool, VariableListStr, VariableNum } from '@typing/variables';
import { hasTraitType } from '@utils/traits';
import { getFinalProfValue, getFinalVariableValue } from '@variables/variable-display';
import { getVariable } from '@variables/variable-manager';
import { isVariableListStr, labelToVariable } from '@variables/variable-utils';
import { isItemRangedWeapon } from './inv-utils';

export function getWeaponStats(id: StoreID, item: Item) {
  const dice = (item.meta_data?.damage?.dice ?? 1) + (item.meta_data?.runes?.striking ?? 0);
  const die = item.meta_data?.damage?.die ?? '';
  const damageType = convertDamageType(item.meta_data?.damage?.damageType ?? '');
  const extra = item.meta_data?.damage?.extra;

  const other: {
    dice: number;
    die: string;
    damageType: string;
    bonus: number;
  }[] = [];

  return {
    attack_bonus: getAttackBonus(id, item),
    damage: {
      dice: dice,
      die: die,
      damageType: damageType,
      bonus: getAttackDamage(id, item),
      other: other,
      extra: extra,
    },
  };
}

function getAttackBonus(id: StoreID, item: Item) {
  if (isItemRangedWeapon(item)) {
    return getRangedAttackBonus(id, item);
  } else {
    return getMeleeAttackBonus(id, item);
  }
}

function getRangedAttackBonus(id: StoreID, item: Item) {
  const attackBonus = getFinalVariableValue(id, 'ATTACK_ROLLS_BONUS').total;
  const dexAttackBonus = getFinalVariableValue(id, 'DEX_ATTACK_ROLLS_BONUS').total;
  const strAttackBonus = getFinalVariableValue(id, 'STR_ATTACK_ROLLS_BONUS').total;
  const rangedAttackBonus = getFinalVariableValue(id, 'RANGED_ATTACK_ROLLS_BONUS').total;
  const extraItemBonus = item.meta_data?.attack_bonus ?? 0;

  const hasBrutal = false; //TODO: hasTraitType('BRUTAL', item.traits);
  const strMod = getFinalVariableValue(id, 'ATTRIBUTE_STR').total;
  const dexMod = getFinalVariableValue(id, 'ATTRIBUTE_DEX').total;

  const hasTracking1 = hasTraitType('TRACKING-1', item.traits);
  const hasTracking2 = hasTraitType('TRACKING-2', item.traits);

  ///

  const parts = new Map<string, number>();
  parts.set('This is your proficiency bonus with this weapon.', getProfTotal(id, item));

  if (hasBrutal) {
    parts.set(
      'This is your Strength modifier. Because this weapon has the brutal trait, you use your Strength modifier instead of Dexterity on attack rolls.',
      strMod
    );
  } else {
    parts.set(
      'This is your Dexterity modifier. You add your Dexterity modifier to attack rolls with most ranged weapons.',
      dexMod
    );
  }

  if (item.meta_data?.runes?.potency) {
    parts.set("This is the bonus you receive from the weapon's potency rune.", item.meta_data.runes.potency);
  }

  if (attackBonus) {
    parts.set('This is a bonus you receive to all attack rolls.', attackBonus);
  }

  if (dexAttackBonus) {
    parts.set('This is a bonus you receive to Dexterity-based attack rolls.', dexAttackBonus);
  }

  if (strAttackBonus) {
    parts.set('This is a bonus you receive to Strength-based attack rolls.', strAttackBonus);
  }

  if (rangedAttackBonus) {
    parts.set('This is a bonus you receive to ranged attack rolls.', rangedAttackBonus);
  }

  if (extraItemBonus) {
    parts.set('This is an item bonus you receive from the item itself.', extraItemBonus);
  }

  if (hasTracking1) {
    parts.set("This is an item bonus you receive from the weapon's tracking trait.", 1);
  }
  if (hasTracking2) {
    parts.set("This is an item bonus you receive from the weapon's tracking trait.", 2);
  }

  return {
    total: getMAPedTotal(
      id,
      item,
      [...parts.values()].reduce((a, b) => a + b, 0)
    ),
    parts: parts,
  };
}

function getMeleeAttackBonus(id: StoreID, item: Item) {
  const attackBonus = getFinalVariableValue(id, 'ATTACK_ROLLS_BONUS').total;
  const dexAttackBonus = getFinalVariableValue(id, 'DEX_ATTACK_ROLLS_BONUS').total;
  const strAttackBonus = getFinalVariableValue(id, 'STR_ATTACK_ROLLS_BONUS').total;
  const meleeAttackBonus = getFinalVariableValue(id, 'MELEE_ATTACK_ROLLS_BONUS').total;
  const extraItemBonus = item.meta_data?.attack_bonus ?? 0;

  const hasFinesse = hasTraitType('FINESSE', item.traits);
  const strMod = getFinalVariableValue(id, 'ATTRIBUTE_STR').total;
  const dexMod = getFinalVariableValue(id, 'ATTRIBUTE_DEX').total;

  const hasTracking1 = hasTraitType('TRACKING-1', item.traits);
  const hasTracking2 = hasTraitType('TRACKING-2', item.traits);

  ///

  const parts = new Map<string, number>();
  parts.set('This is your proficiency bonus with this weapon.', getProfTotal(id, item));

  if (hasFinesse && dexMod > strMod) {
    parts.set(
      'This is your Dexterity modifier. Because this weapon has the finesse trait, you can use your Dexterity modifier instead of Strength on attack rolls.',
      dexMod
    );
  } else {
    parts.set(
      'This is your Strength modifier. You add your Strength modifier to attack rolls with most melee weapons.',
      strMod
    );
  }

  if (item.meta_data?.runes?.potency) {
    parts.set("This is the bonus you receive from the weapon's potency rune.", item.meta_data.runes.potency);
  }

  if (attackBonus) {
    parts.set('This is a bonus you receive to all attack rolls.', attackBonus);
  }

  if (dexAttackBonus) {
    parts.set('This is a bonus you receive to Dexterity-based attack rolls.', dexAttackBonus);
  }

  if (strAttackBonus) {
    parts.set('This is a bonus you receive to Strength-based attack rolls.', strAttackBonus);
  }

  if (meleeAttackBonus) {
    parts.set('This is a bonus you receive to melee attack rolls.', meleeAttackBonus);
  }

  if (extraItemBonus) {
    parts.set('This is an item bonus you receive from the item itself.', extraItemBonus);
  }

  if (hasTracking1) {
    parts.set("This is an item bonus you receive from the weapon's tracking trait.", 1);
  }
  if (hasTracking2) {
    parts.set("This is an item bonus you receive from the weapon's tracking trait.", 2);
  }

  return {
    total: getMAPedTotal(
      id,
      item,
      [...parts.values()].reduce((a, b) => a + b, 0)
    ),
    parts: parts,
  };
}

function getAttackDamage(id: StoreID, item: Item) {
  if (isItemRangedWeapon(item)) {
    return getRangedAttackDamage(id, item);
  } else {
    return getMeleeAttackDamage(id, item);
  }
}

function getRangedAttackDamage(id: StoreID, item: Item) {
  const attackDamage = getFinalVariableValue(id, 'ATTACK_DAMAGE_BONUS').total;
  const dexAttackDamage = getFinalVariableValue(id, 'DEX_ATTACK_DAMAGE_BONUS').total;
  const strAttackDamage = getFinalVariableValue(id, 'STR_ATTACK_DAMAGE_BONUS').total;
  const rangedAttackDamage = getFinalVariableValue(id, 'RANGED_ATTACK_DAMAGE_BONUS').total;

  const hasThrown =
    hasTraitType('THROWN', item.traits) ||
    hasTraitType('THROWN-10', item.traits) ||
    hasTraitType('THROWN-20', item.traits);
  const hasSplash = hasTraitType('SPLASH', item.traits);
  const hasPropulsive = hasTraitType('PROPULSIVE', item.traits);

  const strMod = getFinalVariableValue(id, 'ATTRIBUTE_STR').total;
  const dexMod = getFinalVariableValue(id, 'ATTRIBUTE_DEX').total;

  ///

  const parts = new Map<string, number>();

  if (hasThrown && !hasSplash) {
    parts.set(
      'This is your Strength modifier. Because this is a thrown ranged weapon, you add your Strength modifier to the damage.',
      strMod
    );
  } else if (hasPropulsive) {
    if (strMod >= 0) {
      let strAmt = Math.floor(strMod / 2);
      if (strAmt != 0) {
        parts.set(
          'This is half of your Strength modifier. Because this weapon has the propulsive trait and you have a positive Strength modifier, you add half of your Strength modifier (rounded down) to the damage.',
          strMod
        );
      }
    } else {
      parts.set(
        'This is your Strength modifier. Because this weapon has the propulsive trait and you have a negative Strength modifier, you add your full Strength modifier to the damage.',
        strMod
      );
    }
  }

  if (attackDamage) {
    parts.set('This is a bonus you receive to all attack damage.', attackDamage);
  }

  if (dexAttackDamage) {
    parts.set('This is a bonus you receive to damage for Dexterity-based attacks.', dexAttackDamage);
  }

  if (strAttackDamage) {
    parts.set('This is a bonus you receive to damage for Strength-based attacks.', strAttackDamage);
  }

  if (rangedAttackDamage) {
    parts.set('This is a bonus you receive to damage for ranged attacks.', rangedAttackDamage);
  }

  // TODO: Weapon Specialization

  return {
    total: [...parts.values()].reduce((a, b) => a + b, 0),
    parts: parts,
  };
}

function getMeleeAttackDamage(id: StoreID, item: Item) {
  const attackDamage = getFinalVariableValue(id, 'ATTACK_DAMAGE_BONUS').total;
  const dexAttackDamage = getFinalVariableValue(id, 'DEX_ATTACK_DAMAGE_BONUS').total;
  const strAttackDamage = getFinalVariableValue(id, 'STR_ATTACK_DAMAGE_BONUS').total;
  const meleeAttackDamage = getFinalVariableValue(id, 'MELEE_ATTACK_DAMAGE_BONUS').total;

  const hasSplash = hasTraitType('SPLASH', item.traits);
  const hasFinesse = hasTraitType('FINESSE', item.traits);

  const hasFinesseUseDexDamage = getVariable<VariableBool>(id, 'USE_DEX_FOR_MELEE_FINESSE')?.value ?? false;

  const strMod = getFinalVariableValue(id, 'ATTRIBUTE_STR').total;
  const dexMod = getFinalVariableValue(id, 'ATTRIBUTE_DEX').total;

  ///

  const parts = new Map<string, number>();

  if (hasFinesseUseDexDamage && hasFinesse) {
    if (dexMod >= strMod) {
      if (dexMod) {
        parts.set(
          `This is your Dexterity modifier. You're adding Dexterity instead of Strength to your weapon's damage because this weapon has the finesse trait and you have an ability that allows you to use your Dexterity modifier instead of Strength for damage with finesse weapons.`,
          dexMod
        );
      }
    } else {
      if (strMod) {
        parts.set(
          'This is your Strength modifier. You have an ability that allows you to use your Dexterity modifier instead of Strength for damage with finesse weapons. However, your Strength modifier is greater than your Dexterity so it is being used instead.',
          strMod
        );
      }
    }
  } else {
    if (!hasSplash && strMod) {
      parts.set(
        'This is your Strength modifier. You generally add your Strength modifier to damage with melee weapons.',
        strMod
      );
    }
  }

  if (attackDamage) {
    parts.set('This is a bonus you receive to all attack damage.', attackDamage);
  }

  if (dexAttackDamage) {
    parts.set('This is a bonus you receive to damage for Dexterity-based attacks.', dexAttackDamage);
  }

  if (strAttackDamage) {
    parts.set('This is a bonus you receive to damage for Strength-based attacks.', strAttackDamage);
  }

  if (meleeAttackDamage) {
    parts.set('This is a bonus you receive to damage for melee attacks.', meleeAttackDamage);
  }

  return {
    total: [...parts.values()].reduce((a, b) => a + b, 0),
    parts: parts,
  };
}

function getProfTotal(id: StoreID, item: Item) {
  let category = item.meta_data?.category ?? 'simple';

  // Weapon familiarity // List of weapon names, group names, or trait IDs
  const familiarity =
    getVariable<VariableListStr>(id, 'WEAPON_FAMILIARITY')?.value.map((f) => f.trim().toUpperCase()) ?? [];
  const matchFamiliarity = () => {
    for (const f of familiarity) {
      if (item.name.trim().toUpperCase() === f) return true;
      if (item.meta_data?.group && item.meta_data.group.trim().toUpperCase() === f) return true;
      // Don't use labelToVariable here, as it will remove the numbers for IDs
      if (!isNaN(parseInt(f)) && item.traits?.includes(parseInt(f))) return true;
    }
    return false;
  };
  if (matchFamiliarity()) {
    if (category === 'martial') {
      category = 'simple';
    } else if (category === 'advanced') {
      category = 'martial';
    }
  }

  let categoryProfTotal = 0;
  if (category === 'simple') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `SIMPLE_WEAPONS`));
  } else if (category === 'martial') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `MARTIAL_WEAPONS`));
  } else if (category === 'advanced') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `ADVANCED_WEAPONS`));
  } else if (category === 'unarmed_attack') {
    categoryProfTotal = parseInt(getFinalProfValue(id, `UNARMED_ATTACKS`));
  }

  const group = item.meta_data?.group ?? 'brawling';
  const groupProfTotal = parseInt(getFinalProfValue(id, `WEAPON_GROUP_${group.trim().toUpperCase()}`));

  const individualProfTotal = parseInt(getFinalProfValue(id, `WEAPON_${labelToVariable(item.name)}`));

  const profTotal = Math.max(categoryProfTotal, groupProfTotal, individualProfTotal);

  // "When wielding a weapon you aren't proficient with, treat your level as your proficiency bonus."
  const martialExperience = getVariable<VariableBool>(id, 'MARTIAL_EXPERIENCE')?.value ?? false;
  if (martialExperience && profTotal <= 0) {
    const profWithoutLevel = !!getVariable<VariableBool>('ALL', 'PROF_WITHOUT_LEVEL')?.value;
    if (profWithoutLevel) {
      return 0;
    } else {
      return getVariable<VariableNum>(id, 'LEVEL')?.value ?? 0;
    }
  }

  return profTotal;
}

function getMAPedTotal(id: StoreID, item: Item, total: number): [number, number, number] {
  const hasAgile = hasTraitType('AGILE', item.traits);

  const first = total;
  const second = hasAgile ? total - 4 : total - 5;
  const third = hasAgile ? total - 8 : total - 10;

  return [first, second, third];
}

function convertDamageType(rawDamageType: string) {
  const damageType = rawDamageType.toLowerCase().trim();
  if (damageType === 'bludgeoning' || damageType === 'b') {
    return 'B';
  } else if (damageType === 'piercing' || damageType === 'p') {
    return 'P';
  } else if (damageType === 'slashing' || damageType === 's') {
    return 'S';
  } else if (damageType === 'acid' || damageType === 'a') {
    return 'acid';
  } else if (damageType === 'cold' || damageType === 'c') {
    return 'cold';
  } else if (damageType === 'electricity' || damageType === 'e') {
    return 'electricity';
  } else if (damageType === 'fire' || damageType === 'f') {
    return 'fire';
  } else if (damageType === 'mental' || damageType === 'm') {
    return 'mental';
  } else if (damageType === 'poison' || damageType === 'po') {
    return 'poison';
  } else if (damageType === 'sonic' || damageType === 'So') {
    return 'sonic';
  } else {
    return rawDamageType;
  }
}
