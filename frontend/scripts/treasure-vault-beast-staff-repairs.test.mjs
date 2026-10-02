import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AbilityBlockSchema, InventorySchema, ItemSchema, SpellSchema, TraitSchema } from '../src/schemas/content.ts';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const { uniqueId } = uploadUtils;
const migration = await readFile(
  new URL('../../supabase/migrations/20261001110000_treasure_vault_beast_staff_repairs.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-beast-staff-repairs.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$beast$')[1]);
const rows = await readContentRows([
  ...spec.items.map(({ id }) => ({ table: 'item', id })),
  ...spec.dependencies.map(({ table, id }) => ({ table, id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
  { table: 'item', id: 11746 },
]);
const getRow = (table, id) => {
  const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
  assert.ok(row, `${table}:${id} fixture missing`);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const leafPair = (row) => ({ description: row.description, operations: row.operations });
const ownerState = (row, patch) => {
  for (const [field, value] of Object.entries(patch.expected))
    assert.deepEqual(field === 'uuid' ? Number(row[field]) : row[field], value, `${row.id} ${field}`);
  for (const [field, value] of Object.entries(patch.metadata)) assert.deepEqual(row.meta_data?.[field], value);
  const actual = leafPair(row);
  for (const state of ['before', 'after']) {
    if (
      JSON.stringify(actual) ===
      JSON.stringify({ description: patch.description[state], operations: patch.operations[state] })
    )
      return state;
  }
  assert.fail('Unreviewed Beast Staff description/operations pair');
};
function ownerAt(row, patch, state) {
  ownerState(row, patch);
  const result = structuredClone(row);
  result.description = patch.description[state];
  result.operations = structuredClone(patch.operations[state]);
  return result;
}
const spellState = (row) => {
  const actual = { traditions: row.traditions, defense: row.defense };
  for (const state of ['before', 'after'])
    if (JSON.stringify(actual) === JSON.stringify(spec.spell[state])) return state;
  assert.fail('Unreviewed Cursed Metamorphosis traditions/defense pair');
};
function curseAt(row, state) {
  spellState(row);
  return { ...structuredClone(row), ...structuredClone(spec.spell[state]) };
}
const beforeRows = spec.items.map((patch) => ownerAt(getRow('item', patch.id), patch, 'before'));
const afterRows = spec.items.map((patch, index) => ownerAt(beforeRows[index], patch, 'after'));
const beforeCurse = curseAt(getRow('spell', 4550), 'before');
const afterCurse = curseAt(beforeCurse, 'after');
const spells = spec.dependencies
  .filter(({ table }) => table === 'spell')
  .map(({ id }) => (id === 4550 ? afterCurse : getRow('spell', id)));
const pairs = [
  [
    [4645, 0],
    [4812, 1],
    [4759, 1],
    [4396, 2],
    [4601, 2],
    [4396, 3],
    [4685, 3],
    [4396, 4],
    [6717, 4],
    [4685, 4],
    [4759, 4],
  ],
  [
    [4645, 0],
    [4812, 1],
    [4759, 1],
    [4396, 2],
    [4601, 2],
    [4396, 3],
    [4685, 3],
    [4396, 4],
    [6717, 4],
    [4685, 4],
    [4759, 4],
    [4396, 5],
    [4685, 5],
    [4731, 5],
    [4550, 6],
    [4731, 6],
  ],
];
let engine;
before(async () => {
  engine = await createOperationEngine();
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('two complete staff pairs, 33 references and the conditional +2 circumstance operation are canonical', () => {
  assert.deepEqual(
    spec.items.map(({ id }) => id),
    [11744, 11745]
  );
  assert.equal(
    spec.items.reduce((sum, p) => sum + p.description.replacements.reduce((n, r) => n + r.count, 0), 0),
    33
  );
  assert.equal(
    spec.items
      .flatMap((p) => p.description.replacements)
      .filter((r) => r.to.includes('link_spell_'))
      .reduce((n, r) => n + r.count, 0),
    29
  );
  const base = getRow('item', 11746);
  assert.equal(base.operations.length, 1);
  assert.deepEqual(base.operations[0].data, {
    text: 'to checks using Animal Empathy',
    type: 'circumstance',
    value: 1,
    variable: 'SKILL_DIPLOMACY',
  });
  const operationIds = new Set();
  for (const [i, patch] of spec.items.entries()) {
    const old = beforeRows[i],
      next = afterRows[i];
    ItemSchema.parse(old);
    ItemSchema.parse(next);
    assert.equal(Number(old.uuid), uniqueId(old.name, 'item', old.level, 16));
    assert.equal(old.operations, null);
    assert.equal(next.operations.length, 1);
    const operation = next.operations[0];
    assert.match(operation.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(operation.id, base.operations[0].id);
    operationIds.add(operation.id);
    assert.deepEqual(
      { ...operation, id: base.operations[0].id },
      { ...base.operations[0], data: { ...base.operations[0].data, value: 2 } }
    );
    let repaired = old.description;
    assert.equal(md5(repaired), patch.description.before_md5);
    for (const replacement of patch.description.replacements) {
      assert.equal(repaired.split(replacement.from).length - 1, replacement.count);
      repaired = repaired.replaceAll(replacement.from, replacement.to);
    }
    assert.equal(repaired, next.description);
    assert.equal(md5(repaired), patch.description.after_md5);
    assert.match(repaired, /While wielding the staff while you have it prepared/);
    assert.match(
      repaired,
      /If you have \[Animal Empathy\]\(link_feat_19908\), you gain a \+2 circumstance bonus on checks using it\./
    );
    assert.match(repaired, /\*\*Activate\*\* \[Cast a Spell\]\(link_action_19611\)/);
    assert.doesNotMatch(repaired, /\\\[\\\[|@UUID|hourly|automation|GM note|manual note/i);
    assert.deepEqual({ ...next, description: old.description, operations: old.operations }, old);
    assert.deepEqual(ownerAt(next, patch, 'after'), next);
    assert.deepEqual(ownerAt(next, patch, 'before'), old);
    assert.deepEqual(next.meta_data.source, {
      url: 'https://2e.aonprd.com/Equipment.aspx?ID=4779',
      book: 'Treasure Vault',
      page: '131',
    });
  }
  assert.equal(operationIds.size, 2);
});

test('Cursed Metamorphosis repairs only its two proved upstream leaves, preserving identity, prose, citation and full schema', () => {
  assert.deepEqual(spec.spell.before, { traditions: ['arcane', 'primal'], defense: null });
  assert.deepEqual(spec.spell.after, { traditions: ['arcane', 'occult', 'primal'], defense: 'Fortitude' });
  SpellSchema.parse(beforeCurse);
  SpellSchema.parse(afterCurse);
  assert.deepEqual({ ...afterCurse, ...spec.spell.before }, beforeCurse);
  assert.deepEqual(afterCurse.meta_data.source, {
    url: 'https://2e.aonprd.com/Spells.aspx?ID=1479',
    book: 'Player Core',
    page: '322',
  });
  assert.equal(afterCurse.content_source_id, 3);
  assert.equal(afterCurse.rank, 6);
  assert.equal(afterCurse.cast, 'TWO-ACTIONS');
  assert.deepEqual(curseAt(afterCurse, 'after'), afterCurse);
});

test('all 13 published dependencies have exact row subtype, fields, text hash and existing citation; sources are official', () => {
  assert.equal(spec.dependencies.length, 13);
  for (const dependency of spec.dependencies) {
    assert.match(String(dependency.expected.uuid), /^[0-9]+$/);
    assert.ok(BigInt(dependency.expected.uuid) <= 9223372036854775807n);
    if (typeof dependency.expected.uuid === 'number') assert.ok(Number.isSafeInteger(dependency.expected.uuid));
    const row = dependency.id === 4550 ? afterCurse : getRow(dependency.table, dependency.id);
    for (const [field, value] of Object.entries(dependency.expected))
      assert.deepEqual(
        field === 'uuid' ? Number(row[field]) : row[field],
        field === 'uuid' ? Number(value) : value,
        `${dependency.id} ${field}`
      );
    assert.equal(md5(row.description), dependency.description_md5);
    assert.deepEqual(row.meta_data?.source ?? null, dependency.citation);
    if (dependency.table === 'spell') SpellSchema.parse(row);
    else if (dependency.table === 'ability_block') AbilityBlockSchema.parse(row);
    else TraitSchema.parse(row);
    const source = getRow('content_source', row.content_source_id);
    assert.equal(source.user_id, null);
    assert.equal(source.is_published, true);
  }
  assert.equal(getRow('ability_block', 19611).type, 'action');
  assert.equal(getRow('ability_block', 19611).actions, null);
  assert.equal(getRow('ability_block', 19908).type, 'feat');
  for (const source of spec.sources) assert.equal(getRow('content_source', source.id).name, source.name);
});

test('real canonical link helpers resolve every occurrence and the staff parser retains the complete cumulative 11/16 charge lists', () => {
  for (const [i, row] of afterRows.entries()) {
    assert.deepEqual(engine.detectSpells(beforeRows[i].description, spells, false), []);
    const parsed = engine.detectSpells(row.description, spells, false);
    assert.deepEqual(
      parsed.map((s) => [s.spell.id, s.rank]),
      pairs[i]
    );
    assert.ok(!parsed.some((s) => s.spell.id === 4847), 'narrative Speak with Animals is not a charge-list entry');
    for (const [, display, type, id] of row.description.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)) {
      const target = getRow(type === 'spell' ? 'spell' : 'ability_block', Number(id));
      const actualType = type === 'spell' ? 'spell' : target.type;
      const canonical = engine.convertToHardcodedLink(actualType, target.name, display);
      assert.equal(type, actualType, 'written link subtype matches the published ability row');
      assert.equal(canonical, `[${display}](link_${type}_${id})`);
      assert.equal(engine.buildHrefFromContentData(type, target.id), `link_${type}_${id}`);
      if (type === 'spell') assert.equal(display, display.toLowerCase());
    }
    const html = renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm] }, row.description));
    assert.equal((html.match(/<em><a href="link_spell_/g) ?? []).length, i === 0 ? 12 : 17);
    assert.match(html, /<a href="link_feat_19908">Animal Empathy<\/a>/);
    assert.doesNotMatch(html, /\[\[|@UUID/);
  }
});

function packageContent(items = afterRows) {
  return {
    ...emptyContent,
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    items,
    traits: rows.filter((x) => x.table === 'trait').map((x) => x.row),
    sources: spec.sources.map((x) => getRow('content_source', x.id)),
    spells,
  };
}
async function calculate(items = [], kind = 'character', id = 'beast-companion') {
  const actor = { ...summoner(items), companions: { list: [] }, content_sources: { enabled: [16] } };
  const content = packageContent(items.map((x) => x.item));
  engine.clearOperationErrorNotifications();
  if (kind === 'character')
    return engine._executeCharacterOperations({ character: actor, content, context: 'CHARACTER-SHEET' });
  const character = await engine._executeCharacterOperations({
    character: summoner([]),
    content,
    context: 'CHARACTER-SHEET',
  });
  const result = await engine._executeCreatureOperations({
    id,
    creature: { name: 'Beast companion', level: 1, operations: [], inventory: actor.inventory },
    content,
    charStore: character.store,
  });
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return result;
}
const conditional = (store) => engine.getVariableBreakdown(store, 'SKILL_DIPLOMACY');

test('real character/creature controllers keep the bonus conditional, equipment-local and removable, never an unconditional Diplomacy adjustment', async () => {
  for (const kind of ['character', 'creature']) {
    const store = kind === 'character' ? 'CHARACTER' : 'beast-companion';
    await calculate([], kind);
    const baseline = conditional(store);
    for (const row of afterRows) {
      const entry = inventoryItem(row, { is_equipped: true });
      const saved = structuredClone(entry);
      await calculate([entry], kind);
      const value = conditional(store);
      assert.equal(value.baseValue, baseline.baseValue);
      assert.equal(value.bonusValue, baseline.bonusValue);
      assert.deepEqual(value.conditionals, [
        { text: '+2 circumstance bonus to checks using Animal Empathy', source: row.name },
      ]);
      assert.deepEqual(entry, saved);
      // Existing controller eligibility is based on equipment, not is_formula. Preserve
      // that behavior; even an equipped formula never receives an unconditional bonus.
      await calculate([inventoryItem(row, { is_equipped: true, is_formula: true })], kind);
      assert.deepEqual(conditional(store).conditionals, value.conditionals);
      assert.equal(conditional(store).bonusValue, baseline.bonusValue);
      for (const inactive of [
        [inventoryItem(row)],
        [inventoryItem(row, { is_formula: true })],
        [
          inventoryItem(
            {
              ...row,
              id: 990011,
              name: 'Pack',
              group: 'GENERAL',
              operations: [],
              traits: [],
              meta_data: { bulk: { capacity: 4 } },
            },
            { container_contents: [entry] }
          ),
        ],
        [],
      ]) {
        await calculate(inactive, kind);
        assert.deepEqual(conditional(store).conditionals, []);
      }
    }
  }
});

test('duplicate/tier copies and typed stacking do not add conditional bonuses to unconditional totals; stores and source results stay isolated', async () => {
  const duplicates = [
    inventoryItem(afterRows[0], { is_equipped: true }),
    inventoryItem(afterRows[0], { id: 'duplicate', is_equipped: true }),
    inventoryItem(afterRows[1], { is_equipped: true }),
  ];
  await calculate(duplicates);
  const raw = engine.getVariableBonuses('CHARACTER', 'SKILL_DIPLOMACY');
  assert.ok(raw.length >= 2);
  assert.ok(
    raw.every((x) => x.value === 2 && x.type === 'circumstance' && x.text === 'to checks using Animal Empathy')
  );
  engine.addVariableBonus('CHARACTER', 'SKILL_DIPLOMACY', 1, 'circumstance', '', 'Ordinary circumstance');
  engine.addVariableBonus('CHARACTER', 'SKILL_DIPLOMACY', 3, 'circumstance', '', 'Stronger circumstance');
  engine.addVariableBonus('CHARACTER', 'SKILL_DIPLOMACY', 2, 'item', '', 'Ordinary item');
  assert.equal(conditional('CHARACTER').bonusValue, 5);
  assert.ok(
    conditional('CHARACTER').conditionals.every(
      (x) => x.text === '+2 circumstance bonus to checks using Animal Empathy'
    )
  );
  await calculate([], 'creature', 'other-beast');
  assert.deepEqual(conditional('other-beast').conditionals, []);
  await calculate([inventoryItem(afterRows[1], { is_equipped: true })], 'creature', 'other-beast');
  assert.deepEqual(
    conditional('CHARACTER').conditionals,
    [],
    'fresh character calculation does not retain another entity item effects'
  );
  assert.equal(conditional('other-beast').conditionals[0].source, 'Beast Staff (Major)');
  await calculate([], 'creature', 'other-beast');
  assert.deepEqual(conditional('other-beast').conditionals, []);
});

test('real STAFF selection and selective dependency loading preserve ordinary catalogs and equipment/source/entity scope', () => {
  const entries = afterRows.map((row) => inventoryItem(row, { is_equipped: true }));
  assert.deepEqual(
    engine.filterByTraitType(entries, 'STAFF').map((x) => x.item.id),
    [11744, 11745]
  );
  assert.deepEqual(engine.getInventorySpellIds(entries), [4396, 4550, 4601, 4645, 4685, 4731, 4759, 4812, 4847, 6717]);
  assert.deepEqual(engine.getInventorySpellIds(afterRows.map((row) => inventoryItem(row))), []);
  assert.deepEqual(engine.getInventorySpellIds([]), []);
  const ordinary = { ...afterRows[0], id: 990012, traits: [] };
  assert.deepEqual(
    engine.getInventorySpellIds([inventoryItem(ordinary, { is_equipped: true, container_contents: entries })]),
    []
  );
  const catalog = [{ ...spells[0], content_source_id: 999 }];
  const ids = engine.getInventorySpellIds(entries);
  const missing = engine.getMissingSpellIds(catalog, ids);
  const merged = engine.mergeSpellDependencies(catalog, [...spells, ...spells], missing);
  assert.equal(merged[0], catalog[0]);
  assert.equal(merged.length, 10);
  assert.equal(engine.mergeSpellDependencies(catalog, spells, []), catalog);
  assert.deepEqual(
    engine.filterSpellCatalog(merged, 'metamorphosis', 'TWO-ACTIONS', () => []).map((x) => x.id),
    [4550]
  );
  assert.match(dependencyModule, /actorId[\s\S]*entityId[\s\S]*storeId[\s\S]*infoSources[\s\S]*pageSources[\s\S]*ids/);
});

test('the actual weapon helper keeps potency, striking dice and all attack profiles unchanged', async () => {
  await calculate(afterRows.map((row) => inventoryItem(row, { is_equipped: true })));
  for (const [index, row] of afterRows.entries()) {
    assert.deepEqual(engine.getWeaponStats('CHARACTER', row), engine.getWeaponStats('CHARACTER', beforeRows[index]));
  }
});
const dependencyModule = await readFile(
  new URL('../src/process/spells/item-spell-dependencies.ts', import.meta.url),
  'utf8'
);

test('full saved inventory/selection snapshots and unrelated nested metadata are not rewritten', () => {
  for (const [i, patch] of spec.items.entries()) {
    const row = structuredClone(beforeRows[i]);
    row.meta_data.custom = { keep: [7, 'nested'], enabled: true };
    const saved = {
      inventory: { items: [inventoryItem(row, { is_equipped: true })], coins: { cp: 1, sp: 2, gp: 3, pp: 4 } },
      selections: { staff: { value: String(row.id) } },
    };
    InventorySchema.parse(saved.inventory);
    const frozen = structuredClone(saved);
    const next = ownerAt(row, patch, 'after');
    ItemSchema.parse(next);
    assert.deepEqual({ ...next, description: row.description, operations: row.operations }, row);
    assert.deepEqual(saved, frozen);
  }
});

test('complete reviewed before/after pairs reject partial, NULL and unknown owner/spell states', () => {
  for (const [i, p] of spec.items.entries()) {
    for (const bad of [
      { ...beforeRows[i], description: p.description.after },
      { ...beforeRows[i], operations: p.operations.after },
      { ...afterRows[i], operations: [] },
      { ...afterRows[i], description: null },
      { ...afterRows[i], description: p.description.after + ' drift' },
      {
        ...afterRows[i],
        operations: [{ ...p.operations.after[0], data: { ...p.operations.after[0].data, type: 'item' } }],
      },
    ])
      assert.throws(() => ownerState(bad, p));
  }
  for (const bad of [
    { ...beforeCurse, traditions: spec.spell.after.traditions },
    { ...beforeCurse, defense: 'Fortitude' },
    { ...afterCurse, traditions: null },
    { ...afterCurse, defense: null },
    { ...afterCurse, defense: 'Will' },
  ])
    assert.throws(() => spellState(bad));
});

test('SQL predicates share exact specs, fail closed, check pending before replay, lock dependencies and use only leaf CAS writes', () => {
  assert.deepEqual(JSON.parse(release.split('$beast$')[1]), spec);
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /user_id is null and s\.is_published is true/);
  assert.ok(migration.indexOf("u.status->>'state' = 'PENDING'") < migration.indexOf('then continue;'));
  for (const sql of [migration, release]) {
    assert.match(sql, /u\.type = 'ability-block' and u\.ref_id in \(19611,19908\)/);
    assert.match(sql, /u\.type = 'spell' and u\.ref_id in \(4396,4550,4601,4645,4685,4731,4759,4812,4847,6717\)/);
    assert.match(sql, /u\.type = 'item' and u\.ref_id in \(11744,11745\)/);
    assert.match(sql, /u\.type = 'content-source'/);
  }
  assert.match(migration, /traditions\/defense differs from reviewed pair/);
  assert.match(migration, /description\/operations differs from reviewed pair/);
  assert.match(migration, /operations = array\(select value::json from jsonb_array_elements/);
  assert.match(migration, /to_jsonb\(operations\) is not distinct from nullif/);
  assert.equal((migration.match(/update public\./g) ?? []).length, 2);
  assert.doesNotMatch(
    migration,
    /insert into|delete from|set name|set uuid|set content_source_id|set updated_at|nextval|setval/i
  );
  assert.match(release, /count\(\*\)=2 and bool_and/);
  assert.match(release, /count\(\*\)=13 and bool_and/);
  assert.match(release, /actual->'operations' is not distinct from patch #> '\{operations,after\}'/);
  assert.match(release, /is distinct from property\.value/);
  assert.doesNotMatch(release, /\b(update|insert|delete|do|call|create|alter)\b/i);
  assert.equal((release.match(/;/g) ?? []).length, 1);
});

test('the older mythic-legends spell reference guard remains valid for both exact shared spell dump states', async () => {
  const old = await readFile(
    new URL('../../supabase/migrations/20260929020000_war_of_immortals_mythic_legends.sql', import.meta.url),
    'utf8'
  );
  assert.match(old, /"name": "Cursed Metamorphosis", "id": 4550, "rank": 6/);
  assert.match(old, /s\.id = \(spell->>'id'\)::bigint and lower\(s\.name\) = lower\(spell->>'name'\)/);
  assert.doesNotMatch(old, /s\.(traditions|defense)/);
  for (const row of [beforeCurse, afterCurse])
    assert.deepEqual([row.id, row.name, row.rank], [4550, 'Cursed Metamorphosis', 6]);
});
