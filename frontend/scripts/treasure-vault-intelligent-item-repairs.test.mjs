import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { before, after, test } from 'node:test';
import {
  ItemSchema,
  SpellSchema,
  AbilityBlockSchema,
  TraitSchema,
  LanguageSchema,
  InventorySchema,
} from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { inventoryItem } from './fixtures/eidolon.mjs';

const migration = await readReviewedHistoricalSql(
  new URL('../../supabase/migrations/20261001180000_treasure_vault_intelligent_item_repairs.sql', import.meta.url),
  'utf8'
);
const release = await readReviewedHistoricalSql(
  new URL('../../supabase/release/treasure-vault-intelligent-item-repairs.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$intelligent$')[1]);
assert.deepEqual(JSON.parse(release.split('$intelligent$')[1]), spec);
const fixtures = await readContentRows([
  ...spec.items.map((p) => ({ table: 'item', id: p.id })),
  ...spec.dependencies.map((d) => ({ table: d.table.replace('-', '_'), id: d.id })),
  ...spec.sources.map((s) => ({ table: 'content_source', id: s.id })),
]);
const get = (table, id) => {
  const row = fixtures.find((x) => x.table === table && x.row.id === id)?.row;
  assert.ok(row, table + ':' + id);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
function assertFields(row, expected) {
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value, row.id + '/' + key);
}
function assertMetadata(row, metadata, absent = []) {
  assert.ok(object(row.meta_data));
  for (const [key, value] of Object.entries(metadata))
    assert.deepEqual(row.meta_data[key], value, row.id + '/meta_data/' + key);
  for (const key of absent) assert.equal(Object.hasOwn(row.meta_data, key), false, row.id + '/absent/' + key);
}
function ownerState(row, patch) {
  assertFields(row, patch.expected);
  assertMetadata(row, patch.metadata, patch.metadata_absent);
  assert.ok(
    patch.prior_states.some((state) => Object.entries(state).every(([key, value]) => equal(row[key], value))),
    'complete earlier equipment state'
  );
  const pair = Object.fromEntries(Object.keys(patch.after).map((key) => [key, row[key]]));
  if (equal(pair, patch.before)) return 'before';
  if (equal(pair, patch.after)) return 'after';
  assert.fail('unreviewed owner leaf pair');
}
function dependencyState(row, dependency) {
  for (const [index, state] of dependency.states.entries())
    try {
      assertFields(row, state.expected);
      assertMetadata(row, state.metadata, state.metadata_absent);
      return index;
    } catch {
      /* Other states are expressly reviewed predecessor repairs only. */
    }
  assert.fail('unreviewed dependency ' + dependency.table + ':' + dependency.id);
}
function ownerAt(row, patch, state, prior = 0) {
  const clone = {
    ...structuredClone(row),
    ...structuredClone(patch.expected),
    ...structuredClone(patch.prior_states[prior]),
    ...structuredClone(patch[state]),
    meta_data: { ...structuredClone(row.meta_data), ...structuredClone(patch.metadata) },
  };
  assert.equal(ownerState(clone, patch), state);
  return clone;
}
function dependencyAt(row, dependency, state = 0) {
  const clone = {
    ...structuredClone(row),
    ...structuredClone(dependency.states[state].expected),
    meta_data: { ...structuredClone(row.meta_data), ...structuredClone(dependency.states[state].metadata) },
  };
  assert.equal(dependencyState(clone, dependency), state);
  return clone;
}
const originals = spec.items.map((p) => ownerAt(get('item', p.id), p, 'before'));
const proposed = spec.items.map((p, i) => ownerAt(originals[i], p, 'after'));
const dependencies = spec.dependencies.map((d) => dependencyAt(get(d.table.replace('-', '_'), d.id), d));
const spells = dependencies.filter((r) => spec.dependencies.some((d) => d.table === 'spell' && d.id === r.id));
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures([
    ...fixtures,
    ...spec.dependencies.map((d, i) => ({ table: d.table.replace('-', '_'), row: dependencies[i] })),
  ]);
});
after(async () => engine?.cleanup());

