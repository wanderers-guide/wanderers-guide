import { castingModelCases, type CastingModelCase, type CastingSourceOptions } from './casting-model-data';
import { entryResource, isPrepared, spellCatalog, type SampleSource } from './spell-study-data';

export type SpellPreviewState = { sources: SampleSource[]; options: Record<string, CastingSourceOptions> };
export type PreviewSlot = { sourceId: string; pool: string };
export type SpellPreviewAction =
  | { kind: 'cast'; sourceId: string; entryId: string; rank: number; slot?: PreviewSlot }
  | { kind: 'recover'; sourceId: string; entryId: string }
  | { kind: 'pool'; sourceId: string; pool: string; remaining: number }
  | { kind: 'prepare'; sourceId: string; spells: Record<string, string | null> }
  | { kind: 'staff-prepare'; sourceId: string; sacrifice?: { sourceId: string; entryId: string } }
  | { kind: 'overcharge'; sourceId: string; outcome: 'broken' | 'destroyed' }
  | { kind: 'learn'; sourceId: string; spell: string };

/** Clone the existing review fixtures. This state has no persistence or production write path. */
export function createSpellPreview(example: CastingModelCase): SpellPreviewState {
  const state = { sources: structuredClone(example.scenario.sources), options: structuredClone(example.options) };
  // Item-only diagrams need an actual caster here so their payment and preparation controls can spend slots.
  const castingId =
    example.id === 'staff-spontaneous'
      ? 'spontaneous'
      : ['staff-prepared', 'unprepared-staff'].includes(example.id)
        ? 'prepared'
        : undefined;
  const caster = castingModelCases.find((item) => item.id === castingId);
  if (caster) {
    state.sources.push(...structuredClone(caster.scenario.sources));
    Object.assign(state.options, structuredClone(caster.options));
  }
  return state;
}

/** Link staff payment choices to actual repertoire pools in this sample, including current quantities. */
export function previewOptions(state: SpellPreviewState): Record<string, CastingSourceOptions> {
  const slots = state.sources.flatMap((source) =>
    source.kind === 'spontaneous'
      ? Object.entries(source.pools)
          .filter(([key]) => key.startsWith('rank-'))
          .map(([key, pool]) => ({
            value: `${source.id}:${key}`,
            sourceId: source.id,
            pool: key,
            rank: Number(key.slice(5)),
            label: `${source.name} · Rank ${key.slice(5)} · ${pool.remaining} left`,
            disabled: pool.remaining === 0,
          }))
      : []
  );
  return Object.fromEntries(
    state.sources.map((source) => [
      source.id,
      {
        ...state.options[source.id],
        ...(source.kind === 'staff' ? { slotChoices: slots } : {}),
      },
    ])
  );
}

