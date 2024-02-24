import {
  Character,
  AbilityBlock,
  Spell,
  SpellSlot,
  SpellListEntry,
  SpellInnateEntry,
  CastingSource,
} from '@typing/content';
import { GiveSpellData, SpellMetadata } from '@typing/operations';
import { VariableListStr } from '@typing/variables';
import { getTraitIdByType, hasTraitType } from '@utils/traits';
import { getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';
import _ from 'lodash-es';

export function collectCharacterAbilityBlocks(character: Character, blocks: AbilityBlock[]) {
  // Feats ///////////////////////////////

  const featIds = getVariable<VariableListStr>('CHARACTER', 'FEAT_IDS')?.value ?? [];
  const feats = blocks
    .filter((block) => block.type === 'feat' && featIds.includes(`${block.id}`))
    .sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    });

  const generalAndSkillFeats = feats.filter((feat) => {
    return hasTraitType('GENERAL', feat.traits) || hasTraitType('SKILL', feat.traits);
  });

  const classFeats = feats.filter((feat) => {
    return feat.traits?.includes(character?.details?.class?.trait_id ?? -1);
  });

  const ancestryFeats = feats.filter((feat) => {
    return feat.traits?.includes(character?.details?.ancestry?.trait_id ?? -1);
  });

  const otherFeats = feats.filter((feat) => {
    return (
      !classFeats.includes(feat) &&
      !ancestryFeats.includes(feat) &&
      !generalAndSkillFeats.includes(feat)
    );
  });

  // Features ////////////////////////////

  const classFeatureIds =
    getVariable<VariableListStr>('CHARACTER', 'CLASS_FEATURE_IDS')?.value ?? [];
  const classFeatures = blocks.filter(
    (block) => block.type === 'class-feature' && classFeatureIds.includes(`${block.id}`)
  );

  const physicalFeatureIds =
    getVariable<VariableListStr>('CHARACTER', 'PHYSICAL_FEATURE_IDS')?.value ?? [];
  const physicalFeatures = blocks.filter(
    (block) => block.type === 'physical-feature' && physicalFeatureIds.includes(`${block.id}`)
  );

  const heritageIds = getVariable<VariableListStr>('CHARACTER', 'HERITAGE_IDS')?.value ?? [];
  const heritages = blocks.filter(
    (block) => block.type === 'heritage' && heritageIds.includes(`${block.id}`)
  );

  // Base class features (default by the class)
  const baseClassFeatures = blocks.filter(
    (ab) =>
      ab.type === 'class-feature' &&
      ab.traits?.includes(character?.details?.class?.trait_id ?? -1) &&
      (ab.level === undefined || ab.level <= character.level)
  );

  return {
    generalAndSkillFeats,
    classFeats,
    ancestryFeats,
    otherFeats,

    classFeatures: [...classFeatures, ...baseClassFeatures].sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    }),
    physicalFeatures: physicalFeatures.sort((a, b) => a.name.localeCompare(b.name)),
    heritages: heritages.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function collectCharacterSenses(character: Character, blocks: AbilityBlock[]) {
  const allSenses = blocks.filter((block) => block.type === 'sense');

  const precise = getVariable<VariableListStr>('CHARACTER', 'SENSES_PRECISE')?.value ?? [];
  const imprecise = getVariable<VariableListStr>('CHARACTER', 'SENSES_IMPRECISE')?.value ?? [];
  const vague = getVariable<VariableListStr>('CHARACTER', 'SENSES_VAGUE')?.value ?? [];

  const findSense = (varTitle: string) => {
    let range: string | null = null;
    if (varTitle.includes('-')) {
      const parts = varTitle.split('-');
      varTitle = parts[0];
      range = parts[parts.length - 1];
    }

    const sense = allSenses.find((sense) => labelToVariable(sense.name) === varTitle);
    if (sense) {
      return {
        sense,
        range, // TODO: include variable math
      };
    }
    return null;
  };

  type SenseWithRange = {
    sense: AbilityBlock;
    range: string | null;
  };

  return {
    precise: precise.map(findSense).filter((s) => s !== null) as SenseWithRange[],
    imprecise: imprecise.map(findSense).filter((s) => s !== null) as SenseWithRange[],
    vague: vague.map(findSense).filter((s) => s !== null) as SenseWithRange[],
  };
}

