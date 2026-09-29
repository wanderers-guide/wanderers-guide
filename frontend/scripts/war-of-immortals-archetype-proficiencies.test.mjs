import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929060000_war_of_immortals_archetype_proficiencies.sql', import.meta.url),
  'utf8'
);
const additions = JSON.parse(migration.split('$additions$')[1]);
const rankUpdates = JSON.parse(migration.split('$rank_updates$')[1]);
const affectedIds = [39021, 39022, 39206, 39213];
const fixtureIds = [...affectedIds, 39204, 38584, 38705];

let engine;
let originalRows;
let patchedRows;
let patchedSnapshot;
let content;

/** Apply exactly the migration's reviewed additions and rank changes to a local copy of the content dump. */
function applyMigration(rows) {
  const patched = structuredClone(rows);
  for (const patch of additions) {
    const feat = patched.find(({ row }) => row.id === patch.id)?.row;
    assert.ok(feat, `missing feat ${patch.id}`);
    assert.equal(feat.name, patch.name);
    assert.equal(feat.type, 'feat');
    assert.equal(feat.content_source_id, 400);
    assert.equal(feat.operations.length, patch.before_count);
    feat.operations.push(...structuredClone(patch.append));
  }
  const master = patched.find(({ row }) => row.id === 39213).row;
  assert.equal(master.name, 'Master Animist Spellcasting');
  assert.equal(master.operations.length, 3);
  for (const patch of rankUpdates) {
    const operation = master.operations.find(({ id }) => id === patch.operation_id);
    assert.equal(operation?.type, 'adjValue');
    assert.equal(operation.data.variable, patch.variable);
    assert.equal(operation.data.value.value, patch.before);
    assert.equal(operation.data.value.increases, 0);
    operation.data.value.value = patch.after;
  }
  return patched;
}

before(async () => {
  engine = await createOperationEngine();
  originalRows = await readContentRows(fixtureIds.map((id) => ({ table: 'ability_block', id })));
  patchedRows = applyMigration(originalRows);
  patchedSnapshot = structuredClone(patchedRows);
  engine.setFixtures(patchedRows);
  content = {
    abilityBlocks: patchedRows.map(({ row }) => row),
    classes: [],
    ancestries: [],
    backgrounds: [],
    items: [],
    traits: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [1, 400], INFO: [1, 400] },
  };
});

after(async () => engine?.cleanup());

/** Run the current feat operations on a character with explicit baseline ranks and class HP. */
async function calculate(featIds, { level = 18, spellRank = 'U', martialRank = 'U', classHp = 8 } = {}) {
  const character = {
    id: 1,
    level,
    details: {},
    inventory: { items: [] },
    operation_data: { selections: {} },
    content_sources: { enabled: [1, 400] },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      ...['SPELL_ATTACK', 'SPELL_DC'].map((variable) => ({
        id: `baseline-${variable}`,
        type: 'setValue',
        data: { variable, value: { value: spellRank } },
      })),
      {
        id: 'baseline-martial',
        type: 'setValue',
        data: { variable: 'MARTIAL_WEAPONS', value: { value: martialRank } },
      },
      {
        id: 'baseline-class-hp',
        type: 'setValue',
        data: { variable: 'MAX_HEALTH_CLASS_PER_LEVEL', value: classHp },
      },
      ...featIds.map((abilityBlockId) => ({
        id: `grant-${abilityBlockId}`,
        type: 'giveAbilityBlock',
        data: { type: 'feat', abilityBlockId },
      })),
    ],
  };
  const saved = structuredClone(character);
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, saved, 'calculating a character must not change its saved choices');
  return result.store;
}

