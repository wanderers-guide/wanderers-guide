import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';
let engine;
before(async () => {
  engine = await createOperationEngine();
});
after(async () => {
  await engine?.cleanup();
});
beforeEach(() => {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'PAGE_CONTEXT', 'CHARACTER-BUILDER');
  engine.setFixtures(
    ['Guiding Shot', 'Set-Up Strike', 'Rock and Roll', 'Armor Expertise'].map((name, id) => ({
      table: 'ability_block',
      row: { id: id + 1, name, type: 'feat', traits: [] },
    }))
  );
});
for (const feat of ['GUIDING SHOT', 'SET-UP STRIKE'])
  test(`Fortunate Blow accepts ${feat}`, () => {
    engine.setVariable('CHARACTER', 'FEAT_NAMES', [feat]);
    assert.equal(engine.meetsPrerequisites('CHARACTER', ['Guiding Shot or Set-Up Strike']).result, 'FULLY');
  });
test('Fortunate Blow rejects a character without either feat', () => {
  assert.equal(engine.meetsPrerequisites('CHARACTER', ['Guiding Shot or Set-Up Strike']).result, 'NOT');
});
test('exact feat names containing conjunctions stay intact', () => {
  engine.setVariable('CHARACTER', 'FEAT_NAMES', ['ROCK AND ROLL', 'ARMOR EXPERTISE']);
  assert.equal(engine.meetsPrerequisites('CHARACTER', ['Rock and Roll']).result, 'FULLY');
  assert.equal(engine.meetsPrerequisites('CHARACTER', ['Armor Expertise']).result, 'FULLY');
});

/** Run the page's actual handler with a rejected creation, without a live account. */
const { readFile } = await import('node:fs/promises');
const characterPage = await readFile(new URL('../src/pages/CharactersPage.tsx', import.meta.url), 'utf8');
const createBody = characterPage.match(/const handleCreateCharacter = async \(\) => \{([\s\S]*?)\n  \};/)?.[1];
assert.ok(createBody);
for (const outcome of ['success', 'null', 'rejection'])
  test(`character creation releases both buttons after ${outcome}`, async () => {
    const loading = [true, true];
    const routes = [];
    const notices = [];
    let calls = 0;
    const handler = new Function(
      'createCharacter',
      'navigate',
      'queryClient',
      'setLoadingCreateCharacter',
      'setLoadingCreateZeroCharacter',
      'showNotification',
      `return async()=>{${createBody.replaceAll(': unknown', '')}}`
    )(
      async () => {
        calls++;
        if (outcome === 'rejection') throw new Error('Membership could not be verified');
        return outcome === 'success' ? { id: 42 } : null;
      },
      (route) => routes.push(route),
      { invalidateQueries() {} },
      (value) => (loading[0] = value),
      (value) => (loading[1] = value),
      (notice) => notices.push(notice)
    );
    await handler();
    assert.deepEqual(loading, [false, false]);
    assert.equal(calls, 1);
    assert.deepEqual(routes, outcome === 'success' ? ['/builder/42'] : []);
    assert.equal(notices.length, outcome === 'rejection' ? 1 : 0);
  });
const copyBody = characterPage.match(/async function createCharacterCopy\(character: Character\) \{([\s\S]*)\n\}/)?.[1];
assert.ok(copyBody);
test('copy failure closes its loading notification and never replays creation', async () => {
  const hidden = [];
  const notices = [];
  let calls = 0;
  const copy = new Function(
    'character',
    'makeRequest',
    'showNotification',
    'hideNotification',
    `return (async()=>{${copyBody.replaceAll(': unknown', '').replaceAll('makeRequest<Character>', 'makeRequest')}})()`
  );
  const result = await copy(
    { id: 7, name: 'Original' },
    async () => {
      calls++;
      throw new Error('Membership could not be verified');
    },
    (notice) => notices.push(notice),
    (id) => hidden.push(id)
  );
  assert.equal(result, null);
  assert.equal(calls, 1);
  assert.deepEqual(hidden, ['copy-character-7']);
  assert.equal(notices.at(-1).title, 'Could not copy character');
});

