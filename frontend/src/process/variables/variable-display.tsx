import { VariableAttr, StoreID, VariableNum, VariableProf } from '@typing/variables';
import { getVariable, getVariableBonuses } from './variable-manager';
import { sign } from '@utils/numbers';
import { Box, Text, TextProps } from '@mantine/core';
import { getProficiencyTypeValue } from './variable-utils';
import { Item } from '@typing/content';
import { getAcParts } from '@items/armor-handler';

export function getFinalProfValue(id: StoreID, variableName: string, isDC: boolean = false) {
  const parts = getProfValueParts(id, variableName);
  if (!parts) return isDC ? '10' : '+0';
  return isDC
    ? `${10 + parts.profValue + (parts.attributeMod ?? 0) + parts.level + parts.breakdown.bonusValue}`
    : sign(parts.profValue + (parts.attributeMod ?? 0) + parts.level + parts.breakdown.bonusValue);
}

export function displayFinalProfValue(id: StoreID, variableName: string, isDC: boolean = false) {
  const variable = getVariable<VariableProf>(id, variableName);
  if (!variable) return null;

  const parts = getProfValueParts(id, variableName)!;
  const value = getFinalProfValue(id, variableName, isDC);

  return (
    <span style={{ position: 'relative' }}>
      {<>{value}</>}
      {parts.hasConditionals ? (
        <Text
          c='guide.5'
          style={{
            position: 'absolute',
            top: -6,
            right: -7,
          }}
        >
          *
        </Text>
      ) : null}
    </span>
  );
}

export function getFinalVariableValue(id: StoreID, variableName: string) {
  const variable = getVariable(id, variableName);
  const bonuses = getVariableBonuses(id, variableName);

  let value = 0;
  if (variable?.type === 'num') {
    value = variable.value;
  } else if (variable?.type === 'attr') {
    value = variable.value.value;
  }

  const bMap = new Map<string, { value: number; composition: { amount: number; source: string }[] }>();
  /*
    If there's no display text, we add the number and compare against type.
    If there's display text, we don't add the value.

    If there's no type, we add the number either way.
  */
  for (const bonus of bonuses) {
    if (bonus.text) {
      continue;
    } else {
      const type = bonus.type ? bonus.type.trim().toLowerCase() : 'untyped';
      const adj = (bonus.value ?? 0) >= 0 ? 'bonus' : 'penalty';
      const key = `${type} ${adj}`;
      if (bMap.has(key)) {
        const bMapValue = bMap.get(key)!;
        bMap.set(key, {
          value:
            key === 'untyped'
              ? bMapValue.value + (bonus.value ?? 0)
              : (adj === 'bonus' ? Math.max : Math.min)(bMapValue.value, bonus.value ?? 0),
          composition: [...bMapValue.composition, { amount: bonus.value ?? 0, source: bonus.source }],
        });
      } else {
        bMap.set(key, {
          value: bonus.value!,
          composition: [{ amount: bonus.value!, source: bonus.source }],
        });
      }
    }
  }

  const totalBonusValue = Array.from(bMap.values()).reduce((acc, bonus) => acc + bonus.value, 0);

  return {
    total: value + totalBonusValue,
    value: value,
    bonus: totalBonusValue,
    bmap: bMap,
  };
}

export function getProfValueParts(id: StoreID, variableName: string) {
  const variable = getVariable<VariableProf>(id, variableName);
  if (!variable) return null;
  const breakdown = getVariableBreakdown(id, variableName);
  const hasConditionals = breakdown.conditionals.length > 0;

  const level = variable.value.value !== 'U' ? getVariable<VariableNum>(id, 'LEVEL')?.value ?? 0 : 0;
  const profValue = getProficiencyTypeValue(variable.value.value);
  const attributeMod = variable.value.attribute ? getFinalVariableValue(id, variable.value.attribute).total : null;

  return {
    level,
    profValue,
    attributeMod,
    hasConditionals,
    breakdown,
  };
}

export function getVariableBreakdown(id: StoreID, variableName: string) {
  const bonuses = getVariableBonuses(id, variableName);

  const conditionals: { text: string; source: string }[] = [];
  for (const bonus of bonuses) {
    if (bonus.text) {
      conditionals.push({ text: bonus.text, source: bonus.source });
    }
  }

  const final = getFinalVariableValue(id, variableName);

  return { bonuses: final.bmap, bonusValue: final.bonus, conditionals };
}

export function getBonusText(bonus: {
  value?: number | undefined;
  type?: string | undefined;
  text: string;
  source: string;
  timestamp: number;
}) {
  if (bonus.text) {
    return bonus.text;
  }

  if (bonus.value) {
    const suffix = bonus.value > 0 ? 'bonus' : 'penalty';
    if (bonus.type) {
      return `${sign(bonus.value)} ${bonus.type} ${suffix}`;
    } else {
      return `${sign(bonus.value)} ${suffix}`;
    }
  }

  return '';
}

export function getHealthValueParts(id: StoreID) {
  const ancestryHp = getFinalVariableValue(id, 'MAX_HEALTH_ANCESTRY').total;
  const classHp = getFinalVariableValue(id, 'MAX_HEALTH_CLASS_PER_LEVEL').total;
  const bonusHp = getFinalVariableValue(id, 'MAX_HEALTH_BONUS').total;
  const conMod = getFinalVariableValue(id, 'ATTRIBUTE_CON').total;
  const level = getVariable<VariableNum>(id, 'LEVEL')!.value;

  return {
    level,
    ancestryHp,
    classHp,
    bonusHp,
    conMod,
  };
}

export function getFinalHealthValue(id: StoreID) {
  const { level, ancestryHp, classHp, bonusHp, conMod } = getHealthValueParts(id);
  return ancestryHp + bonusHp + (classHp + conMod) * level;
}

export function displayFinalHealthValue(id: StoreID) {
  return <span>{getFinalHealthValue(id)}</span>;
}

export function displayAttributeValue(id: StoreID, attributeName: string, textProps?: TextProps) {
  const attribute = getVariable<VariableAttr>(id, attributeName);
  if (!attribute) return null;
  return (
    <Text {...textProps}>
      <Text {...textProps} span>
        {attribute.value.value < 0 ? '-' : '+'}
      </Text>

      <Text {...textProps} td={attribute.value.partial ? 'underline' : undefined} span>
        {Math.abs(attribute.value.value)}
      </Text>
    </Text>
  );
}

export function getFinalAcValue(id: StoreID, item?: Item) {
  const { profBonus, bonusAc, dexBonus, armorBonus } = getAcParts(id, item);
  return 10 + profBonus + bonusAc + dexBonus + armorBonus;
}

export function displayFinalAcValue(id: StoreID, item: Item) {
  return <span>{getFinalAcValue(id, item)}</span>;
}
