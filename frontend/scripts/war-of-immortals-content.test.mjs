import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const readPatchArray = async (migration, delimiter) => {
  const sql = await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8');
  return JSON.parse(sql.split(delimiter)[1]);
};

const provenance = await readPatchArray('20260927000000_war_of_immortals_provenance.sql', '$patches$');
const slotPatches = await readPatchArray('20260927010000_war_of_immortals_class_rules.sql', '$slot_patches$');
const links = await readPatchArray('20260927020000_war_of_immortals_links.sql', '$patches$');
const fields = await readPatchArray('20260927030000_war_of_immortals_fields.sql', '$patches$');
const errata = await readPatchArray('20260927070000_war_of_immortals_errata.sql', '$patches$');
const classArchetypeCitations = await readPatchArray(
  '20260927080000_war_of_immortals_class_archetype_urls.sql',
  '$citations$'
);
const apparitionSenseMigration = await readFile(
  new URL('../../supabase/migrations/20260927100000_war_of_immortals_apparition_sense.sql', import.meta.url),
  'utf8'
);

test('AoN citations target distinct existing War of Immortals records without overwriting metadata', async () => {
  assert.equal(provenance.length, 27);
  const keys = provenance.map(({ table, id }) => `${table}:${id}`);
  assert.equal(new Set(keys).size, keys.length);
  const rows = await readContentRows(provenance.map(({ table, id }) => ({ table, id })));
  for (const patch of provenance) {
    const row = rows.find((entry) => entry.table === patch.table && entry.row.id === patch.id)?.row;
    assert.ok(row, `${patch.table}:${patch.id}`);
    assert.equal(row.name, patch.name);
    assert.equal(row.content_source_id, 400);
    assert.equal(row.meta_data?.source, undefined);
    const url = new URL(patch.cite.url);
    assert.equal(url.hostname, '2e.aonprd.com');
    assert.match(url.pathname, /^\/(Feats|Spells|Equipment|Archetypes|HuntersEdge|Instincts|Rackets)\.aspx$/);
    assert.match(url.search, /^\?ID=\d+$/);
    if (patch.cite.book) {
      assert.equal(patch.cite.book, 'War of Immortals');
      assert.match(patch.cite.page, /^\d+$/);
    }
  }
});

test('class-archetype citations target exact uncited War of Immortals records', async () => {
  assert.equal(classArchetypeCitations.length, 4);
  const dump = await readFile(new URL('../../data/data.sql', import.meta.url), 'utf8');
  const section = dump.split('COPY public.class_archetype ')[1].split('\n\\.')[0];
  const [header, ...entries] = section.split('\n');
  const columns = header.match(/\((.*?)\) FROM stdin/)[1].split(', ');
  const column = (cells, name) => cells[columns.indexOf(name)];
  for (const citation of classArchetypeCitations) {
    const matches = entries.filter((entry) => entry.startsWith(`${citation.id}\t`));
    assert.equal(matches.length, 1, citation.name);
    const cells = matches[0].split('\t');
    assert.equal(column(cells, 'name'), citation.name);
    assert.equal(Number(column(cells, 'class_id')), citation.class_id);
    assert.equal(Number(column(cells, 'content_source_id')), 400);
    assert.equal(column(cells, 'meta_data'), '\\N');
    const url = new URL(citation.url);
    assert.equal(url.hostname, '2e.aonprd.com');
    assert.equal(url.pathname, '/Archetypes.aspx');
    assert.match(url.search, /^\?ID=\d+$/);
    assert.match(citation.page, /^\d+$/);
  }
});