test('the migration preserves every existing operation and unrelated feat', () => {
  assert.deepEqual(
    additions.map(({ id }) => id),
    [39021, 39022, 39206]
  );
  assert.deepEqual(
    rankUpdates.map(({ variable }) => variable),
    ['SPELL_ATTACK', 'SPELL_DC']
  );
  assert.match(migration, /status->>'state' = 'PENDING'/);
  for (const patch of additions) {
    const original = originalRows.find(({ row }) => row.id === patch.id).row;
    const changed = patchedRows.find(({ row }) => row.id === patch.id).row;
    assert.deepEqual(changed.operations.slice(0, patch.before_count), original.operations);
    assert.deepEqual(changed.operations.slice(patch.before_count), patch.append);
    assert.deepEqual({ ...changed, operations: original.operations }, original);
  }
  const originalMaster = originalRows.find(({ row }) => row.id === 39213).row;
  const changedMaster = patchedRows.find(({ row }) => row.id === 39213).row;
  assert.deepEqual(changedMaster.operations[0], originalMaster.operations[0], 'spell slots remain unchanged');
  assert.deepEqual({ ...changedMaster, operations: originalMaster.operations }, originalMaster);
  for (const patch of rankUpdates) {
    const original = originalMaster.operations.find(({ id }) => id === patch.operation_id);
    const changed = changedMaster.operations.find(({ id }) => id === patch.operation_id);
    assert.deepEqual(changed, {
      ...original,
      data: { ...original.data, value: { ...original.data.value, value: 'M' } },
    });
  }
  for (const id of [39204, 38584, 38705]) {
    assert.deepEqual(
      patchedRows.find(({ row }) => row.id === id),
      originalRows.find(({ row }) => row.id === id),
      `unaffected feat ${id}`
    );
  }
});

test('dedication grants trained proficiency without lowering a higher baseline', async () => {
  for (const spellRank of ['U', 'E']) {
    const store = await calculate([39021], { level: 2, spellRank });
    const expected = spellRank === 'U' ? 'T' : 'E';
    assert.equal(store.variables.SPELL_ATTACK.value.value, expected);
    assert.equal(store.variables.SPELL_DC.value.value, expected);
    assert.ok(store.variables.CASTING_SOURCES.value.some((source) => source.startsWith('ANIMIST:::')));
  }
  for (const martialRank of ['U', 'E']) {
    const store = await calculate([39022], { level: 2, martialRank });
    assert.equal(store.variables.MARTIAL_WEAPONS.value.value, martialRank === 'U' ? 'T' : 'E');
  }
});

test('Master Animist Spellcasting raises expert casting to master and retains legendary', async () => {
  for (const spellRank of ['E', 'L']) {
    const store = await calculate([39021, 39213], { level: 18, spellRank });
    const expected = spellRank === 'E' ? 'M' : 'L';
    assert.equal(store.variables.SPELL_ATTACK.value.value, expected);
    assert.equal(store.variables.SPELL_DC.value.value, expected);
  }
  const baseline = await calculate([39021], { level: 18, spellRank: 'E' });
  assert.equal(baseline.variables.SPELL_ATTACK.value.value, 'E');
  assert.equal(baseline.variables.SPELL_DC.value.value, 'E');
});

test('Exemplar Expertise adds HP only with Resiliency and a class HP value of 8 or less', async () => {
  for (const classHp of [8, 9]) {
    for (const resilient of [false, true]) {
      const baseFeats = [39022, ...(resilient ? [39204] : [])];
      const before = await calculate(baseFeats, { level: 10, classHp });
      const beforeHp = engine.getFinalVariableValue('CHARACTER', 'MAX_HEALTH_BONUS').total;
      assert.equal(beforeHp, resilient && classHp <= 8 ? 6 : 0, 'existing archetype HP grants remain intact');
      const after = await calculate([...baseFeats, 39206], { level: 10, classHp });
      assert.equal(
        after.variables.MAX_HEALTH_BONUS.value,
        before.variables.MAX_HEALTH_BONUS.value,
        'Expertise adds a bonus rather than changing the base value'
      );
      const expectedAdded = resilient && classHp <= 8 ? 3 : 0;
      assert.equal(
        engine.getFinalVariableValue('CHARACTER', 'MAX_HEALTH_BONUS').total,
        beforeHp + expectedAdded,
        `class HP ${classHp}, resilient ${resilient}`
      );
    }
  }
  assert.deepEqual(patchedRows, patchedSnapshot, 'character calculation must not change source feat content');
  assert.deepEqual(originalRows, await readContentRows(fixtureIds.map((id) => ({ table: 'ability_block', id }))));
});
