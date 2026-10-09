import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';

const idLists = [
  'SENSE_IDS',
  'MODE_IDS',
  'CLASS_IDS',
  'ANCESTRY_IDS',
  'BACKGROUND_IDS',
  'HERITAGE_IDS',
  'CLASS_ARCHETYPE_IDS',
  'FEAT_IDS',
  'SPELL_IDS',
  'LANGUAGE_IDS',
  'CLASS_FEATURE_IDS',
  'PHYSICAL_FEATURE_IDS',
  'EXTRA_ITEM_IDS',
];
let engine;

before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

/** Drive the real conditional runner and observe which operation branch actually executes. */
async function check(name, values, value, operator = 'INCLUDES') {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', name, values);
  await engine.runOperations(
    'CHARACTER',
    { path: 'list-identity-condition' },
    [
      {
        id: 'conditional',
        type: 'conditional',
        data: {
          conditions: [{ id: 'membership', name, type: 'list-str', operator, value }],
          trueOperations: [{ id: 'true', type: 'adjValue', data: { variable: 'BULK_LIMIT_BONUS', value: 1 } }],
          falseOperations: [{ id: 'false', type: 'adjValue', data: { variable: 'BULK_LIMIT_BONUS', value: -1 } }],
        },
      },
    ],
    { doConditionals: true }
  );
  return engine.getVariable('CHARACTER', 'BULK_LIMIT_BONUS').value === 1;
}

for (const name of idLists) {
  test(`${name} membership distinguishes exact numeric identities and its inverse`, async () => {
    for (const [values, candidate, expected] of [
      [['52162'], '52162', true],
      [['52162'], '52164', false],
      [['52162'], '5216', false],
      [['52162'], '521620', false],
      [['52162'], '', false],
      [[], '52162', false],
      [['52162', '52164'], '52164', true],
      [['12'], '34', false],
    ]) {
      assert.equal(await check(name, values, candidate), expected, `${name}: ${values} includes ${candidate}`);
      assert.equal(await check(name, values, candidate, 'NOT_INCLUDES'), !expected);
    }
  });
}

test('numbered active modes retain their existing distinct identities', async () => {
  assert.equal(await check('ACTIVE_MODES', ['CURSEBOUND_2'], 'Cursebound 2'), true);
  assert.equal(await check('ACTIVE_MODES', ['CURSEBOUND_2'], 'Cursebound 3'), false);
  assert.equal(await check('ACTIVE_MODES', ['CURSEBOUND_2'], 'Cursebound 3', 'NOT_INCLUDES'), true);
});

test('name lists retain case, punctuation, whitespace and legacy digit normalization', async () => {
  assert.equal(await check('FEAT_NAMES', ['QUICK_REPAIR'], ' quick-repair! '), true);
  assert.equal(await check('FEAT_NAMES', ['QUICK_REPAIR'], 'Quick Draw'), false);
  assert.equal(await check('TRAIT_NAMES', ['HOLY'], 'holy'), true);
  assert.equal(await check('TRAIT_NAMES', ['HOLY'], 'unholy'), false);
  assert.equal(await check('FEAT_NAMES', ['EXAMPLE_'], 'Example 2'), true);
  assert.equal(await check('FEAT_NAMES', ['EXAMPLE_'], 'Example 3', 'NOT_INCLUDES'), false);
});

test('whole-list equality keeps exact values and ordering rather than membership normalization', async () => {
  assert.equal(await check('FEAT_IDS', ['12', '34'], '["12","34"]', 'EQUALS'), true);
  assert.equal(await check('FEAT_IDS', ['12', '34'], '["12","35"]', 'EQUALS'), false);
  assert.equal(await check('FEAT_IDS', ['12', '34'], '["34","12"]', 'EQUALS'), false);
  assert.equal(await check('FEAT_IDS', ['12', '34'], '["34","12"]', 'NOT_EQUALS'), true);
});

test('conditional focus grants follow the one owned branch through reload, replacement and removal', async () => {
  const giveSpell = (spellId) => ({
    id: `spell-${spellId}`,
    type: 'giveSpell',
    data: { spellId, castingSource: 'TEST', rank: 1, type: 'FOCUS' },
  });
  const branches = Array.from({ length: 4 }, (_, index) => ({
    id: 990100 + index,
    name: `Branch ${index + 1}`,
    type: 'feat',
    level: 1,
    traits: [],
    operations: [giveSpell(990200 + index * 3)],
  }));
  const upgrades = [1, 2].map((tier) => ({
    id: 990110 + tier,
    name: `Branch upgrade ${tier}`,
    type: 'feat',
    level: 1,
    traits: [],
    operations: branches.map((branch, index) => ({
      id: `tier-${tier}-branch-${index}`,
      type: 'conditional',
      data: {
        conditions: [
          { id: `owned-${index}`, name: 'FEAT_IDS', type: 'list-str', operator: 'INCLUDES', value: String(branch.id) },
        ],
        trueOperations: [giveSpell(990200 + index * 3 + tier)],
      },
    })),
  }));
  const spells = Array.from({ length: 12 }, (_, index) => ({
    id: 990200 + index,
    name: `Branch spell ${index}`,
    rank: 1,
    traits: [],
    traditions: [],
    meta_data: { focus: true },
  }));
  const content = {
    abilityBlocks: [...branches, ...upgrades],
    spells,
    classes: [],
    ancestries: [],
    backgrounds: [],
    items: [],
    traits: [],
    languages: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [], INFO: [] },
  };
  engine.setFixtures([
    ...content.abilityBlocks.map((row) => ({ table: 'ability_block', row })),
    ...spells.map((row) => ({ table: 'spell', row })),
  ]);
  for (const branch of [...branches, branches[0], null]) {
    const character = {
      id: 1,
      level: 13,
      details: {},
      inventory: { items: [] },
      operation_data: { selections: {} },
      options: { custom_operations: true },
      custom_operations: [...(branch ? [branch] : []), ...upgrades].map((row) => ({
        id: `give-${row.id}`,
        type: 'giveAbilityBlock',
        data: { type: 'feat', abilityBlockId: row.id },
      })),
    };
    const saved = structuredClone(character);
    for (const input of [character, JSON.parse(JSON.stringify(character))]) {
      const result = await engine._executeCharacterOperations({
        character: input,
        content,
        context: 'CHARACTER-SHEET',
      });
      assert.deepEqual(result.errors, []);
      const focus = engine.collectEntitySpellcasting('CHARACTER', input).focus;
      const index = branches.indexOf(branch);
      assert.deepEqual(
        focus.map(({ spell_id }) => spell_id).sort(),
        branch ? [990200 + index * 3, 990201 + index * 3, 990202 + index * 3] : []
      );
      assert.deepEqual(input, saved, 'Calculation never rewrites the saved character');
    }
  }
});
