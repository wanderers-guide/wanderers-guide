import { z } from 'zod';
import catalogJson from './spell-sample-catalog.json';

const sampleSpellSchema = z.object({
  name: z.string(),
  rank: z.number(),
  cast: z.string(),
  range: z.string(),
  defense: z.string(),
  description: z.string(),
});
export type SampleSpell = z.infer<typeof sampleSpellSchema>;
export const spellCatalog = z.record(z.string(), sampleSpellSchema).parse(catalogJson);
export type SpellDesign = 'sections' | 'switcher';
export type SampleKind =
  | 'prepared-book'
  | 'prepared-tradition'
  | 'spontaneous'
  | 'focus'
  | 'innate'
  | 'staff'
  | 'wand'
  | 'spellheart'
  | 'ritual';
export type SampleEntry = {
  id: string;
  spell: string | null;
  rank: number;
  used?: boolean;
  pool?: string;
  origin?: string;
  label?: string;
  missing?: boolean;
};
export type SampleSource = {
  id: string;
  name: string;
  kind: SampleKind;
  detail: string;
  attack?: number;
  dc?: number;
  entries: SampleEntry[];
  known: string[];
  pools: Record<string, { remaining: number; max: number; unit: string }>;
};
export type SpellScenario = { id: string; label: string; note: string; sources: SampleSource[] };

/** Stable entry and pool IDs preserve separate preparations and duplicate items in the local mock. */
function source(
  id: string,
  name: string,
  kind: SampleKind,
  detail: string,
  spells: (string | null)[],
  ranks?: number[]
): SampleSource {
  return {
    id,
    name,
    kind,
    detail,
    attack: ['prepared-book', 'prepared-tradition', 'spontaneous'].includes(kind) ? 11 : undefined,
    dc: ['prepared-book', 'prepared-tradition', 'spontaneous'].includes(kind) ? 21 : undefined,
    entries: spells.map((spell, index) => ({
      id: `${id}-${index}`,
      spell,
      rank: ranks?.[index] ?? (spell ? spellCatalog[spell].rank : 1),
    })),
    known: [...new Set(spells.filter((spell): spell is string => !!spell))],
    pools: {},
  };
}
const wizard = source(
  'wizard',
  'Wizard',
  'prepared-book',
  'Arcane · Prepared',
  ['Shield', 'Charm', 'Charm', null, 'Invisibility'],
  [0, 1, 1, 1, 2]
);
wizard.known.push('Fear', 'Force Barrage', 'Light');
wizard.entries[2].used = true;
const cleric = source(
  'cleric',
  'Cleric',
  'prepared-tradition',
  'Divine · Prepared',
  ['Guidance', 'Heal', null, 'Bless'],
  [0, 1, 1, 2]
);
cleric.known = ['Guidance', 'Heal', 'Bless', 'Light'];
const bard = source(
  'bard',
  'Bard',
  'spontaneous',
  'Occult · Repertoire',
  ['Daze', 'Fear', 'Befuddle', 'Invisibility'],
  [0, 1, 1, 2]
);
bard.pools = { 'rank-1': { remaining: 3, max: 4, unit: 'slots' }, 'rank-2': { remaining: 2, max: 3, unit: 'slots' } };
const focus = source('focus', 'Focus spells', 'focus', 'Shared focus pool', ['Lay on Hands', 'Courageous Anthem']);
focus.entries[0].origin = 'Champion · Divine';
focus.entries[1].origin = 'Bard · Occult';
focus.pools = { focus: { remaining: 2, max: 3, unit: 'points' } };
const innate = source('innate', 'Innate spells', 'innate', 'Uses belong to each spell', ['Invisibility', 'Light']);
innate.entries[0].pool = 'invisibility';
innate.pools = { invisibility: { remaining: 1, max: 1, unit: 'uses' } };
const staff = source('staff', 'Fire staff', 'staff', 'Staff · Charges', ['Fireball'], [3]);
staff.pools = { charges: { remaining: 5, max: 6, unit: 'charges' } };
const wand = source('wand-travel', 'Travel wand', 'wand', 'Wand · Invisibility', ['Invisibility']);
wand.pools = { uses: { remaining: 1, max: 1, unit: 'uses' } };
const spareWand = source('wand-spare', 'Spare wand', 'wand', 'Wand · Invisibility', ['Invisibility']);
spareWand.pools = { uses: { remaining: 0, max: 1, unit: 'uses' } };
const spellheart = source('spellheart', 'Spellheart', 'spellheart', 'Item-granted spell', ['Light']);
const ritual = source('ritual', 'Rituals', 'ritual', 'Ritual collection', ['Resurrect']);
const edge = structuredClone(wizard);
edge.id = 'homebrew';
edge.name = 'Witch of the Far Northern Constellations';
edge.entries[0].label = 'A Lantern for Those Who Wander Beyond the Last Light';
edge.entries.push({ id: 'missing-reference', spell: null, rank: 2, missing: true });

