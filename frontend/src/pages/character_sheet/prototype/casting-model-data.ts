import { spellScenarios, type SampleSource, type SpellScenario } from './spell-study-data';

export type CastingSourceOptions = {
  staffCaster?: 'prepared' | 'spontaneous' | 'both';
  staffPrepared?: boolean;
  itemBroken?: boolean;
  affixedTo?: string | null;
  wandState?: 'used' | 'broken' | 'destroyed' | 'overcharged';
  signatures?: string[];
  restrictions?: Record<string, string>;
  slotChoices?: { value: string; label: string; rank: number }[];
};
export type CastingModelCase = {
  id: string;
  title: string;
  note: string;
  scenario: SpellScenario;
  options: Record<string, CastingSourceOptions>;
};

/** Isolated copies reuse the existing catalog and never mutate the earlier studies. */
function sample(id: string): SpellScenario {
  const scenario = spellScenarios.find((item) => item.id === id);
  if (!scenario) throw new Error(`Missing wireframe fixture: ${id}`);
  return structuredClone(scenario);
}

const prepared = sample('prepared');
const spontaneous = sample('spontaneous');
const tradition = sample('tradition');
const items = sample('items');
const staff = items.sources[0];
staff.name = 'Sample staff';
staff.entries.unshift({ id: 'staff-cantrip', spell: 'Light', rank: 0 }, { id: 'staff-rank-1', spell: 'Fear', rank: 1 });
const wands = items.sources.filter((source) => source.kind === 'wand');
const brokenWand = structuredClone(wands[0]);
brokenWand.id = 'wand-broken';
brokenWand.name = 'Damaged wand';
brokenWand.entries = brokenWand.entries.map((entry) => ({ ...entry, id: `${entry.id}-broken` }));
const overchargedWand = structuredClone(brokenWand);
overchargedWand.id = 'wand-overcharged';
overchargedWand.name = 'Repaired wand';
overchargedWand.entries = overchargedWand.entries.map((entry) => ({ ...entry, id: `${entry.id}-overcharged` }));
const destroyedWand = structuredClone(brokenWand);
destroyedWand.id = 'wand-destroyed';
destroyedWand.name = 'Destroyed wand';
destroyedWand.entries = destroyedWand.entries.map((entry) => ({ ...entry, id: `${entry.id}-destroyed` }));

/* This schematic deliberately labels its invented spell combination as a sample item. */
const spellheart = structuredClone(items.sources[3]);
spellheart.name = 'Sample spellheart';
spellheart.entries.push(
  { id: 'spellheart-daily-1', spell: 'Fireball', rank: 3, pool: 'fireball' },
  { id: 'spellheart-daily-2', spell: 'Invisibility', rank: 2, pool: 'invisibility' }
);
spellheart.pools = {
  fireball: { remaining: 1, max: 1, unit: 'daily uses' },
  invisibility: { remaining: 0, max: 1, unit: 'daily uses' },
};

/** A title identifies the UI case, not a complete legal character or official item loadout. */
function itemScenario(id: string, sources: SampleSource[]): SpellScenario {
  return { id, label: id, note: 'Illustrative item layout', sources };
}

const staffOptions: CastingSourceOptions = {
  staffCaster: 'spontaneous',
  staffPrepared: true,
  slotChoices: [
    { value: 'sorcerer-3', label: 'Sorcerer · Rank 3 · 2 slots left', rank: 3 },
    { value: 'sorcerer-4', label: 'Sorcerer · Rank 4 · 1 slot left', rank: 4 },
  ],
};
const mixed = sample('mixed');
mixed.sources.splice(1, 0, structuredClone(spontaneous.sources[0]));
mixed.sources.push(
  structuredClone(staff),
  structuredClone(spellheart),
  ...sample('innate').sources,
  ...sample('rituals').sources
);
const emptyStaff = structuredClone(staff);
emptyStaff.id = 'staff-unprepared';
emptyStaff.name = 'Unprepared staff';
emptyStaff.pools.charges.remaining = 0;
const exhausted = sample('spontaneous');
exhausted.sources[0].pools['rank-1'].remaining = 0;
const spentStaff = structuredClone(staff);
spentStaff.id = 'staff-spent';
spentStaff.name = 'Staff with no charges';
spentStaff.pools.charges.remaining = 0;
const damagedStaff = structuredClone(staff);
damagedStaff.id = 'staff-damaged';
damagedStaff.name = 'Broken staff';

