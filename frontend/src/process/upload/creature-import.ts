import { AbilityBlock, ContentSource, Creature, InventoryItem, Item, Rarity, Size, Trait } from '@typing/content';
import {
  EQUIPMENT_TYPES,
  convertToActionCost,
  convertToRarity,
  convertToSize,
  extractFromDescription,
  getItemsByName,
  getLanguageIds,
  getSpellByName,
  getTraitIds,
  stripFoundryLinking,
} from './foundry-utils';
import { toMarkdown, toText } from '@content/content-utils';
import {
  Operation,
  OperationAddBonusToValue,
  OperationAdjValue,
  OperationCreateValue,
  OperationDefineCastingSource,
  OperationGiveItem,
  OperationGiveLanguage,
  OperationGiveSpell,
  OperationGiveSpellSlot,
  OperationGiveTrait,
  OperationSetValue,
} from '@typing/operations';
import { createDefaultOperation } from '@operations/operation-utils';
import { labelToVariable } from '@variables/variable-utils';
import { parseDiceRoll, toLabel } from '@utils/strings';
import _ from 'lodash-es';
import { resetVariables } from '@variables/variable-manager';
import { executeCreatureOperations } from '@operations/operation-controller';
import { fetchContentPackage, fetchTraitByName } from '@content/content-store';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from '@variables/variable-display';
import { getBestArmor, isItemEquippable, isItemImplantable, isItemInvestable } from '@items/inv-utils';
import { hashData, sign } from '@utils/numbers';
import { findCreatureImage } from '@utils/images';
import { getWeaponStats } from '@items/weapon-handler';
import { StoreID } from '@typing/variables';

export async function newImportHandler(source: ContentSource, json: Record<string, any>): Promise<Creature> {
  const creature = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    level: json.system?.details?.level?.value,
    experience: 0,
    hp_current: 0,
    hp_temp: 0,
    stamina_current: 0,
    resolve_current: 0,
    rarity: convertToRarity(json.system?.traits?.rarity),
    inventory: {
      coins: {
        cp: 0,
        sp: 0,
        gp: 0,
        pp: 0,
      },
      items: [],
    },
    notes: undefined,
    details: {
      image_url: await findCreatureImage(toText(json.name) ?? ''),
      background_image_url: undefined,
      conditions: undefined,
      description: toMarkdown(json.system?.details?.publicNotes) ?? '',
    },
    roll_history: undefined,
    operations: undefined,
    abilities_base: undefined,
    abilities_added: undefined,
    spells: {
      slots: [],
      list: [],
      focus_point_current: 0,
      innate_casts: [],
    },
    meta_data: undefined,
    content_source_id: source.id,
    version: '1.0',
  } satisfies Creature as Creature;

  let operations: Operation[] = [];

  console.log(json);

  // Used for tracking what the totals should be for variables
  const varTotals = new Map<string, number>();

  // Attributes
  operations = addAttributes(operations, json);
  // AC
  operations = addAC(operations, json, varTotals);
  // Saves
  operations = addSaves(operations, json, varTotals);
  // HP
  operations = addHP(operations, json, varTotals);
  // Resists, Weaknesses, Immunities
  operations = addResistsWeaks(operations, json);
  // Speeds
  operations = addSpeeds(operations, json);
  // Languages
  operations = await addLanguages(operations, json, source);
  // Perception & Senses
  operations = addPerceptionSenses(operations, json, varTotals);
  // Skills
  operations = addSkills(operations, json, varTotals);
  // Misc Ops
  const traitIds = await getTraitIds(json.system?.traits?.value ?? [], source);
  operations = addMiscOps(operations, json, traitIds);
  // Spells
  operations = await addSpells(operations, json, varTotals);
  // Items
  const { operations: resultOps, items } = await addEquipment(operations, json);
  operations = resultOps;
  creature.inventory!.items = [...creature.inventory!.items, ...items];
  //

  creature.operations = operations;

  // Abilities
  creature.abilities_base = await getAbilities(json, source);

  //////////////////////////

  // Compute creature in sandbox
  // - and add diff of totals to even out stats to og values
  const STORE_ID = `CREATURE_${crypto.randomUUID()}`;

  const content = await fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: false });
  await executeCreatureOperations(STORE_ID, _.cloneDeep(creature), content);

  // Run thru totals
  for (const [key, finalTotal] of varTotals) {
    if (key === 'HEALTH_TEMP') {
      creature.hp_temp = finalTotal;
    } else if (key === 'MAX_HEALTH') {
      const curTotal = getFinalHealthValue(STORE_ID);
      operations.push({
        ...createDefaultOperation<OperationAdjValue>('adjValue'),
        data: {
          variable: 'MAX_HEALTH_BONUS',
          value: finalTotal - curTotal,
        },
      } satisfies OperationAdjValue);
    } else if (key === 'AC') {
      const curTotal = getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, creature.inventory)?.item);
      operations.push({
        ...createDefaultOperation<OperationAdjValue>('adjValue'),
        data: {
          variable: 'AC_BONUS',
          value: finalTotal - curTotal,
        },
      } satisfies OperationAdjValue);
    } else {
      const curTotal = parseInt(getFinalProfValue(STORE_ID, key, key.endsWith('_DC')));
      operations.push({
        ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
        data: {
          variable: key,
          text: '',
          value: `${sign(finalTotal - curTotal)}`,
        },
      } satisfies OperationAddBonusToValue);
    }
  }

  // Add Unarmed Attacks (here because we need to adjust based on totals)
  const attackItems = await addAttacks(STORE_ID, json, source);
  creature.inventory!.items = [...creature.inventory!.items, ...attackItems];
  //

  // Clean up
  resetVariables(STORE_ID);

  return creature;
}

