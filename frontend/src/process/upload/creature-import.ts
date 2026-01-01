import { AbilityBlock, ActionCost, ContentSource, Creature, InventoryItem, Item, Rarity, Size } from '@typing/content';
import {
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
  OperationGiveLanguage,
  OperationGiveSpell,
  OperationGiveSpellSlot,
  OperationGiveTrait,
  OperationSetValue,
} from '@typing/operations';
import { createDefaultOperation } from '@operations/operation-utils';
import { compactLabels, labelToVariable } from '@variables/variable-utils';
import { parseDiceRoll, toLabel } from '@utils/strings';
import { resetVariables } from '@variables/variable-manager';
import { executeOperations } from '@operations/operations.main';
import { fetchContentPackage, getDefaultSources } from '@content/content-store';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from '@variables/variable-helpers';
import { getBestArmor, isItemImplantable, isItemInvestable } from '@items/inv-utils';
import { hashData, sign } from '@utils/numbers';
import { findCreatureImage } from '@utils/images';
import { getWeaponStats } from '@items/weapon-handler';
import { StoreID } from '@typing/variables';
import { cloneDeep, groupBy } from 'lodash-es';
import { GranularCreature } from '@typing/index';

export async function convertGranularCreature(source: ContentSource, g: GranularCreature): Promise<Creature> {
  const creature = {
    id: -1,
    created_at: '',
    name: g.name ?? '',
    level: g.level ?? -1,
    experience: 0,
    hp_current: null as unknown as number, // will reset to max
    hp_temp: 0,
    stamina_current: 0,
    resolve_current: 0,
    rarity: convertToRarity(g.rarity),
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
      image_url: await findCreatureImage(g.name ?? ''),
      background_image_url: undefined,
      conditions: undefined,
      description: g.description ?? '',
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

  // Used for tracking what the totals should be for variables
  const varTotals = new Map<string, number>();

  // Attributes
  operations = addAttributes(operations, g);
  // AC
  operations = addAC(operations, g, varTotals);
  // Saves
  operations = addSaves(operations, g, varTotals);
  // HP
  operations = addHP(operations, g, varTotals);
  // Resists, Weaknesses, Immunities
  operations = addResistsWeaks(operations, g);
  // Speeds
  operations = addSpeeds(operations, g);
  // Languages
  operations = await addLanguages(operations, g, source);
  // Perception & Senses
  operations = addPerceptionSenses(operations, g, varTotals);
  // Skills
  operations = addSkills(operations, g, varTotals);
  // Misc Ops
  const traitIds = await getTraitIds(g.traits ?? [], source, false);
  operations = addMiscOps(operations, g, traitIds);
  // Spells
  operations = await addSpells(operations, g, varTotals);
  // Items
  const { operations: resultOps, items } = await addEquipment(operations, g);
  operations = resultOps;
  creature.inventory!.items = items;
  //

  creature.operations = operations;

  // Abilities
  creature.abilities_base = await getAbilities(g, source);

  //////////////////////////

  // Compute creature in sandbox
  // - and add diff of totals to even out stats to og values
  const STORE_ID = `CREATURE_${crypto.randomUUID()}`;

  const content = await fetchContentPackage(getDefaultSources('PAGE'), { fetchSources: false, fetchCreatures: false });
  await executeOperations({
    type: 'CREATURE',
    data: {
      id: STORE_ID,
      creature: cloneDeep(creature),
      content,
    },
  });

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

  // Add Weapon Attacks (here because we need to adjust based on totals)
  creature.inventory!.items = await addAttacks(STORE_ID, g, source, creature.inventory!.items);
  //

  // Clean up
  resetVariables(STORE_ID);

  return creature;
}

function addAttributes(operations: Operation[], g: GranularCreature) {
  for (const attr of g.attributes) {
    const variable = `ATTRIBUTE_${labelToVariable(compactLabels(toLabel(attr.name)))}`;
    operations.push({
      ...createDefaultOperation<OperationSetValue>('setValue'),
      data: {
        variable: variable,
        value: { value: attr.value, partial: false },
      },
    } satisfies OperationSetValue);
  }
  return operations;
}

function addAC(operations: Operation[], g: GranularCreature, varTotals: Map<string, number>) {
  varTotals.set('AC', g.ac.value);

  if (g.ac.notes) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'AC_BONUS',
        value: undefined,
        type: undefined,
        text: g.ac.notes,
      },
    } satisfies OperationAddBonusToValue);
  }
  return operations;
}

