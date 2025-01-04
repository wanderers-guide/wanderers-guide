import { collectEntityAbilityBlocks, collectEntitySenses, collectEntitySpellcasting } from '@content/collect-content';
import { defineDefaultSources, fetchContentPackage } from '@content/content-store';
import { downloadObjectAsJson } from '@export/export-to-json';
import { isItemWeapon, getFlatInvItems, getBestArmor, getBestShield, getInvBulk, labelizeBulk } from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
import { executeCharacterOperations, executeCreatureOperations } from '@operations/operation-controller';
import { getSpellStats } from '@spells/spell-handler';
import { isCantrip, isRitual } from '@spells/spell-utils';
import { Character, LivingEntity, Spell } from '@typing/content';
import { VariableListStr, VariableStr } from '@typing/variables';
import { displayResistWeak } from '@utils/resist-weaks';
import { toLabel } from '@utils/strings';
import { isCharacter, isCreature, isTruthy } from '@utils/type-fixing';
import {
  getFinalAcValue,
  getFinalHealthValue,
  getFinalProfValue,
  getFinalVariableValue,
  getProfValueParts,
  getSpeedValue,
} from '@variables/variable-display';
import {
  getAllAncestryTraitVariables,
  getAllAttributeVariables,
  getAllSpeedVariables,
  getVariable,
  getVariableStore,
  getVariables,
} from '@variables/variable-manager';
import _ from 'lodash-es';

export default async function jsonV4(entity: LivingEntity) {
  const exportObject = {
    version: 4,
    character: entity,
    content: await getJsonV4Content(entity),
  };

  const fileName = entity.name
    .trim()
    .toLowerCase()
    .replace(/([^a-z0-9]+)/gi, '-');
  downloadObjectAsJson(exportObject, fileName);
}

