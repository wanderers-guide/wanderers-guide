import assert from 'node:assert/strict';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { ItemSchema, InventorySchema, SpellSchema, AbilityBlockSchema, TraitSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001140000_treasure_vault_library_staff_repairs.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-library-staff-repairs.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$library$')[1]);
assert.deepEqual(JSON.parse(release.split('$library$')[1]), spec);
const rows = await readContentRows([
  ...spec.items.map(({ id }) => ({ table: 'item', id })),
  ...spec.dependencies.map(({ table, id }) => ({ table: table.replace('-', '_'), id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
  { table: 'item', id: 11746 },
]);
const get = (table, id) => {
  const row = rows.find((r) => r.table === table && r.row.id === id)?.row;
  assert.ok(row, `${table}:${id}`);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const projection = (row) => (Object.hasOwn(row.meta_data, 'source') ? { source: row.meta_data.source } : {});
const assertFields = (row, expected) => {
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value, `${row.id}/${key}`);
};
function ownerState(row, patch) {
  assertFields(row, patch.expected);
  assert.ok(row.meta_data && typeof row.meta_data === 'object' && !Array.isArray(row.meta_data));
  for (const [key, value] of Object.entries(patch.metadata)) assert.deepEqual(row.meta_data[key], value);
  return assertReviewedTransition(
    { description: row.description, operations: row.operations },
    { description: patch.description.before, operations: patch.operations.before },
    { description: patch.description.after, operations: patch.operations.after },
    `Unreviewed ${row.id} description/operations pair`
  );
}
function ownerAt(row, patch, state) {
  ownerState(row, patch);
  return {
    ...structuredClone(row),
    description: patch.description[state],
    operations: structuredClone(patch.operations[state]),
  };
}
function dependencyState(row, dependency) {
  assert.ok(row.meta_data && typeof row.meta_data === 'object' && !Array.isArray(row.meta_data));
  for (const [index, state] of dependency.states.entries()) {
    try {
      assertFields(row, state.expected);
      assert.equal(row.description, state.description);
      assert.equal(md5(row.description), state.description_md5);
      assert.deepEqual(projection(row), state.citation);
      return index;
    } catch {
      /* Try only the other expressly reviewed complete state. */
    }
  }
  assert.fail(`Unreviewed dependency ${row.id}`);
}
function dependencyAt(row, dependency, index) {
  dependencyState(row, dependency);
  const state = dependency.states[index];
  const result = {
    ...structuredClone(row),
    ...structuredClone(state.expected),
    description: state.description,
    meta_data: { ...row.meta_data },
  };
  delete result.meta_data.source;
  Object.assign(result.meta_data, state.citation);
  return result;
}
const originals = spec.items.map((p) => ownerAt(get('item', p.id), p, 'before'));
const proposed = spec.items.map((p, i) => ownerAt(originals[i], p, 'after'));
const dependencyRows = spec.dependencies.map((d) => dependencyAt(get(d.table.replace('-', '_'), d.id), d, 0));
const spells = dependencyRows.filter((row) => spec.dependencies.some((d) => d.table === 'spell' && d.id === row.id));
const pairExpectations = [
  [
    [8800, 0],
    [4794, 0],
    [7610, 1],
    [9010, 1],
    [7366, 1],
    [4905, 2],
    [9053, 2],
  ],
  [
    [8800, 0],
    [4794, 0],
    [7610, 1],
    [9010, 1],
    [7366, 1],
    [4905, 2],
    [9053, 2],
    [4905, 3],
    [7610, 3],
    [9010, 3],
    [7366, 3],
    [4905, 4],
    [9010, 5],
    [7366, 5],
  ],
  [
    [9011, 0],
    [4516, 1],
    [9015, 1],
    [8803, 2],
    [9000, 2],
    [8817, 3],
    [5449, 3],
    [8803, 4],
    [4865, 4],
    [8803, 5],
    [4516, 5],
    [5367, 5],
    [4865, 5],
  ],
];
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('three full tier clones change only descriptions and Socialite scoped operations, retaining original citations and physical statistics', () => {
  assert.deepEqual(
    spec.items.map((p) => p.id),
    [12153, 12152, 12425]
  );
  assert.equal(
    spec.items.reduce((sum, p) => sum + p.description.replacements.reduce((n, r) => n + r.count, 0), 0),
    40
  );
  for (const [index, patch] of spec.items.entries()) {
    const old = originals[index],
      next = proposed[index];
    ItemSchema.parse(old);
    ItemSchema.parse(next);
    assert.deepEqual({ ...next, description: old.description, operations: old.operations }, old);
    assert.deepEqual(next.meta_data, old.meta_data);
    assert.equal(md5(old.description), patch.description.before_md5);
    let text = old.description;
    for (const replacement of patch.description.replacements) {
      assert.equal(text.split(replacement.from).length - 1, replacement.count);
      text = text.replaceAll(replacement.from, replacement.to);
    }
    assert.equal(text, next.description);
    assert.equal(md5(text), patch.description.after_md5);
    assert.deepEqual(ownerAt(next, patch, 'before'), old);
    assert.deepEqual(ownerAt(next, patch, 'after'), next);
  }
  assert.match(proposed[0].description, /store up to 50 texts\./);
  assert.match(proposed[1].description, /store up to 100 texts\./);
  assert.equal(proposed[0].operations, null);
  assert.equal(proposed[1].operations, null);
  const bonus = proposed[2].operations[0];
  assert.match(bonus.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(bonus.id, get('item', 11746).operations[0].id);
  assert.deepEqual(bonus.data, {
    variable: 'SKILL_DIPLOMACY',
    value: 2,
    type: 'circumstance',
    text: 'to Make an Impression on members of high society',
  });
  assert.equal(bonus.type, get('item', 11746).operations[0].type);
});

test('all24 actual official dependencies and six sources retain reviewed exact identity, subtype, mechanics and citation states', () => {
  assert.equal(spec.dependencies.length, 24);
  assert.equal(spec.sources.length, 6);
  for (const source of spec.sources) assertFields(get('content_source', source.id), source);
  for (const [index, dependency] of spec.dependencies.entries()) {
    const row = dependencyRows[index];
    assert.equal(dependencyState(row, dependency), 0);
    if (dependency.table === 'spell') SpellSchema.parse(row);
    else if (dependency.table === 'ability-block') AbilityBlockSchema.parse(row);
    else TraitSchema.parse(row);
    assert.equal(get('content_source', row.content_source_id).user_id, null);
    assert.equal(get('content_source', row.content_source_id).is_published, true);
    for (let state = 0; state < dependency.states.length; state++)
      assert.equal(dependencyState(dependencyAt(row, dependency, state), dependency), state);
  }
  assert.equal(get('ability_block', 19611).type, 'action');
  assert.equal(get('ability_block', 19739).type, 'action');
  assert.equal(get('spell', 7610).rarity, 'RARE');
  assert.equal(get('spell', 7610).content_source_id, 493);
  assert.equal(get('spell', 7366).content_source_id, 420);
  assert.equal(get('spell', 8800).content_source_id, 842);
  assert.deepEqual(get('spell', 9010).heightened.text, [
    { amount: '(3rd)', text: 'The spell can sort up to 500 objects in a minute, or 75 objects in a round.' },
  ]);
});

test('actual helper and staff parser resolve all34 cumulative rank entries, every reference and remastered activation', () => {
  assert.deepEqual(
    spec.items.map((p) => p.pairs),
    pairExpectations
  );
  for (const [index, row] of proposed.entries()) {
    const parsed = engine.detectSpells(row.description, spells);
    assert.deepEqual(
      parsed.map(({ spell, rank }) => [spell.id, rank]),
      pairExpectations[index]
    );
    for (const [id] of pairExpectations[index])
      assert.ok(
        row.description.includes(`*${engine.convertToHardcodedLink('spell', get('spell', id).name.toLowerCase())}*`)
      );
    const html = engine.renderRichText(row.description);
    assert.equal((html.match(/<em><a\b[^>]*>/g) ?? []).length, pairExpectations[index].length);
    assert.doesNotMatch(html, /\[\[|@UUID/);
    assert.match(html, />Cast a Spell<\/a>/);
    assert.ok(row.description.includes(engine.convertToHardcodedLink('action', 'Cast a Spell')));
    if (index < 2) {
      assert.match(row.description, /cost="THREE-ACTIONS"/);
      assert.ok(row.description.includes(engine.convertToHardcodedLink('trait', 'concentrate')));
      assert.ok(row.description.includes(engine.convertToHardcodedLink('trait', 'manipulate')));
    } else assert.ok(row.description.includes(engine.convertToHardcodedLink('action', 'Make an Impression')));
  }
  assert.deepEqual(engine.detectSpells(originals[1].description, spells), []);
  assert.deepEqual(engine.detectSpells(originals[2].description, spells), []);
});

function packageContent() {
  return {
    ...emptyContent,
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    items: proposed,
    traits: dependencyRows.filter((r) => spec.dependencies.some((d) => d.table === 'trait' && d.id === r.id)),
    sources: spec.sources.map((s) => get('content_source', s.id)),
    spells,
  };
}
async function calculate(items = [], kind = 'character', id = 'socialite-companion') {
  const character = { ...summoner(items), companions: { list: [] }, content_sources: { enabled: [16] } };
  const content = packageContent();
  engine.clearOperationErrorNotifications();
  if (kind === 'character')
    await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  else {
    const result = await engine._executeCharacterOperations({
      character: summoner([]),
      content,
      context: 'CHARACTER-SHEET',
    });
    await engine._executeCreatureOperations({
      id,
      creature: { name: 'Socialite companion', level: 1, operations: [], inventory: character.inventory },
      content,
      charStore: result.store,
    });
  }
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return engine.getVariableBreakdown(kind === 'character' ? 'CHARACTER' : id, 'SKILL_DIPLOMACY');
}
test('actual character/creature controller bonus is conditional, equipment-local, removable, and never an unconditional Diplomacy modifier', async () => {
  for (const kind of ['character', 'creature']) {
    const base = await calculate([], kind);
    const equipped = inventoryItem(proposed[2], { is_equipped: true });
    const saved = structuredClone(equipped);
    assert.deepEqual((await calculate([inventoryItem(originals[2], { is_equipped: true })], kind)).conditionals, []);
    const result = await calculate([equipped], kind);
    assert.equal(result.baseValue, base.baseValue);
    assert.equal(result.bonusValue, base.bonusValue);
    assert.deepEqual(result.conditionals, [
      { text: '+2 circumstance bonus to Make an Impression on members of high society', source: 'Socialite Staff' },
    ]);
    assert.deepEqual(equipped, saved);
    for (const items of [
      [],
      [inventoryItem(proposed[2])],
      [inventoryItem(proposed[2], { is_formula: true })],
      [
        inventoryItem(
          {
            ...proposed[2],
            id: 990014,
            name: 'Container',
            group: 'GENERAL',
            operations: [],
            traits: [],
            meta_data: { bulk: { capacity: 4 } },
          },
          { container_contents: [equipped] }
        ),
      ],
    ])
      assert.deepEqual((await calculate(items, kind)).conditionals, []);
    // Formula ownership eligibility is a separate controller change, never a general skill grant.
    assert.equal(
      (await calculate([inventoryItem(proposed[2], { is_equipped: true, is_formula: true })], kind)).bonusValue,
      base.bonusValue
    );
  }
});
test('duplicates, typed bonuses and entity/source recalculation preserve stacking and weapon statistics', async () => {
  await calculate([
    inventoryItem(proposed[2], { is_equipped: true }),
    inventoryItem(proposed[2], { id: 'duplicate', is_equipped: true }),
  ]);
  assert.ok(
    engine
      .getVariableBonuses('CHARACTER', 'SKILL_DIPLOMACY')
      .every(
        (b) =>
          b.value === 2 && b.type === 'circumstance' && b.text === 'to Make an Impression on members of high society'
      )
  );
  engine.addVariableBonus('CHARACTER', 'SKILL_DIPLOMACY', 1, 'circumstance', '', 'Ordinary circumstance');
  engine.addVariableBonus('CHARACTER', 'SKILL_DIPLOMACY', 3, 'circumstance', '', 'Stronger circumstance');
  engine.addVariableBonus('CHARACTER', 'SKILL_DIPLOMACY', 2, 'status', '', 'Ordinary status');
  assert.equal(engine.getVariableBreakdown('CHARACTER', 'SKILL_DIPLOMACY').bonusValue, 5);
  await calculate([inventoryItem(proposed[2], { is_equipped: true })], 'creature', 'other-socialite');
  assert.deepEqual(engine.getVariableBreakdown('CHARACTER', 'SKILL_DIPLOMACY').conditionals, []);
  await calculate([], 'creature', 'other-socialite');
  assert.deepEqual(engine.getVariableBreakdown('other-socialite', 'SKILL_DIPLOMACY').conditionals, []);
  await calculate(proposed.map((row) => inventoryItem(row, { is_equipped: true })));
  for (const [index, row] of proposed.entries())
    assert.deepEqual(engine.getWeaponStats('CHARACTER', row), engine.getWeaponStats('CHARACTER', originals[index]));
});
test('actual item dependency loading/filtering never enables disabled ordinary spell catalogs and remains ownership-scoped', () => {
  const items = proposed.map((row) => inventoryItem(row, { is_equipped: true }));
  const ids = [...new Set(spells.map((s) => s.id))].sort((a, b) => a - b);
  assert.deepEqual(
    engine.filterByTraitType(items, 'STAFF').map((i) => i.item.id),
    [12153, 12152, 12425]
  );
  assert.deepEqual(engine.getInventorySpellIds(items), ids);
  assert.deepEqual(engine.getInventorySpellIds(proposed.map((row) => inventoryItem(row))), []);
  assert.deepEqual(engine.getInventorySpellIds([]), []);
  const ordinary = spells.filter((s) => s.content_source_id === 3);
  const missing = engine.getMissingSpellIds(ordinary, ids);
  const supplemented = engine.mergeSpellDependencies(ordinary, [...spells, ...spells], missing);
  assert.equal(supplemented.length, 16);
  assert.deepEqual(
    ordinary.map((s) => s.id).sort((a, b) => a - b),
    [4516, 4794, 4865, 4905]
  );
  assert.equal(engine.mergeSpellDependencies(ordinary, spells, []), ordinary);
  assert.deepEqual(
    engine.filterSpellCatalog(supplemented, 'quick sort', 'THREE-ACTIONS', () => []).map((s) => s.id),
    [9010]
  );
  assert.deepEqual(
    engine.filterSpellCatalog(supplemented, 'quick sort', 'TWO-ACTIONS', () => []),
    []
  );
});
test('paired owner/rule drift and NULLs fail closed; saved inventories remain untouched', () => {
  for (const [index, patch] of spec.items.entries()) {
    const row = originals[index];
    for (const changes of [
      { name: 'drift' },
      { uuid: null },
      { content_source_id: null },
      { level: null },
      { traits: [] },
      { price: null },
      { meta_data: null },
      { meta_data: [] },
      { description: null },
    ])
      assert.throws(() => ownerState({ ...row, ...changes }, patch));
    if (patch.id === 12425) {
      assert.throws(() => ownerState({ ...row, operations: proposed[index].operations }, patch));
      assert.throws(() => ownerState({ ...proposed[index], operations: null }, patch));
    }
  }
  const glimmer = spec.dependencies.find((d) => d.id === 5367 && d.table === 'spell');
  const beforeRow = dependencyAt(get('spell', 5367), glimmer, 0);
  assert.throws(() => dependencyState({ ...beforeRow, defense: 'Will' }, glimmer));
  assert.throws(() => dependencyState({ ...beforeRow, duration: 'sustained up to 1 minute' }, glimmer));
  for (const dependency of spec.dependencies) {
    const row = dependencyAt(get(dependency.table.replace('-', '_'), dependency.id), dependency, 0);
    assert.throws(() => dependencyState({ ...row, uuid: null }, dependency));
    assert.throws(() => dependencyState({ ...row, meta_data: null }, dependency));
    assert.throws(() => dependencyState({ ...row, description: row.description + ' drift' }, dependency));
  }
  const inventory = summoner(originals.map((row) => inventoryItem(row, { is_equipped: true }))).inventory;
  InventorySchema.parse(inventory);
  const saved = structuredClone(inventory);
  spec.items.forEach((patch, index) => ownerAt(originals[index], patch, 'after'));
  assert.deepEqual(inventory, saved);
});
test('SQL retains json[] operations, exact pairs, stable queue/source/dependency checks before replay, and strict terminal release', () => {
  const childPrelockStart = migration.indexOf('-- Acquire reviewed content rows before source cache locks.');
  const childPrelockEnd = migration.indexOf('-- End reviewed content row prelocks.');
  assert.ok(migration.indexOf('lock table public.content_update') < childPrelockStart);
  assert.ok(
    childPrelockStart < childPrelockEnd &&
      childPrelockEnd < migration.indexOf('from public.content_source', migration.indexOf('\nbegin\n'))
  );
  const childPrelocks = migration.slice(childPrelockStart, childPrelockEnd);
  assert.doesNotMatch(childPrelocks, /\b(?:update|insert|delete)\s+public\.|\b(?:continue|return)\b/i);
  assert.match(
    childPrelocks,
    /public\.item i[\s\S]*?jsonb_array_elements\(spec->'items'\)[\s\S]*?order by i\.id for update/
  );
  for (const [table, type, alias] of [
    ['ability_block', 'ability-block', 'a'],
    ['spell', 'spell', 's'],
    ['trait', 'trait', 't'],
  ]) {
    assert.match(
      childPrelocks,
      new RegExp(
        `public\\.${table} ${alias}[\\s\\S]*?jsonb_array_elements\\(spec->'dependencies'\\)[\\s\\S]*?where d->>'table' = '${type}'[\\s\\S]*?order by ${alias}\\.id for share;`
      )
    );
  }
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /array\(select value::json from jsonb_array_elements/);
  assert.ok(
    migration.indexOf('Library dependency has a pending curator submission') < migration.indexOf('if actual_pair=')
  );
  assert.ok(migration.indexOf('Library staff has a pending curator submission') < migration.indexOf('if actual_pair='));
  assert.match(migration, /u\.data->>'content_source_id'=dependency->>'source'/);
  assert.match(migration, /u\.data->>'content_source_id'=item_row\.content_source_id::text/);
  assert.match(migration, /u\.data->>'id'=source_spec->>'id'/);
  assert.match(release, /u\.data->>'content_source_id'=d\.value->>'source'/);
  assert.match(release, /u\.data->>'content_source_id'=p#>>'\{expected,content_source_id\}'/);
  assert.match(release, /u\.data->>'id'=s->>'id'/);
  assert.match(migration, /get diagnostics changed_rows=row_count/);
  assert.match(migration, /if changed_rows<>1 then/);
  assert.match(migration, /Library staff CAS failed/);
  assert.equal((migration.match(/update public\.item set /g) ?? []).length, 1);
  assert.doesNotMatch(migration, /update public\.(?:spell|trait|ability_block|content_source|character)/);
  assert.match(release, /coalesce\(/);
  assert.match(release, /is not true/);
  assert.match(release, /false\) passed/);
});