export function collectCharacterSpellcasting(character: Character) {
  const castingSources = getVariable<VariableListStr>('CHARACTER', 'CASTING_SOURCES')?.value ?? [];
  const spellDatas = getVariable<VariableListStr>('CHARACTER', 'SPELL_DATA')?.value ?? [];
  const spellSlots = getVariable<VariableListStr>('CHARACTER', 'SPELL_SLOTS')?.value ?? [];

  // Prefill slots from computed results
  let slots: SpellSlot[] = [];
  for (const strS of spellSlots) {
    const slot = JSON.parse(strS) as { lvl: number; rank: number; amt: number; source: string };
    for (let i = 0; i < slot.amt; i++) {
      if (slot.lvl !== character.level) continue;
      slots.push({
        rank: slot.rank,
        source: slot.source,
        spell_id: undefined,
        exhausted: undefined,
        color: undefined,
      });
    }
  }
  // Fill slot data from saved character data
  slots = mergeSpellSlots(slots, character.spells?.slots ?? []);

  // List of character's spells
  let list = _.cloneDeep(character.spells?.list ?? []);
  let focus: { spell_id: number; source: string }[] = [];
  let innate: SpellInnateEntry[] = [];
  for (const strD of spellDatas) {
    const spellData = JSON.parse(strD) as GiveSpellData;

    if (spellData.type === 'NORMAL') {
      list.push({
        spell_id: spellData.spellId,
        rank: spellData.rank ?? 0,
        source: spellData.castingSource ?? '',
      });
    } else if (spellData.type === 'FOCUS') {
      focus.push({
        spell_id: spellData.spellId,
        source: spellData.castingSource ?? '',
      });
    } else if (spellData.type === 'INNATE') {
      innate.push({
        spell_id: spellData.spellId,
        tradition: spellData.tradition ?? '',
        rank: spellData.rank ?? 0,
        casts_max: spellData.casts ?? 0,
        casts_current: 0,
      });
    }
  }
  // Remove duplicates
  list = _.uniqWith(list, _.isEqual);
  focus = _.uniqWith(focus, _.isEqual);
  innate = _.uniqWith(innate, _.isEqual);

  // Fill current casts from saved character data
  innate = mergeInnateSpells(innate, character.spells?.innate_casts ?? []);

  return {
    slots,
    list,
    focus,
    innate,
    ritual: (character.spells?.rituals ?? []).map((spell_id) => ({ spell_id })),
    focus_points: {
      current: character.spells?.focus_point_current ?? 0,
      max: Math.min(focus.length ?? 0, 3),
    },
    sources: castingSources.map((source) => {
      const parts = source.split(':::') || ['', '', '', ''];
      return {
        name: parts[0],
        type: parts[1],
        tradition: parts[2],
        attribute: parts[3],
      } satisfies CastingSource as CastingSource;
    }),
  };
}

function mergeSpellSlots(emptySlots: SpellSlot[], characterSlots: SpellSlot[]): SpellSlot[] {
  // Preprocess character slots into a Map for quick lookup
  const slotMap = new Map();
  for (const slot of characterSlots) {
    const key = `${slot.rank}-${slot.source}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, []);
    }
    slotMap.get(key).push(slot);
  }

  // Iterate over empty slots and fill them with data from character slots
  return emptySlots.map((slot) => {
    const key = `${slot.rank}-${slot.source}`;
    if (slotMap.has(key) && slotMap.get(key).length > 0) {
      const match = slotMap.get(key).shift(); // Get the first match and remove it from the array
      // Fill in the details from the matched slot
      slot.spell_id = match.spell_id;
      slot.exhausted = match.exhausted;
      slot.color = match.color;
    }
    return slot;
  });
}

function mergeInnateSpells(
  emptyCasts: SpellInnateEntry[],
  characterCasts: SpellInnateEntry[]
): SpellInnateEntry[] {
  const castMap = new Map();
  for (const cast of emptyCasts) {
    castMap.set(`${cast.spell_id}-${cast.tradition}-${cast.rank}`, 0);
  }

  for (const cast of characterCasts) {
    const key = `${cast.spell_id}-${cast.tradition}-${cast.rank}`;
    if (castMap.has(key)) {
      castMap.set(key, cast.casts_current);
    }
  }

  return emptyCasts.map((cast) => {
    const key = `${cast.spell_id}-${cast.tradition}-${cast.rank}`;
    cast.casts_current = castMap.get(key);
    return cast;
  });
}
