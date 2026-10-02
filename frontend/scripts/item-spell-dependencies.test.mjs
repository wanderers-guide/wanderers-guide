import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const { QueryClient, QueryObserver } = require('@tanstack/react-query');
const directory = await mkdtemp(join(tmpdir(), 'wg-item-spell-dependencies-'));
after(() => rm(directory, { recursive: true, force: true }));

// Substitute remote content and notifications, retaining the real spell parser.
const contentSource = await readFile(join(root, 'src/process/content/content-store.ts'), 'utf8');
const contentExports = [...contentSource.matchAll(/export (?:async )?function ([A-Za-z0-9_]+)/g)].map(
  (match) => match[1]
);
const output = join(directory, 'item-spells.mjs');
await build({
  absWorkingDir: root,
  stdin: {
    contents: `export {detectSpells, detectSpellheartSpells} from '@spells/spell-utils'; export * from '@spells/item-spell-dependencies';`,
    resolveDir: root,
    loader: 'ts',
  },
  tsconfig: join(root, 'tsconfig.json'),
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
  plugins: [
    {
      name: 'item-spell-system-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /^@content\/content-store$/ }, () => ({ path: 'content', namespace: 'boundary' }));
        builder.onResolve({ filter: /^@utils\/notifications$/ }, () => ({
          path: 'notifications',
          namespace: 'boundary',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'boundary' }, ({ path }) => ({
          contents:
            path === 'content'
              ? contentExports
                  .map((name) =>
                    name === 'fetchContent'
                      ? 'export function fetchContent(...args) { return globalThis.__itemSpellFetch(...args); }'
                      : `export function ${name}() { return []; }`
                  )
                  .join('\n')
              : 'export function displayError() {}',
          loader: 'ts',
        }));
      },
    },
  ],
}).then((bundle) => writeFile(output, bundle.outputFiles[0].text));
const {
  detectSpells,
  detectSpellheartSpells,
  getInventorySpellIds,
  getMissingSpellIds,
  getExplicitSpellQueryOptions,
  mergeSpellDependencies,
  filterSpellCatalog,
} = await import(pathToFileURL(output));

const petalStorm = { id: 8999, name: 'Petal Storm', rank: 4, cast: 'TWO-ACTIONS', content_source_id: 842 };
const elementalAbsorption = {
  id: 8867,
  name: 'Elemental Absorption',
  rank: 3,
  cast: 'TWO-ACTIONS',
  content_source_id: 842,
};
const localSpell = { id: 1, name: 'Local spell', rank: 1, cast: 'ONE-ACTION', content_source_id: 16 };
const boreal = {
  id: 'boreal',
  is_equipped: true,
  is_formula: false,
  is_invested: false,
  container_contents: [],
  item: {
    id: 11794,
    name: 'Boreal Staff',
    group: 'WEAPON',
    traits: [1546],
    meta_data: {},
    description: '* **3rd** [elemental absorption](link_spell_8867) ([water](link_trait_1584) only)',
  },
};
const brightbloom = {
  id: 'brightbloom',
  is_equipped: false,
  is_formula: false,
  is_invested: false,
  container_contents: [],
  item: {
    id: 11814,
    name: 'Brightbloom Posy (Major)',
    group: 'GENERAL',
    traits: [2570],
    meta_data: {},
    description: '**Effect** You cast 6th-rank [petal storm](link_spell_8999).',
  },
};

test('Treasure Vault item references recover their exact spells without enabling Impossible Magic for selection', () => {
  // With only source16 loaded, the original detector omits both missing dependencies.
  assert.deepEqual(detectSpells(boreal.item.description, [localSpell]), []);
  assert.deepEqual(detectSpells(brightbloom.item.description, [localSpell], true), []);
  const refs = getInventorySpellIds([boreal, brightbloom]);
  assert.deepEqual(refs, [8867, 8999]);
  const missing = getMissingSpellIds([localSpell], refs);
  const itemCatalog = mergeSpellDependencies([localSpell], [elementalAbsorption, petalStorm], missing);
  assert.deepEqual(
    detectSpells(boreal.item.description, itemCatalog).map(({ spell, rank }) => [spell.id, rank]),
    [[8867, 3]]
  );
  assert.deepEqual(
    detectSpells(brightbloom.item.description, itemCatalog, true).map(({ spell, rank }) => [spell.id, rank]),
    [[8999, 6]]
  );
  assert.deepEqual(
    [localSpell].map((spell) => spell.id),
    [1]
  );
});

test('Major Brightbloom Posy casts its explicitly sixth-rank Petal Storm without changing the catalog spell', () => {
  const text =
    '**Activate** Cast a Spell; **Frequency** once per day; **Effect** You cast 6th-rank [petal storm](link_spell_8999).';
  const detected = detectSpells(text, [petalStorm], true);
  assert.equal(detected.length, 1);
  assert.equal(detected[0].rank, 6);
  assert.equal(detected[0].spell.rank, 6);
  assert.equal(petalStorm.rank, 4);
});

