import { getCachedContent } from '@content/content-store';
import { Item, Trait } from '@schemas/content';
import { StoreID, VariableBool, VariableListStr, VariableNum, VariableProf, VariableStr } from '@schemas/variables';
import { hasTraitType } from '@utils/traits';
import {
  getCombinedVariableValue,
  getFinalVariableValue,
  getModifierParts,
  getProfValueParts,
  ModifierBonus,
} from '@variables/variable-helpers';
import { getVariable } from '@variables/variable-manager';
import { compileProficiencyType, labelToVariable } from '@variables/variable-utils';
import { compileTraits, getGradeImprovements, isItemRangedWeapon } from './inv-utils';
import stripMd from 'remove-markdown';
import { getSharedEidolonRunes } from './eidolon-runes';

export function parseOtherDamage(
  damage: { dice: number; die: string; damageType: string; bonus: number }[],
  prefix?: string
) {
  prefix = prefix ?? ' + ';
  return damage.map((d, index) => {
    const damageString = `${index === 0 ? prefix : ' + '}${d.dice}${d.die} ${d.damageType}`;
    return d.bonus > 0 ? `${damageString} + ${d.bonus}` : damageString;
  });
}

export function getWeaponStats(id: StoreID, item: Item) {
  // Get adjustments from Starfinder item grade
  const gradeImprovements = getGradeImprovements(item);
  const sharedRunes = getSharedEidolonRunes(id, item);

  // Get the number of dice for the weapon
  let dice =
    Number(item.meta_data?.damage?.dice ?? 1) +
    Math.max(Math.min(Number(item.meta_data?.runes?.striking ?? 0), 4), sharedRunes.striking) +
    (gradeImprovements.damage_dice - 1);
  const minDice = getVariable<VariableNum>(id, 'MINIMUM_WEAPON_DAMAGE_DICE')?.value ?? 1;
  if (dice < minDice) dice = minDice;

  //
  const die = item.meta_data?.damage?.die ?? '';
  const damageType = convertDamageType(item.meta_data?.damage?.damageType ?? '');
  let extra = (item.meta_data?.damage?.extra ?? '').trim();

  // Remove any starting '+' (we add it later)
  if (extra.startsWith('+')) {
    extra = extra.substring(1).trim();
  }

  // Remove the first number from the extra damage string, to add it to the bonus
  let extraDamage = 0;
  extra = extra
    .replace(/(([^d]|^)(|-)\d+?)($|\s)/, (_, group1) => {
      extraDamage = parseInt(group1);
      return ''; // Remove the first match
    })
    .trim();

  // Again, remove any starting '+' (the removed extra damage could be followed by another one)
  if (extra.startsWith('+')) {
    extra = extra.substring(1).trim();
  }

  const other: {
    dice: number;
    die: string;
    damageType: string;
    bonus: number;
    source?: string;
  }[] = [];

  const damageRunes = (item.meta_data?.runes?.property ?? []).filter((r) => !!r.rune?.meta_data?.damage?.die);
  for (const rune of damageRunes) {
    other.push({
      dice: Number(rune.rune!.meta_data!.damage!.dice),
      die: rune.rune!.meta_data!.damage!.die ?? '',
      damageType: convertDamageType(rune.rune?.meta_data?.damage?.damageType ?? ''),
      bonus: 0,
      source: rune.rune ? `<${rune.name}> ${stripMd(rune.rune.description)}` : rune.name,
    });
  }

  const damageBonus = getAttackDamage(id, item);
  if (extraDamage !== 0) {
    damageBonus.total += extraDamage;
    damageBonus.parts.set('This is an extra custom bonus you receive for this item.', extraDamage);
  }

  return {
    attack_bonus: getAttackBonus(id, item),
    damage: {
      dice: dice,
      die: die,
      damageType: damageType,
      bonus: damageBonus,
      other: other,
      extra: extra,
    },
  };
}