test('four complete clones change only approved descriptions and three physical leaves', () => {
  assert.deepEqual(
    spec.items.map((p) => p.id),
    [12000, 12300, 12138, 12486]
  );
  assert.equal(spec.dependencies.length, 16);
  assert.deepEqual(
    spec.sources.map((s) => s.id).sort((a, b) => a - b),
    [1, 3, 16, 842]
  );
  assert.equal(
    spec.items.reduce((n, p) => n + p.description.replacements.reduce((s, r) => s + r.count, 0), 0),
    49
  );
  for (const [index, p] of spec.items.entries()) {
    const old = originals[index],
      next = proposed[index];
    ItemSchema.parse(old);
    ItemSchema.parse(next);
    const unchanged = { ...structuredClone(next) };
    for (const key of Object.keys(p.after)) unchanged[key] = old[key];
    assert.deepEqual(unchanged, old);
    assert.deepEqual(next.meta_data, old.meta_data);
    assert.equal(next.operations, null);
    let text = old.description;
    assert.equal(md5(text), p.description.before_md5);
    for (const r of p.description.replacements) {
      assert.equal(text.split(r.from).length - 1, r.count);
      text = text.replaceAll(r.from, r.to);
    }
    assert.equal(text, next.description);
    assert.equal(md5(text), p.description.after_md5);
  }
  assert.equal(proposed[0].usage, 'worn armor');
  assert.equal(proposed[1].usage, 'worn cloak');
  assert.equal(proposed[3].bulk, '0.1');
  const saved = {
    coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
    items: originals.map((r, i) => inventoryItem(r, 'saved-' + i)),
  };
  const savedCopy = structuredClone(saved);
  InventorySchema.parse(saved);
  assert.deepEqual(saved, savedCopy);
});

test('all complete002/006 owner states and before/after leaf pairs are compatible without mixed pairs', () => {
  assert.deepEqual(spec.items[0].prior_states, [
    { group: 'WEAPON', traits: [1475, 1581, 1613, 2860] },
    { group: 'ARMOR', traits: [1475, 1630, 1613, 2860, 1527] },
  ]);
  assert.deepEqual(spec.items[2].prior_states, [{ traits: [1841, 1686, 3073] }, { traits: [1841, 1686, 3073, 1459] }]);
  for (let mask = 0; mask < 64; mask++)
    for (const [index, p] of spec.items.entries()) {
      const prior = index === 0 ? (mask >> 4) & 1 : index === 2 ? (mask >> 5) & 1 : 0;
      const state = mask & (1 << index) ? 'after' : 'before';
      const row = ownerAt(originals[index], p, state, prior);
      assert.equal(ownerState(row, p), state);
      const next = { ...structuredClone(row), ...structuredClone(p.after) };
      assert.equal(ownerState(next, p), 'after');
      assert.deepEqual(next.traits, row.traits);
      assert.equal(next.group, row.group);
    }
  const faerie = ownerAt(originals[0], spec.items[0], 'before', 0);
  faerie.group = 'ARMOR';
  assert.throws(() => ownerState(faerie, spec.items[0]));
  for (const [index, p] of spec.items.entries())
    if (Object.keys(p.after).length > 1) {
      const partial = { ...structuredClone(originals[index]), description: p.after.description };
      assert.throws(() => ownerState(partial, p));
      const partial2 = { ...structuredClone(proposed[index]), description: p.before.description };
      assert.throws(() => ownerState(partial2, p));
    }
});