function addAttributes(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_STR',
      value: { value: json.system.abilities.str.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_DEX',
      value: { value: json.system.abilities.dex.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_CON',
      value: { value: json.system.abilities.con.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_INT',
      value: { value: json.system.abilities.int.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_WIS',
      value: { value: json.system.abilities.wis.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_CHA',
      value: { value: json.system.abilities.cha.mod, partial: false },
    },
  } satisfies OperationSetValue);
  return operations;
}

function addAC(operations: Operation[], json: Record<string, any>, varTotals: Map<string, number>) {
  varTotals.set('AC', json.system.attributes.ac.value);

  if (json.system.attributes.ac.details) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'AC_BONUS',
        value: undefined,
        type: undefined,
        text: json.system.attributes.ac.details,
      },
    } satisfies OperationAddBonusToValue);
  }
  return operations;
}

function addSaves(operations: Operation[], json: Record<string, any>, varTotals: Map<string, number>) {
  varTotals.set('SAVE_FORT', json.system.saves.fortitude.value);

  if (json.system.saves.fortitude.saveDetail) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_FORT',
        value: undefined,
        type: undefined,
        text: json.system.saves.fortitude.saveDetail,
      },
    } satisfies OperationAddBonusToValue);
  }

  varTotals.set('SAVE_REFLEX', json.system.saves.reflex.value);

  if (json.system.saves.reflex.saveDetail) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_REFLEX',
        value: undefined,
        type: undefined,
        text: json.system.saves.reflex.saveDetail,
      },
    } satisfies OperationAddBonusToValue);
  }

  varTotals.set('SAVE_WILL', json.system.saves.will.value);

  if (json.system.saves.will.saveDetail) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_WILL',
        value: undefined,
        type: undefined,
        text: json.system.saves.will.saveDetail,
      },
    } satisfies OperationAddBonusToValue);
  }

  // All saves conditional
  if (json.system.attributes.allSaves.value) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_FORT',
        value: undefined,
        type: undefined,
        text: json.system.attributes.allSaves.value,
      },
    } satisfies OperationAddBonusToValue);
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_REFLEX',
        value: undefined,
        type: undefined,
        text: json.system.attributes.allSaves.value,
      },
    } satisfies OperationAddBonusToValue);
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_WILL',
        value: undefined,
        type: undefined,
        text: json.system.attributes.allSaves.value,
      },
    } satisfies OperationAddBonusToValue);
  }

  return operations;
}

function addHP(operations: Operation[], json: Record<string, any>, varTotals: Map<string, number>) {
  varTotals.set('MAX_HEALTH', json.system.attributes.hp.max);

  if (json.system.attributes.hp.details) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'MAX_HEALTH_BONUS',
        value: undefined,
        type: undefined,
        text: json.system.attributes.hp.details,
      },
    } satisfies OperationAddBonusToValue);
  }

  varTotals.set('HEALTH_TEMP', json.system.attributes.hp.temp);

  return operations;
}

