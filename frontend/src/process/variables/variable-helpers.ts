import { getAcParts } from '@items/armor-handler';
import { getBestArmor } from '@items/inv-utils';
import { CastingSource, Item, LivingEntity } from '@schemas/content';
import {
  ProficiencyType,
  StoreID,
  VariableAttr,
  VariableBool,
  VariableListStr,
  VariableNum,
  VariableProf,
  VariableStr,
} from '@schemas/variables';
import { hasTraitType } from '@utils/traits';
import { getVariable, getVariableBonuses } from './variable-manager';
import { compileProficiencyType, compileExpressions, getProficiencyTypeValue } from './variable-utils';
import { sign } from '@utils/numbers';

export function getFinalProfValue(
  id: StoreID,
  variableName: string,
  isDC: boolean = false,
  overrideAttribute?: string,
  overrideProfType?: ProficiencyType
) {
  const parts = getProfValueParts(id, variableName, overrideAttribute, overrideProfType);
  if (!parts) {
    if (isDC) {
      return '10';
    } else {
      if (getVariable<VariableBool>('CHARACTER', 'PROF_WITHOUT_LEVEL')?.value) {
        return '-2';
      } else {
        return '+0';
      }
    }
  }
  return isDC
    ? `${10 + parts.profValue + (parts.attributeMod ?? 0) + parts.level + parts.breakdown.bonusValue}`
    : sign(parts.profValue + (parts.attributeMod ?? 0) + parts.level + parts.breakdown.bonusValue);
}

/** A raw modifier already resolved from any variable expression, before typed stacking. */
export type ModifierBonus = Pick<ReturnType<typeof getVariableBonuses>[number], 'value' | 'type' | 'text' | 'source'>;
export type ModifierGroup = { value: number; composition: { amount: number; source: string }[] };

/**
 * Resolve all applicable raw modifiers together. Positive and negative modifiers have separate
 * typed limits; untyped entries stack. Descriptive conditions remain available without changing totals.
 */
export function resolveModifierBonuses(bonuses: ModifierBonus[]) {
  const bmap = new Map<string, ModifierGroup>();
  const conditionals: { text: string; source: string }[] = [];
  for (const bonus of bonuses) {
    if (bonus.text) {
      conditionals.push({ text: getBonusText(bonus), source: bonus.source });
      continue;
    }
    if (bonus.value === null || bonus.value === undefined || !Number.isFinite(bonus.value)) continue;
    const type = bonus.type?.trim().toLowerCase() || 'untyped';
    const adjustment = bonus.value >= 0 ? 'bonus' : 'penalty';
    const key = `${type} ${adjustment}`;
    const existing = bmap.get(key);
    if (existing) {
      existing.value =
        type === 'untyped'
          ? existing.value + bonus.value
          : (adjustment === 'bonus' ? Math.max : Math.min)(existing.value, bonus.value);
      existing.composition.push({ amount: bonus.value, source: bonus.source });
    } else {
      bmap.set(key, { value: bonus.value, composition: [{ amount: bonus.value, source: bonus.source }] });
    }
  }
  return { bonus: [...bmap.values()].reduce((total, group) => total + group.value, 0), bmap, conditionals };
}

/** Combine category baselines additively and apply typed stacking once across their raw modifiers. */
export function getCombinedVariableValue(
  id: StoreID,
  variableNames: string[],
  additionalBonuses: ModifierBonus[] = []
) {
  let value = 0;
  const bonuses: ModifierBonus[] = [...additionalBonuses];
  for (const name of new Set(variableNames)) {
    const variable = getVariable(id, name);
    if (variable?.type === 'num') value += variable.value;
    else if (variable?.type === 'attr') value += variable.value.value;
    bonuses.push(...getVariableBonuses(id, name));
  }
  const resolved = resolveModifierBonuses(bonuses);
  return { ...resolved, value, total: value + resolved.bonus };
}

/** Resolve one variable using the same modifier rules as combined attack, damage, and AC categories. */
export function getFinalVariableValue(id: StoreID, variableName: string) {
  return getCombinedVariableValue(id, [variableName]);
}

