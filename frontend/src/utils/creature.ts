import { createDefaultOperation } from '@operations/operation-utils';
import { ActionCost, Creature } from '@typing/content';
import { OperationAddBonusToValue, OperationAdjValue, OperationGiveTrait, OperationSetValue } from '@typing/operations';
import { sign } from './numbers';
import { getAllSaveVariables, getAllSkillVariables } from '@variables/variable-manager';
import { isAttributeValue, labelToVariable } from '@variables/variable-utils';
import { toLabel } from './strings';
import { cloneDeep } from 'lodash-es';
import { getEntityLevel } from '@pages/character_sheet/living-entity-utils';

export function findCreatureTraits(creature: Creature) {
  return (
    (creature.operations?.filter((op) => op.type === 'giveTrait') as OperationGiveTrait[]).map(
      (op) => op.data.traitId
    ) ?? []
  );
}

export function adjustCreature(input: Creature, adjustment: 'ELITE' | 'WEAK') {
  let creature = cloneDeep(input);
  const mod = adjustment === 'ELITE' ? 1 : -1;

  // HP Adjustment
  let hpAdjustment = 0;
  if (getEntityLevel(creature) >= 1 && getEntityLevel(creature) <= 2) {
    hpAdjustment = mod * 10;
  } else if (getEntityLevel(creature) >= 3 && getEntityLevel(creature) <= 5) {
    hpAdjustment = mod * 15;
  } else if (getEntityLevel(creature) >= 6 && getEntityLevel(creature) <= 20) {
    hpAdjustment = mod * 20;
  } else if (getEntityLevel(creature) >= 21) {
    hpAdjustment = mod * 30;
  }

  // Level Adjustment
  if (getEntityLevel(creature) <= 1) {
    creature.level = getEntityLevel(creature) + mod * 2;
  } else {
    creature.level = getEntityLevel(creature) + mod;
  }

  // Min level is -1
  creature.level = Math.max(creature.level, -1);

  const ops = creature.operations ?? [];
  const STORE_ID = `CREATURE_${creature.id}`;

  // Tweak HP for level * CON adjustment
  const conAttr = (
    ops.find((op) => op.type === 'setValue' && op.data.variable === 'ATTRIBUTE_CON') as OperationSetValue
  )?.data.value;
  if (isAttributeValue(conAttr)) {
    hpAdjustment -= mod * conAttr.value;
  }

  // HP
  ops.push({
    ...createDefaultOperation<OperationAdjValue>('adjValue'),
    data: {
      variable: 'MAX_HEALTH_BONUS',
      value: hpAdjustment,
    },
  } satisfies OperationAdjValue);

  // AC
  ops.push({
    ...createDefaultOperation<OperationAdjValue>('adjValue'),
    data: {
      variable: 'AC_BONUS',
      value: mod * 2,
    },
  } satisfies OperationAdjValue);

  // Attacks
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'ATTACK_ROLLS_BONUS',
      text: '',
      value: `${sign(mod * 2)}`,
      type: 'adj',
    },
  } satisfies OperationAddBonusToValue);
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'ATTACK_DAMAGE_BONUS',
      text: '',
      value: `${sign(mod * 2)}`,
      type: 'adj',
    },
  } satisfies OperationAddBonusToValue);
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'SPELL_DC',
      text: '',
      value: `${sign(mod * 2)}`,
      type: 'adj',
    },
  } satisfies OperationAddBonusToValue);

  // Saves
  for (const save of getAllSaveVariables(STORE_ID)) {
    ops.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: save.name,
        text: '',
        value: `${sign(mod * 2)}`,
        type: 'adj',
      },
    } satisfies OperationAddBonusToValue);
  }

  // Skills
  ops.push({
    ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
    data: {
      variable: 'PERCEPTION',
      text: '',
      value: `${sign(mod * 2)}`,
      type: 'adj',
    },
  } satisfies OperationAddBonusToValue);
  for (const skill of getAllSkillVariables(STORE_ID)) {
    ops.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: skill.name,
        text: '',
        value: `${sign(mod * 2)}`,
        type: 'adj',
      },
    } satisfies OperationAddBonusToValue);
  }

  creature.operations = ops;

  creature.name = `${creature.name} (${adjustment === 'ELITE' ? 'elite' : 'weak'})`;
  creature.details.adjustment = adjustment;

  return cloneDeep(creature);
}