test('spellhearts expose each casting activation, not armor benefits or descriptive comparisons', () => {
  const speakWithPlants = { ...localSpell, id: 4848, name: 'Speak With Plants', rank: 3 };
  const tangleVine = { ...localSpell, id: 4888, name: 'Tangle Vine', rank: 0 };
  const soothingBlossoms = { ...localSpell, id: 8836, name: 'Soothing Blossoms', rank: 2 };
  const burningBlossoms = { ...localSpell, id: 5137, name: 'Burning Blossoms', rank: 7 };
  const text = [
    '**Armor** You speak with flowers, as [speak with plants](link_spell_4848).',
    '**Activate** [Cast a Spell](link_action_19611); **Effect** You cast [tangle vine](link_spell_4888).',
    '**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day; **Effect** You cast [soothing blossoms](link_spell_8836).',
    '**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day; **Effect** You cast 6th-rank [petal storm](link_spell_8999). This resembles [speak with plants](link_spell_4848).',
    '**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day; **Effect** You cast [burning blossoms](link_spell_5137).',
  ].join('\n\n');
  const catalog = [speakWithPlants, tangleVine, soothingBlossoms, petalStorm, burningBlossoms];
  assert.deepEqual(
    detectSpellheartSpells(text, catalog).map(({ spell, rank }) => [spell.id, spell.rank, rank]),
    [
      [4888, 0, 0],
      [8836, 2, 2],
      [8999, 6, 6],
      [5137, 7, 7],
    ]
  );
  assert.deepEqual(
    detectSpellheartSpells(text, [petalStorm]).map(({ spell, rank }) => [spell.id, rank]),
    [[8999, 6]]
  );
  assert.equal(petalStorm.rank, 4);
});

test('spellheart casting handles legacy multiline activations and shared alternative ranks locally', () => {
  const harm = { ...localSpell, id: 4653, name: 'Harm', rank: 1 };
  const heal = { ...localSpell, id: 4656, name: 'Heal', rank: 1 };
  const text = [
    '**Activate** Cast a Spell\n\n**Effect** You cast 4th-level *[harm](link_spell_4653)* or *[heal](link_spell_4656)*.',
    '**Activate** [Cast a Spell;](link_action_19611) **Effect** You cast [heal](link_spell_4656).',
    '**Activate** Cast a Spell; **Effect** You cast a 3rd-rank [harm](link_spell_4653) or 6th-rank [petal storm](link_spell_8999).',
  ].join('\n\n');
  assert.deepEqual(
    detectSpellheartSpells(text, [harm, heal, petalStorm]).map(({ spell, rank }) => [spell.id, rank]),
    [
      [4653, 4],
      [4656, 4],
      [4656, 1],
      [4653, 3],
      [8999, 6],
    ]
  );
  assert.deepEqual(
    detectSpellheartSpells(text, [heal]).map(({ spell, rank }) => [spell.id, rank]),
    [
      [4656, 4],
      [4656, 1],
    ]
  );
  assert.equal(heal.rank, 1);
});

test('spellheart passive references and noncasting activations are never presented as spells', () => {
  const text = [
    '**Armor** After you cast a spell, the item casts [petal storm](link_spell_8999) on you.',
    '**Activate** Interact; **Effect** You gain a benefit as [petal storm](link_spell_8999).',
    '**Activate** Interact; **Requirements** You have cast [petal storm](link_spell_8999).',
  ].join('\n\n');
  assert.deepEqual(detectSpellheartSpells(text, [petalStorm]), []);
});

test('headerless spellhearts preserve the first available linked spell and its explicit rank', () => {
  const directCast = 'You cast 6th-rank [petal storm](link_spell_8999). Then [elemental absorption](link_spell_8867).';
  assert.deepEqual(
    detectSpellheartSpells(directCast, [petalStorm, elementalAbsorption]).map(({ spell, rank }) => [
      spell.id,
      spell.rank,
      rank,
    ]),
    [[8999, 6, 6]]
  );
  const bareLinks = '[petal storm](link_spell_8999), [elemental absorption](link_spell_8867)';
  assert.deepEqual(
    detectSpellheartSpells(bareLinks, [petalStorm, elementalAbsorption]).map(({ spell, rank }) => [spell.id, rank]),
    [[8999, 4]]
  );
  assert.deepEqual(
    detectSpellheartSpells(bareLinks, [elementalAbsorption]).map(({ spell, rank }) => [spell.id, rank]),
    [[8867, 3]]
  );
  assert.deepEqual(detectSpellheartSpells(bareLinks, []), []);
  assert.equal(petalStorm.rank, 4);
});