function addSaves(operations: Operation[], g: GranularCreature, varTotals: Map<string, number>) {
  varTotals.set('SAVE_FORT', g.saves.fort.value);

  if (g.saves.fort.notes) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_FORT',
        value: undefined,
        type: undefined,
        text: g.saves.fort.notes,
      },
    } satisfies OperationAddBonusToValue);
  }

  varTotals.set('SAVE_REFLEX', g.saves.ref.value);

  if (g.saves.ref.notes) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_REFLEX',
        value: undefined,
        type: undefined,
        text: g.saves.ref.notes,
      },
    } satisfies OperationAddBonusToValue);
  }

  varTotals.set('SAVE_WILL', g.saves.will.value);

  if (g.saves.will.notes) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_WILL',
        value: undefined,
        type: undefined,
        text: g.saves.will.notes,
      },
    } satisfies OperationAddBonusToValue);
  }

  // All saves conditional
  if (g.saves.generalNotes) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_FORT',
        value: undefined,
        type: undefined,
        text: g.saves.generalNotes,
      },
    } satisfies OperationAddBonusToValue);
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_REFLEX',
        value: undefined,
        type: undefined,
        text: g.saves.generalNotes,
      },
    } satisfies OperationAddBonusToValue);
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_WILL',
        value: undefined,
        type: undefined,
        text: g.saves.generalNotes,
      },
    } satisfies OperationAddBonusToValue);
  }

  return operations;
}

function addHP(operations: Operation[], g: GranularCreature, varTotals: Map<string, number>) {
  varTotals.set('MAX_HEALTH', g.hp.value);

  if (g.hp.notes) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'MAX_HEALTH_BONUS',
        value: undefined,
        type: undefined,
        text: g.hp.notes,
      },
    } satisfies OperationAddBonusToValue);
  }

  // varTotals.set('HEALTH_TEMP', g.hp.temp); TODO

  return operations;
}

function addResistsWeaks(operations: Operation[], g: GranularCreature) {
  const constructValue = (data: { type: string; value?: number; doubleAgainst?: string[]; exceptions?: string[] }) => {
    const exceptions = data.exceptions && data.exceptions.length > 0 ? ` (except ${data.exceptions.join(', ')})` : '';
    const doubleAgainst =
      data.doubleAgainst && data.doubleAgainst.length > 0 ? ` (doubled vs. ${data.doubleAgainst.join(', ')})` : '';
    return `${data.type}${exceptions}${doubleAgainst}${data.value ? `, ${data.value}` : ''}`;
  };

  for (const immunity of g.immunities ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'IMMUNITIES',
        value: constructValue(immunity),
      },
    } satisfies OperationAdjValue);
  }

  for (const weakness of g.weaknesses ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'WEAKNESSES',
        value: constructValue(weakness),
      },
    } satisfies OperationAdjValue);
  }

  for (const resistance of g.resistances ?? []) {
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

function addSpeeds(operations: Operation[], g: GranularCreature) {
  const landSpeed = g.speeds.find(
    (s) => s.name.toLowerCase().trim() === 'land' || s.name.toLowerCase().trim() === 'normal'
  );
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SPEED',
      value: landSpeed?.value ?? 0,
    },
  } satisfies OperationSetValue);

  for (const speed of g.speeds) {
    const speedVar = labelToVariable(speed.name.trim());
    if (speedVar !== 'FLY' && speedVar !== 'CLIMB' && speedVar !== 'BURROW' && speedVar !== 'SWIM') {
      continue;
    }

    operations.push({
      ...createDefaultOperation<OperationSetValue>('setValue'),
      data: {
        variable: `SPEED_${labelToVariable(speed.name.trim())}`,
        value: speed.value,
      },
    } satisfies OperationSetValue);
  }

  return operations;
}