/** Resolve a weapon attack using only its actual attack attribute and one shared typed-modifier pool. */
function getAttackBonus(id: StoreID, item: Item) {
  const traits = compileTraits(item);
  const ranged = isItemRangedWeapon(item);
  const brutal = hasTraitType('BRUTAL', traits);
  const finesse = !ranged && hasTraitType('FINESSE', traits);
  const attributes = ranged ? [brutal ? 'STR' : 'DEX'] : finesse ? ['STR', 'DEX'] : ['STR'];
  const proficiency = getProfTotal(id, item);
  const sharedPotency = getSharedEidolonRunes(id, item).potency;
  const ownPotency = Math.min(item.meta_data?.runes?.potency ?? 0, 4);
  const potency = Math.max(ownPotency, sharedPotency);
  const tracking = Math.max(
    0,
    ...(['TRACKING-1', 'TRACKING-2', 'TRACKING-3', 'TRACKING-4'] as const).map((trait, index) =>
      hasTraitType(trait, traits) ? index + 1 : 0
    )
  );
  const itemBonuses: ModifierBonus[] = [
    {
      value: potency,
      type: 'item',
      text: '',
      source: sharedPotency > ownPotency ? "Summoner's shared potency rune" : `${item.name} potency rune`,
    },
    { value: item.meta_data?.attack_bonus ?? 0, type: 'item', text: '', source: `${item.name} attack bonus` },
    { value: tracking, type: 'item', text: '', source: `${item.name} tracking trait` },
  ].filter((bonus) => bonus.value !== 0);
  const candidates = attributes.map((attribute) => {
    const modifiers = getCombinedVariableValue(
      id,
      [
        ...proficiency.bonusVariables,
        'ATTACK_ROLLS_BONUS',
        'NON_SPELL_ATTACK_ROLLS_BONUS',
        `${ranged ? 'RANGED' : 'MELEE'}_ATTACK_ROLLS_BONUS`,
        `${attribute}_ATTACK_ROLLS_BONUS`,
      ],
      itemBonuses
    );
    const attributeMod = getFinalVariableValue(id, `ATTRIBUTE_${attribute}`).total;
    const parts = new Map<string, number>([
      ['This is your proficiency bonus with this weapon.', proficiency.total],
      [`This attack uses your ${attribute === 'DEX' ? 'Dexterity' : 'Strength'} modifier.`, attributeMod],
      ...getModifierParts(modifiers),
    ]);
    return { total: proficiency.total + attributeMod + modifiers.total, parts, conditionals: modifiers.conditionals };
  });
  // Finesse is optional: compare the complete legal attack totals, including attribute-specific penalties.
  const best = candidates.reduce((best, candidate) => (candidate.total > best.total ? candidate : best));
  return { ...best, total: getMAPedTotal(id, item, best.total) };
}

/** Choose the damage attribute independently of the attack attribute, preserving thrown and propulsive rules. */
function getAttackDamage(id: StoreID, item: Item) {
  const traits = compileTraits(item);
  const ranged = isItemRangedWeapon(item);
  const splash = hasTraitType('SPLASH', traits);
  const thrown = (
    [
      'THROWN',
      'THROWN-5',
      'THROWN-10',
      'THROWN-15',
      'THROWN-20',
      'THROWN-25',
      'THROWN-30',
      'THROWN-40',
      'THROWN-100',
      'THROWN-200',
    ] as const
  ).some((trait) => hasTraitType(trait, traits));
  const propulsive = ranged && hasTraitType('PROPULSIVE', traits);
  const usesFullStrength = ranged ? (thrown && !splash) || hasTraitType('FLARE', traits) : !splash;
  const mayUseDexterity =
    !ranged &&
    !splash &&
    hasTraitType('FINESSE', traits) &&
    (getVariable<VariableBool>(id, 'USE_DEX_FOR_MELEE_FINESSE')?.value ?? false);
  const attributes = usesFullStrength || propulsive ? (mayUseDexterity ? ['STR', 'DEX'] : ['STR']) : [];
  const specialization = getWeaponSpecialization(id, item);
  const candidates = (attributes.length ? attributes : [null]).map((attribute) => {
    const modifiers = getCombinedVariableValue(id, [
      'ATTACK_DAMAGE_BONUS',
      'NON_SPELL_ATTACK_DAMAGE_BONUS',
      `${ranged ? 'RANGED' : 'MELEE'}_ATTACK_DAMAGE_BONUS`,
      ...(attribute ? [`${attribute}_ATTACK_DAMAGE_BONUS`] : []),
    ]);
    let attributeMod = attribute ? getFinalVariableValue(id, `ATTRIBUTE_${attribute}`).total : 0;
    if (propulsive && !usesFullStrength && attributeMod > 0) attributeMod = Math.floor(attributeMod / 2);
    const parts = new Map<string, number>();
    if (attribute)
      parts.set(
        propulsive && !usesFullStrength
          ? 'Propulsive adds half your positive Strength modifier, or your full negative Strength modifier.'
          : `This damage uses your ${attribute === 'DEX' ? 'Dexterity' : 'Strength'} modifier.`,
        attributeMod
      );
    for (const [description, value] of getModifierParts(modifiers)) parts.set(description, value);
    if (specialization.value) parts.set(specialization.description, specialization.value);
    return {
      total: attributeMod + modifiers.total + specialization.value,
      parts,
      conditionals: modifiers.conditionals,
    };
  });
  return candidates.reduce((best, candidate) => (candidate.total > best.total ? candidate : best));
}