test('every official dependency field and subtype is reviewed, including exact001 rune and019 duration states', () => {
  for (const [index, d] of spec.dependencies.entries()) {
    const row = dependencies[index];
    assert.equal(dependencyState(row, d), 0);
    const schema =
      d.table === 'item'
        ? ItemSchema
        : d.table === 'spell'
          ? SpellSchema
          : d.table === 'trait'
            ? TraitSchema
            : d.table === 'language'
              ? LanguageSchema
              : AbilityBlockSchema;
    schema.parse(row);
    assertFields(
      get('content_source', d.source),
      spec.sources.find((s) => s.id === d.source)
    );
    for (let state = 0; state < d.states.length; state++)
      assert.equal(dependencyState(dependencyAt(row, d, state), d), state);
    for (const key of Object.keys(d.states[0].expected)) {
      const broken = structuredClone(row);
      broken[key] = key === 'uuid' ? '0' : broken[key] === null ? 'drift' : null;
      assert.throws(() => dependencyState(broken, d), d.id + '/' + key);
    }
    for (const key of Object.keys(d.states[0].metadata)) {
      const broken = structuredClone(row);
      broken.meta_data[key] = broken.meta_data[key] === null ? 'drift' : null;
      assert.throws(() => dependencyState(broken, d), d.id + '/metadata/' + key);
    }
    for (const key of d.states[0].metadata_absent)
      for (const value of [true, null]) {
        const broken = structuredClone(row);
        broken.meta_data[key] = value;
        assert.throws(() => dependencyState(broken, d), d.id + '/absent/' + key);
      }
    const future = structuredClone(row);
    future.meta_data.future_extension = { nested: [1, 2, 3] };
    assert.equal(dependencyState(future, d), 0);
  }
  assert.equal(spec.dependencies.find((d) => d.id === 4814).states.length, 2);
  assert.deepEqual(
    spec.dependencies.find((d) => d.id === 4814).states.map((s) => s.expected.duration),
    ['1 minute', 'sustained up to 1 minute']
  );
  assert.equal(spec.dependencies.find((d) => d.id === 11726).states.length, 2);
  assert.equal(get('ability_block', 20769).type, 'sense');
  assert.equal(get('ability_block', 19852).type, 'action');
});

test('all owner fields, nullable mechanics and known metadata reject drift while future metadata survives', () => {
  for (const [index, p] of spec.items.entries())
    for (const state of ['before', 'after']) {
      const row = ownerAt(originals[index], p, state);
      for (const [key, value] of Object.entries(p.expected)) {
        const broken = structuredClone(row);
        broken[key] = key === 'uuid' ? '0' : value === null ? 'drift' : null;
        assert.throws(() => ownerState(broken, p), p.id + '/' + key);
      }
      for (const [key, value] of Object.entries(p.metadata)) {
        const broken = structuredClone(row);
        broken.meta_data[key] = value === null ? 'drift' : null;
        assert.throws(() => ownerState(broken, p), p.id + '/metadata/' + key);
      }
      for (const key of p.metadata_absent)
        for (const value of [true, null]) {
          const broken = structuredClone(row);
          broken.meta_data[key] = value;
          assert.throws(() => ownerState(broken, p), p.id + '/absent/' + key);
        }
      for (const value of [null, [], false, '{}']) {
        const broken = { ...structuredClone(row), meta_data: value };
        assert.throws(() => ownerState(broken, p));
      }
      const future = structuredClone(row);
      future.meta_data.future_extension = { nested: ['keep', 1] };
      assert.equal(ownerState(future, p), state);
      const next = { ...structuredClone(future), ...structuredClone(p.after) };
      assert.equal(ownerState(next, p), 'after');
      assert.deepEqual(next.meta_data, future.meta_data);
    }
});

