import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { before, after, test } from 'node:test';
import { ItemSchema, InventorySchema, ContentSourceSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readHistoricalContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner, eidolon } from './fixtures/eidolon.mjs';

const { uniqueId } = createRequire(import.meta.url)('../../supabase/functions/_shared/upload-utils.ts');
const migration = await readFile(
  new URL('../../supabase/migrations/20261002010000_treasure_vault_relic_seeds.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-relic-seeds.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$seeds$')[1]);
const dependencies = await readHistoricalContentRows(spec.dependencies.map(({ table, id }) => ({ table, id })));
const sources = await readHistoricalContentRows(spec.sources.map(({ id }) => ({ table: 'content_source', id })));
const source16Creatures = await readHistoricalContentRows([{ table: 'creature', sourceIds: [16] }]);
const source16Traits = await readHistoricalContentRows([{ table: 'trait', sourceIds: [16] }]);
// Negative identities exist only in this offline fixture. Postgres allocates production IDs.
const proposed = spec.items.map(({ row }, index) => ({
  ...structuredClone(row),
  id: -25001 - index,
  created_at: '2026-10-02T00:00:00Z',
}));
const variables = ['SKILL_DECEPTION', 'SKILL_CRAFTING', 'SKILL_PERFORMANCE', 'PERCEPTION'];
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
});
after(async () => engine?.cleanup());
const content = {
  ...emptyContent,
  items: [...proposed, ...dependencies.filter(({ table }) => table === 'item').map(({ row }) => row)],
  traits: dependencies.filter(({ table }) => table === 'trait').map(({ row }) => row),
  abilityBlocks: dependencies.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
  classes: dependencies.filter(({ table }) => table === 'class').map(({ row }) => row),
  sources: sources.map(({ row }) => row),
};
/** Execute real rules consumers without a user character or persisted inventory mutation. */
async function calculate(items, enabled = spec.sources.map(({ id }) => id), creature = false) {
  engine.setFixtures([...dependencies, ...sources, ...proposed.map((row) => ({ table: 'item', row }))]);
  engine.clearOperationErrorNotifications();
  const character = { ...summoner(creature ? [] : items), companions: { list: [] }, content_sources: { enabled } };
  const packageContent = { ...content, defaultSources: { PAGE: enabled, INFO: enabled } };
  let result = await engine._executeCharacterOperations({
    character,
    content: packageContent,
    context: 'CHARACTER-SHEET',
  });
  const id = creature ? 'CREATURE-relic-fixture' : 'CHARACTER';
  if (creature) {
    result = await engine._executeCreatureOperations({
      id,
      creature: { ...structuredClone(eidolon), operations: [], inventory: { ...eidolon.inventory, items } },
      content: packageContent,
      charStore: result.store,
    });
  }
  assert.deepEqual(result.errors, []);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  engine.importVariableStore(id, result.store);
  return {
    scores: variables.map((variable) => engine.getFinalProfValue(id, variable)),
    conditional: variables.map((variable) =>
      engine.getVariableBreakdown(id, variable).conditionals.map(({ text }) => text)
    ),
    feats: engine.getVariable(id, 'FEAT_IDS').value,
    skills: Object.keys(result.store.variables)
      .filter((key) => key.startsWith('SKILL_LORE_'))
      .sort(),
    extraItems: engine.getVariable(id, 'EXTRA_ITEM_IDS').value,
  };
}