/** Specialization is an untyped rules contribution determined by the weapon's actual proficiency rank. */
function getWeaponSpecialization(id: StoreID, item: Item): { value: number; description: string } {
  const proficiency = getProfTotal(id, item).prof;
  const greater = getVariable<VariableBool>(id, 'WEAPON_SPECIALIZATION_GREATER')?.value ?? false;
  const enabled = greater || (getVariable<VariableBool>(id, 'WEAPON_SPECIALIZATION')?.value ?? false);
  const base = proficiency === 'E' ? 2 : proficiency === 'M' ? 3 : proficiency === 'L' ? 4 : 0;
  return {
    value: enabled ? base * (greater ? 2 : 1) : 0,
    description: `Additional damage from ${greater ? 'greater weapon specialization' : 'weapon specialization'} at your weapon proficiency.`,
  };
}

/** Compare proficiency rank and level without prematurely stacking its bonuses into the attack. */
function getWeaponProficiencyBase(id: StoreID, variable: string): number {
  const parts = getProfValueParts(id, variable);
  return parts
    ? parts.profValue + parts.level
    : getVariable<VariableBool>('CHARACTER', 'PROF_WITHOUT_LEVEL')?.value
      ? -2
      : 0;
}

/**
 * Finds the skill proficiency variables tied to an item's Professional traits.
 * SF2e "Professional (<Skill>)" traits are separate trait records per skill, so we match the
 * item's trait IDs against cached traits by name pattern instead of hardcoding IDs.
 * @param item - Item to inspect
 * @returns - Skill variable names (e.g. SKILL_COMPUTERS) listed by the item's Professional traits
 */
function getProfessionalTraitSkills(item: Item): string[] {
  const traitIds = new Set(compileTraits(item));
  if (traitIds.size === 0) return [];

  const skills: string[] = [];
  for (const trait of getCachedContent<Trait>('trait')) {
    if (!trait?.id || !traitIds.has(trait.id)) continue;
    const match = /^professional \((.+?)\)/i.exec(trait.name.trim());
    if (match) {
      skills.push(`SKILL_${labelToVariable(match[1])}`);
    }
  }
  return skills;
}

/**
 * The weapon's effective group. A str variable named WEAPON_GROUP_OVERRIDE_<ITEM NAME>
 * overrides the item's stored group — for weapons whose group is player-selected
 * (e.g. the solarian's Solar Weapon, whose form is chosen and can be re-forged).
 */
export function getWeaponGroup(id: StoreID, item: Item): string | undefined {
  const override = getVariable<VariableStr>(id, `WEAPON_GROUP_OVERRIDE_${labelToVariable(item.name)}`)?.value;
  if (override && override.trim().length > 0) {
    return override.trim().toLowerCase();
  }
  return item.meta_data?.group;
}

