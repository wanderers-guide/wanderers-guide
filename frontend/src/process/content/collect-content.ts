import {
  AbilityBlock,
  SpellSlot,
  SpellInnateEntry,
  CastingSource,
  SenseWithRange,
  LivingEntity,
  SpellSlotRecord,
} from '@typing/content';
import { GiveSpellData } from '@typing/operations';
import { StoreID, VariableListStr, VariableNum } from '@typing/variables';
import { attemptToFindSense, compactSensesWithRange } from '@utils/senses';
import { toLabel } from '@utils/strings';
import { hasTraitType } from '@utils/traits';
import { getVariable } from '@variables/variable-manager';
import { compileExpressions } from '@variables/variable-utils';
import { cloneDeep, isEqual, uniqWith } from 'lodash-es';
import { isCharacter, isCreature, isTruthy } from '@utils/type-fixing';
import { getEntityLevel } from '@utils/entity-utils';

export function collectEntityAbilityBlocks(
  id: StoreID,
  entity: LivingEntity,
  blocks: AbilityBlock[],
  options?: { filterBasicClassFeatures?: boolean }
) {
  // Feats ///////////////////////////////

  const featIds = getVariable<VariableListStr>(id, 'FEAT_IDS')?.value ?? [];
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
    if (isCharacter(entity)) {
      return feat.traits?.includes(entity?.details?.class?.trait_id ?? -1);
    } else {
      return false;
    }
  });

  const ancestryFeats = feats.filter((feat) => {
    if (isCharacter(entity)) {
      return feat.traits?.includes(entity?.details?.ancestry?.trait_id ?? -1);
    } else {
      return false;
    }
  });

  const otherFeats = feats.filter((feat) => {
    return !classFeats.includes(feat) && !ancestryFeats.includes(feat) && !generalAndSkillFeats.includes(feat);
  });

  // Features ////////////////////////////

  const classFeatureIds = getVariable<VariableListStr>(id, 'CLASS_FEATURE_IDS')?.value ?? [];
  let classFeatures = blocks.filter(
    (block) => block.type === 'class-feature' && classFeatureIds.includes(`${block.id}`)
  );
  if (options?.filterBasicClassFeatures) {
    const BASIC_NAMES = ['Attribute Boosts', 'Skill Feat', 'Skill Increase', 'General Feat'];
    if (isCharacter(entity)) {
      BASIC_NAMES.push(`${entity.details?.class?.name} Feat`);
      BASIC_NAMES.push(`${entity.details?.class_2?.name} Feat`);
    }

    classFeatures = classFeatures.filter((feature) => !BASIC_NAMES.includes(feature.name));
  }

  const physicalFeatureIds = getVariable<VariableListStr>(id, 'PHYSICAL_FEATURE_IDS')?.value ?? [];
  const physicalFeatures = blocks.filter(
    (block) => block.type === 'physical-feature' && physicalFeatureIds.includes(`${block.id}`)
  );

  const heritageIds = getVariable<VariableListStr>(id, 'HERITAGE_IDS')?.value ?? [];
  const heritages = blocks.filter((block) => block.type === 'heritage' && heritageIds.includes(`${block.id}`));

  return {
    generalAndSkillFeats,
    classFeats,
    ancestryFeats,
    otherFeats,

    classFeatures: classFeatures.sort((a, b) => {
      if (a.level !== undefined && b.level !== undefined) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }
      return a.name.localeCompare(b.name);
    }),
    physicalFeatures: physicalFeatures.sort((a, b) => a.name.localeCompare(b.name)),
    heritages: heritages.sort((a, b) => a.name.localeCompare(b.name)),
    // For creature:
    baseAbilities: isCreature(entity) ? (entity.abilities_base ?? []) : [],
    addedAbilities: isCreature(entity)
      ? (entity.abilities_added?.map((id) => blocks.find((b) => id === b.id)).filter(isTruthy) ?? [])
      : [],
  };
}

