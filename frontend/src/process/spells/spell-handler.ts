import { collectEntitySpellcasting } from '@content/collect-content';
import {
  CastingSource,
  CastingSourceSchema,
  Item,
  LivingEntity,
  Spell,
  SpellheartCasting,
  SpellheartCastingSchema,
} from '@schemas/content';
import { StoreID } from '@schemas/variables';
import { toLabel } from '@utils/strings';
import { getCombinedVariableValue, getModifierParts, getProfValueParts } from '@variables/variable-helpers';
import { getVariable } from '@variables/variable-manager';
import { isCantrip } from './spell-utils';

export function getSpellStats(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  return {
    spell_attack: getSpellAttack(id, spell, tradition, attribute),
    spell_dc: getSpellDC(id, spell, tradition, attribute),
  };
}

/** Read one current source for wand/staff display without granting casting permission. */
export function getItemCastingSource(
  id: StoreID,
  spell: Spell,
  casting: Pick<ReturnType<typeof collectEntitySpellcasting>, 'sources' | 'list'>
): CastingSource | undefined {
  let best: { source: CastingSource; dc: number; attack: number } | undefined;
  for (const candidate of casting.sources) {
    const parsed = CastingSourceSchema.safeParse(candidate);
    if (
      !parsed.success ||
      !parsed.data.name.trim() ||
      !['PREPARED-TRADITION', 'PREPARED-LIST', 'SPONTANEOUS-REPERTOIRE'].includes(parsed.data.type) ||
      !['ARCANE', 'DIVINE', 'OCCULT', 'PRIMAL'].includes(parsed.data.tradition) ||
      getVariable(id, parsed.data.attribute)?.type !== 'attr'
    ) {
      continue;
    }
    const source = parsed.data;
    const onTraditionList = spell.traditions?.some((tradition) => tradition.toUpperCase() === source.tradition);
    // The collector's normal list includes source-bound grants; focus/innate grants are separate.
    const onExpandedList = casting.list.some(
      (entry) =>
        Number.isSafeInteger(entry.spell_id) &&
        entry.spell_id > 0 &&
        entry.spell_id === spell.id &&
        entry.source === source.name
    );
    if (!onTraditionList && !onExpandedList) continue;

    const stats = getSpellStats(id, spell, source.tradition, source.attribute);
    const dc = stats.spell_dc.total;
    const attack = stats.spell_attack.total[0];
    if (!Number.isFinite(dc) || !Number.isFinite(attack)) continue;
    // Keep attack and DC on the same source, with a stable tie for equal statistics.
    if (!best || dc > best.dc || (dc === best.dc && attack > best.attack)) {
      best = { source, dc, attack };
    }
  }
  return best?.source;
}

/** Read explicit item values without altering a saved snapshot or guessing from its description. */
export function resolveSpellheartCasting(item: Item, canonicalItem?: Item): SpellheartCasting | undefined {
  const own = item.meta_data?.spellheart_casting;
  if (own !== undefined) {
    const parsed = SpellheartCastingSchema.safeParse(own);
    return parsed.success ? parsed.data : undefined;
  }

  const uuid = (item as Item & { uuid?: unknown }).uuid;
  if (!canonicalItem || canonicalItem.id !== item.id || canonicalItem.content_source_id !== item.content_source_id) {
    return undefined;
  }
  if ('uuid' in item || 'uuid' in canonicalItem) {
    if (!Number.isSafeInteger(uuid) || !uuid || (canonicalItem as Item & { uuid?: unknown }).uuid !== uuid) {
      return undefined;
    }
  } else {
    // Validated catalog and inventory items omit UUIDs. Match their retained
    // identity instead, without replacing descriptions, versions or custom data.
    if (
      !Number.isSafeInteger(item.id) ||
      item.id <= 0 ||
      !Number.isSafeInteger(item.content_source_id) ||
      item.content_source_id <= 0 ||
      !Number.isSafeInteger(item.level) ||
      typeof item.created_at !== 'string' ||
      !item.created_at ||
      typeof item.name !== 'string' ||
      !item.name ||
      typeof item.group !== 'string' ||
      !item.group ||
      canonicalItem.created_at !== item.created_at ||
      canonicalItem.name !== item.name ||
      canonicalItem.level !== item.level ||
      canonicalItem.group !== item.group
    ) {
      return undefined;
    }
  }
  const parsed = SpellheartCastingSchema.safeParse(canonicalItem.meta_data?.spellheart_casting);
  return parsed.success ? parsed.data : undefined;
}