test('actual helper resolves every chosen occurrence with correct spell/action/sense/language/item/trait subtypes', () => {
  for (const [index, row] of proposed.entries())
    for (const match of row.description.matchAll(/\[([^\]]+)\]\(link_([^_]+)_([^)]+)\)/g)) {
      const [, label, type, id] = match;
      if (type === 'condition') {
        assert.equal(id, 'dazzled');
        assert.equal(label, 'dazzling');
        assert.equal(index, 3);
        continue;
      }
      const d = spec.dependencies.find((d) => d.id === Number(id));
      assert.ok(d, type + ':' + id);
      const target = dependencies[spec.dependencies.indexOf(d)];
      assert.equal(engine.convertToHardcodedLink(type, target.name, label), match[0]);
      if (d.table === 'ability-block') assert.equal(target.type, type);
    }
  assert.equal((proposed[0].description.match(/\(link_item_11726\)/g) || []).length, 3);
  assert.equal((proposed[1].description.match(/\(link_item_23287\)/g) || []).length, 2);
  assert.equal((proposed[1].description.match(/\(link_action_19856\)/g) || []).length, 5);
  assert.equal((proposed[2].description.match(/\(link_action_19856\)/g) || []).length, 3);
  assert.equal((proposed[3].description.match(/\(link_action_19733\)/g) || []).length, 2);
});

test('actual renderer preserves modifiers, mechanical riders, frequency and trigger values without import artifacts', () => {
  for (const row of proposed) {
    const html = engine.renderRichText(row.description);
    assert.doesNotMatch(html, /\[\[|@UUID|showDC|\{Dazzling\}/);
  }
  const faerie = engine.renderRichText(proposed[0].description),
    cloak = engine.renderRichText(proposed[1].description),
    gun = engine.renderRichText(proposed[2].description),
    star = engine.renderRichText(proposed[3].description);
  assert.match(faerie, /\+23/);
  assert.equal((faerie.match(/\+25/g) || []).length, 3);
  assert.equal((proposed[0].description.match(/Frequency\*\* once per day/g) || []).length, 2);
  assert.match(faerie, /<em><a\b[^>]*>safe passage<\/a><\/em>/);
  assert.match(faerie, />concealed<\/a>/);
  assert.match(cloak, /\+30/);
  assert.equal((cloak.match(/\+31/g) || []).length, 3);
  assert.equal((proposed[1].description.match(/Frequency\*\*/g) || []).length, 2);
  assert.match(cloak, /DC 38 Perception/);
  assert.match(cloak, /An enemy misses you with a melee/);
  assert.match(proposed[1].description, /without moving away from the triggering enemy/);
  assert.match(proposed[1].description, /as your whirl/);
  assert.match(gun, /DC 45 basic Reflex save/);
  assert.match(gun, /once per minute/);
  assert.match(gun, /You target a creature with an attack/);
  assert.match(gun, />off-guard<\/a>/);
  assert.match(star, />dazzling<\/a> the struck creature for 1 round/);
  assert.match(proposed[0].description, /Celestial/);
  assert.doesNotMatch(proposed[0].description, /Empyrean/);
  assert.match(proposed[2].description, /speed advanced firearm/);
  assert.equal(proposed[2].meta_data.damage.dice, 1);
  assert.equal(proposed[2].meta_data.runes.striking, 3);
  assert.deepEqual(
    proposed.map((row) =>
      [...row.description.matchAll(/<abbr cost="([^"]+)" class="action-symbol">([^<]+)<\/abbr>/g)].map((m) => [
        m[1],
        m[2],
      ])
    ),
    [
      [
        ['TWO-ACTIONS', '2'],
        ['TWO-ACTIONS', '2'],
      ],
      [
        ['TWO-ACTIONS', '2'],
        ['ONE-ACTION', '1'],
        ['REACTION', '5'],
        ['TWO-ACTIONS', '2'],
      ],
      [
        ['FREE-ACTION', '4'],
        ['TWO-ACTIONS', '2'],
        ['THREE-ACTIONS', '3'],
      ],
      [],
    ]
  );
});

test('actual spell parser retains printed4th/2nd item ranks without changing catalogs or spell-panel eligibility', () => {
  assert.deepEqual(
    engine.detectSpells(proposed[0].description, spells, true).map((s) => [s.spell.id, s.rank]),
    [[4814, 4]]
  );
  assert.deepEqual(
    engine.detectSpells(proposed[1].description, spells, true).map((s) => [s.spell.id, s.rank]),
    [[4677, 2]]
  );
  assert.deepEqual(
    spells.map((s) => [s.id, s.rank]).sort((a, b) => a[0] - b[0]),
    [
      [4677, 1],
      [4814, 3],
    ]
  );
  assert.equal(spells.find((s) => s.id === 4814).cast, 'THREE-ACTIONS');
  assert.deepEqual(engine.getInventorySpellIds(proposed.map((r, i) => inventoryItem(r, 'held-' + i))), []);
});