function addResistsWeaks(operations: Operation[], json: Record<string, any>) {
  const constructValue = (data: Record<string, any>) => {
    const exceptions = data.exceptions && data.exceptions.length > 0 ? ` (except ${data.exceptions.join(', ')})` : '';
    return `${data.type}${exceptions}, ${data.value ?? ''}`;
  };

  for (const immunity of json.system.attributes.immunities ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'IMMUNITIES',
        value: constructValue(immunity),
      },
    } satisfies OperationAdjValue);
  }

  for (const weakness of json.system.attributes.weaknesses ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'WEAKNESSES',
        value: constructValue(weakness),
      },
    } satisfies OperationAdjValue);
  }

  for (const resistance of json.system.attributes.resistances ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'RESISTANCES',
        value: constructValue(resistance),
      },
    } satisfies OperationAdjValue);
  }

  return operations;
}

function addSpeeds(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SPEED',
      value: json.system.attributes.speed.value,
    },
  } satisfies OperationSetValue);

  for (const speed of json.system.attributes.speed.otherSpeeds ?? []) {
    operations.push({
      ...createDefaultOperation<OperationSetValue>('setValue'),
      data: {
        variable: `SPEED_${labelToVariable(speed.type)}`,
        value: speed.value,
      },
    } satisfies OperationSetValue);
  }

  return operations;
}

async function addLanguages(operations: Operation[], json: Record<string, any>, source: ContentSource) {
  // TODO, we don't include languages.details but prob should

  const languageIds = await getLanguageIds(json.system.details.languages.value ?? [], source);
  for (const languageId of languageIds) {
    operations.push({
      ...createDefaultOperation<OperationGiveLanguage>('giveLanguage'),
      data: {
        languageId: languageId,
      },
    } satisfies OperationGiveLanguage);
  }

  return operations;
}

function addPerceptionSenses(operations: Operation[], json: Record<string, any>, varTotals: Map<string, number>) {
  varTotals.set('PERCEPTION', json.system.perception.mod);

  if (json.system.perception.details) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'PERCEPTION',
        value: undefined,
        type: undefined,
        text: json.system.perception.details,
      },
    } satisfies OperationAddBonusToValue);
  }

  const constructValues = (data: Record<string, any>) => {
    const variable = data.acuity
      ? data.acuity === 'imprecise'
        ? 'SENSES_IMPRECISE'
        : data.acuity === 'vague'
          ? 'SENSES_VAGUE'
          : 'SENSES_PRECISE'
      : 'SENSES_PRECISE';
    const range = data.range ? `, ${data.range}` : '';
    return {
      variable: variable,
      value: `${data.type}${range}`,
    };
  };

  for (const sense of json.system.perception.senses ?? []) {
    const result = constructValues(sense);
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: result.variable,
        value: result.value,
      },
    } satisfies OperationAdjValue);
  }

  return operations;
}

function addSkills(operations: Operation[], json: Record<string, any>, varTotals: Map<string, number>) {
  let skills: { name: string; value: number }[] = findJsonItems(json, 'lore').map((skill) => ({
    name: skill.name as string,
    value: skill.system.mod.value as number,
  }));
  skills = [
    ...skills,
    ...Object.keys(json.system?.skills ?? {}).map((key) => ({
      name: key,
      value: json.system.skills[key].base,
    })),
  ];

  for (const skill of skills) {
    // Do includes because sometimes the words are in parentheses
    const isLore = skill.name.includes('Lore');
    const variable = isLore
      ? `SKILL_LORE_${labelToVariable(skill.name.replace(' Lore', ''))}`
      : `SKILL_${labelToVariable(skill.name)}`;
    if (isLore) {
      operations.push({
        ...createDefaultOperation<OperationCreateValue>('createValue'),
        data: {
          variable: variable,
          type: 'prof',
          value: {
            value: 'T',
            increases: 0,
            attribute: 'ATTRIBUTE_INT',
          },
        },
      } satisfies OperationCreateValue);
    } else {
      operations.push({
        ...createDefaultOperation<OperationAdjValue>('adjValue'),
        data: {
          variable: variable,
          value: {
            value: 'T',
          },
        },
      } satisfies OperationAdjValue);
    }

    varTotals.set(variable, skill.value);
  }

  return operations;
}

function addMiscOps(operations: Operation[], json: Record<string, any>, traitIds: number[]) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SIZE',
      value: convertToSize(json.system.traits.size?.value),
    },
  } satisfies OperationSetValue);

  for (const traitId of traitIds) {
    operations.push({
      ...createDefaultOperation<OperationGiveTrait>('giveTrait'),
      data: {
        traitId: traitId,
      },
    } satisfies OperationGiveTrait);
  }

  return operations;
}

