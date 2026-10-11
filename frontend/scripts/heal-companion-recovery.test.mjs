import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { CONTENT_SCHEMAS } from './content-schemas.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const sql = await readFile(
  new URL('../../supabase/migrations/20261011000000_restore_heal_companion.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(sql.split('$heal_recovery_spec$')[1]);
let engine;
let fixtures;
let content;

before(async () => {
  // Use the existing exact native dependencies, never a production character.
  fixtures = await readContentRows([
    { table: 'spell', id: 4977 },
    { table: 'trait', id: 1344 },
  ]);
  fixtures.push({ table: 'ability_block', row: structuredClone(spec.row) });
  engine = await createOperationEngine({ renderSpellDrawer: true });
  engine.setFixtures(fixtures);
  content = {
    abilityBlocks: [spec.row],
    spells: fixtures.filter(({ table }) => table === 'spell').map(({ row }) => row),
    traits: fixtures.filter(({ table }) => table === 'trait').map(({ row }) => row),
    items: [],
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    sources: [],
    defaultSources: { PAGE: [1, 14], INFO: [1, 14] },
  };
});
after(async () => engine?.cleanup());

const calculate = () =>
  engine._executeCharacterOperations({
    character: {
      id: 1,
      level: 1,
      details: {},
      inventory: { items: [] },
      operation_data: { selections: {} },
      options: { custom_operations: true },
      custom_operations: [
        { id: 'saved-legacy-feat', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: 22108 } },
      ],
    },
    content,
    context: 'CHARACTER-SHEET',
  });

test('recovered whole row passes the actual ability and operation schemas without changing native identity', () => {
  const parsed = CONTENT_SCHEMAS['ability-block'].parse(spec.row);
  assert.deepEqual(parsed.operations, spec.row.operations);
  assert.deepEqual(parsed.meta_data, spec.row.meta_data);
  assert.equal(parsed.id, 22108);
  // The frontend ability schema intentionally omits the database-only UUID.
  assert.equal(spec.row.uuid, 7476666523704164);
  assert.equal(spec.row.meta_data.deprecated, true);
  for (const fixture of fixtures.filter(({ table }) => table !== 'ability_block'))
    CONTENT_SCHEMAS[fixture.table].parse(fixture.row);
});

test('missing saved ID is a red-capable control, then restoration returns the exact ranger grants', async () => {
  const before = structuredClone(content);
  before.abilityBlocks = [];
  engine.setFixtures(fixtures.filter(({ table }) => table !== 'ability_block'));
  content = before;
  const missing = await calculate();
  assert.deepEqual(missing.store.variables.FEAT_IDS.value, []);
  assert.deepEqual(missing.store.variables.SPELL_IDS.value, []);

  engine.setFixtures(fixtures);
  content.abilityBlocks = [spec.row];
  const restored = await calculate();
  assert.deepEqual(restored.errors, []);
  assert.deepEqual(restored.store.variables.FEAT_IDS.value, ['22108']);
  assert.deepEqual(restored.store.variables.SPELL_IDS.value, ['4977']);
  assert.deepEqual(restored.store.variables.SPELL_DATA.value.map(JSON.parse), [
    { spellId: 4977, type: 'FOCUS', castingSource: 'RANGER' },
  ]);
  assert.ok(restored.store.variables.CASTING_SOURCES.value.includes('RANGER:::-:::PRIMAL:::ATTRIBUTE_WIS'));
  assert.equal(restored.store.variables.SPELL_ATTACK.value.value, 'T');
  assert.equal(restored.store.variables.SPELL_DC.value.value, 'T');
  assert.ok(restored.store.variables.PRIMARY_SHEET_TABS.value.includes('spells'));
});

test('actual saved feat drawer renders the restored official wording and indexed spell', () => {
  const html = engine.renderFeatDrawer({ id: 22108, feat: spec.row });
  assert.match(html, /Heal Companion/);
  assert.match(html, /an animal companion/);
  assert.match(html, /deep devotion to your animal companion/);
  // RichText consumes drawer hrefs into click handlers, so SSR omits the href.
  assert.match(html, /<a\b[^>]*>Heal Companion<\/a>/);
  assert.equal(engine.convertToHardcodedLink('spell', 'Heal Companion'), '[Heal Companion](link_spell_4977)');
  assert.doesNotMatch(html, /Select Feat|\bAI\b|recovery|repaired|restored/i);
});