test('Animist prepared spell slots match the published 1–20 progression after six guarded cells', async () => {
  const [{ row }] = await readContentRows([{ table: 'ability_block', id: 38637 }]);
  assert.equal(row.name, 'Animist & Apparition Spellcasting');
  const operation = row.operations.find(({ id }) => id === '8411d1a2-a480-468e-a45c-d8f6fa10a0d2');
  assert.equal(operation.type, 'giveSpellSlot');
  assert.equal(operation.data.castingSource, 'ANIMIST');
  const original = structuredClone(operation.data.slots);
  const slots = structuredClone(original);
  for (const patch of slotPatches) {
    const existing = slots.filter(({ lvl, rank }) => lvl === patch.lvl && rank === patch.rank);
    assert.equal(existing.length, patch.before === undefined ? 0 : 1);
    if (existing.length) {
      assert.equal(existing[0].amt, patch.before);
      existing[0].amt = patch.after;
    } else slots.push({ lvl: patch.lvl, rank: patch.rank, amt: patch.after });
  }
  assert.deepEqual(operation.data.slots, original, 'the checked-in source fixture is not modified');
  const expected = [
    '100000000',
    '200000000',
    '210000000',
    '220000000',
    '221000000',
    '222000000',
    '222100000',
    '222200000',
    '222210000',
    '222220000',
    '222221000',
    '222222000',
    '222222100',
    '222222200',
    '222222210',
    '222222220',
    '222222221',
    '222222222',
    '222222222',
    '222222222',
  ];
  for (let level = 1; level <= 20; level++) {
    const actual = Array.from({ length: 9 }, (_, index) => {
      const matches = slots.filter(({ lvl, rank }) => lvl === level && rank === index + 1);
      assert.ok(matches.length <= 1, `duplicate level ${level} rank ${index + 1}`);
      return matches[0]?.amt ?? 0;
    }).join('');
    assert.equal(actual, expected[level - 1], `level ${level}`);
  }
});

test('Echo of Lost Moments grants the rank-five spell, changing only that grant', async () => {
  const [{ row }, { row: spell }] = await readContentRows([
    { table: 'ability_block', id: 38709 },
    { table: 'spell', id: 4679 },
  ]);
  assert.equal(spell.name, 'Illusory Scene');
  assert.equal(spell.rank, 5);
  const original = structuredClone(row);
  const conditional = row.operations.find(({ id }) => id === '2cc5d640-ccd6-4532-a42c-eb00b0de6cb6');
  const grant = conditional.data.trueOperations.find(({ id }) => id === 'e57b1671-6485-4b1a-9d15-bc9eaa8d953f');
  assert.deepEqual(grant.data, { type: 'NORMAL', castingSource: 'ANIMIST_APPARITION', rank: 1, spellId: 4677 });
  grant.data.spellId = 4679;
  grant.data.rank = 5;
  const expected = structuredClone(original);
  const expectedGrant = expected.operations.find(({ id }) => id === conditional.id).data.trueOperations[0];
  expectedGrant.data.spellId = 4679;
  expectedGrant.data.rank = 5;
  assert.deepEqual(row, expected);
});