async function addSpells(operations: Operation[], json: Record<string, any>, varTotals: Map<string, number>) {
  const convertCastingType = (type: string) => {
    if (type === 'innate') return null;
    if (type === 'focus') return '-';
    if (type === 'prepared') return 'PREPARED-TRADITION';
    if (type === 'spontaneous') return 'SPONTANEOUS-REPERTOIRE';
    return null;
  };

  const castingDataMap = new Map<string, { source: string; type: string; tradition: string }>();
  for (const casting of findJsonItems(json, 'spellcastingEntry')) {
    const source = labelToVariable(casting.name);
    const type = convertCastingType(casting.system.prepared?.value);
    const tradition = labelToVariable(casting.system.tradition.value);
    castingDataMap.set(casting._id, {
      source: source,
      type: type ?? '',
      tradition: tradition,
    });

    if (type) {
      operations.push({
        ...createDefaultOperation<OperationDefineCastingSource>('defineCastingSource'),
        data: {
          variable: 'CASTING_SOURCES',
          value: `${source}:::${type}:::${tradition}:::ATTRIBUTE_CHA`,
        },
      } satisfies OperationDefineCastingSource);
    }

    if (casting.system.spelldc?.value) {
      varTotals.set('SPELL_ATTACK', casting.system.spelldc.value);
    }
    if (casting.system.spelldc?.dc) {
      varTotals.set('SPELL_DC', casting.system.spelldc.dc);
    }

    if (casting.system.slots) {
      const keys = Object.keys(casting.system.slots);
      for (const key of keys) {
        const rank = parseInt(key.replace('slot', ''));
        operations.push({
          ...createDefaultOperation<OperationGiveSpellSlot>('giveSpellSlot'),
          data: {
            castingSource: source,
            slots: Array.from({ length: 20 }, (_, i) => ({
              lvl: i + 1,
              rank: rank,
              amt: casting.system.slots[key].max,
            })),
            // TODO, handle prepared spells by ID
          },
        } satisfies OperationGiveSpellSlot);
      }
    }
  }

  for (const spell of findJsonItems(json, 'spell')) {
    const data = castingDataMap.get(spell.system.location.value);
    if (!data) continue;

    const spells = await getSpellByName([toLabel(spell.system.slug)]);
    if (spells.length === 0) continue;

    operations.push({
      ...createDefaultOperation<OperationGiveSpell>('giveSpell'),
      data: {
        spellId: spells[0].id,
        type: data.type === '-' ? 'FOCUS' : data.type === '' ? 'INNATE' : 'NORMAL',
        castingSource: data.source,
        rank: spell.system.location.heightenedLevel,
        tradition: data.tradition as any,
        casts: 1,
      },
    } satisfies OperationGiveSpell);
  }

  return operations;
}