export const castingModelCases: CastingModelCase[] = [
  {
    id: 'prepared',
    title: 'Prepared',
    note: 'Each preparation owns its Ready or Used state. Empty slots lead to Prepare.',
    scenario: prepared,
    options: { wizard: { restrictions: { 'wizard-3': 'School slot' } } },
  },
  {
    id: 'spontaneous',
    title: 'Spontaneous',
    note: 'One slot counter per rank. Signature spells expose eligible casting ranks in the detail view.',
    scenario: spontaneous,
    options: { bard: { signatures: ['bard-1'] } },
  },
  {
    id: 'tradition',
    title: 'Prepared from a tradition',
    note: 'The same preparation layout, with a tradition list instead of a private spellbook.',
    scenario: tradition,
    options: {},
  },
  {
    id: 'focus',
    title: 'Focus spells',
    note: 'One shared point pool. Cantrips stay free, and spell origins stay visible.',
    scenario: sample('focus'),
    options: {},
  },
  {
    id: 'innate',
    title: 'Innate spells',
    note: 'Limited uses sit beside the individual spell. At-will spells have no shared slot counter.',
    scenario: sample('innate'),
    options: {},
  },
  {
    id: 'rituals',
    title: 'Rituals',
    note: 'A reference collection, with room for casting time, cost, and participants in the detail view.',
    scenario: sample('rituals'),
    options: {},
  },
  {
    id: 'staff-prepared',
    title: 'Staff with prepared casting',
    note: 'One item charge pool. Extra charges belong in daily preparation, with an identified sacrificed slot.',
    scenario: itemScenario('staff-prepared', [staff]),
    options: { staff: { staffCaster: 'prepared', staffPrepared: true } },
  },
  {
    id: 'staff-spontaneous',
    title: 'Staff with spontaneous casting',
    note: 'Choose charges alone, or one charge plus an eligible slot from a named source.',
    scenario: itemScenario('staff-spontaneous', [staff]),
    options: { staff: staffOptions },
  },
  {
    id: 'wands',
    title: 'Wands',
    note: 'Separate items show Ready, Used, Broken, and Overcharged states. Overcharging has its own flow.',
    scenario: itemScenario('wands', [...wands, brokenWand, overchargedWand, destroyedWand]),
    options: {
      'wand-spare': { wandState: 'used' },
      'wand-broken': { wandState: 'broken' },
      'wand-overcharged': { wandState: 'overcharged' },
      'wand-destroyed': { wandState: 'destroyed' },
    },
  },
  {
    id: 'spellhearts',
    title: 'Spellhearts',
    note: 'Sample item: an unlimited cantrip and two independent daily activations. No universal spellheart pool.',
    scenario: itemScenario('spellhearts', [spellheart]),
    options: { spellheart: { affixedTo: 'Weapon (sample)' } },
  },
  {
    id: 'mixed',
    title: 'A mixed spell page',
    note: 'Prepared and spontaneous sources, focus, items, innate spells, and rituals share one visual system.',
    scenario: mixed,
    options: {
      bard: { signatures: ['bard-1'] },
      staff: {
        staffCaster: 'both',
        staffPrepared: true,
        slotChoices: [{ value: 'bard-2', label: 'Bard · Rank 2 · 2 slots left', rank: 2 }],
      },
      spellheart: { affixedTo: 'Weapon (sample)' },
    },
  },
  {
    id: 'unprepared-staff',
    title: 'Staff before preparation',
    note: 'An unprepared item remains identifiable, with a clear path to daily preparation.',
    scenario: itemScenario('unprepared-staff', [emptyStaff]),
    options: { 'staff-unprepared': { staffCaster: 'prepared', staffPrepared: false } },
  },
  {
    id: 'exhausted',
    title: 'No rank 1 slots left',
    note: 'Spells remain readable when a pool is empty. Other ranks retain their own resources.',
    scenario: exhausted,
    options: {},
  },
  {
    id: 'homebrew',
    title: 'Long names / missing content',
    note: 'Names wrap, and missing references remain distinct from empty preparation slots.',
    scenario: sample('homebrew'),
    options: {},
  },
  {
    id: 'empty',
    title: 'No spells',
    note: 'No empty sections for casting types the character does not have.',
    scenario: sample('empty'),
    options: {},
  },
  {
    id: 'item-states',
    title: 'Empty and broken staves',
    note: 'Zero charges still allow cantrips from a prepared staff. Broken items cannot cast.',
    scenario: itemScenario('item-states', [spentStaff, damagedStaff]),
    options: { 'staff-spent': { staffPrepared: true }, 'staff-damaged': { staffPrepared: true, itemBroken: true } },
  },
  {
    id: 'unaffixed',
    title: 'Spellheart before attachment',
    note: 'The attachment requirement stays visible before a spellheart can be activated.',
    scenario: itemScenario('unaffixed', [spellheart]),
    options: { spellheart: { affixedTo: null } },
  },
  {
    id: 'broken-heart',
    title: 'Broken spellheart',
    note: 'Stored uses do not make a broken item usable.',
    scenario: itemScenario('broken-heart', [spellheart]),
    options: { spellheart: { affixedTo: 'Weapon (sample)', itemBroken: true } },
  },
];

export const castingModelGroups = [
  { value: 'casting', label: 'Prepared / spontaneous', cases: ['prepared', 'spontaneous'] },
  { value: 'preparation', label: 'Preparation types', cases: ['prepared', 'tradition'] },
  { value: 'other', label: 'Focus / innate / rituals', cases: ['focus', 'innate', 'rituals'] },
  {
    value: 'items',
    label: 'Staves / wands / spellhearts',
    cases: ['staff-prepared', 'staff-spontaneous', 'wands', 'spellhearts'],
  },
  { value: 'mixed', label: 'Mixed character', cases: ['mixed'] },
  {
    value: 'states',
    label: 'Empty / exhausted / missing',
    cases: ['unprepared-staff', 'exhausted', 'homebrew', 'empty'],
  },
  { value: 'item-states', label: 'Item readiness / damage', cases: ['item-states', 'unaffixed', 'broken-heart'] },
];