test('Apparition Sense grants the in-book sense rather than the playtest version', async () => {
  const rows = await readContentRows([
    { table: 'ability_block', id: 38742 },
    { table: 'ability_block', id: 38723 },
    { table: 'ability_block', id: 28396 },
    { table: 'content_source', id: 400 },
  ]);
  const feature = rows.find(({ row }) => row.id === 38742).row;
  const currentSight = rows.find(({ row }) => row.id === 38723).row;
  const playtestSight = rows.find(({ row }) => row.id === 28396).row;
  const source = rows.find(({ row }) => row.id === 400).row;
  assert.equal(feature.name, 'Apparition Sense');
  assert.equal(feature.type, 'feat');
  assert.equal(feature.content_source_id, 400);
  assert.equal(feature.operations.length, 1);
  assert.equal(playtestSight.content_source_id, 85);
  assert.equal(currentSight.name, 'Apparition Sight (imprecise 30 ft)');
  assert.equal(currentSight.type, 'sense');
  assert.equal(currentSight.content_source_id, 400);
  assert.ok(!source.required_content_sources.includes(85));
  assert.deepEqual(
    currentSight.operations.map(({ type, data }) => ({ type, data })),
    playtestSight.operations.map(({ type, data }) => ({ type, data }))
  );
  assert.deepEqual(feature.operations[0], {
    id: '3b0d3ea9-eddf-4c84-8b10-80a25e6f3745',
    type: 'giveAbilityBlock',
    data: { type: 'sense', abilityBlockId: 28396 },
  });
  assert.match(
    apparitionSenseMigration,
    /operations\[1\] = jsonb_set\(operation, '\{data,abilityBlockId\}', '38723'::jsonb/
  );
  assert.match(apparitionSenseMigration, /status->>'state' = 'PENDING'/);
});

test('broken links are repaired at their exact occurrences', async () => {
  const ids = [...new Set(links.map(({ id }) => id))];
  const rows = (await readContentRows(ids.map((id) => ({ table: 'ability_block', id })))).map(({ row }) => row);
  for (const patch of links) {
    const row = rows.find(({ id }) => id === patch.id);
    assert.equal(row.name, patch.name);
    assert.equal(row.content_source_id, 400);
    const original = patch.field === 'operations' ? JSON.stringify(row.operations) : row.description;
    assert.equal(original.split(patch.before).length - 1, patch.count, `${row.name}: ${patch.before}`);
    const replaced = original.replaceAll(patch.before, patch.after);
    assert.ok(replaced.includes(patch.after));
    assert.ok(!replaced.includes(patch.before));
    if (patch.field === 'operations') assert.doesNotThrow(() => JSON.parse(replaced));
  }
});

test('printed-book fields differ from their exact old values and leave unrelated data alone', async () => {
  const rows = await readContentRows(fields.map(({ table, id }) => ({ table, id })));
  for (const patch of fields) {
    const original = rows.find(({ table, row }) => table === patch.table && row.id === patch.id)?.row;
    assert.ok(original);
    assert.equal(original.content_source_id, 400);
    assert.equal(original[patch.field], patch.before);
    if (patch.name) assert.equal(original.name, patch.name);
    const changed = { ...original, [patch.field]: patch.after };
    const expected = structuredClone(original);
    expected[patch.field] = patch.after;
    assert.deepEqual(changed, expected);
  }
});

test('published War of Immortals errata and prerequisites change only the stated fields', async () => {
  const ids = [...new Set(errata.map(({ id }) => id))];
  const rows = (await readContentRows(ids.map((id) => ({ table: 'ability_block', id })))).map(({ row }) => row);
  for (const patch of errata) {
    const row = rows.find(({ id }) => id === patch.id);
    assert.equal(row.name, patch.name);
    assert.equal(row.content_source_id, 400);
    if (patch.replace) {
      assert.equal(row[patch.field].split(patch.before).length - 1, 1);
      assert.ok(!row[patch.field].includes(patch.after));
    } else assert.deepEqual(row[patch.field], patch.before);
  }
});

test('Bloodrager Rage damage follows weapon specialization in the real character engine', async () => {
  const sourceIds = [1, 3, 256, 400];
  const tables = {
    abilityBlocks: 'ability_block',
    classes: 'class',
    traits: 'trait',
    ancestries: 'ancestry',
    backgrounds: 'background',
    languages: 'language',
    items: 'item',
    spells: 'spell',
    archetypes: 'archetype',
    versatileHeritages: 'versatile_heritage',
  };
  const rows = await readContentRows(Object.values(tables).map((table) => ({ table, sourceIds })));
  const content = Object.fromEntries(
    Object.entries(tables).map(([key, table]) => [
      key,
      rows.filter((entry) => entry.table === table).map((entry) => entry.row),
    ])
  );
  content.sources = (await readContentRows(sourceIds.map((id) => ({ table: 'content_source', id })))).map(
    (entry) => entry.row
  );
  content.classArchetypes = [];
  content.defaultSources = { PAGE: sourceIds, INFO: sourceIds };
  const bloodrager = content.abilityBlocks.find(({ id }) => id === 51667);
  const operation = bloodrager.operations.find(({ id }) => id === '81b9d86d-939f-4ca1-a5b8-fa75a7d8a4a2');
  assert.equal(operation.data.conditions[1].name, 'WEAPON_SPECIALIZATION_GREATER');
  assert.equal(operation.data.conditions[1].value, '');
  operation.data.conditions[1].value = 'TRUE';
  const engine = await createOperationEngine();
  engine.setFixtures(rows);
  try {
    for (const [level, expected] of [
      [1, 2],
      [7, 4],
      [15, 8],
    ]) {
      const character = {
        id: 1,
        level,
        hp_current: 20,
        details: { class: content.classes.find(({ id }) => id === 108), conditions: [] },
        inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
        content_sources: { enabled: sourceIds },
        meta_data: { reset_hp: false },
        operation_data: { selections: {} },
        options: { custom_operations: true, ignore_bulk_limit: true },
        custom_operations: [
          { id: 'bloodrager-test', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: 51667 } },
        ],
      };
      const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
      assert.deepEqual(result.errors, []);
      assert.equal(result.store.variables.RAGE_DAMAGE.value, expected, `level ${level}`);
    }
  } finally {
    await engine.cleanup();
  }
});
