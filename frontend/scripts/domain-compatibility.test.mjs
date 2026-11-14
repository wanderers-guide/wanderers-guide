import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';
import { AbilityBlockSchema } from '../src/schemas/content.ts';
const domains = JSON.parse(await readFile(new URL('./fixtures/domain-catalog.json', import.meta.url), 'utf8')).map(
  (row) => AbilityBlockSchema.parse(row)
);
// Immutable pre-conversion capture: the scheduled sanitized dump must not replace this baseline.
const original = AbilityBlockSchema.parse(
  JSON.parse(await readFile(new URL('./fixtures/domain-legacy.json', import.meta.url), 'utf8'))
);
const oldSelector = original.operations[0].id,
  currentSelector = 'e84bbcb8-7d6b-4b9d-a1a4-d5b98f65c34a';
const converted = {
  ...original,
  operations: [
    {
      id: currentSelector,
      type: 'select',
      data: {
        title: 'Select a Domain',
        modeType: 'FILTERED',
        optionType: 'ABILITY_BLOCK',
        optionsPredefined: [],
        optionsFilters: {
          id: 'e53fb7da-7077-4d49-9d2b-9955265e4fd0',
          type: 'ABILITY_BLOCK',
          level: { max: 1 },
          traits: [2520],
          abilityBlockType: 'feat',
        },
      },
    },
  ],
};
const seed = {
  id: 9902406,
  name: 'Domain regression owner',
  group: 'GENERAL',
  traits: [],
  meta_data: {},
  operations: [{ id: 'grant-domains', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: 21087 } }],
};
const prefix = `item-${seed.id}_grant-domains_`;
let engine;
before(async () => {
  engine = await createOperationEngine();
});
after(async () => {
  await engine?.cleanup();
});
/** Execute the real controller against a pinned catalog, preserving saved character input. */
async function calculate(selections, sources = [...new Set(domains.map((row) => row.content_source_id))]) {
  const character = { ...summoner([inventoryItem(seed)]), companions: { list: [] }, operation_data: { selections } };
  const saved = structuredClone(character);
  const traits = [{ id: 2520, name: 'Domain', meta_data: {} }];
  engine.setFixtures([
    { table: 'item', row: seed },
    ...[converted, ...domains].map((row) => ({ table: 'ability_block', row })),
    { table: 'trait', row: traits[0] },
  ]);
  const result = await engine._executeCharacterOperations({
    character,
    content: {
      ...emptyContent,
      items: [seed],
      abilityBlocks: [converted, ...domains],
      traits,
      defaultSources: { PAGE: sources, INFO: sources },
    },
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, saved);
  const found = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.selection) found.push(value);
    for (const [key, entry] of Object.entries(value))
      if (key !== 'selection') {
        if (Array.isArray(entry)) entry.forEach(visit);
        else visit(entry);
      }
  }
  visit(result.ors);
  return found.find((row) => row.selection.title === 'Select a Domain');
}
for (const option of original.operations[0].data.optionsPredefined) {
  test(`legacy ${option.title} and current numeric choices survive calculation and reload`, async () => {
    const row = domains.find((row) => row.name === `${option.title} Domain`);
    assert(row);
    for (const [selector, value] of [
      [oldSelector, option.id],
      [oldSelector, String(row.id)],
      [currentSelector, String(row.id)],
    ]) {
      const selections = { [prefix + selector]: value };
      for (let reload = 0; reload < 2; reload++) {
        const result = await calculate(structuredClone(selections));
        assert.equal(result.result?.source?.id, row.id);
        assert.equal(result.selection.id, selector);
        assert.deepEqual(result.selection.aliases, [currentSelector, oldSelector]);
      }
    }
  });
}
test('current choice and explicit clears win; removing a choice clears both identities', async () => {
  const air = original.operations[0].data.optionsPredefined.find((row) => row.title === 'Air'),
    fire = domains.find((row) => row.name === 'Fire Domain');
  const selections = {
    [prefix + oldSelector]: air.id,
    [prefix + currentSelector]: String(fire.id),
    'other-owner': air.id,
  };
  assert.equal((await calculate(selections)).result.source.id, fire.id);
  for (const value of [''])
    assert.equal((await calculate({ ...selections, [prefix + currentSelector]: value })).result, undefined);
  assert.equal(
    engine.resolveSelectionNode(
      {
        value: null,
        children: { [oldSelector]: { value: air.id, children: {} }, [currentSelector]: { value: null, children: {} } },
      },
      converted.operations[0]
    ).node.value,
    null
  );
  const cleared = engine.clearSelectionPaths([prefix + oldSelector, prefix + currentSelector], selections);
  assert.deepEqual(cleared, { 'other-owner': air.id });
  assert.equal((await calculate(cleared)).result, undefined);
});
test('unknown UUID cannot select its numeric prefix; catalog source filters stay scoped', async () => {
  for (const value of ['61092bad-0000-4000-8000-000000000000', 'constructor', '__proto__']) {
    assert.equal((await calculate({ [prefix + oldSelector]: value })).result, undefined);
  }
  const result = await calculate({}, [1]);
  assert(result.selection.options.length > 0);
  assert(result.selection.options.every((row) => row.content_source_id === 1));
  assert(!result.selection.options.some((row) => row.name === 'Cold Domain'));
  assert((await calculate({}, [420])).selection.options.some((row) => row.name === 'Cold Domain'));
});
test('Cold and previous apocryphal references remain available without passive spell grants', () => {
  assert.equal(domains.length, 61);
  for (const old of original.operations[0].data.optionsPredefined) {
    const current = domains.find((row) => row.name === `${old.title} Domain`);
    assert.deepEqual(current.operations, []);
    for (const line of old.description.split('\n').filter((line) => line.includes('Apocryphal Spell')))
      for (const link of line.matchAll(/link_spell_\d+/g)) assert(current.description.includes(link[0]));
  }
});
