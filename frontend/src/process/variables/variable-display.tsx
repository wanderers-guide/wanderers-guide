import { VariableAttr, VariableNum, VariableProf } from '@typing/variables';
import { getVariable, getVariableBonuses } from './variable-manager';
import { sign } from '@utils/numbers';
import { Box, Text } from '@mantine/core';
import { getProficiencyTypeValue } from './variable-utils';

export function displayFinalProfValue(variableName: string, isDC: boolean = false) {
  const variable = getVariable<VariableProf>(variableName);
  if (!variable) return null;

  const parts = getProfValueParts(variableName)!;

  return (
    <span style={{ position: 'relative' }}>
      {isDC ? (
        <>
          {10 + parts.profValue + (parts.attributeMod ?? 0) + parts.level + parts.totalBonusValue}
        </>
      ) : (
        <>
          {sign(parts.profValue + (parts.attributeMod ?? 0) + parts.level + parts.totalBonusValue)}
        </>
      )}
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

export function getProfValueParts(variableName: string) {
  const variable = getVariable<VariableProf>(variableName);
  if (!variable) return null;
  const breakdown = getProfBreakdown(variableName);
  const hasConditionals = breakdown.conditionals.length > 0;

  const level = variable.value.value !== 'U' ? getVariable<VariableNum>('LEVEL')?.value ?? 0 : 0;
  const profValue = getProficiencyTypeValue(variable.value.value);
  const attributeMod =
    getVariable<VariableAttr>(variable.value.attribute ?? '')?.value.value ?? null;
  const totalBonusValue = Array.from(breakdown.bonuses.values()).reduce(
    (acc, bonus) => acc + bonus.value,
    0
  );

  return {
    level,
    profValue,
    attributeMod,
    totalBonusValue,
    hasConditionals,
    breakdown,
  };
}

function getProfBreakdown(variableName: string) {
  const bonuses = getVariableBonuses(variableName);

  const bMap = new Map<
    string,
    { value: number; composition: { amount: number; source: string }[] }
  >();
  const conditionals: { text: string; source: string }[] = [];

  /*
    If there's no display text, we add the number and compare against type.
    If there's display text, we don't add the value.

    If there's no type, we add the number either way.
  */
  for (const bonus of bonuses) {
    if (bonus.text) {
      conditionals.push({ text: bonus.text, source: bonus.source });
    } else {
      const key = bonus.type ? bonus.type.trim().toLowerCase() : 'untyped';
      if (bMap.has(key)) {
        const bMapValue = bMap.get(key)!;
        bMap.set(key, {
          value:
            key === 'untyped'
              ? bMapValue.value + (bonus.value ?? 0)
              : Math.max(bMapValue.value, bonus.value ?? 0),
          composition: [
            ...bMapValue.composition,
            { amount: bonus.value ?? 0, source: bonus.source },
          ],
        });
      } else {
        bMap.set(key, {
          value: bonus.value!,
          composition: [{ amount: bonus.value!, source: bonus.source }],
        });
      }
    }
  }

  return { bonuses: bMap, conditionals };
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

export function getHealthValueParts() {
  const ancestryHp = getVariable<VariableNum>('MAX_HEALTH_ANCESTRY')!.value;
  const classHp = getVariable<VariableNum>('MAX_HEALTH_CLASS_PER_LEVEL')!.value;
  const bonusHp = getVariable<VariableNum>('MAX_HEALTH_BONUS')!.value;
  const conMod = getVariable<VariableAttr>('ATTRIBUTE_CON')!.value.value;
  const level = getVariable<VariableNum>('LEVEL')!.value;

  return {
    level,
    ancestryHp,
    classHp,
    bonusHp,
    conMod,
  };
}

export function displayFinalHealthValue() {
  const { level, ancestryHp, classHp, bonusHp, conMod } = getHealthValueParts();
  return <span>{ancestryHp + bonusHp + (classHp + conMod) * level}</span>;
}