function getProfTotal(id: StoreID, item: Item) {
  let category = item.meta_data?.category ?? 'simple';

  // Weapon familiarity // List of weapon names, group names, or trait IDs
  const familiarity =
    getVariable<VariableListStr>(id, 'WEAPON_FAMILIARITY')?.value.map((f) => f.trim().toUpperCase()) ?? [];
  const matchFamiliarity = () => {
    for (const f of familiarity) {
      if (item.name.trim().toUpperCase() === f) return true;
      const effectiveGroup = getWeaponGroup(id, item);
      if (effectiveGroup && effectiveGroup.trim().toUpperCase() === f) return true;
      // Don't use labelToVariable here, as it will remove the numbers for IDs
      if (!isNaN(parseInt(f)) && compileTraits(item).includes(parseInt(f))) return true;
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

  let categoryVariable = '';
  let categoryProfTotal = 0;
  if (category === 'simple') {
    categoryVariable = 'SIMPLE_WEAPONS';
  } else if (category === 'martial') {
    categoryVariable = 'MARTIAL_WEAPONS';
  } else if (category === 'advanced') {
    categoryVariable = 'ADVANCED_WEAPONS';
  } else if (category === 'unarmed_attack') {
    categoryVariable = 'UNARMED_ATTACKS';
  }
  categoryProfTotal = getWeaponProficiencyBase(id, categoryVariable);

  const group = getWeaponGroup(id, item) ?? 'brawling';

  const groupVariable = `WEAPON_GROUP_${group.trim().toUpperCase()}`;
  const groupProfTotal = getWeaponProficiencyBase(id, groupVariable);

  const divisionVariables = determineWeaponDivisions(item);
  let divisionVariable = null;
  let divisionProfTotal = 0;
  for (const v of divisionVariables) {
    const newTotal = getWeaponProficiencyBase(id, v);
    if (newTotal > divisionProfTotal) {
      divisionProfTotal = newTotal;
      divisionVariable = v;
    }
  }

  const individualVariable = `WEAPON_${labelToVariable(item.name)}`;
  const individualProfTotal = getWeaponProficiencyBase(id, individualVariable);

  let maxProfTotal = categoryProfTotal;
  let maxVariable = categoryVariable;

  if (groupProfTotal > maxProfTotal) {
    maxProfTotal = groupProfTotal;
    maxVariable = groupVariable;
  }

  if (divisionVariable && divisionProfTotal > maxProfTotal) {
    maxProfTotal = divisionProfTotal;
    maxVariable = divisionVariable;
  }

  if (individualProfTotal > maxProfTotal) {
    maxProfTotal = individualProfTotal;
    maxVariable = individualVariable;
  }

  // Professional trait (SF2e): "For purposes of proficiency, you treat this martial weapon as a
  // simple weapon or this advanced weapon as a martial weapon, up to your proficiency with the
  // listed skill (if higher than your normal proficiency for this weapon)."
  const professionalSkills = getProfessionalTraitSkills(item);
  if (professionalSkills.length > 0) {
    const rawCategory = item.meta_data?.category ?? 'simple';
    const downgradedVariable =
      rawCategory === 'martial' ? 'SIMPLE_WEAPONS' : rawCategory === 'advanced' ? 'MARTIAL_WEAPONS' : null;
    if (downgradedVariable) {
      const downgradedTotal = getWeaponProficiencyBase(id, downgradedVariable);
      for (const skillVariable of professionalSkills) {
        const skillParts = getProfValueParts(id, skillVariable);
        if (!skillParts) continue;
        // The cap is the skill's proficiency (rank + level) — its attribute mod and skill-check
        // bonuses don't carry over to attack proficiency
        const skillCapTotal = skillParts.level + skillParts.profValue;
        const candidateTotal = Math.min(downgradedTotal, skillCapTotal);
        // "(if higher than your normal proficiency)" — only ever an upgrade
        if (candidateTotal > maxProfTotal) {
          maxProfTotal = candidateTotal;
          // Attribute the winning rank to whichever side was the limiting factor, for the breakdown drawer
          maxVariable = downgradedTotal <= skillCapTotal ? downgradedVariable : skillVariable;
        }
      }
    }
  }

  // Martial Experience = "When wielding a weapon you aren't proficient with, treat your level as your proficiency bonus."
  const martialExperience = getVariable<VariableBool>(id, 'MARTIAL_EXPERIENCE')?.value ?? false;
  if (martialExperience && maxProfTotal <= 0) {
    const profWithoutLevel = !!getVariable<VariableBool>('CHARACTER', 'PROF_WITHOUT_LEVEL')?.value;
    if (profWithoutLevel) {
      maxProfTotal = 0;
    } else {
      maxProfTotal = getVariable<VariableNum>(id, 'LEVEL')?.value ?? 0;
    }
  }

  return {
    total: maxProfTotal,
    bonusVariables: [categoryVariable, groupVariable, ...divisionVariables, individualVariable],
    variable: maxVariable,
    prof: compileProficiencyType(getVariable<VariableProf>(id, maxVariable)?.value),
  };
}

function getMAPedTotal(id: StoreID, item: Item, total: number): [number, number, number] {
  const hasAgile = hasTraitType('AGILE', compileTraits(item));

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

/**
 * Utility function to determine the weapon's division
 * @param item - Item
 * @returns - Variables of the weapon division
 */
export function determineWeaponDivisions(item: Item): string[] {
  const traitsIds = compileTraits(item);
  const divisions: string[] = [];

  // Gun: any ranged weapon with the analog or tech trait, split by category
  if (isItemRangedWeapon(item)) {
    if (hasTraitType('ANALOG', traitsIds) || hasTraitType('TECH', traitsIds)) {
      const category = item.meta_data?.category ?? 'simple';
      divisions.push('WEAPON_DIVISION_GUN');
      if (category === 'simple') {
        divisions.push('WEAPON_DIVISION_GUN_SIMPLE');
      } else if (category === 'martial') {
        divisions.push('WEAPON_DIVISION_GUN_MARTIAL');
      } else if (category === 'advanced') {
        divisions.push('WEAPON_DIVISION_GUN_ADVANCED');
      }
    }
  }

  // One-handed agile/finesse weapons (ex. SF2e Striker Operative specialization).
  // "One-handed" counts anything wieldable in a single hand: 1, 1+, or 1 or 2.
  const isOneHanded = ['1', '1+', '1 or 2'].includes(`${item.hands ?? ''}`.trim());
  if (isOneHanded && (hasTraitType('AGILE', traitsIds) || hasTraitType('FINESSE', traitsIds))) {
    divisions.push('WEAPON_DIVISION_ONE_HANDED_AGILE_FINESSE');
  }

  return divisions;
}
