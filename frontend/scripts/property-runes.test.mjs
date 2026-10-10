import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let armor;
let runes;
let traits;

before(async () => {
  engine = await createOperationEngine();
  const rows = await readContentRows([
    ...[6985, 23058, 23059, 23060].map((id) => ({ table: 'item', id })),
    ...[1504, 1527].map((id) => ({ table: 'trait', id })),
  ]);
  armor = rows.find(({ table, row }) => table === 'item' && row.id === 6985).row;
  runes = rows.filter(({ table, row }) => table === 'item' && row.group === 'RUNE').map(({ row }) => row);
  traits = rows.filter(({ table }) => table === 'trait').map(({ row }) => row);
});
after(async () => engine?.cleanup());

/** Calculate saved armor through the real controller without adding its rune book to the character. */
async function calculate({
  rune = runes[0],
  homebrew = false,
  catalogRune,
  snapshot = rune,
  flags = {},
  bonus = 0,
} = {}) {
  const item = structuredClone(armor);
  if (homebrew) {
    item.id = 990001;
    item.name = 'Homebrew Hellknight plate';
    item.content_source_id = 990002;
  }
  item.traits = [...new Set([...item.traits, 1504, 1527])];
  item.meta_data.runes = {
    potency: 1,
    resilient: 0,
    property: [{ id: rune.id, name: rune.name, ...(snapshot ? { rune: structuredClone(snapshot) } : {}) }],
  };
  const character = {
    id: 990000,
    level: 7,
    details: { conditions: [] },
    content_sources: { enabled: [1, 3] },
    inventory: {
      coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
      items: [
        {
          id: 'armor',
          item,
          is_equipped: true,
          is_invested: true,
          is_implanted: false,
          is_formula: false,
          container_contents: [],
          ...flags,
        },
      ],
    },
    operation_data: { selections: {} },
    variants: {},
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      ...[
        ['PERCEPTION', { value: 'T' }],
        ['HEAVY_ARMOR', { value: 'T' }],
        ['ATTRIBUTE_WIS', { value: 0 }],
        ['ATTRIBUTE_STR', { value: 4 }],
      ].map(([variable, value]) => ({
        id: `set-${variable}`,
        type: 'setValue',
        data: { variable, value },
      })),
      ...(bonus
        ? [
            {
              id: 'other-item-bonus',
              type: 'addBonusToValue',
              data: { variable: 'PERCEPTION', value: bonus, type: 'item', text: '' },
            },
          ]
        : []),
    ],
  };
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    traits,
    items: catalogRune ? [catalogRune] : [],
    defaultSources: { PAGE: [1, 3], INFO: [1, 3, 842] },
  };
  engine.setFixtures(traits.map((row) => ({ table: 'trait', row })));
  const before = structuredClone({ character, content });
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  assert.deepEqual({ character, content }, before, 'calculation must preserve saved items and catalog data');
  return {
    perception: Number(engine.getFinalProfValue('CHARACTER', 'PERCEPTION')),
    ac: Number(engine.getFinalAcValue('CHARACTER', item)),
    bonuses: result.store.bonuses.PERCEPTION ?? [],
  };
}

for (const homebrew of [false, true]) {
  test(`${homebrew ? 'homebrew' : 'official'} armor applies all Sunweave grades without enabling their book`, async () => {
    for (const [index, rune] of runes.entries()) {
      const result = await calculate({ homebrew, rune });
      assert.equal(result.perception, 10 + index);
      assert.equal(result.ac, 26, 'potency still applies');
    }
  });
}

test('a current catalog rune takes precedence over an older saved rune', async () => {
  const old = structuredClone(runes[0]);
  old.operations = [];
  assert.equal((await calculate({ snapshot: old, catalogRune: runes[0] })).perception, 10);
});

test('snapshot rune effects still require equipped, invested, non-formula armor', async () => {
  for (const flags of [{ is_equipped: false }, { is_invested: false }, { is_formula: true }]) {
    assert.equal((await calculate({ flags })).perception, 9);
  }
  assert.equal((await calculate({ bonus: 2 })).perception, 11, 'item bonuses do not stack');
});

test("missing and mismatched snapshots never apply another item's operations", async () => {
  for (const snapshot of [null, { ...runes[0], id: runes[1].id }, { ...runes[0], group: 'GENERAL' }]) {
    assert.equal((await calculate({ snapshot })).perception, 9);
  }
  assert.equal((await calculate({ snapshot: null, catalogRune: runes[0] })).perception, 10);
});