export function extractCreatureInfo(text: string) {
  const info = {
    traits: [] as string[],
    perception: {
      value: 0,
      senses: [] as string[],
    },
    languages: [] as string[],
    skills: [] as { name: string; bonus: number }[],
    attributes: [] as { name: string; value: number }[],
    items: [] as {
      name: string;
      quantity: number;
    }[],
    speeds: [] as {
      name: string;
      value: number;
    }[],
    resistances: [] as {
      type: string;
      value: number;
    }[],
    weaknesses: [] as {
      type: string;
      value: number;
    }[],
    immunities: [] as string[],
    ac: 0,
    saves: {
      fort: 0,
      ref: 0,
      will: 0,
    },
    hp: 0,
    abilities: [] as {
      name: string;
      action: ActionCost;
      traits: string[];
      description: string;
      // Extract other fields here
    }[],
    attacks: [] as {
      name: string;
      traits: string[];
      bonus: number;
      damage: string;
      // Extract damage parts here
    }[],
    // Spells
  };

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const vLine = labelToVariable(line);
    const removeFirstWord = (text: string) => text.split(' ').slice(1).join(' ');

    if (vLine.startsWith('PERCEPTION_')) {
      const parts = removeFirstWord(line).split(/[,;]/g);
      info.perception.value = parseInt(parts[0]);
      info.perception.senses = parts.slice(1).map((p) => p.trim());
      continue;
    }

    if (vLine.startsWith('LANGUAGES_')) {
      const parts = removeFirstWord(line)
        .split(/[,]/g)
        .map((p) => p.trim());
      info.languages = parts;
      continue;
    }

    if (vLine.startsWith('SKILLS_')) {
      const parts = removeFirstWord(line).split(/[,]/g);
      info.skills = parts.map((p) => {
        const pp = p.split(' ');
        const bonus = pp.pop();
        const name = pp.join(' ');
        return {
          name: name,
          bonus: parseInt(bonus || '0'),
        };
      });
      continue;
    }

    if (vLine.startsWith('STR_') || vLine.startsWith('STRENGTH_')) {
      const parts = line.split(/[,;]/g);
      info.attributes = parts.map((p) => {
        const pp = p.split(' ');
        const value = pp.pop();
        const name = pp.join(' ');
        return {
          name: name,
          value: parseInt(value || '0'),
        };
      });
      continue;
    }

    if (vLine.startsWith('ITEMS_')) {
      const parts = removeFirstWord(line).split(/[,]/g);
      info.items = parts.map((p) => {
        const pp = p.split('(');
        const name = pp[0].trim();
        const bonus = parseInt(pp[1]);
        return {
          name: name,
          quantity: isNaN(bonus) ? 1 : bonus,
        };
      });
      continue;
    }

    if (vLine.startsWith('AC_')) {
      const parts = line.split(/[,;]/g);

      for (const part of parts) {
        const fPart = part.trim().toUpperCase();
        if (fPart.startsWith('AC')) {
          info.ac = parseInt(fPart.split(' ')[1]);
        } else if (fPart.startsWith('FORT')) {
          info.saves.fort = parseInt(fPart.split(' ')[1]);
        } else if (fPart.startsWith('REF')) {
          info.saves.ref = parseInt(fPart.split(' ')[1]);
        } else if (fPart.startsWith('WILL')) {
          info.saves.will = parseInt(fPart.split(' ')[1]);
        }
      }
      continue;
    }

    if (vLine.startsWith('HP_')) {
      const parts = line.split(/[,;]/g);
      const fPart = parts[0].trim().toUpperCase();

      info.hp = parseInt(fPart.split(' ')[1]);

      continue;
    }

    if (vLine.startsWith('SPEED_')) {
      const parts = removeFirstWord(line).split(/[,;]/g);
      info.speeds = parts.map((p) => {
        const pp = p.replace(' feet', '').replace(' ft.', '').replace(' ft', '').trim().split(' ');
        const value = pp.pop();
        const name = pp.join(' ');
        return {
          name: name.trim().length > 0 ? name : 'normal',
          value: parseInt(value || '0'),
        };
      });
      continue;
    }

    if (vLine.startsWith('MELEE_') || vLine.startsWith('RANGED_')) {
      const mainParts = removeFirstWord(line).split(/Damage/gi);
      console.log(mainParts);

      let name = mainParts[0].replace('[one-action]', '').trim();
      let traits: string[] = [];
      if (name.includes(' (')) {
        const traitsStr = name.split(')')[0].split(' (')[1].trim();
        traits = traitsStr.split(',').map((t) => t.trim());
        name = name.split(' (')[0].trim();
      }

      if (name.includes(' [')) {
        name = name.split(' [')[0].trim();
      }

      console.log(name);

      const namePP = name.split(' ');
      const bonus = namePP.pop();
      name = namePP.join(' ');

      info.attacks.push({
        name: name,
        traits: traits,
        bonus: parseInt(bonus || '0'),
        damage: mainParts[1].trim(),
      });
      continue;
    }

    // Find traits / rarity / size
    if (lines.indexOf(line) === 0 && line.split(' ').every((t) => t[0].toUpperCase() === t[0])) {
      info.traits = line.split(' ');
      continue;
    }

    // Else it's an ability
    const processAbility = (ability: string) => {
      const extractName = (ability: string) => {
        const parts = ability.split(/(\[|\(|DC|\:)/g);
        const isName = toLabel(parts[0].trim()) === parts[0].trim();
        if (isName) {
          return parts[0].trim();
        } else {
          return null;
        }
      };

      const name = extractName(ability);
      if (!name) return;
      const description = ability.replace(name, '').trim();

      info.abilities.push({
        name: name,
        action: null,
        traits: [],
        description: description,
      });
    };
    processAbility(line);
  }

  console.log(lines);

  return info;
}
