import { collectEntityAbilityBlocks, collectEntitySenses, collectEntitySpellcasting } from '@content/collect-content';
import { defineDefaultSources, fetchContentPackage } from '@content/content-store';
import { downloadObjectAsJson } from '@export/export-to-json';
import { isItemWeapon, getFlatInvItems, getBestArmor, getBestShield, getInvBulk, labelizeBulk } from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
import { executeCharacterOperations } from '@operations/operation-controller';
import { getSpellStats } from '@spells/spell-handler';
import { isCantrip, isRitual } from '@spells/spell-utils';
import { Character, Spell } from '@typing/content';
import { VariableListStr, VariableStr } from '@typing/variables';
import { displayResistWeak } from '@utils/resist-weaks';
import { toLabel } from '@utils/strings';
import {
  getFinalAcValue,
  getFinalHealthValue,
  getFinalProfValue,
  getFinalVariableValue,
  getProfValueParts,
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

export default async function jsonV4(character: Character) {
  const exportObject = {
    version: 4,
    character,
    content: await getContent(character),
  };

  const fileName = character.name
    .trim()
    .toLowerCase()
    .replace(/([^a-z0-9]+)/gi, '-');
  downloadObjectAsJson(exportObject, fileName);
}

async function getContent(character: Character) {
  // Get all content that the character uses
  defineDefaultSources(character.content_sources?.enabled ?? []);
  const content = await fetchContentPackage(undefined, { fetchSources: true });
  const STORE_ID = 'CHARACTER';

  // Execute all operations (to update the variables)
  await executeCharacterOperations(character, content, 'CHARACTER-BUILDER');

  // Get all the data

  const featData = collectEntityAbilityBlocks(STORE_ID, character, content.abilityBlocks, {
    filterBasicClassFeatures: true,
  });

  const characterTraits = getAllAncestryTraitVariables(STORE_ID).map((v) => {
    const trait = content.traits.find((trait) => trait.id === v.value);
    return trait;
  });

  const resistVar = getVariable<VariableListStr>(STORE_ID, 'RESISTANCES');
  const weakVar = getVariable<VariableListStr>(STORE_ID, 'WEAKNESSES');
  const immuneVar = getVariable<VariableListStr>(STORE_ID, 'IMMUNITIES');

  const languages = getVariable<VariableListStr>(STORE_ID, 'LANGUAGE_NAMES')?.value ?? [];

  const senseData = collectEntitySenses(STORE_ID, content.abilityBlocks);

  const weapons = character.inventory?.items
    .filter((invItem) => invItem.is_equipped && isItemWeapon(invItem.item))
    .sort((a, b) => a.item.name.localeCompare(b.item.name))
    .map((invItem) => ({
      item: invItem.item,
      stats: getWeaponStats(STORE_ID, invItem.item),
    }));

  const flatItems = character.inventory ? getFlatInvItems(character.inventory) : [];
  const totalBulk = character.inventory ? labelizeBulk(getInvBulk(character.inventory), true) : null;

  const spellData = collectEntitySpellcasting(STORE_ID, character);

  const spellSourceStats = spellData.sources.map((source) => {
    return {
      source,
      stats: getSpellStats(STORE_ID, null, source.tradition, source.attribute),
    };
  });

  const spells = (
    spellData.list
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
      .filter((s) => s) as Spell[]
  ).sort((a, b) => a.rank - b.rank);

  const focusSpells = (
    spellData.focus
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
      .filter((s) => s) as Spell[]
  ).sort((a, b) => a.rank - b.rank);

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
    .filter((s) => s)
    .sort((a, b) => a!.rank - b!.rank);

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
  const ac = getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, character.inventory)?.item);
  const shield = getBestShield(STORE_ID, character.inventory);
  const armor = getBestArmor(STORE_ID, character.inventory);

  const speeds = getAllSpeedVariables(STORE_ID).map((v) => {
    return {
      name: v.name,
      value: getFinalVariableValue(STORE_ID, v.name),
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