/** Temporary interaction bookkeeping only. Availability is rechecked so repeated taps cannot overspend. */
export function updateSpellPreview(previous: SpellPreviewState, action: SpellPreviewAction): SpellPreviewState {
  const next = structuredClone(previous);
  const source = next.sources.find((item) => item.id === action.sourceId);
  if (!source) return previous;
  const settings = next.options[source.id] ?? (next.options[source.id] = {});
  if (action.kind === 'pool') {
    const pool = source.pools[action.pool];
    if (!pool || !Number.isFinite(action.remaining)) return previous;
    pool.remaining = Math.max(0, Math.min(pool.max, Math.floor(action.remaining)));
    if (source.kind === 'focus')
      next.sources
        .filter((item) => item.kind === 'focus')
        .forEach((item) => {
          if (item.pools.focus) item.pools.focus.remaining = Math.min(item.pools.focus.max, pool.remaining);
        });
  } else if (action.kind === 'prepare') {
    if (!isPrepared(source)) return previous;
    source.entries.forEach((entry) => {
      if (!(entry.id in action.spells)) return;
      const name = action.spells[entry.id];
      const spell = name ? spellCatalog[name] : null;
      if (
        name &&
        (!source.known.includes(name) ||
          !spell ||
          (entry.rank === 0 ? spell.rank !== 0 : spell.rank === 0 || spell.rank > entry.rank))
      )
        return;
      if (entry.spell !== name) Object.assign(entry, { spell: name, used: false, missing: false });
    });
  } else if (action.kind === 'learn') {
    const spell = spellCatalog[action.spell];
    if (!spell || source.kind !== 'prepared-book' || source.known.includes(action.spell)) return previous;
    source.known.push(action.spell);
  } else if (action.kind === 'staff-prepare') {
    if (source.kind !== 'staff' || settings.staffPrepared !== false || settings.itemBroken) return previous;
    const highest = Math.max(
      0,
      ...next.sources.flatMap((item) => [
        ...Object.keys(item.pools)
          .filter((key) => key.startsWith('rank-'))
          .map((key) => Number(key.slice(5))),
        ...(isPrepared(item) ? item.entries.map((entry) => entry.rank) : []),
      ])
    );
    let charges = highest || source.pools.charges.max;
    if (action.sacrifice) {
      const owner = next.sources.find((item) => item.id === action.sacrifice?.sourceId);
      const entry = owner?.entries.find((item) => item.id === action.sacrifice?.entryId);
      if (!owner || !isPrepared(owner) || !entry?.spell || entry.rank === 0 || entry.used) return previous;
      entry.used = true;
      charges += entry.rank;
    }
    source.pools.charges = { remaining: charges, max: charges, unit: 'charges' };
    settings.staffPrepared = true;
  } else if (action.kind === 'overcharge') {
    if (
      source.kind !== 'wand' ||
      source.pools.uses.remaining ||
      ['broken', 'destroyed', 'overcharged'].includes(settings.wandState ?? '')
    )
      return previous;
    settings.wandState = action.outcome;
  } else {
    const entry = source.entries.find((item) => item.id === action.entryId);
    if (!entry?.spell || entry.missing || !spellCatalog[entry.spell]) return previous;
    if (action.kind === 'recover') {
      if (isPrepared(source)) entry.used = false;
      return next;
    }
    if (
      source.kind === 'ritual' ||
      settings.itemBroken ||
      (source.kind === 'spellheart' && settings.affixedTo === null) ||
      (source.kind === 'staff' && settings.staffPrepared === false) ||
      (source.kind === 'wand' && ['broken', 'destroyed', 'overcharged'].includes(settings.wandState ?? ''))
    )
      return previous;
    if (entry.rank === 0) return next;
    if (isPrepared(source)) {
      if (entry.used) return previous;
      entry.used = true;
    } else if (source.kind === 'spontaneous') {
      const rank = settings.signatures?.includes(entry.id) ? action.rank : entry.rank;
      const pool = source.pools[`rank-${rank}`];
      if (rank < entry.rank || !pool?.remaining) return previous;
      pool.remaining -= 1;
    } else if (source.kind === 'staff' && action.slot) {
      const owner = next.sources.find((item) => item.id === action.slot?.sourceId);
      const pool = owner?.pools[action.slot.pool];
      if (
        owner?.kind !== 'spontaneous' ||
        !pool?.remaining ||
        Number(action.slot.pool.slice(5)) < entry.rank ||
        !source.pools.charges.remaining
      )
        return previous;
      pool.remaining -= 1;
      source.pools.charges.remaining -= 1;
    } else {
      const resource = entryResource(source, entry);
      // Spellhearts have independent activation pools in the expanded fixtures.
      const key = source.kind === 'spellheart' ? entry.pool : resource?.key;
      const cost = source.kind === 'spellheart' ? 1 : (resource?.cost ?? 0);
      const pool = key ? source.pools[key] : undefined;
      if (pool && pool.remaining < cost) return previous;
      if (pool) pool.remaining -= cost;
      if (source.kind === 'focus' && pool)
        next.sources
          .filter((item) => item.kind === 'focus')
          .forEach((item) => {
            if (item.pools.focus) item.pools.focus.remaining = pool.remaining;
          });
    }
  }
  return next;
}