async function addAttacks(id: StoreID, json: Record<string, any>, source: ContentSource) {
  const invItems: InventoryItem[] = [];
  for (const attack of findJsonItems(json, 'melee')) {
    let traitNames = (attack.system?.traits?.value ?? []) as string[];

    const range = (() => {
      const rangeTrait = traitNames.find((trait) => trait.startsWith('range-'));
      return rangeTrait ? parseInt(rangeTrait.replace('range-increment-', '').replace('range-', '')) : null;
    })();
    if (range !== null) {
      traitNames = traitNames.filter((trait) => !trait.startsWith('range-'));
    }

    const reload = (() => {
      const reloadTrait = traitNames.find((trait) => trait.startsWith('reload-'));
      return reloadTrait ? parseInt(reloadTrait.replace('reload-', '')) : null;
    })();
    if (reload !== null) {
      traitNames = traitNames.filter((trait) => !trait.startsWith('reload-'));
    }

    const allDamageData = [...Object.values(attack.system?.damageRolls ?? {})] as Record<string, string>[];
    if (allDamageData.length === 0) continue;
    const damageData = allDamageData[0];
    const parsedDamage = parseDiceRoll(damageData?.damage ?? '');

    const item: Item = {
      id: hashData({ value: crypto.randomUUID() }),
      created_at: '',
      name: attack.name,
      level: 0,
      rarity: convertToRarity(attack.system?.traits?.rarity),
      traits: await getTraitIds(traitNames, source, false),
      description: attack.system?.description?.value ?? '',
      group: 'WEAPON',
      size: 'MEDIUM',
      meta_data: {
        category: 'unarmed_attack',
        group: 'brawling',
        damage: {
          damageType: damageData?.damageType ?? '',
          dice: parsedDamage.length > 0 ? parsedDamage[0].dice : 1,
          die: parsedDamage.length > 0 ? parsedDamage[0].die : '',
          extra: undefined,
        },
        attack_bonus: undefined,
        bulk: {},
        //unselectable?: boolean;
        quantity: 1,
        range: range ?? undefined,
        reload: `${reload}` ?? undefined,
        foundry: {},
      },
      operations: [],
      content_source_id: 1,
      version: '',
    };

    // Add adjustments to the attack and damage to properly calculate
    const weaponStats = getWeaponStats(id, item);

    const attackDiff = attack.system?.bonus?.value
      ? attack.system.bonus.value - weaponStats.attack_bonus.total[0]
      : undefined;
    const damageDiff = parsedDamage.length > 0 ? parsedDamage[0].bonus - weaponStats.damage.bonus.total : undefined;

    // Include attack effects in damage extra
    const processAttackEffect = (effect: string) => {
      effect = effect.toLowerCase().trim().replace(/-/g, ' ');

      if (effect === 'grab') {
        effect = 'improved grab';
      } else if (effect === 'push') {
        effect = 'improved push';
      } else if (effect === 'knockdown') {
        effect = 'improved knockdown';
      }

      return toLabel(effect);
    };
    const attackEffects = (attack.system?.attackEffects?.value ?? []).map(processAttackEffect);

    let extra = damageDiff ? `${damageDiff}` : '';
    if (attackEffects.length > 0) {
      extra = `${extra ? `${extra} + ` : ''}${attackEffects.join(', ')}`;
    }

    // Add adjustments
    item.meta_data!.damage!.extra = extra.trim() ? extra : undefined;
    item.meta_data!.attack_bonus = attackDiff;

    invItems.push({
      id: crypto.randomUUID(),
      item: item,
      is_formula: false,
      is_equipped: true,
      is_invested: false,
      is_implanted: false,
      container_contents: [],
    });
  }

  return invItems;
}

async function addEquipment(operations: Operation[], json: Record<string, any>) {
  const items = await getItemsByName(findJsonItems(json, 'equipment').map((item) => item.name as string));

  const invItems: InventoryItem[] = [];
  for (const item of items) {
    operations.push({
      ...createDefaultOperation<OperationGiveItem>('giveItem'),
      data: {
        itemId: item.id,
      },
    } satisfies OperationGiveItem);

    invItems.push({
      id: crypto.randomUUID(),
      item: _.cloneDeep(item),
      is_formula: false,
      is_equipped: false, // isItemEquippable(item), TODO: Fix armor adjusting AC more than supposed to
      is_invested: isItemInvestable(item),
      is_implanted: isItemImplantable(item),
      container_contents: [],
    });
  }

  return { operations: operations, items: invItems };
}

async function getAbilities(json: Record<string, any>, source: ContentSource): Promise<AbilityBlock[]> {
  const abilities: AbilityBlock[] = [];
  for (const ability of findJsonItems(json, 'action')) {
    const descValues = extractFromDescription(
      stripFoundryLinking(ability.system?.description?.value, json.system?.details?.level?.value)
    );
    const description = toMarkdown(descValues.description) ?? '';
    const name = toText(ability.name) ?? '';

    if (!description || description.trim() === name.trim()) continue;
    abilities.push({
      id: -1,
      created_at: '',
      name: name,
      actions: convertToActionCost(ability.system?.actionType?.value, ability.system?.actions?.value),
      level: json.system?.details?.level?.value,
      rarity: convertToRarity(ability.system?.traits?.rarity),
      frequency: toText(descValues?.frequency),
      trigger: descValues?.trigger || toText(ability.system?.trigger?.value),
      requirements: toText(descValues?.requirements),
      access: undefined,
      description: description,
      special: toMarkdown(descValues.special),
      prerequisites: undefined,
      type: 'action',
      meta_data: {
        foundry: {
          category: ability.system?.category,
        },
      },
      traits: await getTraitIds(ability.system?.traits?.value ?? [], source, false),
      content_source_id: source.id,
      version: '1.0',
    } satisfies AbilityBlock);
  }

  return abilities;
}

function findJsonItems(json: Record<string, any>, type: string): Record<string, any>[] {
  return json?.items?.filter((item: any) => item.type === type) ?? [];
}

export function findCreatureTraits(creature: Creature) {
  return (
    (creature.operations?.filter((op) => op.type === 'giveTrait') as OperationGiveTrait[]).map(
      (op) => op.data.traitId
    ) ?? []
  );
}