/** Spellhearts use printed values; only their cantrips can use higher, existing casting statistics. */
export function getSpellheartStats(
  id: StoreID,
  spell: Spell,
  tradition: string,
  attribute: string,
  casting: SpellheartCasting,
  entity: LivingEntity | null
) {
  const fallback = getSpellStats(id, spell, tradition, attribute);
  const parsed = SpellheartCastingSchema.safeParse(casting);
  if (!parsed.success) return fallback;

  const stats = { ...fallback };
  if (parsed.data.attack !== undefined) {
    const modifiers = getSpellAttackModifiers(id, spell);
    stats.spell_attack = {
      total: getMAPedTotal(id, parsed.data.attack + modifiers.total),
      parts: new Map([
        ["This is the spellheart's printed spell attack modifier.", parsed.data.attack],
        ...getModifierParts(modifiers),
      ]),
      conditionals: modifiers.conditionals,
    };
  }
  if (parsed.data.dc !== undefined) {
    stats.spell_dc = {
      total: parsed.data.dc,
      parts: new Map([["This is the spellheart's printed spell DC.", parsed.data.dc]]),
    };
  }

  if (!entity || !isCantrip(spell)) return stats;

  const ownCasting = collectEntitySpellcasting(id, entity);
  const sources = [...ownCasting.sources];
  // Innate grants use Charisma in the existing innate-spell path, even without a named casting source.
  for (const innate of ownCasting.innate) {
    if (!Number.isSafeInteger(innate.spell_id) || innate.spell_id <= 0) continue;
    sources.push({ name: 'INNATE', type: '-', tradition: innate.tradition, attribute: 'ATTRIBUTE_CHA' });
  }
  for (const candidate of sources) {
    const source = CastingSourceSchema.safeParse(candidate);
    if (
      !source.success ||
      !source.data.name.trim() ||
      !source.data.type.trim() ||
      !['ARCANE', 'DIVINE', 'OCCULT', 'PRIMAL'].includes(source.data.tradition) ||
      getVariable(id, source.data.attribute)?.type !== 'attr'
    ) {
      continue;
    }
    const ownStats = getSpellStats(id, spell, source.data.tradition, source.data.attribute);
    if (parsed.data.attack !== undefined && ownStats.spell_attack.total[0] > stats.spell_attack.total[0]) {
      stats.spell_attack = ownStats.spell_attack;
    }
    if (parsed.data.dc !== undefined && ownStats.spell_dc.total > stats.spell_dc.total) {
      stats.spell_dc = ownStats.spell_dc;
    }
  }
  return stats;
}

function getSpellAttackModifiers(id: StoreID, spell: Spell | null, attribute?: string) {
  const rangeVariable = spell?.range?.trim().toLowerCase() === 'touch' ? 'MELEE' : 'RANGED';
  const attributeVariable = attribute === 'ATTRIBUTE_STR' ? 'STR' : attribute === 'ATTRIBUTE_DEX' ? 'DEX' : null;
  return getCombinedVariableValue(id, [
    'SPELL_ATTACK',
    'ATTACK_ROLLS_BONUS',
    `${rangeVariable}_ATTACK_ROLLS_BONUS`,
    ...(attributeVariable ? [`${attributeVariable}_ATTACK_ROLLS_BONUS`] : []),
  ]);
}

/** Stack raw spell, general, range and applicable attribute modifiers as one attack roll. */
function getSpellAttack(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  const profParts = getProfValueParts(id, 'SPELL_ATTACK', attribute)!;
  const modifiers = getSpellAttackModifiers(id, spell, attribute);
  const parts = new Map<string, number>([
    ['This is your proficiency bonus for spell attacks.', profParts.profValue + profParts.level],
    [`This is your ${toLabel(attribute)} modifier for this casting source.`, profParts.attributeMod ?? 0],
    ...getModifierParts(modifiers),
  ]);
  return {
    total: getMAPedTotal(
      id,
      [...parts.values()].reduce((total, part) => total + part, 0)
    ),
    parts,
    conditionals: modifiers.conditionals,
  };
}

function getSpellDC(id: StoreID, spell: Spell | null, tradition: string, attribute: string) {
  const profParts = getProfValueParts(id, `SPELL_DC`, attribute)!;

  ///

  const parts = new Map<string, number>();
  parts.set('This is your proficiency bonus for spell DCs.', profParts.profValue + profParts.level);

  parts.set(
    `This is your ${toLabel(attribute)} modifier. You add your ${toLabel(attribute)} modifier to spell DCs from this casting source.`,
    profParts.attributeMod ?? 0
  );

  if (profParts.breakdown.bonusValue) {
    parts.set('This is a bonus you receive to spell DCs from various sources.', profParts.breakdown.bonusValue);
  }

  return {
    total: 10 + [...parts.values()].reduce((a, b) => a + b, 0),
    parts: parts,
  };
}

function getMAPedTotal(id: StoreID, total: number): [number, number, number] {
  const first = total;
  const second = total - 5;
  const third = total - 10;

  return [first, second, third];
}
