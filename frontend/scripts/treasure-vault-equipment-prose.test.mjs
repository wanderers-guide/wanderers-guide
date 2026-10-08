import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import {
  ItemSchema,
  InventorySchema,
  TraitSchema,
  AbilityBlockSchema,
  ContentSourceSchema,
} from '../src/schemas/content.ts';
import { createOperationEngine, readHistoricalContentRows } from './operation-test-harness.mjs';
import { inventoryItem, summoner, content as emptyContent } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001240000_treasure_vault_equipment_prose.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-equipment-prose.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$prose$')[1]);
const headerText = await readFile(
  new URL('../../supabase/migrations/20261001210000_treasure_vault_equipment_headers.sql', import.meta.url),
  'utf8'
);
const conditionText = await readFile(
  new URL('../../supabase/migrations/20261001130000_treasure_vault_condition_references.sql', import.meta.url),
  'utf8'
);
const headers = JSON.parse(headerText.split('$headers$')[1]);
const conditions = JSON.parse(conditionText.split('$patches$')[1]);
const importerOnlyDescriptions = [
  '**Activate** <abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr> [Interact](link_action_19733)\n\n* * *\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 [poison](link_trait_1476), clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 [poison](link_trait_1476), clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 [poison](link_trait_1476), clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for 2d6 minutes.',
  '**Ammunition** any\n\n**Activate** <abbr cost="ONE-ACTION" class="action-symbol">1</abbr> [Interact](link_action_19733)\n\n* * *\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes [cold](link_trait_1519) damage instead of the weapon\'s normal damage type, plus 2 [cold](link_trait_1519) [splash](link_trait_1532) damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 [cold](link_trait_1519) [splash](link_trait_1532) damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to [Balance](link_action_19608). Creatures that [Step](link_action_19853) or [Crawl](link_action_19618) don\'t need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM\'s discretion. Dealing at least 1 point of [fire](link_trait_1542) damage to the ice removes it instantly',
  "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> envision, [Interact](link_action_19733)\n\n* * *\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can [Sustain the Activation](link_action_19858) for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and [Sense Motive](link_action_19847) to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical [virtuoso instrument](link_item_7604).",
  '**Activate** <abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr> [Interact](link_action_19733)\n\n* * *\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to [Balance](link_action_19608) as a success, and a success as a success but moving on greater difficult terrain (1 round)',
];
const rows = await readHistoricalContentRows([
  ...spec.items.map(({ id }) => ({ table: 'item', id })),
  ...spec.dependencies.map(({ table, id }) => ({ table, id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
]);
const get = (table, id) => {
  const row = rows.find((r) => r.table === table && r.row.id === id)?.row;
  assert.ok(row, `${table}:${id}`);
  return row;
};
const digest = (value, algorithm = 'md5') => createHash(algorithm).update(value).digest('hex');
const same = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const tuple = (row) => ({
  traits: row.traits,
  usage: row.usage,
  description: row.description,
  craft_requirements: row.craft_requirements,
  source: row.meta_data?.source,
});
/** Match every reviewed known field; preserve unknown outer metadata, never unknown inner citations. */
function fields(row, expected) {
  assert.ok(row);
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value, `${row.id}/${key}`);
}
function metadata(row, expected, absent) {
  assert.ok(object(row.meta_data));
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(row.meta_data[key], value, `${row.id}/meta/${key}`);
  for (const key of absent) assert.equal(Object.hasOwn(row.meta_data, key), false);
}
/** A complete successor is a tuple, not a collection of independently acceptable leaves. */
function validate(row, patch, terminal = false, historical = false) {
  fields(row, patch.expected);
  metadata(row, patch.metadata, patch.metadata_absent);
  if (same(tuple(row), patch.after)) return 'after';
  if (!terminal && (historical ? patch.legacy_states : patch.before_states).some((state) => same(tuple(row), state)))
    return 'before';
  assert.fail('Unreviewed complete equipment prose tuple');
}
/** Only a validated complete terminal can be normalized to its immutable historical raw fixture. */
function at(patch, state) {
  const row = structuredClone(get('item', patch.id));
  validate(row, patch, false, true);
  Object.assign(row, structuredClone(state));
  delete row.source;
  row.meta_data.source = structuredClone(state.source);
  validate(row, patch, false, true);
  ItemSchema.parse(row);
  return row;
}
const originals = spec.items.map((p) => at(p, p.before_states.at(-1)));
const proposed = spec.items.map((p) => at(p, p.after));
const sources = spec.sources.map((s) => get('content_source', s.id));
const dependencies = spec.dependencies.map((d) => get(d.table, d.id));
function relevant(update) {
  if (['APPROVED', 'REJECTED'].includes(update.status?.state)) return false;
  if (update.type === 'content-source')
    return spec.sources.some(
      (s) => update.ref_id === s.id || String(update.data?.id) === String(s.id) || update.data?.name === s.name
    );
  const identities = [
    ...spec.items.map((p) => ({ ...p.expected, type: 'item', id: p.id })),
    ...spec.dependencies.map((d) => ({ ...d.expected, type: d.type, id: d.id })),
  ];
  return identities.some(
    (d) =>
      update.type === d.type &&
      (update.ref_id === d.id ||
        String(update.data?.id) === String(d.id) ||
        String(update.data?.uuid) === d.uuid ||
        ((update.content_source_id === d.content_source_id ||
          String(update.data?.content_source_id) === String(d.content_source_id)) &&
          update.data?.name === d.name))
  );
}
function gates(sourceRows = sources, deps = dependencies, pending = []) {
  assert.equal(sourceRows.length, 3);
  assert.equal(deps.length, 23);
  assert.ok(!pending.some(relevant));
  for (const source of spec.sources)
    fields(
      sourceRows.find((r) => r.id === source.id),
      source
    );
  for (const [index, d] of spec.dependencies.entries()) {
    fields(deps[index], d.expected);
    metadata(deps[index], d.metadata, d.metadata_absent);
  }
}
/** Pure clone model tests policy only. The separately recorded native PostgreSQL proof tests SQL. */
function apply(input, sourceRows = sources, deps = dependencies, pending = [], failedCas) {
  gates(sourceRows, deps, pending);
  assert.equal(input.length, 4);
  assert.equal(new Set(input.map((r) => r.id)).size, 4);
  for (const p of spec.items)
    validate(
      input.find((r) => r.id === p.id),
      p
    );
  return input.map((row) => {
    const p = spec.items.find((p) => p.id === row.id);
    if (validate(row, p) !== 'after') assert.notEqual(row.id, failedCas);
    const next = structuredClone(row);
    Object.assign(next, {
      traits: structuredClone(p.after.traits),
      usage: p.after.usage,
      description: p.after.description,
    });
    next.meta_data.source = structuredClone(p.after.source);
    return next;
  });
}
function terminal(input, sourceRows = sources, deps = dependencies, pending = []) {
  try {
    gates(sourceRows, deps, pending);
    assert.equal(input.length, 4);
    for (const p of spec.items)
      validate(
        input.find((r) => r.id === p.id),
        p,
        true
      );
    return true;
  } catch {
    return false;
  }
}
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('exact four B rows only change complete prose/citation, Tales Illusion and Freeze usage; historical literals immutable', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$prose$')[1]));
  assert.deepEqual(
    spec.items.map((p) => p.id),
    [11901, 12024, 12507, 12709]
  );
  assert.equal(
    digest(conditionText.split('$patches$')[1], 'sha256'),
    '5a39d35511dac3eae2b2c5c1d4b90253514113d2fa569c23a3bbb221784e6ba9'
  );
  assert.equal(
    digest(headerText.split('$headers$')[1], 'sha256'),
    '8180f1711048a98c6ff90882769321de62fa1acb876b6fe34fc797db6d091114'
  );
  const hashes = [
    '0130c87981a64623dc37736b773a7bdb',
    '2499ec316ae7d669207e9340ee75e13c',
    '3e7ea74f66f0d523917501e13e13768c',
    'e807c976027c3127991883e79e1634f4',
  ];
  for (const [index, p] of spec.items.entries()) {
    assert.equal(digest(p.after.description), hashes[index]);
    assert.equal(p.hashes.after, hashes[index]);
    assert.equal(proposed[index].hands, null);
    assert.equal(proposed[index].operations, null);
    assert.equal(proposed[index].content_source_id, 16);
    assert.deepEqual(
      {
        ...proposed[index],
        traits: originals[index].traits,
        usage: originals[index].usage,
        description: originals[index].description,
        meta_data: { ...proposed[index].meta_data, source: originals[index].meta_data.source },
      },
      originals[index]
    );
    assert.equal(proposed[index].usage, p.id === 12024 ? '' : originals[index].usage);
    assert.deepEqual(proposed[index].traits, p.id === 12507 ? [1469, 1531, 1504, 1479, 2131] : originals[index].traits);
    assert.equal(p.after.source.book, 'Treasure Vault (Remastered)');
    assert.equal(p.after.source.url, `https://2e.aonprd.com/Equipment.aspx?ID=${[1999, 1898, 2127, 2020][index]}`);
    const h = headers.items.find((h) => h.id === p.id);
    assert.deepEqual(
      p.before_states.map((s) => s.traits),
      h.after_states.map((s) => s.traits)
    );
    assert.deepEqual(
      p.before_states.map((s) => s.description),
      h.descriptions.map((d) => d.text)
    );
    assert.deepEqual(
      p.legacy_states.map(({ usage, craft_requirements, source, ...s }) => s),
      [...h.before_states, ...h.after_states]
    );
    for (const [i, state] of p.before_states.entries()) assert.equal(digest(state.description), p.hashes.before[i]);
    if (p.id === 11901 || p.id === 12024) {
      const c = conditions.find((c) => c.id === p.id);
      assert.equal(p.raw.description, c.description.before_text);
      assert.equal(p.hashes.before[1], c.description.after);
    }
  }
  for (const s of sources) ContentSourceSchema.parse(s);
  for (const [index, d] of spec.dependencies.entries())
    ({ item: ItemSchema, trait: TraitSchema, ability_block: AbilityBlockSchema })[d.table].parse(dependencies[index]);
});

test('all36 exact post021 raw/repaired/B mixtures repair/replay; unknown outer metadata preserved; pre021 and A rejected', () => {
  let count = 0;
  const choices = spec.items.map((p) => [...p.before_states, p.after]);
  for (const a of choices[0])
    for (const b of choices[1])
      for (const c of choices[2])
        for (const d of choices[3]) {
          const input = [a, b, c, d].map((state, index) => at(spec.items[index], state));
          const frozen = structuredClone(input);
          assert.deepEqual(apply(input), proposed);
          assert.deepEqual(apply(apply(input)), proposed);
          assert.deepEqual(input, frozen);
          assert.equal(
            terminal(input),
            [a, b, c, d].every((state, index) => same(state, spec.items[index].after))
          );
          count++;
        }
  assert.equal(count, 36);
  for (const p of spec.items) {
    const input = structuredClone(originals);
    input[spec.items.indexOf(p)] = at(p, p.raw);
    assert.throws(() => apply(input));
    input[spec.items.indexOf(p)] = at(p, p.before_states.at(-1));
    input[spec.items.indexOf(p)].description = importerOnlyDescriptions[spec.items.indexOf(p)];
    assert.throws(() => apply(input));
  }
  const input = originals.map((row) => ({
    ...structuredClone(row),
    meta_data: { ...row.meta_data, future_outer: { keep: [null, 42] } },
  }));
  for (const [index, row] of apply(input).entries())
    assert.deepEqual(row.meta_data.future_outer, input[index].meta_data.future_outer);
});

test('every mixed tuple, NULL/type/mechanics/citation drift rejects before write and terminal replay', () => {
  for (const baseline of [originals, proposed])
    for (const [index, p] of spec.items.entries()) {
      for (const change of [
        { name: null },
        { uuid: null },
        { level: 1 },
        { price: {} },
        { operations: [] },
        { hands: '1' },
        { usage: null },
        { usage: ' ' },
        { traits: null },
        { description: null },
        { meta_data: null },
        { meta_data: [] },
      ]) {
        const input = structuredClone(baseline);
        Object.assign(input[index], change);
        const frozen = structuredClone(input);
        assert.throws(() => apply(input));
        assert.equal(terminal(input), false);
        assert.deepEqual(input, frozen);
      }
      for (const key of p.metadata_absent) {
        const input = structuredClone(baseline);
        input[index].meta_data[key] = null;
        assert.throws(() => apply(input));
      }
      const citation = structuredClone(baseline);
      citation[index].meta_data.source.extra = 'unreviewed';
      assert.throws(() => apply(citation));
      const leaves = ['traits', 'usage', 'description', 'source'];
      for (const leaf of leaves) {
        const input = structuredClone(baseline),
          state = same(tuple(input[index]), p.after) ? p.before_states[0] : p.after;
        if (leaf === 'source') input[index].meta_data.source = structuredClone(state.source);
        else input[index][leaf] = structuredClone(state[leaf]);
        if (!same(tuple(input[index]), tuple(baseline[index])))
          assert.throws(() => apply(input), `${p.id}/hybrid/${leaf}`);
      }
    }
  for (const baseline of [originals, proposed]) {
    for (let index = 0; index < dependencies.length; index++) {
      const deps = structuredClone(dependencies);
      deps[index].meta_data = null;
      assert.throws(() => apply(baseline, sources, deps));
    }
    for (let index = 0; index < sources.length; index++) {
      const s = structuredClone(sources);
      s[index].is_published = false;
      assert.throws(() => apply(baseline, s));
    }
  }
});

test('all owner/dependency/source pending identity routes block before and exact after; only explicit terminal statuses ignored', () => {
  for (const baseline of [originals, proposed]) {
    const identities = [
      ...spec.items.map((p) => ({ ...p.expected, type: 'item' })),
      ...spec.dependencies.map((d) => ({ ...d.expected, type: d.type })),
    ];
    assert.equal(identities.filter((d) => d.type === 'ability-block').length, 6);
    assert.equal(
      identities.some((d) => d.type === 'action'),
      false
    );
    for (const d of identities)
      for (const status of [null, {}, { state: 'PENDING' }, { state: 'UNKNOWN' }, { state: [] }])
        for (const identity of [
          { ref_id: d.id, data: {} },
          { ref_id: null, data: { id: d.id } },
          { ref_id: null, data: { uuid: d.uuid } },
          { ref_id: null, content_source_id: -1, data: { name: d.name, content_source_id: d.content_source_id } },
          { ref_id: null, content_source_id: d.content_source_id, data: { name: d.name } },
        ]) {
          const pending = [{ type: d.type, status, ...identity }];
          assert.throws(() => apply(baseline, sources, dependencies, pending));
          assert.equal(terminal(baseline, sources, dependencies, pending), false);
        }
    for (const s of spec.sources)
      for (const identity of [
        { ref_id: s.id, data: {} },
        { ref_id: null, data: { id: s.id } },
        { ref_id: -1, data: { name: s.name } },
      ])
        assert.throws(() =>
          apply(baseline, sources, dependencies, [{ type: 'content-source', status: {}, ...identity }])
        );
  }
  for (const state of ['APPROVED', 'REJECTED'])
    assert.deepEqual(
      apply(proposed, sources, dependencies, [{ type: 'item', ref_id: 11901, status: { state } }]),
      proposed
    );
  assert.throws(() => apply(originals, sources, dependencies, [], 12024));
  assert.deepEqual(apply(proposed, sources, dependencies, [], 12024), proposed);
});

test('actual cache helper resolves13 exact identities; every eligible repeated link and plain condition renders without importer junk', () => {
  engine.setFixtures(rows);
  const requests = [
    ['action', 'Interact', undefined, 19733],
    ['action', 'Balance', undefined, 19608],
    ['action', 'Crawl', undefined, 19618],
    ['action', 'Step', undefined, 19853],
    ['action', 'Sense Motive', undefined, 19847],
    ['action', 'Sustain', 'Sustain the Activation', 19858],
    ['trait', 'poison', undefined, 1476],
    ['trait', 'cold', undefined, 1519],
    ['trait', 'splash', undefined, 1532],
    ['trait', 'fire', undefined, 1542],
    ['trait', 'concentrate', undefined, 1432],
    ['trait', 'manipulate', undefined, 1433],
    ['item', 'Musical Instrument (Virtuoso Handheld)', 'virtuoso instrument', 7604],
  ];
  for (const [type, lookup, display, id] of requests)
    assert.equal(engine.convertToHardcodedLink(type, lookup, display), `[${display ?? lookup}](link_${type}_${id})`);
  const totals = new Map();
  for (const row of proposed) {
    assert.doesNotMatch(row.description, /link_condition_|\\|\[\[|@UUID|\/r /);
    assert.match(row.description, /class="action-symbol"/);
    assert.equal(row.description.split('* * *').length - 1, 1);
    const html = engine.renderRichText(row.description);
    const labels = new Map();
    for (const [, label, href] of row.description.matchAll(/\[([^\]]+)\]\((link_[^)]+)\)/g)) {
      labels.set(label, (labels.get(label) ?? 0) + 1);
      totals.set(href, (totals.get(href) ?? 0) + 1);
    }
    for (const [label, count] of labels) assert.equal(html.split(`>${label}</a>`).length - 1, count);
    if (row.id === 11901)
      for (const [name, count] of [
        ['clumsy', 3],
        ['enfeebled', 3],
        ['slowed', 2],
        ['paralyzed', 1],
      ])
        assert.equal(html.split(`>${name}</a>`).length - 1, count);
    if (row.id === 12024) assert.equal(html.split('>prone</a>').length - 1, 1);
  }
  assert.deepEqual(Object.fromEntries(totals), {
    link_trait_1433: 4,
    link_trait_1476: 3,
    link_trait_1519: 3,
    link_trait_1532: 2,
    link_action_19608: 2,
    link_action_19853: 1,
    link_action_19618: 1,
    link_trait_1542: 1,
    link_trait_1432: 1,
    link_action_19858: 1,
    link_action_19847: 1,
    link_item_7604: 1,
  });
  const curare = engine.renderRichText(proposed[0].description, ['clumsy']);
  assert.equal(curare.split('>clumsy</a>').length - 1, 0);
  assert.match(curare, /clumsy 2/);
});

const stableStore = (store) => ({
  ...store,
  history: Object.fromEntries(
    Object.entries(store.history).map(([key, values]) => [key, values.map(({ timestamp, ...entry }) => entry)])
  ),
});
const container = {
  ...structuredClone(proposed[0]),
  id: -24001,
  name: 'Synthetic prose container',
  traits: [],
  operations: [],
  usage: '',
  bulk: '0',
  meta_data: { ...structuredClone(proposed[0].meta_data), bulk: { capacity: 10 } },
};
/** Execute public real character/creature controllers with a strictly local fixture package. */
async function calculate(items, kind, enabled) {
  const actor = { ...summoner(items), companions: { list: [] }, content_sources: { enabled } };
  InventorySchema.parse(actor.inventory);
  const frozen = structuredClone(actor);
  const content = {
    ...emptyContent,
    items: [...proposed, get('item', 7604)],
    traits: rows.filter((r) => r.table === 'trait').map((r) => r.row),
    sources,
    abilityBlocks: [],
    defaultSources: { PAGE: enabled, INFO: enabled },
  };
  engine.setFixtures(rows);
  engine.clearOperationErrorNotifications();
  let result;
  if (kind === 'character')
    result = await engine._executeCharacterOperations({ character: actor, content, context: 'CHARACTER-SHEET' });
  else {
    const parent = await engine._executeCharacterOperations({
      character: { ...summoner([]), companions: { list: [] } },
      content,
      context: 'CHARACTER-SHEET',
    });
    result = await engine._executeCreatureOperations({
      id: 'COMPANION_0',
      creature: { name: 'Prose companion', level: 1, operations: [], inventory: actor.inventory },
      content,
      charStore: parent.store,
    });
  }
  assert.deepEqual(actor, frozen);
  assert.deepEqual(engine.getOperationErrorNotifications(), []);
  return { ...result, store: stableStore(result.store) };
}
test('actual character/companion calculations invariant60 pairs, bulk unchanged, Illusion removal is an intentional header delta', async () => {
  let pairs = 0;
  for (const kind of ['character', 'companion'])
    for (const enabled of [[16], [3, 16], [3]])
      for (const flags of [
        {},
        { is_equipped: true },
        { is_invested: true },
        { is_equipped: true, is_invested: true },
        { is_equipped: true, is_invested: true, is_formula: true },
      ])
        for (const wrap of [
          (items) => items,
          (items) => [inventoryItem(structuredClone(container), { container_contents: items })],
        ]) {
          assert.deepEqual(
            await calculate(wrap(originals.map((r) => inventoryItem(structuredClone(r), flags))), kind, enabled),
            await calculate(wrap(proposed.map((r) => inventoryItem(structuredClone(r), flags))), kind, enabled)
          );
          pairs++;
        }
  assert.equal(pairs, 60);
  for (const quantity of [1, 4, 9, 10, 11, 100])
    for (const is_formula of [false, true])
      for (const [index, old] of originals.entries()) {
        const a = inventoryItem({ ...structuredClone(old), meta_data: { ...old.meta_data, quantity } }, { is_formula });
        const b = inventoryItem(
          { ...structuredClone(proposed[index]), meta_data: { ...proposed[index].meta_data, quantity } },
          { is_formula }
        );
        assert.equal(engine.getItemBulk(a), engine.getItemBulk(b));
      }
  assert.ok(engine.compileTraits(originals[2]).includes(1447));
  assert.equal(engine.compileTraits(proposed[2]).includes(1447), false);
  assert.deepEqual(engine.compileTraits(proposed[2]), [1469, 1531, 1504, 1479, 2131]);
});
test('actual Freeze sentinel proves held/empty container boundary and integrated367 formula suppression in both controllers', async () => {
  const sentinel = {
    id: 'prose024-usage-sentinel',
    type: 'addBonusToValue',
    data: { variable: 'AC_BONUS', value: 1, type: 'item', text: '' },
  };
  let controls = 0;
  for (const kind of ['character', 'companion'])
    for (const usage of ['held-in-one-hand', ''])
      for (const is_formula of [false, true])
        for (const placement of ['top', 'container']) {
          const item = inventoryItem(
            { ...structuredClone(proposed[1]), usage, operations: [sentinel] },
            { is_formula }
          );
          const result = await calculate(
            placement === 'top' ? [item] : [inventoryItem(structuredClone(container), { container_contents: [item] })],
            kind,
            [16]
          );
          const storeId = kind === 'character' ? 'CHARACTER' : 'COMPANION_0';
          engine.importVariableStore(storeId, result.store);
          assert.equal(
            engine.getFinalVariableValue(storeId, 'AC_BONUS').total,
            is_formula ? 0 : placement === 'top' || usage === '' ? 1 : 0
          );
          controls++;
        }
  assert.equal(controls, 16);
  assert.equal(proposed[1].operations, null);
});
test('actual add/serialized saves preserve existing top/container snapshots16 cases; new copies alone receive B', async () => {
  let cases = 0;
  for (const kind of ['character', 'companion'])
    for (const [index, next] of proposed.entries())
      for (const is_formula of [false, true]) {
        const top = inventoryItem(structuredClone(originals[index]), { id: `saved-top-${next.id}` }),
          nested = inventoryItem(structuredClone(originals[index]), { id: `saved-contained-${next.id}` });
        const savedContainer = inventoryItem(structuredClone(container), { container_contents: [nested] });
        let actor =
          kind === 'character'
            ? { ...summoner([top, savedContainer]), companions: { list: [] } }
            : {
                name: 'Saved companion',
                level: 1,
                operations: [],
                inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [top, savedContainer] },
              };
        const saved = structuredClone(actor.inventory.items),
          catalog = structuredClone(next);
        await engine.handleAddItem(
          (update) => {
            actor = update(actor);
          },
          next,
          is_formula
        );
        InventorySchema.parse(actor.inventory);
        const added = actor.inventory.items.filter((item) => !saved.some((entry) => entry.id === item.id));
        assert.equal(added.length, 1);
        assert.deepEqual(added[0].item, catalog);
        assert.equal(added[0].is_formula, is_formula);
        assert.equal(added[0].is_equipped, false);
        assert.deepEqual(
          actor.inventory.items
            .filter((item) => saved.some((entry) => entry.id === item.id))
            .sort((a, b) => a.id.localeCompare(b.id)),
          saved.sort((a, b) => a.id.localeCompare(b.id))
        );
        assert.deepEqual(next, catalog);
        const serialized = JSON.parse(JSON.stringify(actor.inventory));
        InventorySchema.parse(serialized);
        for (const original of [top, nested])
          assert.deepEqual(
            engine.getFlatInvItems(serialized).find((entry) => entry.id === original.id).item,
            original.item
          );
        cases++;
      }
  assert.equal(cases, 16);
});
test('actual contain-and-return preserves complete legacy/B Freeze snapshots for character and companion saves', async () => {
  let cases = 0;
  for (const kind of ['character', 'companion'])
    for (const row of [originals[1], proposed[1]]) {
      const saved = inventoryItem(structuredClone(row), {
        id: `move-${kind}-${row.usage || 'empty'}`,
        is_equipped: true,
      });
      const heldContainer = inventoryItem(structuredClone(container));
      let actor =
        kind === 'character'
          ? { ...summoner([saved, heldContainer]), companions: { list: [] } }
          : {
              name: 'Saved move companion',
              level: 1,
              operations: [],
              inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [saved, heldContainer] },
            };
      const original = structuredClone(saved.item);
      const move = (target) =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Actual move handler did not finish')), 2000);
          let calls = 0;
          engine.handleMoveItem(
            (update) => {
              try {
                actor = update(actor);
                if (++calls === 2) {
                  clearTimeout(timeout);
                  resolve();
                }
              } catch (error) {
                clearTimeout(timeout);
                reject(error);
              }
            },
            engine.getFlatInvItems(actor.inventory).find((entry) => entry.id === saved.id),
            target
          );
        });
      await move(heldContainer);
      InventorySchema.parse(actor.inventory);
      assert.equal(
        actor.inventory.items.some((entry) => entry.id === saved.id),
        false
      );
      const contained = actor.inventory.items.find((entry) => entry.id === heldContainer.id).container_contents;
      assert.equal(contained.length, 1);
      assert.equal(contained[0].is_equipped, false);
      assert.deepEqual(contained[0].item, original);
      await move(null);
      const serialized = JSON.parse(JSON.stringify(actor.inventory));
      InventorySchema.parse(serialized);
      assert.deepEqual(serialized.items.find((entry) => entry.id === saved.id).item, original);
      assert.equal(serialized.items.find((entry) => entry.id === heldContainer.id).container_contents.length, 0);
      cases++;
    }
  assert.equal(cases, 4);
});
test('SQL gates precede replay; full-row CAS, source-only metadata update and final all-owner readback retained', () => {
  const childLockPass = migration.indexOf('Acquire only these reviewed child rows');
  const firstParentLock = migration.indexOf('into prose_source_row from public.content_source');
  assert.ok(migration.indexOf('lock table public.content_update') < childLockPass);
  for (const table of ['item', 'trait', 'ability_block']) {
    const lock = migration.indexOf(`perform 1 from public.${table}`);
    assert.ok(childLockPass < lock && lock < firstParentLock);
  }
  assert.match(migration.slice(childLockPass, firstParentLock), /public.item where id=.*for update/);
  assert.doesNotMatch(migration.slice(childLockPass, firstParentLock), /update public\.|continue/);
  assert.ok(
    migration.indexOf('lock table public.content_update') < migration.indexOf('if prose_current=prose_terminal')
  );
  assert.ok(
    migration.indexOf('Equipment prose dependency drift') < migration.indexOf('if prose_current=prose_terminal')
  );
  assert.ok(
    migration.indexOf('owner has unresolved curator submission') < migration.indexOf('if prose_current=prose_terminal')
  );
  assert.match(migration, /to_jsonb\(i\)-'updated_at'-'search_tsv'\) is not distinct from prose_captured/);
  assert.match(migration, /meta_data=jsonb_set\(i.meta_data,'\{source\}'/);
  assert.match(migration, /prose_changed<>1/);
  assert.match(migration, /final all-owner readback drift/);
  assert.doesNotMatch(migration, /update public\.(character|creature|content_source|content_update)/);
  assert.match(release, /count\(\*\)=4 and count\(distinct id\)=4/);
});

test('approved013/021 successor branches share the exact024 B contract without changing historical literals', async () => {
  assert.deepEqual(JSON.parse(conditionText.split('$prose$')[1]), spec);
  assert.deepEqual(JSON.parse(headerText.split('$prose$')[1]), spec);
  for (const [text, releaseName] of [
    [conditionText, 'condition-references'],
    [headerText, 'equipment-headers'],
  ]) {
    const historicalRelease = await readFile(
      new URL(`../../supabase/release/treasure-vault-${releaseName}.sql`, import.meta.url),
      'utf8'
    );
    assert.deepEqual(JSON.parse(historicalRelease.split('$prose$')[1]), spec);
    assert.ok(text.includes("prose_current=prose_patch->'after'"));
    assert.ok(text.includes("prose_patch->'legacy_states'"));
    assert.ok(historicalRelease.includes("exists(select 1 from prose_complete where id=patch->>'id')"));
    assert.ok(
      text.indexOf('This pure initial pass') < text.indexOf('into prose_source_row from public.content_source')
    );
  }
});
