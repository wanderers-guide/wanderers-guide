import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260927210000_war_of_immortals_embedded_activities.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
let engine;
let rows;

before(async () => {
  engine = await createOperationEngine();
  rows = await readContentRows(
    patches.flatMap(({ parent, child }) => [
      { table: 'ability_block', id: parent.id },
      { table: 'ability_block', id: child.id },
    ])
  );
  for (const patch of patches) {
    const parent = rows.find(({ row }) => row.id === patch.parent.id).row;
    const child = rows.find(({ row }) => row.id === patch.child.id).row;
    assert.equal(parent.name, patch.parent.name);
    assert.equal(parent.type, 'feat');
    assert.equal(parent.content_source_id, 400);
    assert.equal(parent.uuid, String(patch.parent.uuid));
    assert.deepEqual(parent.operations, []);
    assert.match(parent.description, new RegExp(patch.child.name));
    assert.equal(child.name, patch.child.name);
    assert.equal(child.type, 'feat');
    assert.equal(child.content_source_id, 400);
    assert.equal(child.uuid, String(patch.child.uuid));
    assert.equal(child.actions, patch.child.actions);
    assert.deepEqual(child.operations, []);
    assert.equal(child.meta_data.unselectable, undefined);
    parent.operations.push(patch.grant);
    child.meta_data.unselectable = true;
  }
  engine.setFixtures(rows);
  engine.defineDefaultSources('PAGE', [400]);
});
after(async () => engine?.cleanup());

for (const patch of patches) {
  test(`${patch.parent.name} grants ${patch.child.name} on a new character`, async () => {
    const parent = rows.find(({ row }) => row.id === patch.parent.id).row;
    const child = rows.find(({ row }) => row.id === patch.child.id).row;
    const content = {
      abilityBlocks: rows.map(({ row }) => row),
      spells: [],
      items: [],
      classes: [],
      ancestries: [],
      backgrounds: [],
      languages: [],
      traits: [],
      sources: [],
      defaultSources: { PAGE: [400], INFO: [400] },
    };
    for (const alreadySelected of [false, true]) {
      const character = {
        id: alreadySelected ? 2 : 1,
        level: 20,
        details: {},
        inventory: { items: [] },
        operation_data: { selections: {} },
        options: { custom_operations: true },
        custom_operations: [
          { id: 'grant-parent', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: parent.id } },
        ],
      };
      const { store, errors } = await engine._executeCharacterOperations({
        character,
        content,
        context: 'CHARACTER-SHEET',
      });
      assert.deepEqual(errors, []);
      if (alreadySelected) {
        const saved = await engine.runOperations(
          'CHARACTER',
          { path: 'saved', node: { value: null, children: { choose: { value: String(child.id), children: {} } } } },
          [
            {
              id: 'choose',
              type: 'select',
              data: {
                title: 'Saved feat',
                modeType: 'FILTERED',
                optionType: 'ABILITY_BLOCK',
                optionsPredefined: [],
                optionsFilters: {
                  id: 'saved-filter',
                  type: 'ABILITY_BLOCK',
                  abilityBlockType: 'feat',
                  level: { min: 0, max: 20 },
                },
              },
            },
          ]
        );
        assert.equal(saved[0].result.source.id, child.id);
      }
      assert.ok(store.variables.FEAT_IDS.value.includes(String(parent.id)));
      assert.ok(store.variables.FEAT_IDS.value.includes(String(child.id)));
      const ownedBlocks = Object.values(
        engine.collectEntityAbilityBlocks('CHARACTER', character, content.abilityBlocks)
      ).flat(Infinity);
      const actionList = ownedBlocks.filter((block) => block.actions !== null);
      assert.equal(actionList.filter(({ id }) => id === child.id).length, 1);
      assert.equal(engine.isAbilityBlockVisible('CHARACTER', child), false);
      const featChoices = await engine.determineFilteredSelectionList('CHARACTER', 'test-choice', {
        id: 'test-choice',
        type: 'ABILITY_BLOCK',
        abilityBlockType: 'feat',
        level: { min: 0, max: 20 },
      });
      assert.ok(!featChoices.some(({ id }) => id === child.id));
    }
  });
}

test('repair leaves saved IDs and descriptions intact and changes only grants and choice visibility', () => {
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.match(migration, /operations = array\[\(patch->'grant'\)::json\]/);
  assert.match(migration, /jsonb_set\(child\.meta_data, '\{unselectable\}', 'true'::jsonb/);
  assert.equal(patches.length, 2);
  assert.deepEqual(
    patches.map(({ grant, child }) => [grant.type, grant.data.type, grant.data.abilityBlockId, child.id]),
    [
      ['giveAbilityBlock', 'feat', 51429, 51429],
      ['giveAbilityBlock', 'feat', 51506, 51506],
    ]
  );
});
