import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let creature;
let content;
let original;

before(async () => {
  engine = await createOperationEngine();
  const rows = await readContentRows([
    { table: 'creature', id: 12807 },
    { table: 'ability_block', id: 19330 },
    { table: 'trait', id: 1654 },
    { table: 'trait', id: 3842 },
  ]);
  creature = rows.find(({ table }) => table === 'creature').row;
  original = structuredClone(creature);
  const sql = await readFile(
    new URL('../../supabase/migrations/20260925000000_fix_rootball_intelligence.sql', import.meta.url),
    'utf8'
  );
  const patch = JSON.parse(sql.split('$patch$')[1]);
  const operation = creature.operations.find(({ id }) => id === patch.id);
  assert.equal(operation.type, 'setValue');
  assert.equal(operation.data.variable, 'ATTRIBUTE_INT');
  assert.ok([patch.before, patch.after].includes(operation.data.value.value));
  operation.data.value.value = patch.after;
  engine.setFixtures(rows);
  content = {
    defaultSources: { PAGE: [1, 3, 16], INFO: [1, 3, 16] },
    classes: [],
    ancestries: [],
    backgrounds: [],
    items: [],
    sources: [],
    languages: [],
    spells: [],
    abilityBlocks: rows.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    traits: rows.filter(({ table }) => table === 'trait').map(({ row }) => row),
  };
});
after(async () => engine?.cleanup());

test('the Rootball repair preserves all other fields and operation identities', () => {
  const expected = structuredClone(original);
  expected.operations.find(({ id }) => id === '14a327e5-2f66-41c1-9973-52c26257a700').data.value.value = -4;
  assert.deepEqual(creature, expected);
});

test('Rootball Chair uses Intelligence -4 without changing its other base attributes', async () => {
  // Treasure Vault p. 107, https://2e.aonprd.com/AnimalCompanions.aspx?ID=125&NoRedirect=1
  for (const level of [1, 5, 10, 20]) {
    const { store } = await engine._executeCharacterOperations({
      character: { id: 1, name: 'Companion fixture', level, details: {}, inventory: { items: [] } },
      content,
      context: 'CHARACTER-SHEET',
    });
    const result = await engine._executeCreatureOperations({ id: 'COMPANION_0', creature, content, charStore: store });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(
      ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(
        (attribute) => result.store.variables[`ATTRIBUTE_${attribute}`].value.value
      ),
      [2, 2, 3, -4, 1, 0],
      `owner level ${level}`
    );
  }
});