/** Numeric breakdown entries use the resolved groups, so the displayed equation matches the actual total. */
export function getModifierParts(modifiers: ReturnType<typeof getCombinedVariableValue>): Map<string, number> {
  const parts = new Map<string, number>();
  if (modifiers.value) parts.set('Additional base adjustments from applicable operations.', modifiers.value);
  for (const [type, group] of modifiers.bmap) {
    if (!group.value) continue;
    const sources = group.composition.map((entry) => `${entry.source}: ${sign(entry.amount)}`).join('; ');
    parts.set(`${type} (${sources}).`, group.value);
  }
  return parts;
}

export function getProfValueParts(
  id: StoreID,
  variableName: string,
  overrideAttribute?: string,
  overrideProfType?: ProficiencyType
) {
  const variable = getVariable<VariableProf>(id, variableName);
  if (!variable) return null;
  const breakdown = getVariableBreakdown(id, variableName);
  const hasConditionals = breakdown.conditionals.length > 0;
  const profType = overrideProfType ?? compileProficiencyType(variable.value);

  let level = 0;
  if (getVariable<VariableBool>('CHARACTER', 'PROF_WITHOUT_LEVEL')?.value) {
    level = profType !== 'U' ? 0 : -2;
  } else {
    level = profType !== 'U' ? (getVariable<VariableNum>(id, 'LEVEL')?.value ?? 0) : 0;
  }

  if (variableName.startsWith('SKILL_') && profType === 'U') {
    const untrainedImprov = getVariable<VariableStr>(id, 'UNTRAINED_IMPROVISATION')?.value;
    if (untrainedImprov) {
      const result = parseInt(compileExpressions(id, untrainedImprov?.trim(), true) ?? '');
      level = result;
    }
  }

  const profValue = getProficiencyTypeValue(profType);

  let attribute = overrideAttribute ? overrideAttribute : variable.value.attribute;
  if (!attribute && (variableName === 'SPELL_ATTACK' || variableName === 'SPELL_DC')) {
    // If we don't have an attribute for spellcasting, take the first one from the casting sources
    const rawCastingSources = getVariable<VariableListStr>(id, 'CASTING_SOURCES')?.value ?? [];
    const castingSources = rawCastingSources.map((source) => {
      const parts = source.split(':::') || ['', '', '', ''];
      return {
        name: parts[0],
        type: parts[1],
        tradition: parts[2],
        attribute: parts[3],
      } satisfies CastingSource as CastingSource;
    });
    if (castingSources.length > 0) {
      attribute = castingSources[0].attribute;
    }
  }

  const attributeMod = attribute ? getFinalVariableValue(id, attribute).total : null;

  return {
    level,
    profValue,
    attributeMod,
    hasConditionals,
    breakdown,
  };
}

export function getVariableBreakdown(id: StoreID, variableName: string) {
  const final = getFinalVariableValue(id, variableName);
  return { bonuses: final.bmap, bonusValue: final.bonus, baseValue: final.value, conditionals: final.conditionals };
}

export function getBonusText(bonus: ModifierBonus) {
  if (bonus.value) {
    const suffix = bonus.value > 0 ? 'bonus' : 'penalty';
    if (bonus.type) {
      return `${sign(bonus.value)} ${bonus.type} ${suffix} ${bonus.text}`.trim();
    } else {
      return `${sign(bonus.value)} ${suffix} ${bonus.text}`.trim();
    }
  }

  return `${bonus.text}`.trim();
}

export function getHealthValueParts(id: StoreID) {
  const ancestryHp = getFinalVariableValue(id, 'MAX_HEALTH_ANCESTRY').total;
  const classHp = getFinalVariableValue(id, 'MAX_HEALTH_CLASS_PER_LEVEL').total;
  const bonusHp = getFinalVariableValue(id, 'MAX_HEALTH_BONUS').total;
  const conMod = getFinalVariableValue(id, 'ATTRIBUTE_CON').total;
  let level = getVariable<VariableNum>(id, 'LEVEL')!.value;
  if (level === -100) {
    level = getVariable<VariableNum>('CHARACTER', 'LEVEL')?.value ?? 0;
  }

  const breakdown = getVariableBreakdown(id, 'MAX_HEALTH_BONUS');
  // const ancestryBreakdown = getVariableBreakdown(id, 'MAX_HEALTH_ANCESTRY');
  // const classBreakdown = getVariableBreakdown(id, 'MAX_HEALTH_CLASS_PER_LEVEL');

  return {
    level,
    ancestryHp,
    classHp,
    bonusHp,
    conMod,
    breakdown,
    // ancestryBreakdown,
    // classBreakdown,
  };
}