export async function getJsonV4Content(entity: LivingEntity) {
  // Get all content that the character uses
  if (isCharacter(entity)) {
    defineDefaultSources(entity.content_sources?.enabled ?? []);
  } else if (isCreature(entity)) {
    defineDefaultSources(undefined);
  }
  const content = await fetchContentPackage(undefined, { fetchSources: true });
  const STORE_ID = isCharacter(entity) ? 'CHARACTER' : `CREATURE_${entity.id}`;

  // Execute all operations (to update the variables)
  if (isCharacter(entity)) {
    await executeCharacterOperations(entity, content, 'CHARACTER-BUILDER');
  } else if (isCreature(entity)) {
    await executeCreatureOperations(STORE_ID, entity, content);
  }

  // Get all the data

  const featData = collectEntityAbilityBlocks(STORE_ID, entity, content.abilityBlocks, {
    filterBasicClassFeatures: true,
  });

  const characterTraits = getAllAncestryTraitVariables(STORE_ID)
    .map((v) => {
      const trait = content.traits.find((trait) => trait.id === v.value);
      return trait;
    })
    .filter(isTruthy);

  const resistVar = getVariable<VariableListStr>(STORE_ID, 'RESISTANCES');
  const weakVar = getVariable<VariableListStr>(STORE_ID, 'WEAKNESSES');
  const immuneVar = getVariable<VariableListStr>(STORE_ID, 'IMMUNITIES');

  const languages = getVariable<VariableListStr>(STORE_ID, 'LANGUAGE_NAMES')?.value ?? [];

  const senseData = collectEntitySenses(STORE_ID, content.abilityBlocks);

  const weapons = entity.inventory?.items
    .filter((invItem) => invItem.is_equipped && isItemWeapon(invItem.item))
    .sort((a, b) => a.item.name.localeCompare(b.item.name))
    .map((invItem) => ({
      item: invItem.item,
      stats: getWeaponStats(STORE_ID, invItem.item),
    }));

  const flatItems = entity.inventory ? getFlatInvItems(entity.inventory) : [];
  const totalBulk = entity.inventory ? labelizeBulk(getInvBulk(entity.inventory), true) : null;

  const spellData = collectEntitySpellcasting(STORE_ID, entity);

  const spellSourceStats = spellData.sources.map((source) => {
    return {
      source,
      stats: getSpellStats(STORE_ID, null, source.tradition, source.attribute),
    };
  });

  const spells = spellData.list
    .map((s) => {
      const spell = content.spells.find((spell) => spell.id === s.spell_id);
      if (spell) {
        return {
          ...spell,
          rank: s.rank,
          casting_source: s.source,
        };
      }
      return null;
    })
    .filter(isTruthy)
    .sort((a, b) => a.rank - b.rank);

  const focusSpells = spellData.focus
    .map((s) => {
      const spell = content.spells.find((spell) => spell.id === s.spell_id);
      if (spell) {
        return {
          ...spell,
          rank: s.rank ?? 0,
          casting_source: s.source,
        };
      }
      return null;
    })
    .filter(isTruthy)
    .sort((a, b) => a.rank - b.rank);

  const innateSpells = spellData.innate
    .map((s) => {
      const spell = content.spells.find((spell) => spell.id === s.spell_id);
      if (spell) {
        return {
          ...s,
          spell: spell,
        };
      }
      return null;
    })
    .filter(isTruthy)
    .sort((a, b) => a.rank - b.rank);

  const cantrips = spells.filter((s) => isCantrip(s) && !isRitual(s));
  const nonCantrips = spells.filter((s) => !isCantrip(s) && !isRitual(s));
  const ritualSpells = spells.filter((s) => isRitual(s));

  const spellSlots = spellData.slots.map((slot) => {
    const spell = content.spells.find((spell) => spell.id === slot.spell_id);
    return {
      ...slot,
      spell: spell,
    };
  });

  const alltraits = content.traits;

  const size = toLabel(getVariable<VariableStr>(STORE_ID, 'SIZE')?.value);
  const maxHP = getFinalHealthValue(STORE_ID);
  const ac = getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, entity.inventory)?.item);
  const shield = getBestShield(STORE_ID, entity.inventory);
  const armor = getBestArmor(STORE_ID, entity.inventory);

  const speeds = getAllSpeedVariables(STORE_ID).map((v) => {
    return {
      name: v.name,
      value: getSpeedValue(STORE_ID, v, entity),
    };
  });

  const resistWeaks = {
    resists: resistVar?.value.map((v) => displayResistWeak(STORE_ID, v)) ?? [],
    weaks: weakVar?.value.map((v) => displayResistWeak(STORE_ID, v)) ?? [],
    immunes: immuneVar?.value.map((v) => displayResistWeak(STORE_ID, v)) ?? [],
  };

  // Prof dump
  const profs: { [key: string]: any } = {};
  for (const prof of Object.values(getVariables(STORE_ID)).filter((v) => v.type === 'prof')) {
    try {
      profs[prof.name] = {
        total: getFinalProfValue(STORE_ID, prof.name),
        parts: getProfValueParts(STORE_ID, prof.name),
      };
    } catch (e) {
      console.warn('Error getting prof value', prof, e);
    }
  }

  // Add spell attack innate and spell DC innate
  profs[`INNATE_SPELL_ATTACK`] = {
    total: getFinalProfValue(STORE_ID, 'SPELL_ATTACK', false, 'ATTRIBUTE_CHA'),
    parts: getProfValueParts(STORE_ID, 'SPELL_ATTACK', 'ATTRIBUTE_CHA'),
  };
  profs[`INNATE_SPELL_DC`] = {
    total: getFinalProfValue(STORE_ID, 'SPELL_DC', true, 'ATTRIBUTE_CHA'),
    parts: getProfValueParts(STORE_ID, 'SPELL_DC', 'ATTRIBUTE_CHA'),
  };

  // Attribute dump
  const attrs: { [key: string]: any } = {};
  for (const attr of getAllAttributeVariables(STORE_ID)) {
    try {
      attrs[attr.name] = attr.value;
    } catch (e) {
      console.warn('Error getting attr value', attr, e);
    }
  }

  // Raw data dump
  const rawData = _.cloneDeep(getVariableStore(STORE_ID));

  return {
    _README: `Here's some compiled data about the character. Should be fairly human-readable. The <character> section is what WG reads, this section is solely for you! Should give you an abundance of compiled stats and info about the character. If you have any questions, feel free to ask on our Discord!`,
    all_traits: alltraits,
    all_sources: content.sources,
    all_spells: spellSourceStats.length > 0 ? content.spells : [],
    feats_features: featData,
    character_traits: characterTraits,
    languages: languages,
    senses: senseData,
    weapons: weapons,
    inventory_flat: flatItems,
    total_bulk: totalBulk,
    spell_raw_data: spellData,
    spell_sources: spellSourceStats,
    spell_slots: spellSlots,
    spells: {
      all: spells,
      cantrips: cantrips,
      normal: nonCantrips,
      rituals: ritualSpells,
    },
    focus_spells: focusSpells,
    innate_spells: innateSpells,
    size: size,
    speeds: speeds,
    max_hp: maxHP,
    ac: ac,
    shield_item: shield,
    armor_item: armor,
    resist_weaks: resistWeaks,
    proficiencies: profs,
    attributes: attrs,
    raw_data_dump: rawData,
  };
}