async function addLanguages(operations: Operation[], g: GranularCreature, source: ContentSource) {
  // TODO, we don't include languages.notes but prob should

  const languageIds = await getLanguageIds(g.languages?.value ?? [], source);
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

function addPerceptionSenses(operations: Operation[], g: GranularCreature, varTotals: Map<string, number>) {
  varTotals.set('PERCEPTION', g.perception.value);

  if (g.perception.notes) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'PERCEPTION',
        value: undefined,
        type: undefined,
        text: g.perception.notes,
      },
    } satisfies OperationAddBonusToValue);
  }

  const constructValues = (data: { name: string; range?: number; acuity?: 'precise' | 'imprecise' | 'vague' }) => {
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
      value: `${data.name}${range}`,
    };
  };

  for (const sense of g.perception.senses ?? []) {
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

function addSkills(operations: Operation[], g: GranularCreature, varTotals: Map<string, number>) {
  for (const skill of g.skills ?? []) {
    // Do includes because sometimes the words are in parentheses
    const isLore = skill.name.toLowerCase().includes('lore');
    const variable = isLore
      ? `SKILL_LORE_${labelToVariable(skill.name.toLowerCase().replace(' lore', ''))}`
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

    varTotals.set(variable, skill.bonus);
  }

  return operations;
}

function addMiscOps(operations: Operation[], g: GranularCreature, traitIds: number[]) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SIZE',
      value: convertToSize(g.size),
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

async function addSpells(operations: Operation[], g: GranularCreature, varTotals: Map<string, number>) {
  const convertCastingType = (type: string) => {
    if (type === 'innate') return null;
    if (type === 'focus') return '-';
    if (type === 'prepared') return 'PREPARED-TRADITION';
    if (type === 'spontaneous') return 'SPONTANEOUS-REPERTOIRE';
    return null;
  };

  if (g.spellcasting?.focus) {
    const source = (g.name + ' Focus').toUpperCase();
    operations.push({
      ...createDefaultOperation<OperationDefineCastingSource>('defineCastingSource'),
      data: {
        variable: 'CASTING_SOURCES',
        value: `${source}:::${convertCastingType('focus')}:::${`ARCANE`}:::ATTRIBUTE_CHA`,
      },
    } satisfies OperationDefineCastingSource);

    if (g.spellcasting.focus.attackBonus) {
      varTotals.set('SPELL_ATTACK', g.spellcasting.focus.attackBonus);
    }
    if (g.spellcasting.focus.dc) {
      varTotals.set('SPELL_DC', g.spellcasting.focus.dc);
    }

    for (const spell of g.spellcasting.focus.spells) {
      const spells = await getSpellByName([toLabel(spell.name)]);
      if (spells.length === 0) continue;

      operations.push({
        ...createDefaultOperation<OperationGiveSpell>('giveSpell'),
        data: {
          spellId: spells[0].id,
          type: 'FOCUS',
          castingSource: source,
          rank: Math.max(g.spellcasting.focus.cantripsHeighteningRank, spell.rank),
          tradition: 'ARCANE',
          casts: 1,
        },
      } satisfies OperationGiveSpell);
    }
  }

  if (g.spellcasting?.innate) {
    const source = (g.name + ' Innate').toUpperCase();
    operations.push({
      ...createDefaultOperation<OperationDefineCastingSource>('defineCastingSource'),
      data: {
        variable: 'CASTING_SOURCES',
        value: `${source}:::${convertCastingType('innate')}:::${g.spellcasting.innate.tradition}:::ATTRIBUTE_CHA`,
      },
    } satisfies OperationDefineCastingSource);

    if (g.spellcasting.innate.attackBonus) {
      varTotals.set('SPELL_ATTACK', g.spellcasting.innate.attackBonus);
    }
    if (g.spellcasting.innate.dc) {
      varTotals.set('SPELL_DC', g.spellcasting.innate.dc);
    }

    for (const spell of g.spellcasting.innate.spells) {
      const spells = await getSpellByName([toLabel(spell.name)]);
      if (spells.length === 0) continue;

      operations.push({
        ...createDefaultOperation<OperationGiveSpell>('giveSpell'),
        data: {
          spellId: spells[0].id,
          type: 'INNATE',
          castingSource: source,
          rank: spell.rank,
          tradition: g.spellcasting.innate.tradition,
          casts: spell.castsPerDay === 'AT-WILL' || spell.castsPerDay === 'CONSTANT' ? 0 : (spell.castsPerDay ?? 1),
        },
      } satisfies OperationGiveSpell);
    }
  }

  if (g.spellcasting?.prepared) {
    const source = (g.name + ' Prepared').toUpperCase();
    operations.push({
      ...createDefaultOperation<OperationDefineCastingSource>('defineCastingSource'),
      data: {
        variable: 'CASTING_SOURCES',
        value: `${source}:::${convertCastingType('prepared')}:::${g.spellcasting.prepared.tradition}:::ATTRIBUTE_CHA`,
      },
    } satisfies OperationDefineCastingSource);

    if (g.spellcasting.prepared.attackBonus) {
      varTotals.set('SPELL_ATTACK', g.spellcasting.prepared.attackBonus);
    }
    if (g.spellcasting.prepared.dc) {
      varTotals.set('SPELL_DC', g.spellcasting.prepared.dc);
    }

    for (const spell of g.spellcasting.prepared.spells) {
      const spells = await getSpellByName([toLabel(spell.name)]);
      if (spells.length === 0) continue;

      operations.push({
        ...createDefaultOperation<OperationGiveSpell>('giveSpell'),
        data: {
          spellId: spells[0].id,
          type: 'NORMAL',
          castingSource: source,
          rank: spell.rank,
          tradition: g.spellcasting.prepared.tradition,
          casts: 1,
        },
      } satisfies OperationGiveSpell);
    }

    const slots = groupBy(g.spellcasting.prepared.spells, (spell) => spell.rank);
    for (const [rank, spells] of Object.entries(slots)) {
      const rankNum = parseInt(rank);
      // Calculate the total amount of slots for this rank
      const amount = spells.reduce((acc, spell) => acc + spell.amount, 0);
      operations.push({
        ...createDefaultOperation<OperationGiveSpellSlot>('giveSpellSlot'),
        data: {
          castingSource: source,
          slots: Array.from({ length: 20 }, (_, i) => ({
            lvl: i + 1,
            rank: rankNum,
            amt: amount,
          })),
        },
      } satisfies OperationGiveSpellSlot);
    }
  }

  if (g.spellcasting?.spontaneous) {
    const source = (g.name + ' Spontaneous').toUpperCase();
    operations.push({
      ...createDefaultOperation<OperationDefineCastingSource>('defineCastingSource'),
      data: {
        variable: 'CASTING_SOURCES',
        value: `${source}:::${convertCastingType('spontaneous')}:::${g.spellcasting.spontaneous.tradition}:::ATTRIBUTE_CHA`,
      },
    } satisfies OperationDefineCastingSource);

    if (g.spellcasting.spontaneous.attackBonus) {
      varTotals.set('SPELL_ATTACK', g.spellcasting.spontaneous.attackBonus);
    }
    if (g.spellcasting.spontaneous.dc) {
      varTotals.set('SPELL_DC', g.spellcasting.spontaneous.dc);
    }

    for (const spell of g.spellcasting.spontaneous.spells) {
      const spells = await getSpellByName([toLabel(spell.name)]);
      if (spells.length === 0) continue;

      operations.push({
        ...createDefaultOperation<OperationGiveSpell>('giveSpell'),
        data: {
          spellId: spells[0].id,
          type: 'NORMAL',
          castingSource: source,
          rank: spell.rank,
          tradition: g.spellcasting.spontaneous.tradition,
          casts: 1,
        },
      } satisfies OperationGiveSpell);
    }

    for (const slots of g.spellcasting.spontaneous.slots) {
      operations.push({
        ...createDefaultOperation<OperationGiveSpellSlot>('giveSpellSlot'),
        data: {
          castingSource: source,
          slots: Array.from({ length: 20 }, (_, i) => ({
            lvl: i + 1,
            rank: slots.rank,
            amt: slots.amount,
          })),
        },
      } satisfies OperationGiveSpellSlot);
    }
  }

  if (g.spellcasting?.rituals) {
    if (g.spellcasting.rituals.attackBonus) {
      varTotals.set('SPELL_ATTACK', g.spellcasting.rituals.attackBonus);
    }
    if (g.spellcasting.rituals.dc) {
      varTotals.set('SPELL_DC', g.spellcasting.rituals.dc);
    }

    for (const spell of g.spellcasting.rituals.spells) {
      const spells = await getSpellByName([toLabel(spell.name)]);
      if (spells.length === 0) continue;

      operations.push({
        ...createDefaultOperation<OperationGiveSpell>('giveSpell'),
        data: {
          spellId: spells[0].id,
          type: 'NORMAL',
          castingSource: 'RITUALS',
          rank: spell.rank,
          tradition: 'ARCANE',
          casts: 1,
        },
      } satisfies OperationGiveSpell);
    }
  }

  return operations;
}

async function addAttacks(
  id: StoreID,
  g: GranularCreature,
  source: ContentSource,
  existingItems: InventoryItem[] = []
): Promise<InventoryItem[]> {
  const invItems: InventoryItem[] = cloneDeep(existingItems);
  for (const attack of g.attacks ?? []) {
    let traitNames = attack.traits?.map((trait) => trait.toLowerCase().trim()) ?? [];

    const existingItem = invItems.find(
      (i) =>
        // eg. scythe === scythe
        i.item.name.trim().toLowerCase() === attack.name.trim().toLowerCase() ||
        // eg. keen scythe === scythe
        attack.name.trim().toLowerCase().endsWith(` ${i.item.name.trim().toLowerCase()}`)
    );

    // Extract range and reload from traits
    const range = (() => {
      const rangeTrait = traitNames.map((t) => t.replace(/\s/g, '-')).find((trait) => trait.startsWith('range-'));
      return rangeTrait ? parseInt(rangeTrait.replace('range-increment-', '').replace('range-', '')) : null;
    })();
    if (range !== null) {
      traitNames = traitNames.filter((trait) => !trait.replace(/\s/g, '-').startsWith('range-'));
    }

    const reload = (() => {
      const reloadTrait = traitNames.map((t) => t.replace(/\s/g, '-')).find((trait) => trait.startsWith('reload-'));
      return reloadTrait ? parseInt(reloadTrait.replace('reload-', '')) : null;
    })();
    if (reload !== null) {
      traitNames = traitNames.filter((trait) => !trait.replace(/\s/g, '-').startsWith('reload-'));
    }

    // Create the item
    const item: Item = {
      id: existingItem?.item.id ?? hashData({ value: crypto.randomUUID() }),
      created_at: '',
      name: attack.name.trim(),
      level: 0,
      rarity: 'COMMON',
      traits: await getTraitIds(traitNames, source, false),
      description: '',
      group: 'WEAPON',
      size: 'MEDIUM',
      meta_data: {
        category: existingItem?.item.meta_data?.category ?? 'unarmed_attack',
        group: existingItem?.item.meta_data?.group ?? 'brawling',
        damage: {
          damageType: attack.damage.damageType,
          dice: attack.damage.amountOfDice,
          die: attack.damage.dieType,
          extra: undefined,
        },
        attack_bonus: undefined,
        bulk: {},
        unselectable: existingItem?.item.meta_data?.unselectable ?? true,
        quantity: 1,
        range: attack.misc?.range ?? range ?? undefined,
        reload: attack.misc?.reload ? `${attack.misc.reload}` : reload ? `${reload}` : undefined,
        foundry: {},
      },
      operations: [],
      content_source_id: source.id,
      version: '',
    };

    // Add adjustments to the attack and damage to properly calculate
    const weaponStats = getWeaponStats(id, item);

    const attackDiff = attack.attackBonus.attack1st
      ? attack.attackBonus.attack1st - weaponStats.attack_bonus.total[0]
      : undefined;
    const damageDiff = attack.damage.damageBonus
      ? attack.damage.damageBonus - weaponStats.damage.bonus.total
      : undefined;

    let extra = attack.damage.extraEffects?.join(' + ') ?? '';
    if (damageDiff) {
      extra = `${damageDiff}${extra.trim() ? ' + ' : ''}${extra.trim()}`;
    }

    // Add adjustments
    item.meta_data!.damage!.extra = extra.trim() ? extra : undefined;
    item.meta_data!.attack_bonus = attackDiff;

    // If there's an existing item, just override it
    if (existingItem) {
      existingItem.item = item;
      existingItem.is_formula = false;
      existingItem.is_equipped = true;
      existingItem.is_invested = isItemInvestable(item);
      existingItem.is_implanted = isItemImplantable(item);
      existingItem.container_contents = [];
    } else {
      invItems.push({
        id: crypto.randomUUID(),
        item: item,
        is_formula: false,
        is_equipped: true,
        is_invested: isItemInvestable(item),
        is_implanted: isItemImplantable(item),
        container_contents: [],
      });
    }
  }

  return invItems;
}

async function addEquipment(operations: Operation[], g: GranularCreature) {
  const items = await getItemsByName((g.items ?? []).map((item) => item.name));

  const invItems: InventoryItem[] = [];
  for (const item of items) {
    const gItem = g.items?.find((i) => i.name.trim().toLowerCase() === item.name.trim().toLowerCase());

    // operations.push({
    //   ...createDefaultOperation<OperationGiveItem>('giveItem'),
    //   data: {
    //     itemId: item.id,
    //   },
    // } satisfies OperationGiveItem);

    const itemData = cloneDeep(item);
    if (itemData.meta_data) {
      itemData.meta_data.hp = itemData.meta_data.hp_max;
      itemData.meta_data.quantity = gItem?.quantity ?? 1;
    }
    invItems.push({
      id: crypto.randomUUID(),
      item: itemData,
      is_formula: false,
      is_equipped: false, // isItemEquippable(item), TODO: Fix armor adjusting AC more than supposed to
      is_invested: isItemInvestable(item),
      is_implanted: isItemImplantable(item),
      container_contents: [],
    });
  }

  return { operations: operations, items: invItems };
}

async function getAbilities(g: GranularCreature, source: ContentSource): Promise<AbilityBlock[]> {
  const abilities: AbilityBlock[] = [];
  for (const ability of g.abilities ?? []) {
    abilities.push({
      id: -1,
      created_at: '',
      name: ability.name,
      actions: ability.action ?? null,
      level: g.level ?? 1,
      rarity: 'COMMON',
      frequency: ability.frequency,
      trigger: ability.trigger,
      requirements: ability.requirements,
      // cost: ability.cost,
      // access: ability.access,
      description: ability.description,
      special: ability.special,
      prerequisites: undefined,
      type: 'action',
      traits: await getTraitIds(ability.traits ?? [], source, false),
      content_source_id: source.id,
      version: '1.0',
    } satisfies AbilityBlock);
  }

  return abilities;
}

/**
 * Converts a Foundry creature JSON to a GranularCreature format.
 */
export function convertFoundryCreatureToGranularCreature(json: Record<string, any>): GranularCreature {
  const level = json.system?.details?.level?.value ?? 0;

  interface GranularCreatureAbility {
    name: string;
    action?: ActionCost;
    traits: string[];
    description: string;
    frequency?: string;
    cost?: string;
    trigger?: string;
    requirements?: string;
    access?: string;
    special?: string;
  }

  interface GranularCreatureAttack {
    attackType: 'melee' | 'ranged';
    action: 'ONE-ACTION';
    name: string;
    attackBonus: { attack1st: number; attack2nd?: number; attack3rd?: number };
    traits?: string[];
    damage: {
      amountOfDice: number;
      dieType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12';
      damageType: string;
      damageBonus?: number;
      extraEffects?: string[];
    };
    misc?: {
      range?: number;
      reload?: number;
    };
  }

  interface GranularCreatureSpellcasting {
    innate?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        castsPerDay?: 'AT-WILL' | 'CONSTANT' | number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    focus?: {
      type: string; // normal, domain, order, hex, etc.
      dc?: number;
      attackBonus?: number;
      focusPoints: 1 | number;
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    spontaneous?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      slots: {
        rank: number;
        amount: number;
      }[];
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    prepared?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        amount: 1 | number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    rituals?: {
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
    };
  }

  function getGranularAbilities(json: Record<string, any>): GranularCreatureAbility[] {
    const abilities: GranularCreatureAbility[] = [];
    for (const ability of findJsonItems(json, 'action')) {
      const descValues = extractFromDescription(
        stripFoundryLinking(ability.system?.description?.value, json.system?.details?.level?.value)
      );
      const description = toMarkdown(descValues.description) ?? '';
      const name = toText(ability.name) ?? '';

      if (!description || description.trim() === name.trim()) continue;
      abilities.push({
        name: name,
        action: convertToActionCost(ability.system?.actionType?.value, ability.system?.actions?.value),
        frequency: toText(descValues?.frequency),
        trigger: descValues?.trigger || toText(ability.system?.trigger?.value),
        requirements: toText(descValues?.requirements),
        cost: toText(descValues?.cost),
        access: undefined,
        description: description,
        special: toMarkdown(descValues.special),
        traits: ability.system?.traits?.value ?? [],
      } satisfies GranularCreatureAbility);
    }

    return abilities;
  }

  function addGranularAttacks(json: Record<string, any>): GranularCreatureAttack[] {
    const granAttacks: GranularCreatureAttack[] = [];
    for (const attack of findJsonItems(json, 'melee')) {
      // Traits
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

      // Damage
      const allDamageData = [...Object.values(attack.system?.damageRolls ?? {})] as Record<string, string>[];
      if (allDamageData.length === 0) continue;
      const damageData = allDamageData[0];
      const parsedDamage = parseDiceRoll(damageData?.damage ?? '');

      // Attacks effects
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
      const attackEffects = (attack.system?.attackEffects?.value ?? []).map(processAttackEffect) as string[];

      const granAttack: GranularCreatureAttack = {
        attackType: range === null ? 'melee' : 'ranged',
        action: 'ONE-ACTION',
        name: attack.name,
        attackBonus: {
          attack1st: attack.system?.bonus?.value ?? 0,
          attack2nd: undefined,
          attack3rd: undefined,
        },
        traits: traitNames,
        damage: {
          amountOfDice: parsedDamage.length > 0 ? parsedDamage[0].dice : 1,
          dieType: parsedDamage.length > 0 ? (parsedDamage[0].die as 'd4' | 'd6' | 'd8' | 'd10' | 'd12') : 'd6',
          damageType: damageData?.damageType ?? '',
          damageBonus: damageData?.bonus ? parseInt(damageData.bonus) : undefined,
          extraEffects: attackEffects,
        },
        misc: {
          range: range ?? undefined,
          reload: reload ?? undefined,
        },
      };

      granAttacks.push(granAttack);
    }

    return granAttacks;
  }

  function addGranularSpells(json: Record<string, any>): GranularCreatureSpellcasting {
    const spellcasting: GranularCreatureSpellcasting = {};

    for (const casting of findJsonItems(json, 'spellcastingEntry')) {
      // const source = labelToVariable(casting.name);
      const tradition = labelToVariable(casting.system.tradition.value).toUpperCase();
      const spellAttack = casting.system.spelldc?.value ?? 0;
      const spellDC = casting.system.spelldc?.dc ?? 0;
      const spells = findJsonItems(json, 'spell').filter((spell) => spell.system.location.value === casting._id);
      const cantripsHeighteningRank = Math.max(
        ...spells.map((spell) => spell.system.level.value),
        Math.ceil(level / 2)
      );

      const slots = casting.system.slots as Record<
        string,
        {
          max: number;
          value?: number;
          prepared?: {
            id: string;
          }[];
        }
      >;

      const castingType = casting.system.prepared?.value;
      if (castingType === 'innate') {
        spellcasting.innate = {
          tradition: tradition as 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT',
          dc: spellDC,
          attackBonus: spellAttack,
          spells: spells.map((spell) => ({
            name: toLabel(spell.system.slug.replace(/-/g, ' ')),
            rank: spell.system.location.heightenedLevel ?? spell.system.level.value,
            castsPerDay: spell.name.toLowerCase().includes('(at will)')
              ? 'AT-WILL'
              : spell.name.toLowerCase().includes('(constant)')
                ? 'CONSTANT'
                : undefined,
            notes: undefined,
          })),
          cantripsHeighteningRank: cantripsHeighteningRank,
        };
      } else if (castingType === 'focus') {
        spellcasting.focus = {
          type: casting.name.toLowerCase().replace(' spells', ''),
          dc: spellDC,
          attackBonus: spellAttack,
          focusPoints: Math.min(spells.length, 3),
          spells: spells.map((spell) => ({
            name: toLabel(spell.system.slug.replace(/-/g, ' ')),
            rank: spell.system.location.heightenedLevel ?? spell.system.level.value,
            notes: undefined,
          })),
          cantripsHeighteningRank: cantripsHeighteningRank,
        };
      } else if (castingType === 'prepared') {
        // Format slot data for easier digestion
        const spellsAsPreparedSlots: { id: string; rank: number }[] = [];
        for (const slot of Object.keys(slots)) {
          if (slot.startsWith('slot')) {
            const rank = parseInt(slot.replace('slot', ''));
            const prepared = slots[slot].prepared ?? [];
            spellsAsPreparedSlots.push(
              ...prepared.map((p) => ({
                id: p.id,
                rank: rank,
              }))
            );
          } else {
            console.error(`> Unknown slot type: ${slot}`);
          }
        }

        spellcasting.prepared = {
          tradition: tradition as 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT',
          dc: spellDC,
          attackBonus: spellAttack,
          spells: spellsAsPreparedSlots.map((slot) => {
            const spell = spells.find((s) => s._id === slot.id)!;
            return {
              name: toLabel(spell.system.slug.replace(/-/g, ' ')),
              rank: slot.rank,
              amount: 1,
              notes: undefined,
            };
          }),
          cantripsHeighteningRank: cantripsHeighteningRank,
        };
      } else if (castingType === 'spontaneous') {
        // Format slot data for easier digestion
        const slotsAtRank: { rank: number; amount: number }[] = [];
        for (const slot of Object.keys(slots)) {
          if (slot.startsWith('slot') && slots[slot].value) {
            const rank = parseInt(slot.replace('slot', ''));
            const value = slots[slot].value!;
            slotsAtRank.push({
              rank: rank,
              amount: value,
            });
          } else {
            console.error(`> Unknown slot type: ${slot}`);
          }
        }

        spellcasting.spontaneous = {
          tradition: tradition as 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT',
          dc: spellDC,
          attackBonus: spellAttack,
          slots: slotsAtRank,
          spells: spells.map((spell) => ({
            name: toLabel(spell.system.slug.replace(/-/g, ' ')),
            rank: spell.system.location.heightenedLevel ?? spell.system.level.value,
            notes: undefined,
          })),
          cantripsHeighteningRank: cantripsHeighteningRank,
        };
      }
    }

    // Handle rituals
    const ritualsDC = json.system?.spellcasting?.rituals?.dc;
    const ritualsAttack = json.system?.spellcasting?.rituals?.value;
    if (ritualsDC || ritualsAttack) {
      const rituals = findJsonItems(json, 'spell').filter((spell) => !spell.system.location.value);

      spellcasting.rituals = {
        dc: ritualsDC,
        attackBonus: ritualsAttack,
        spells: rituals.map((ritual) => ({
          name: toLabel(ritual.system.slug.replace(/-/g, ' ')),
          rank: ritual.system.level.value,
          notes: undefined,
        })),
      };
    }

    return spellcasting;
  }

  const creature: GranularCreature = {
    name: toText(json.name) ?? '',
    imageUrl: json.img ?? undefined,
    level: level,
    size: convertToSize(json.system?.traits?.size?.value) as Size,
    rarity: convertToRarity(json.system?.traits?.rarity) as Rarity,
    traits: json.system?.traits?.value,
    perception: {
      value: json.system?.perception?.mod ?? 0,
      senses: json.system.perception.senses,
      notes: json.system.perception.details?.trim() || undefined,
    },
    languages: {
      value: json.system?.details?.languages?.value ?? [],
      notes: json.system?.details?.languages?.details,
    },
    skills: [
      ...findJsonItems(json, 'lore').map((skill) => ({
        name: skill.name as string,
        bonus: skill.system.mod.value as number,
      })),
      ...Object.keys(json.system?.skills ?? {}).map((key) => ({
        name: key,
        bonus: json.system.skills[key].base,
      })),
    ],
    attributes: [
      { name: 'STR', value: json.system.abilities.str.mod },
      { name: 'DEX', value: json.system.abilities.dex.mod },
      { name: 'CON', value: json.system.abilities.con.mod },
      { name: 'INT', value: json.system.abilities.int.mod },
      { name: 'WIS', value: json.system.abilities.wis.mod },
      { name: 'CHA', value: json.system.abilities.cha.mod },
    ],
    items: [...findJsonItems(json, 'equipment'), ...findJsonItems(json, 'weapon')].map((item) => ({
      name: item.name as string,
      quantity: item.system?.quantity ?? 1,
      notes: undefined,
    })),
    speeds: [
      {
        name: 'normal',
        value: json.system.attributes.speed.value,
        notes: json.system.attributes.speed.details?.trim() || undefined,
      },
      ...(json.system.attributes.speed.otherSpeeds ?? []).map((speed: any) => ({
        name: speed.type,
        value: speed.value,
        notes: undefined,
      })),
    ],
    resistances:
      json.system.attributes.resistances?.map((resistance: any) => ({
        type: resistance.type.replace(/-/g, ' '),
        value: resistance.value,
        doubleAgainst: resistance.doubleVs,
        exceptions: resistance.exceptions,
      })) ?? [],
    weaknesses:
      json.system.attributes.weaknesses?.map((weakness: any) => ({
        type: weakness.type.replace(/-/g, ' '),
        value: weakness.value,
        doubleAgainst: weakness.doubleVs,
        exceptions: weakness.exceptions,
      })) ?? [],
    immunities:
      json.system.attributes.immunities?.map((immunity: any) => ({
        type: immunity.type.replace(/-/g, ' '),
        exceptions: immunity.exceptions,
      })) ?? [],
    ac: {
      value: json.system.attributes.ac.value,
      notes: json.system.attributes.ac.details?.trim() || undefined,
    },
    saves: {
      fort: {
        value: json.system.saves.fortitude.value,
        notes: json.system.saves.fortitude.saveDetail?.trim() || undefined,
      },
      ref: {
        value: json.system.saves.reflex.value,
        notes: json.system.saves.reflex.saveDetail?.trim() || undefined,
      },
      will: {
        value: json.system.saves.will.value,
        notes: json.system.saves.will.saveDetail?.trim() || undefined,
      },
      generalNotes: json.system.attributes.allSaves.value?.trim() || undefined,
    },
    hp: {
      value: json.system.attributes.hp.max,
      notes: json.system.attributes.hp.details?.trim() || undefined,
      // temp hp? json.system.attributes.hp.temp
    },
    abilities: getGranularAbilities(json),
    attacks: addGranularAttacks(json),
    spellcasting: addGranularSpells(json),
    description: toMarkdown(json.system?.details?.publicNotes) ?? '',
  };

  return creature;
}

function findJsonItems(json: Record<string, any>, type: string): Record<string, any>[] {
  return json?.items?.filter((item: any) => item.type === type) ?? [];
}