/**
 * Whether the Stamina variant rule (GM Core) is enabled for this store. Only ever set on
 * character stores (via `character.variants.stamina`) — creatures & companions are unaffected.
 */
export function isStaminaVariant(id: StoreID) {
  return getVariable<VariableBool>(id, 'STAMINA_VARIANT')?.value ?? false;
}

export function getFinalHealthValue(id: StoreID) {
  const { level, ancestryHp, classHp, bonusHp, conMod } = getHealthValueParts(id);
  if (isStaminaVariant(id)) {
    // Stamina variant: only half the class HP goes to max HP and Con no longer contributes
    // (the other half of class HP + Con mod per level become stamina points instead).
    return ancestryHp + bonusHp + Math.floor(classHp / 2) * level;
  }
  return ancestryHp + bonusHp + (classHp + conMod) * level;
}

/**
 * Max stamina points under the Stamina variant: (half class HP + Con mod) per level.
 * Returns 0 when the variant isn't enabled for this store.
 */
export function getFinalStaminaValue(id: StoreID) {
  if (!isStaminaVariant(id)) return 0;
  const { level, classHp, conMod } = getHealthValueParts(id);
  return Math.max((Math.floor(classHp / 2) + conMod) * level, 0);
}

/**
 * The attribute variable the resolve pool is keyed off of — the class's key attribute
 * (whatever the class DC uses). Returns null if no class has been selected yet.
 */
export function getResolveAttribute(id: StoreID) {
  return getVariable<VariableProf>(id, 'CLASS_DC')?.value.attribute ?? null;
}

/**
 * Max resolve points under the Stamina variant: equal to the class's key attribute modifier.
 * Returns 0 when the variant isn't enabled for this store.
 */
export function getFinalResolveValue(id: StoreID) {
  if (!isStaminaVariant(id)) return 0;
  const attribute = getResolveAttribute(id);
  const keyMod = attribute ? (getVariable<VariableAttr>(id, attribute)?.value.value ?? 0) : 0;
  return Math.max(keyMod, 0);
}

export function getFinalAcValue(id: StoreID, item?: Item) {
  const { profBonus, bonusAc, dexBonus, armorBonus } = getAcParts(id, item);
  return 10 + profBonus + bonusAc + dexBonus + armorBonus;
}

/**
 * Ignore the eligible armor penalty, then choose one other penalty to reduce by up to 5 feet.
 * Re-stack each legal candidate from raw modifiers; suppressed penalties never create extra Speed.
 */
export function getSpeedValue(id: StoreID, variable: VariableNum, entity: LivingEntity | null) {
  const base = getFinalVariableValue(id, variable.name).value;
  const unburdenedIron = getVariable<VariableBool>(id, 'UNBURDENED_IRON')?.value ?? false;
  let bonuses: ModifierBonus[] = getVariableBonuses(id, variable.name);
  if (unburdenedIron) {
    const armor = getBestArmor(id, entity?.inventory)?.item;
    const ignoreArmor = armor && !hasTraitType('HINDERING', armor.traits ?? undefined);
    bonuses = bonuses.map((bonus) =>
      ignoreArmor && bonus.source === armor.name && !bonus.text && (bonus.value ?? 0) < 0
        ? { ...bonus, value: 0 }
        : bonus
    );
  }
  let resolved = resolveModifierBonuses(bonuses);
  if (unburdenedIron) {
    for (const [index, bonus] of bonuses.entries()) {
      if (bonus.text || (bonus.value ?? 0) >= 0) continue;
      const candidate = resolveModifierBonuses(
        bonuses.map((entry, candidateIndex) =>
          candidateIndex === index ? { ...entry, value: Math.min(0, (entry.value ?? 0) + 5) } : entry
        )
      );
      if (candidate.bonus > resolved.bonus) resolved = candidate;
    }
  }
  return { ...resolved, total: Math.max(5, base + resolved.bonus), value: base };
}