test('all five full items have uploader UUIDs, remaster URLs, exact headers and no invented price/usage/components', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$seeds$')[1]));
  assert.deepEqual(
    proposed.map((row) => [row.name, row.level, row.usage, row.bulk]),
    [
      ["Fortune's Favor", 3, 'worn', '0'],
      ["Inventor's Chair", 4, '', '3'],
      ['Phistophilus Fiddle', 3, 'held in 2 hands', '1'],
      ["Sleuth's Pipe", 3, 'held in 1 hand', '0.1'],
      ['Watch of Lost Ages', 3, 'held in 1 hand', '0.1'],
    ]
  );
  for (const [index, row] of proposed.entries()) {
    ItemSchema.parse(row);
    assert.equal(row.uuid, uniqueId(row.name, 'item', row.level, 16));
    assert.equal(String(row.uuid), spec.items[index].uuid);
    assert.equal(row.rarity, 'UNIQUE');
    assert.equal(row.price, null);
    assert.equal(row.hands, null);
    assert.equal(row.craft_requirements, null);
    assert.equal(row.meta_data.source.url, `https://2e.aonprd.com/Equipment.aspx?ID=${2406 + index}`);
    assert.equal(row.meta_data.source.book, 'Treasure Vault (Remastered)');
    assert.ok(row.traits.includes(3460) && row.traits.includes(1504));
    assert.equal(row.traits.includes(1527), index === 0);
    assert.ok(
      row.operations.every(
        (op) => op.type === 'addBonusToValue' && op.data.value === 1 && op.data.type === 'item' && op.data.text
      )
    );
    assert.ok(!Object.hasOwn(row.meta_data, 'container_default_items'));
    assert.ok(!Object.hasOwn(row.meta_data, 'foundry'));
  }
  assert.equal(new Set(proposed.flatMap(({ operations }) => operations.map(({ id }) => id))).size, 4);
  sources.forEach(({ row }) => ContentSourceSchema.parse(row));
});