/** Execute the migrated mods through the real controller, including removal and reload. */
test('mine mods appear in Modify rules only while their granting feats are owned', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20261026000000_mine_mod_rules.sql', import.meta.url),
    'utf8'
  );
  const entries = JSON.parse(migration.split('$entries$')[1]);
  const { readContentRows } = await import('./operation-test-harness.mjs');
  const rows = await readContentRows([
    ...entries.map(({ id }) => ({ table: 'ability_block', id })),
    { table: 'ability_block', id: 59021 },
  ]);
  for (const entry of entries) rows.find(({ row }) => row.id === entry.id).row.operations = [entry.operation];
  engine.setFixtures(rows);
  const content = {
    abilityBlocks: rows.map(({ row }) => row),
    items: [],
    classes: [],
    traits: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [900], INFO: [900] },
  };
  for (const owned of [entries, [], entries]) {
    const packet = await engine._executeCharacterOperations({
      character: {
        id: 1,
        level: 8,
        details: {},
        inventory: { items: [] },
        operation_data: { selections: {} },
        options: { custom_operations: true },
        custom_operations: owned.map((entry) => ({
          id: `grant-${entry.id}`,
          type: 'giveAbilityBlock',
          data: { type: 'feat', abilityBlockId: entry.id },
        })),
      },
      content,
      context: 'CHARACTER-SHEET',
    });
    const injected = packet.store.variables.INJECT_TEXT.value.map((text) => JSON.parse(text));
    assert.equal(injected.length, owned.length);
    for (const entry of owned) assert.ok(injected.some((row) => row.id === 59021 && row.text.includes(entry.name)));
  }
});

/** Provider/network failures must also release the importer-owned notification. */
test('Pathbuilder network failure releases its import notification', async () => {
  const source = await readFile(
    new URL('../src/process/import/pathbuilder/import-from-pathbuilder.ts', import.meta.url),
    'utf8'
  );
  const body = source.match(
    /export async function importFromPathbuilder\(pathbuilderJsonId: number\) \{([\s\S]*?)\n\}/
  )?.[1];
  assert.ok(body);
  const hidden = [];
  const notices = [];
  const result = await new Function(
    'pathbuilderJsonId',
    'fetch',
    'showNotification',
    'hideNotification',
    'console',
    `return (async()=>{${body.replaceAll(': unknown', '')}})()`
  )(
    123,
    async () => {
      throw new Error('Network failed');
    },
    (notice) => notices.push(notice),
    (id) => hidden.push(id),
    { error() {} }
  );
  assert.equal(result, null);
  assert.deepEqual(hidden, ['importing-123']);
  assert.equal(notices.at(-1).title, 'Import failed');
});

/** The curator's existing From the Front correction must satisfy Champion's armor check. */
test('From the Front and Champion Dedication grant heavy armor training', async () => {
  const { readContentRows } = await import('./operation-test-harness.mjs');
  const rows = await readContentRows([{ table: 'ability_block', sourceIds: [256, 579] }]);
  engine.setFixtures(rows);
  const content = {
    abilityBlocks: rows.map(({ row }) => row),
    items: [],
    classes: [],
    traits: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [256, 579], INFO: [256, 579] },
  };
  const packet = await engine._executeCharacterOperations({
    character: {
      id: 1,
      level: 2,
      details: {},
      inventory: { items: [] },
      operation_data: { selections: {} },
      options: { custom_operations: true },
      custom_operations: [
        { id: 'envoy-armor', type: 'setValue', data: { variable: 'LIGHT_ARMOR', value: { value: 'T' } } },
        { id: 'front', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: 45476 } },
        { id: 'champion', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: 32001 } },
      ],
    },
    content,
    context: 'CHARACTER-SHEET',
  });
  assert.equal(packet.store.variables.MEDIUM_ARMOR.value.value, 'T');
  assert.equal(packet.store.variables.HEAVY_ARMOR.value.value, 'T');
});
