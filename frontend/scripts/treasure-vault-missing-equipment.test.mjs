import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { ItemSchema, InventorySchema, ContentSourceSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const { uniqueId } = createRequire(import.meta.url)('../../supabase/functions/_shared/upload-utils.ts');
const migration = await readFile(
  new URL('../../supabase/migrations/20261001230000_treasure_vault_missing_equipment.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-missing-equipment.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$equipment$')[1]);
assert.deepEqual(JSON.parse(release.split('$equipment$')[1]), spec);
const sourceRows = await readContentRows(spec.sources.map((s) => ({ table: 'content_source', id: s.id })));
const dependencyRows = await readContentRows(spec.dependencies.map((d) => ({ table: d.table, id: d.id })));
// These negative IDs are offline validation fixtures, never persisted identities.
const proposed = spec.items.map((p, i) => ({
  ...structuredClone(p.row),
  id: -23001 - i,
  created_at: '2026-10-02T00:00:00.000Z',
}));
const ring = proposed.find((p) => p.name === 'Spiritsight Ring');
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true, renderPerceptionDrawer: true });
});
after(async () => {
  await engine?.cleanup();
});
const norm = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const body = migration.split('$equipment$')[2];
const content = {
  ...emptyContent,
  items: proposed,
  traits: dependencyRows.filter((r) => r.table === 'trait').map((r) => r.row),
  sources: sourceRows.map((r) => r.row),
  abilityBlocks: [],
};
async function calculate(items, enabled = [1, 3, 16]) {
  engine.setFixtures([...dependencyRows, ...sourceRows, ...proposed.map((row) => ({ table: 'item', row }))]);
  engine.clearOperationErrorNotifications();
  const character = { ...summoner(items), companions: { list: [] }, content_sources: { enabled } };
  const result = await engine._executeCharacterOperations({
    character,
    content: { ...content, defaultSources: { PAGE: enabled, INFO: enabled } },
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  engine.importVariableStore('CHARACTER', result.store);
  return {
    perception: engine.getFinalProfValue('CHARACTER', 'PERCEPTION'),
    dc: engine.getFinalProfValue('CHARACTER', 'PERCEPTION', true),
    conditional: engine.getVariableBreakdown('CHARACTER', 'PERCEPTION').conditionals,
    senses: engine.collectEntitySenses('CHARACTER', []),
    resistances: engine.getVariable('CHARACTER', 'RESISTANCES').value,
  };
}

test('four full published entries match schema, canonical UUIDs and physical headers; ambiguous Blue is not inserted', () => {
  assert.equal(spec.items.length, 4);
  assert.equal(spec.dependencies.length, 12);
  assert.deepEqual(
    proposed.map((p) => [p.name, p.level, p.price.gp, p.usage, p.bulk]),
    [
      ['Violet Venom', 3, 12, 'held in 2 hands', '0.1'],
      ['Spiritsight Ring', 6, 225, 'worn', '0'],
      ['Rhinoceros Mask', 4, 90, 'worn mask', '0'],
      ['Rhinoceros Mask (Greater)', 8, 425, 'worn mask', '0'],
    ]
  );
  for (const [i, row] of proposed.entries()) {
    ItemSchema.parse(row);
    assert.equal(row.uuid, uniqueId(row.name, 'item', row.level, 16));
    assert.equal(String(row.uuid), spec.items[i].uuid);
    assert.equal(row.group, 'GENERAL');
    assert.equal(row.rarity, 'UNCOMMON');
    assert.equal(row.size, 'MEDIUM');
    assert.equal(row.hands, null);
    assert.equal(row.meta_data.source.book, 'Treasure Vault (Remastered)');
    assert.equal(row.meta_data.unselectable, false);
    assert.equal(row.craft_requirements, null);
    assert.ok(!Object.hasOwn(row.meta_data, 'foundry'));
    assert.ok(!Object.hasOwn(row.meta_data, 'damage'));
  }
  sourceRows.forEach((r) => ContentSourceSchema.parse(r.row));
  assert.ok(!migration.includes('Blue Dragonfly'));
  assert.ok(!migration.includes('confused 1'));
});

test('every stored dependency and every named occurrence resolves through the actual subtype-aware helper', () => {
  engine.setFixtures(dependencyRows);
  for (const p of proposed) {
    for (const m of p.description.matchAll(/\[([^\]]+)\]\(link_(trait|action|creature)_(\d+)\)/g)) {
      const target = dependencyRows.find(
        (r) => r.row.id === Number(m[3]) && r.table === (m[2] === 'action' ? 'ability_block' : m[2])
      );
      assert.ok(target);
      assert.equal(engine.convertToHardcodedLink(m[2], target.row.name, m[1]), m[0]);
      if (m[2] === 'action') assert.equal(target.row.type, 'action');
    }
  }
  const poison = proposed[0];
  assert.equal((poison.description.match(/link_trait_1476/g) ?? []).length, 3);
  assert.equal((poison.description.match(/link_creature_11195/g) ?? []).length, 1);
  assert.equal((ring.description.match(/link_trait_2424/g) ?? []).length, 4);
  assert.equal((ring.description.match(/link_action_19845/g) ?? []).length, 1);
  for (const mask of proposed.slice(2)) {
    assert.equal((mask.description.match(/link_action_19855/g) ?? []).length, 1);
    assert.equal((mask.description.match(/link_action_19856/g) ?? []).length, 1);
  }
});

test('primary poison stages and both mask thresholds preserve every victim/conditional rider without blanket operations', () => {
  const poison = proposed[0];
  assert.match(poison.description, /cost="TWO-ACTIONS"/);
  assert.match(
    poison.description,
    /\*\*Saving Throw\*\* DC 17 Fortitude; \*\*Onset\*\* 1 minute; \*\*Maximum Duration\*\* 6 rounds/
  );
  assert.match(poison.description, /\*\*Stage 1\*\* 1d6 \[poison\]\(link_trait_1476\) plus enfeebled 1 \(1 round\)/);
  assert.match(poison.description, /\*\*Stage 2\*\* 1d6 \[poison\]\(link_trait_1476\) plus drained 1 \(1 round\)/);
  assert.match(poison.description, /\*\*Stage 3\*\* 2d6 \[poison\]\(link_trait_1476\) plus enfeebled 1 \(1 round\)/);
  for (const [i, mask] of proposed.slice(2).entries()) {
    const threshold = i ? 10 : 5;
    assert.match(
      mask.description,
      /If you \[Stride\]\(link_action_19855\) at least 10 feet, your next melee \[Strike\]\(link_action_19856\) before the end of your turn/
    );
    assert.ok(mask.description.includes(`Hardness of ${threshold} or less`));
    assert.ok(mask.description.includes(`more than Hardness ${threshold}, the mask grants no benefit`));
    assert.ok(!mask.description.includes('**Activate**'));
  }
  assert.ok([poison, ...proposed.slice(2)].every((row) => row.operations.length === 0));
});

test('actual renderer shows activation/divider and all plain conditions, without import wrappers or fake condition links', async () => {
  await calculate([]);
  for (const row of proposed) {
    const html = engine.renderRichText(row.description);
    assert.doesNotMatch(html, /\[\[|@UUID|@Check|link_condition_/);
    const labels =
      row.name === 'Violet Venom'
        ? ['enfeebled', 'drained']
        : row.name === 'Spiritsight Ring'
          ? ['hidden', 'undetected']
          : [];
    for (const label of labels) {
      assert.match(html, new RegExp(`<a\\b[^>]*>${label}<\\/a>`));
      assert.doesNotMatch(engine.renderRichText(row.description, [label]), new RegExp(`<a\\b[^>]*>${label}<\\/a>`));
    }
    if (row.name === 'Violet Venom') {
      assert.match(html, /<abbr class="action-symbol">2<\/abbr>/);
      assert.match(html, /role="separator"/);
    }
  }
});

test('actual ring conditional bonus leaves normal math unchanged and collector/display retain range-less vague detection', async () => {
  const baseline = await calculate([]);
  const active = await calculate([inventoryItem(ring, { is_invested: true })]);
  assert.equal(active.perception, baseline.perception);
  assert.equal(active.dc, baseline.dc);
  assert.equal(active.conditional.length, 1);
  assert.match(
    active.conditional[0].text,
    /^\+2 item bonus when using the Seek action to find hidden or undetected incorporeal creatures within 30 feet of you$/
  );
  const sense = active.senses.vague.find((s) => s.senseName === 'Incorporeal Creatures');
  assert.ok(sense);
  assert.equal(sense.type, 'vague');
  assert.equal(sense.range, '');
  assert.equal(sense.sense, undefined);
  assert.equal(engine.displaySense(sense).trim(), 'Incorporeal Creatures');
  assert.ok(!active.senses.precise.some((s) => s.senseName === sense.senseName));
  assert.ok(!active.senses.imprecise.some((s) => s.senseName === sense.senseName));
  const html = engine.renderPerceptionDrawer('CHARACTER');
  assert.match(html, /Incorporeal Creatures/);
  assert.doesNotMatch(html, /Incorporeal Creatures \(30 ft/);
  assert.doesNotMatch(html, /<a\b[^>]*>Incorporeal Creatures/);
  assert.match(ring.description, /you might not do so instantly, and you can't pinpoint the location/);
  assert.match(ring.description, /Stealth check against your Perception DC/);
});

test('actual combined prerequisite gates investment, removal, containers, formulas, duplicates and saved source ownership', async () => {
  const baseline = await calculate([]),
    active = await calculate([inventoryItem(ring, { is_invested: true })]);
  assert.deepEqual(await calculate([inventoryItem(ring)]), baseline);
  assert.deepEqual(await calculate([inventoryItem(ring, { is_invested: true, is_equipped: true })]), active);
  for (const flags of [
    { is_formula: true },
    { is_formula: true, is_invested: true },
    { is_formula: true, is_invested: true, is_equipped: true },
  ])
    assert.deepEqual(await calculate([inventoryItem(ring, flags)]), baseline, 'formulas are not physical owners');
  const container = {
    ...structuredClone(proposed[0]),
    id: -23999,
    name: 'Local container',
    traits: [],
    operations: [],
    usage: 'held in 2 hands',
    meta_data: { bulk: { capacity: 10 } },
  };
  assert.deepEqual(
    await calculate([inventoryItem(container, { container_contents: [inventoryItem(ring, { is_invested: true })] })]),
    baseline
  );
  assert.deepEqual(
    await calculate([
      inventoryItem(ring, { id: 'first-copy', is_invested: true }),
      inventoryItem(ring, { id: 'second-copy', is_invested: true }),
    ]),
    active
  );
  assert.deepEqual(
    await calculate([inventoryItem(ring, { is_invested: true })], [3]),
    active,
    'saved physical item is not erased by source filtering'
  );
  assert.deepEqual(
    await calculate(
      proposed
        .filter((p) => p.name !== ring.name)
        .map((p) => inventoryItem(p, { is_invested: true, is_equipped: true }))
    ),
    baseline
  );
  assert.deepEqual(await calculate(proposed.map((p) => inventoryItem(p, { is_invested: true }))), active);
});

test('new inventory clones, saved snapshots, actual removal and light bulk grouping remain intact', async () => {
  const existing = { ...structuredClone(proposed[0]), id: -23998, name: 'Unrelated saved item' };
  let character = { ...summoner([inventoryItem(existing)]), companions: { list: [] } };
  const saved = structuredClone(character.inventory.items[0]),
    frozen = structuredClone(proposed);
  for (const row of proposed)
    await engine.handleAddItem(
      (fn) => {
        character = fn(character);
      },
      row,
      false
    );
  InventorySchema.parse(character.inventory);
  assert.equal(character.inventory.items.length, 5);
  assert.deepEqual(
    character.inventory.items.find((r) => r.id === saved.id),
    saved
  );
  assert.deepEqual(proposed, frozen);
  assert.ok(character.inventory.items.every((r) => !r.is_invested && !r.is_equipped));
  const entry = character.inventory.items.find((r) => r.item.name === ring.name);
  engine.handleDeleteItem((fn) => {
    character = fn(character);
  }, entry);
  assert.equal(character.inventory.items.length, 4);
  assert.deepEqual(
    character.inventory.items.find((r) => r.id === saved.id),
    saved
  );
  for (const [quantity, bulk] of [
    [1, 0.1],
    [9, 0.1],
    [10, 1],
  ]) {
    assert.equal(
      engine.getItemBulk(inventoryItem({ ...proposed[0], meta_data: { ...proposed[0].meta_data, quantity } })),
      bulk
    );
    assert.equal(
      engine.getItemBulk(
        inventoryItem({ ...proposed[0], meta_data: { ...proposed[0].meta_data, quantity } }, { is_formula: true })
      ),
      0
    );
  }
});

test('captured global official inventory permits only absent or exact terminal identities, including legacy ring alias and citation IDs', async () => {
  const dump = await readFile(new URL('../../data/data.sql', import.meta.url), 'utf8');
  const block = dump.split('COPY public.content_source (')[1];
  const sourceIds = block
    .slice(block.indexOf('\n') + 1)
    .split('\n\\.')[0]
    .split('\n')
    .filter(Boolean)
    .map((line) => Number(line.split('\t')[0]));
  const all = await readContentRows([{ table: 'item', sourceIds }]);
  const terminalIds = new Set(spec.items.map((p) => p.uuid));
  const known = all.filter((r) => terminalIds.has(String(r.row.uuid)));
  assert.ok(known.length === 0 || known.length === 4);
  for (const row of all.map((r) => r.row)) {
    const alias = spec.aliases.some((a) => a.names.some((n) => norm(row.name).startsWith(n)));
    const url = row.meta_data?.source?.url ?? '';
    const citation =
      /^https?:\/\/2e\.aonprd\.com\/Equipment\.aspx\?/i.test(url) &&
      spec.aliases.some((a) => a.citation_ids.includes(Number(/[?&]id=(\d+)/.exec(url.toLowerCase())?.[1])));
    if (alias || citation) assert.ok(terminalIds.has(String(row.uuid)) && row.content_source_id === 16);
  }
  assert.equal(all.filter((r) => r.row.content_source_id === 16).length, known.length ? 1113 : 1109);
});

test('SQL guards queue/status/type identities before replay and captures full baselines with strict insert/count CAS plus final readback', () => {
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.match(body, /lock table public\.item in share row exclusive mode/);
  assert.ok(body.indexOf('lock table public.item') < body.indexOf('for update'));
  assert.ok(body.indexOf('pending content requires review') < body.indexOf('terminal_count=4'));
  assert.match(body, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.match(body, /u\.content_source_id=16 or u\.data->>'content_source_id'='16'/);
  assert.match(body, /u\.type=d->>'queue_type'/);
  for (const sql of [body, release]) {
    assert.match(sql, /u\.data#>>'\{meta_data,source,url\}'/);
    assert.match(sql, /substring\(lower\(u\.data#>>'\{meta_data,source,url\}'\) from '\[\?&\]id=\(\[0-9\]\+\)'\)/);
    assert.match(sql, /substring\(lower\(i\.meta_data#>>'\{source,url\}'\) from '\[\?&\]id=\(\[0-9\]\+\)'\)/);
  }
  assert.ok(
    spec.dependencies.filter((d) => d.table === 'ability_block').every((d) => d.queue_type === 'ability-block')
  );
  assert.match(body, /captured_items from public\.item/);
  assert.match(body, /current_hashes is distinct from captured_items/);
  assert.match(body, /inserted_rows->\(actual->>'id'\)/);
  assert.match(body, /row_count<>1 then raise exception 'Missing equipment INSERT CAS failed'/);
  assert.match(body, /row_count<>1 then raise exception 'Missing equipment count CAS failed'/);
  assert.match(body, /jsonb_set\(s\.meta_data::jsonb,'\{counts,item\}',spec->'terminal_item_count',false\)/);
  assert.match(body, /array\(select value::json from jsonb_array_elements/);
  assert.match(body, /s\.id is null or s\.user_id is null/);
  assert.doesNotMatch(
    body,
    /delete from|update public\.(item|trait|ability_block|creature|character)|alter table|create function/i
  );
  assert.match(release, /as passed from settings/);
  assert.match(release, /count\(distinct i\.id\)=4/);
  assert.equal(spec.baseline_item_count, 1109);
  assert.equal(spec.terminal_item_count, 1113);
});