export function collectEntitySenses(id: StoreID, blocks: AbilityBlock[]) {
  const allSenses = blocks.filter((block) => block.type === 'sense');

  const precise = getVariable<VariableListStr>(id, 'SENSES_PRECISE')?.value ?? [];
  const imprecise = getVariable<VariableListStr>(id, 'SENSES_IMPRECISE')?.value ?? [];
  const vague = getVariable<VariableListStr>(id, 'SENSES_VAGUE')?.value ?? [];

  const findSense = (varTitle: string) => {
    let range: string | null = null;
    if (varTitle.includes(',')) {
      const parts = varTitle.split(',');
      varTitle = parts[0];
      range = parts[parts.length - 1];
    }

    const finalRange = compileExpressions(id, range?.trim() ?? '', true) ?? '';
    const finalSenseName = toLabel(varTitle);
    return attemptToFindSense(finalSenseName, finalRange, allSenses);
  };

  const compactSenses = compactSensesWithRange([
    ...precise
      .map(findSense)
      .filter(isTruthy)
      .map((s) => ({ ...s, type: 'precise' }) satisfies SenseWithRange),
    ...imprecise
      .map(findSense)
      .filter(isTruthy)
      .map((s) => ({ ...s, type: 'imprecise' }) satisfies SenseWithRange),
    ...vague
      .map(findSense)
      .filter(isTruthy)
      .map((s) => ({ ...s, type: 'vague' }) satisfies SenseWithRange),
  ]);

  return {
    precise: compactSenses.filter((s) => s.type === 'precise'),
    imprecise: compactSenses.filter((s) => s.type === 'imprecise'),
    vague: compactSenses.filter((s) => s.type === 'vague'),
  };
}

export function collectEntitySpellcasting(id: StoreID, entity: LivingEntity) {
  const castingSources = getVariable<VariableListStr>(id, 'CASTING_SOURCES')?.value ?? [];
  const spellDatas = getVariable<VariableListStr>(id, 'SPELL_DATA')?.value ?? [];
  const spellSlots = getVariable<VariableListStr>(id, 'SPELL_SLOTS')?.value ?? [];

  // Prefill slots from computed results
  let slots: SpellSlotRecord[] = [];
  let count = 0;
  for (const strS of spellSlots) {
    const slot = JSON.parse(strS) as { lvl: number; rank: number; amt: number; source: string; opId: string };
    for (let i = 0; i < slot.amt; i++) {
      if (slot.lvl !== getEntityLevel(entity)) continue;
      slots.push({
        id: `${id}-spell-slot-${count}`,
        rank: slot.rank,
        source: slot.source,
        spell_id: undefined,
        exhausted: undefined,
        color: undefined,
      });
      count++;
    }
  }

  // Fill slot data from saved entity data
  slots = mergeSpellSlots(slots, entity.spells?.slots ?? []);

  // List of entity's spells
  let list = cloneDeep(entity.spells?.list ?? []);
  let focus: { spell_id: number; source: string; rank: number | undefined }[] = [];
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
        rank: spellData.rank,
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
  list = uniqWith(list, isEqual);
  focus = uniqWith(focus, isEqual);
  innate = uniqWith(innate, isEqual);

  // Fill current casts from saved character data
  innate = mergeInnateSpells(innate, entity.spells?.innate_casts ?? []);

  return {
    slots,
    list,
    focus,
    innate,
    sources: castingSources
      .map((source) => {
        const parts = source.split(':::') || ['', '', '', ''];
        return {
          name: parts[0],
          type: parts[1],
          tradition: parts[2],
          attribute: parts[3],
        } satisfies CastingSource as CastingSource;
      })
      .sort((a, b) => {
        if (a.type !== b.type) {
          return b.type.localeCompare(a.type);
        }
        return a.name.localeCompare(b.name);
      }),
  };
}

export function getFocusPoints(id: StoreID, entity: LivingEntity, focusSpells: Record<string, any>[]) {
  const fromSpells = focusSpells.filter((f) => f?.rank !== 0).length ?? 0;
  const extra = getVariable<VariableNum>(id, 'FOCUS_POINT_BONUS')?.value ?? 0;

  const maxFocusPoints = Math.min(fromSpells + extra, 3);
  return {
    current: entity.spells?.focus_point_current ?? maxFocusPoints,
    max: maxFocusPoints,
  };
}

function mergeSpellSlots(emptySlots: SpellSlotRecord[], characterSlots: SpellSlot[]) {
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

function mergeInnateSpells(emptyCasts: SpellInnateEntry[], characterCasts: SpellInnateEntry[]): SpellInnateEntry[] {
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