test('every named occurrence resolves through the actual source-scoped helper; all25 story-gift links use22 exact feat identities', () => {
  const gifts = [];
  for (const row of proposed) {
    for (const match of row.description.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)) {
      const [, label, type, id] = match;
      const table = ['feat', 'action', 'class-feature'].includes(type) ? 'ability_block' : type;
      const target = dependencies.find((entry) => entry.table === table && entry.row.id === Number(id));
      assert.ok(target, `${type}:${id}`);
      if (table === 'ability_block') assert.equal(target.row.type, type);
      engine.setFixtures([target]);
      assert.equal(engine.convertToHardcodedLink(type, target.row.name, label), match[0]);
      if (type === 'feat' && Number(id) !== 30995) gifts.push(Number(id));
    }
    const html = engine.renderRichText(row.description);
    assert.doesNotMatch(html, /\[\[|@UUID|@Check|link_condition_|—/);
    assert.match(html, /Minor Gifts/);
    assert.match(html, /Major Gifts/);
    assert.match(html, /Grand Gift/);
  }
  assert.equal(gifts.length, 25);
  assert.equal(new Set(gifts).size, 22);
  assert.ok(!gifts.includes(46712) && !gifts.includes(38062));
  assert.match(proposed[3].description, /\*\*Major Gifts\*\* \[intelligent relic\]\(link_feat_29688\)/);
  assert.match(proposed[1].description, /\[muse\]\(link_feat_28851\) \(Crafting\)/);
  assert.match(proposed[2].description, /\[muse\]\(link_feat_28851\) \(Performance\)/);
});

test('four base benefits are advisory conditional item bonuses, not blanket numbers, training, gift grants or free physical items', async () => {
  const baseline = await calculate([]);
  const active = await calculate(proposed.map((row) => inventoryItem(row, { is_invested: true })));
  assert.deepEqual(active.scores, baseline.scores);
  assert.deepEqual(active.skills, baseline.skills);
  assert.deepEqual(active.feats, baseline.feats);
  assert.deepEqual(active.extraItems, baseline.extraItems);
  assert.deepEqual(active.conditional, [
    ['+1 item bonus to Feint'],
    ["+1 item bonus to Craft items using the integrated artisan's toolkit"],
    ['+1 item bonus while playing the phistophilus fiddle'],
    ['+1 item bonus to Sense Motive'],
  ]);
  assert.match(
    proposed[0].description,
    /Games Lore checks made to gamble or determine the outcome of a game of chance/
  );
  assert.match(proposed[3].description, /if you're an \[investigator\]/);
  assert.match(proposed[4].description, /\[Recall Knowledge\].*about historical subjects/);
  assert.deepEqual(proposed[4].operations, []);
});

test('investment, formulas, stowed held/worn gear, removal, duplicates and saved-source snapshots use existing inventory rules', async () => {
  const baseline = await calculate([]);
  const fortune = proposed[0];
  assert.deepEqual(await calculate([inventoryItem(fortune)]), baseline);
  const active = await calculate(proposed.map((row) => inventoryItem(row, { is_invested: true })));
  for (const flags of [{ is_formula: true }, { is_formula: true, is_equipped: true, is_invested: true }])
    assert.deepEqual(await calculate(proposed.map((row) => inventoryItem(row, flags))), baseline);
  const bag = {
    ...structuredClone(proposed[4]),
    id: -25999,
    name: 'Local container',
    usage: '',
    operations: [],
    traits: [],
    meta_data: { bulk: { capacity: 10 } },
  };
  // An unmarked chair has no printed holding/wearing restriction; its Craft advisory remains conditional on use.
  for (const row of [proposed[0], proposed[2], proposed[3]])
    assert.deepEqual(
      await calculate([
        inventoryItem(bag, { container_contents: [inventoryItem(row, { is_invested: true, is_equipped: true })] }),
      ]),
      baseline
    );
  assert.deepEqual(
    await calculate(
      proposed.flatMap((row) => [
        inventoryItem(row, { id: `first-${row.id}`, is_invested: true }),
        inventoryItem(row, { id: `second-${row.id}`, is_invested: true }),
      ])
    ),
    active
  );
  assert.deepEqual(
    await calculate(
      proposed.map((row) => inventoryItem(row, { is_invested: true })),
      [3]
    ),
    active
  );
  assert.deepEqual(await calculate([]), baseline);
});

test('creature owners receive the same conditional benefits without character leakage or formula grants', async () => {
  const baseline = await calculate([], undefined, true);
  const active = await calculate(
    proposed.map((row) => inventoryItem(row, { is_invested: true })),
    undefined,
    true
  );
  assert.deepEqual(active.scores, baseline.scores);
  assert.deepEqual(active.feats, baseline.feats);
  assert.deepEqual(active.extraItems, baseline.extraItems);
  assert.equal(active.conditional.flat().length, 4);
  assert.deepEqual(
    await calculate(
      proposed.map((row) => inventoryItem(row, { is_formula: true, is_invested: true })),
      undefined,
      true
    ),
    baseline
  );
  assert.deepEqual(await calculate([], undefined, true), baseline);
});

test('normal add/remove preserves saved siblings, allocates inventory-copy IDs, and uses only printed physical bulk', async () => {
  const original = inventoryItem({ ...structuredClone(proposed[0]), id: -25998, name: 'Unrelated saved snapshot' });
  let character = { ...summoner([original]), companions: { list: [] } };
  const frozen = structuredClone(proposed);
  for (const row of proposed)
    await engine.handleAddItem(
      (fn) => {
        character = fn(character);
      },
      row,
      false
    );
  InventorySchema.parse(character.inventory);
  assert.equal(character.inventory.items.length, 6);
  assert.deepEqual(
    character.inventory.items.find(({ id }) => id === original.id),
    original
  );
  assert.deepEqual(proposed, frozen);
  assert.equal(new Set(character.inventory.items.map(({ id }) => id)).size, 6);
  for (const row of proposed) assert.equal(engine.getItemBulk(inventoryItem(row)), Number(row.bulk));
  const chair = character.inventory.items.find(({ item }) => item.name === "Inventor's Chair");
  assert.deepEqual(chair.container_contents, []);
  engine.handleDeleteItem((fn) => {
    character = fn(character);
  }, chair);
  assert.equal(character.inventory.items.length, 5);
  assert.deepEqual(
    character.inventory.items.find(({ id }) => id === original.id),
    original
  );
});

test('SQL guards every identity, queue state, partial import and count before replay; full baseline/readback/CAS preserve existing rows', () => {
  const body = migration.split('$seeds$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.match(body, /lock table public\.item in share row exclusive mode/);
  assert.match(body, /lock table public\.trait in share mode/);
  assert.ok(body.indexOf('pending content requires review') < body.indexOf('terminal_count=5'));
  assert.match(body, /terminal_count<>0/);
  assert.match(body, /actual_count<>\(spec->>'baseline_item_count'\)::bigint/);
  assert.match(body, /before_count is distinct from spec->'baseline_counts'/);
  assert.match(body, /current_hashes is distinct from captured_items/);
  assert.match(body, /inserted_rows->\(actual->>'id'\)/);
  assert.match(body, /row_count<>1 then raise exception 'Relic seeds INSERT CAS failed'/);
  assert.match(body, /row_count<>1 then raise exception 'Relic seeds count CAS failed'/);
  assert.match(body, /row_count<>5/);
  assert.match(body, /array\(select value::json from jsonb_array_elements/);
  assert.match(body, /s\.id is null or s\.user_id is null/);
  assert.match(
    body,
    /jsonb_set\(jsonb_set\(s.meta_data::jsonb,'\{counts,item\}',spec#>'\{terminal_counts,item\}',false\),'\{counts,trait\}',spec#>'\{terminal_counts,trait\}',false\)/
  );
  assert.match(release, /count\(distinct i.id\)=5/);
  assert.match(release, /\) is true\)/);
  assert.match(release, /as passed from settings/);
  assert.equal(spec.baseline_item_count, 1113);
  assert.equal(spec.terminal_item_count, 1118);
  assert.deepEqual(spec.baseline_counts, { item: 1113, creature: 1, trait: 45 });
  assert.deepEqual(spec.terminal_counts, { item: 1118, creature: 1, trait: 24 });
  assert.equal(
    source16Creatures.length,
    spec.baseline_counts.creature,
    'The actual sanitized baseline has exactly one source16 creature'
  );
  assert.match(body, /actual_trait_count<>\(spec#>>'\{terminal_counts,trait\}'\)::bigint/);
  assert.equal(
    source16Traits.length,
    24,
    'The actual trait corpus, not stale cached45, establishes the exact successor count'
  );
  assert.match(release, /count\(\*\)=24 from public\.trait where content_source_id=16/);
  const successor = JSON.parse(release.split('$successor$')[1]);
  assert.deepEqual(successor.seed_counts, spec.terminal_counts);
  assert.deepEqual(successor.chair_counts, { item: 1119, creature: 2, trait: 24 });
  assert.equal(spec.dependencies.length, 37);
  assert.equal(spec.sources.length, 8);
  const allGuards = [
    ...body.matchAll(
      /if exists\(select 1 from public\.content_update u[\s\S]*?\)\) then raise exception '([^']+)'; end if;/g
    ),
  ];
  assert.deepEqual(
    allGuards.map(([, message]) => message),
    [
      'Relic seeds pending content requires review',
      'Relic seeds successor pending content requires review',
      'Relic seeds final curator guard changed',
    ]
  );
  const guards = allGuards
    .filter(([, message]) => !message.includes('successor'))
    .map(([guard]) => guard.replace(/raise exception '[^']+'/, "raise exception 'curator guard'"));
  assert.equal(guards.length, 2);
  assert.equal(guards[0], guards[1], 'The final migration-only curator guard must retain every initial identity route');
  assert.ok(body.indexOf('final curator guard changed') > body.indexOf('final item count drift'));
  assert.doesNotMatch(
    body,
    /delete from|update public\.(item|trait|ability_block|creature|class|character)|alter table|create function/i
  );
  assert.ok(
    spec.dependencies
      .filter(({ table }) => table === 'ability_block')
      .every(({ queue_type }) => queue_type === 'ability-block')
  );
});