test('existing book spellheart activation formats retain every linked cast spell', async () => {
  // The sanitized dump is an existing content fixture, not a production read.
  const dump = await readFile(join(root, '../data/data.sql'), 'utf8');
  const itemCopy = dump.match(/COPY public.item \((.*?)\) FROM stdin;\n([\s\S]*?)\n\\\./);
  assert.ok(itemCopy);
  const columns = itemCopy[1].split(', ').map((column) => column.replaceAll('"', ''));
  let spellheartCount = 0;
  for (const line of itemCopy[2].split('\n')) {
    const values = line.split('\t');
    const item = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    if (!/(?:\{|,)2570(?:,|\})/.test(item.traits ?? '')) continue;
    spellheartCount++;
    const description = item.description.replace(/\\n/g, '\n');
    const activationStart = description.search(/^\*\*Activate\*\*/im);
    assert.notEqual(activationStart, -1, `${item.name} activation header`);
    // Existing official fixture rows place only casting spell links after these headers.
    const expected = [
      ...new Set(
        [...description.slice(activationStart).matchAll(/\(link_spell_(\d+)\)/g)].map((match) => Number(match[1]))
      ),
    ].sort((a, b) => a - b);
    const catalog = expected.map((id) => ({ ...localSpell, id }));
    const actual = [...new Set(detectSpellheartSpells(description, catalog).map(({ spell }) => spell.id))].sort(
      (a, b) => a - b
    );
    assert.deepEqual(actual, expected, `${item.id} ${item.name}`);
  }
  assert.ok(spellheartCount > 0);
});

test('item reference eligibility matches existing panels and does not scan ordinary items or containers', () => {
  const wand = {
    ...brightbloom,
    id: 'wand',
    item: { ...brightbloom.item, traits: [1665], description: '[elemental absorption](link_spell_8867)' },
  };
  const ordinary = {
    ...brightbloom,
    id: 'ordinary',
    item: { ...brightbloom.item, traits: [], description: '[other spell](link_spell_7001)' },
  };
  const inheritedWand = {
    ...wand,
    id: 'inherited-wand',
    item: { ...wand.item, traits: [], meta_data: { base_item_content: { traits: [1665] } } },
  };
  assert.deepEqual(getInventorySpellIds([boreal, brightbloom, wand, inheritedWand, ordinary]), [8867, 8999]);
  assert.deepEqual(getInventorySpellIds([{ ...boreal, is_equipped: false }]), []);
  assert.deepEqual(
    getInventorySpellIds([
      { ...brightbloom, is_formula: true },
      { ...wand, is_formula: true },
    ]),
    [8867, 8999]
  );
  assert.deepEqual(getInventorySpellIds([{ ...ordinary, container_contents: [boreal, brightbloom] }]), []);
  assert.deepEqual(getInventorySpellIds([brightbloom]), [8999]);
  assert.equal(brightbloom.is_invested, false);
  assert.equal(brightbloom.is_equipped, false);
});

test('dependency reads are unique exact IDs and source-enabled rows win over returned duplicates', () => {
  const current = { ...petalStorm, name: 'Current catalog Petal Storm' };
  const catalog = [localSpell, current];
  assert.deepEqual(getMissingSpellIds(catalog, [8999, 8867, 8867, -1, 0]), [8867]);
  assert.deepEqual(
    mergeSpellDependencies(catalog, [petalStorm, elementalAbsorption, elementalAbsorption, { id: 90 }], [8867]),
    [localSpell, current, elementalAbsorption]
  );
  assert.equal(mergeSpellDependencies(catalog, undefined, [8867]), catalog);
  assert.equal(mergeSpellDependencies(catalog, [elementalAbsorption], []), catalog);
  assert.deepEqual(catalog, [localSpell, current]);
});

test('search and action filters combine for delayed item spells and clear without changing the catalog', () => {
  const catalog = [localSpell, elementalAbsorption, petalStorm];
  const traits = () => ['wood'];
  assert.deepEqual(filterSpellCatalog(catalog, ' PETAL ', 'ALL', traits), [petalStorm]);
  assert.deepEqual(filterSpellCatalog(catalog, '', 'TWO-ACTIONS', traits), [elementalAbsorption, petalStorm]);
  assert.deepEqual(filterSpellCatalog(catalog, 'petal', 'TWO-ACTIONS', traits), [petalStorm]);
  assert.deepEqual(filterSpellCatalog(catalog, 'petal', 'ONE-ACTION', traits), []);
  assert.deepEqual(filterSpellCatalog(catalog, 'wood', 'TWO-ACTIONS', traits), [elementalAbsorption, petalStorm]);
  assert.equal(filterSpellCatalog(catalog, '', 'ALL', traits), catalog);
});