function pendingFor(row, table, update) {
  if (['APPROVED', 'REJECTED'].includes(update.status?.state) || update.type !== table) return false;
  return (
    update.ref_id === row.id ||
    String(update.data?.id) === String(row.id) ||
    (update.ref_id === null &&
      update.data?.name === row.name &&
      (table === 'content-source' ||
        update.content_source_id === row.content_source_id ||
        String(update.data?.content_source_id) === String(row.content_source_id)))
  );
}
test('pending identity guards cover first apply/replay, payload source, refnull ids, unknown states and all reference types', () => {
  const targets = [
    ...proposed.map((row) => ({ row, table: 'item' })),
    ...dependencies.map((row, i) => ({ row, table: spec.dependencies[i].table })),
    ...spec.sources.map((row) => ({ row, table: 'content-source' })),
  ];
  for (const { row, table } of targets)
    for (const state of ['PENDING', 'UNKNOWN', undefined, null]) {
      const base = { type: table, ref_id: row.id, content_source_id: 99999, data: {}, status: { state } };
      assert.ok(pendingFor(row, table, base));
      assert.ok(pendingFor(row, table, { ...base, ref_id: null, data: { id: row.id } }));
      assert.ok(
        pendingFor(row, table, {
          ...base,
          ref_id: null,
          data: { name: row.name, content_source_id: row.content_source_id },
        })
      );
      assert.equal(pendingFor(row, table, { ...base, type: 'unrelated' }), false);
      for (const approved of ['APPROVED', 'REJECTED'])
        assert.equal(pendingFor(row, table, { ...base, status: { state: approved } }), false);
    }
  assert.ok(
    migration.indexOf('pending curator submission') < migration.indexOf("if actual_pair=patch->'after' then continue")
  );
  assert.match(
    migration,
    /u\.content_source_id=item_row\.content_source_id or u\.data->>'content_source_id'=item_row\.content_source_id::text/
  );
  assert.match(
    migration,
    /u\.content_source_id=\(dependency->>'source'\)::bigint or u\.data->>'content_source_id'=dependency->>'source'/
  );
  assert.match(release, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
});

test('migration keeps leaf-only CAS1/readback checks and release fails closed on missing or NULL states', () => {
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
    /jsonb_build_object\('id', i\.id, 'write', i\.id in \([\s\S]*?jsonb_array_elements\(spec->'items'\)/
  );
  assert.match(
    childPrelocks,
    /public\.item i[\s\S]*?union[\s\S]*?where d->>'table' = 'item'[\s\S]*?order by i\.id loop/
  );
  assert.match(
    childPrelocks,
    /if \(dependency->>'write'\)::boolean then[\s\S]*?public\.item[^;]*for update;[\s\S]*?else[\s\S]*?public\.item[^;]*for share;/
  );
  for (const [table, type, alias] of [
    ['ability_block', 'ability-block', 'a'],
    ['language', 'language', 'l'],
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
  assert.match(migration, /get diagnostics changed_rows=row_count;\s*if changed_rows<>1/);
  assert.match(migration, /saved_after is distinct from expected_after/);
  assert.ok(migration.includes("expected_after:=(to_jsonb(item_row)-'updated_at'-'search_tsv')||(patch->'after');"));
  assert.doesNotMatch(migration, /set meta_data|set operations|set traits|set "group"/);
  assert.match(release, /is not true/);
  assert.match(release, /coalesce\(\(select/);
  assert.match(release, /from spec\),false\) passed/);
  assert.match(release, /'treasure-vault-intelligent-item-repairs'::text id/);
});