/** Illustrative loadouts exercise presentation; they are not complete rules-validated character builds. */
export const spellScenarios: SpellScenario[] = [
  {
    id: 'mixed',
    label: 'Mixed sources',
    note: 'Prepared slots, one shared focus pool, and separate wand uses.',
    sources: [wizard, focus, wand],
  },
  {
    id: 'prepared',
    label: 'Prepared: spellbook',
    note: 'Two Charm preparations stay separate. Empty slots move into preparation.',
    sources: [wizard],
  },
  {
    id: 'tradition',
    label: 'Prepared: tradition',
    note: 'Preparation uses a tradition list without a separate spellbook view.',
    sources: [cleric],
  },
  {
    id: 'spontaneous',
    label: 'Spontaneous',
    note: 'Spells of the same rank spend from one source-specific pool.',
    sources: [bard],
  },
  {
    id: 'focus',
    label: 'Focus only',
    note: 'Both sources share one pool. The focus cantrip uses no points.',
    sources: [focus],
  },
  {
    id: 'rituals',
    label: 'Rituals only',
    note: 'Reference and collection management, with no ordinary Cast button.',
    sources: [ritual],
  },
  { id: 'innate', label: 'Innate spells', note: 'Limited and unlimited uses stay distinct.', sources: [innate] },
  {
    id: 'items',
    label: 'Staves, wands, spellhearts',
    note: 'Item identities and resources stay separate. Staff preparation and wand overcharge are outside this mock.',
    sources: [staff, wand, spareWand, spellheart],
  },
  {
    id: 'homebrew',
    label: 'Long names / missing data',
    note: 'Illustrative homebrew name and a missing reference retain their space and slot identity.',
    sources: [edge],
  },
  { id: 'empty', label: 'No spells', note: 'A quiet empty state without empty casting-source sections.', sources: [] },
];

export const sourceKindLabel: Record<SampleKind, string> = {
  'prepared-book': 'Spellbook',
  'prepared-tradition': 'Tradition',
  spontaneous: 'Repertoire',
  focus: 'Focus',
  innate: 'Innate',
  staff: 'Staff',
  wand: 'Wand',
  spellheart: 'Spellheart',
  ritual: 'Rituals',
};
export function isPrepared(source: SampleSource): boolean {
  return source.kind.startsWith('prepared');
}
export function entryName(entry: SampleEntry): string {
  return entry.label ?? entry.spell ?? (entry.missing ? 'Spell unavailable' : 'Unprepared slot');
}

/** Return the resource consumed by this specific entry, without conflating source, rank or item pools. */
export function entryResource(source: SampleSource, entry: SampleEntry): { key: string; cost: number } | null {
  if (entry.rank === 0 || source.kind === 'ritual') return null;
  if (source.kind === 'spontaneous') return { key: `rank-${entry.rank}`, cost: 1 };
  if (source.kind === 'focus') return { key: 'focus', cost: 1 };
  if (source.kind === 'staff') return { key: 'charges', cost: entry.rank };
  if (source.kind === 'wand') return { key: 'uses', cost: 1 };
  if (entry.pool) return { key: entry.pool, cost: 1 };
  return null;
}

/** Variable-action spells participate in every represented action-cost filter. */
export function matchesCost(spell: SampleSpell, cost: string): boolean {
  if (cost === 'all') return true;
  if (spell.cast === 'ONE-TO-THREE-ACTIONS') return ['1', '2', '3'].includes(cost);
  return (
    (
      { 'ONE-ACTION': '1', 'TWO-ACTIONS': '2', 'THREE-ACTIONS': '3', 'FREE-ACTION': '4', REACTION: '5' } as Record<
        string,
        string
      >
    )[spell.cast] === cost
  );
}

export function actionLabel(cast: string): string {
  return (
    (
      {
        'ONE-ACTION': '1 action',
        'TWO-ACTIONS': '2 actions',
        'THREE-ACTIONS': '3 actions',
        'ONE-TO-THREE-ACTIONS': '1 to 3 actions',
        'FREE-ACTION': 'Free action',
        REACTION: 'Reaction',
      } as Record<string, string>
    )[cast] ?? cast
  );
}
export function actionGlyph(cast: string): string {
  return (
    (
      { 'ONE-ACTION': '1', 'TWO-ACTIONS': '2', 'THREE-ACTIONS': '3', 'FREE-ACTION': '4', REACTION: '5' } as Record<
        string,
        string
      >
    )[cast] ?? ''
  );
}