test('explicit ranks stay local to their spell and preserve normal, legacy, wand and staff parsing', () => {
  const text =
    '**Effect** Cast 6th-rank *[petal storm](link_spell_8999)*.\n\n**Effect** Cast [elemental absorption](link_spell_8867).';
  assert.deepEqual(
    detectSpells(text, [petalStorm, elementalAbsorption], true).map(({ spell, rank }) => [spell.id, spell.rank, rank]),
    [
      [8999, 6, 6],
      [8867, 3, 3],
    ]
  );
  assert.equal(detectSpells('Cast 6th-level [petal storm](link_spell_8999).', [petalStorm], true)[0].rank, 6);
  assert.equal(detectSpells('Cast 10th-rank [petal storm](link_spell_8999).', [petalStorm], true)[0].rank, 10);
  assert.equal(detectSpells('Lasts 6 rounds. Cast [petal storm](link_spell_8999).', [petalStorm], true)[0].rank, 4);
  assert.equal(detectSpells('Cast 11th-rank [petal storm](link_spell_8999).', [petalStorm], true)[0].rank, 4);
  assert.equal(detectSpells('A regular wand casts [petal storm](link_spell_8999).', [petalStorm], true)[0].rank, 4);
  assert.deepEqual(
    detectSpells(
      '* **3rd** [elemental absorption](link_spell_8867)\n* **6th** [elemental absorption](link_spell_8867)',
      [elementalAbsorption]
    ).map(({ spell, rank }) => [spell.id, spell.rank, rank]),
    [
      [8867, 3, 3],
      [8867, 6, 6],
    ]
  );
  assert.equal(petalStorm.rank, 4);
  assert.equal(elementalAbsorption.rank, 3);
});

const baseScope = {
  actorId: 'actor-a',
  entityId: 1,
  storeId: 'CHARACTER',
  infoSources: 'public',
  pageSources: '16',
  ids: [8867],
};
const settled = () => new Promise((resolve) => setImmediate(resolve));

test('query ownership, entity, source and inventory changes cannot publish late dependency rows', async (t) => {
  for (const [name, change] of [
    ['account', { actorId: 'actor-b' }],
    ['entity', { entityId: 2 }],
    ['store', { storeId: 'COMPANION' }],
    ['information sources', { infoSources: 'public-and-owned' }],
    ['enabled sources', { pageSources: '16,842' }],
    ['inventory references', { ids: [8999] }],
  ])
    await t.test(name, async () => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 60000 } },
      });
      const pending = [];
      globalThis.__itemSpellFetch = (type, data) => new Promise((resolve) => pending.push({ type, data, resolve }));
      const observer = new QueryObserver(client, getExplicitSpellQueryOptions(baseScope));
      const unsubscribe = observer.subscribe(() => {});
      assert.deepEqual(
        pending.map(({ type, data }) => [type, data]),
        [['spell', { id: [8867] }]]
      );
      const currentScope = { ...baseScope, ...change };
      observer.setOptions(getExplicitSpellQueryOptions(currentScope));
      assert.equal(pending.length, 2);
      pending[0].resolve([elementalAbsorption]);
      await settled();
      assert.equal(observer.getCurrentResult().data, undefined);
      const current =
        currentScope.ids[0] === 8999 ? petalStorm : { ...elementalAbsorption, name: 'Current scoped spell' };
      pending[1].resolve([current]);
      await settled();
      assert.deepEqual(observer.getCurrentResult().data, [current]);
      unsubscribe();
      observer.destroy();
      client.clear();
    });
});

test('removing the last item clears its supplement immediately even when its read completes later', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  let finish;
  globalThis.__itemSpellFetch = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const observer = new QueryObserver(client, getExplicitSpellQueryOptions(baseScope));
  const unsubscribe = observer.subscribe(() => {});
  observer.setOptions(getExplicitSpellQueryOptions({ ...baseScope, ids: [] }));
  assert.equal(observer.getCurrentResult().data, undefined);
  assert.equal(getExplicitSpellQueryOptions({ ...baseScope, ids: [] }).enabled, false);
  assert.equal(mergeSpellDependencies([localSpell], [elementalAbsorption], [])[0], localSpell);
  finish([elementalAbsorption]);
  await settled();
  assert.equal(observer.getCurrentResult().data, undefined);
  unsubscribe();
  observer.destroy();
  client.clear();
});

test('a failed optional dependency read leaves source-enabled spells available without adding rows', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  globalThis.__itemSpellFetch = async () => {
    throw new Error('Offline');
  };
  const observer = new QueryObserver(client, getExplicitSpellQueryOptions(baseScope));
  const unsubscribe = observer.subscribe(() => {});
  await settled();
  assert.equal(observer.getCurrentResult().isError, true);
  assert.equal(mergeSpellDependencies([localSpell], observer.getCurrentResult().data, [8867])[0], localSpell);
  unsubscribe();
  observer.destroy();
  client.clear();
});
