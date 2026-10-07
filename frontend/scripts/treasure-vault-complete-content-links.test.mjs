import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { CONTENT_SCHEMAS } from './content-schemas.ts';
import { createOperationEngine } from './operation-test-harness.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
const { build } = require('esbuild');
const argumentsByName = new Map(
  process.argv
    .slice(2)
    .filter((value) => value.startsWith('--') && value.includes('='))
    .map((value) => {
      const separator = value.indexOf('=');
      return [value.slice(2, separator), value.slice(separator + 1)];
    })
);
const hash = (value) => createHash('sha256').update(value).digest('hex');

/** Load tracked SQL by default. Explicit candidate overrides never fetch live content. */
async function loadSpec(name, filename, delimiter) {
  const override = argumentsByName.get(name);
  const bytes = await readFile(override ?? new URL(`../../supabase/migrations/${filename}`, import.meta.url));
  const expectedHash = argumentsByName.get(`${name}-sha256`);
  if (expectedHash) assert.equal(hash(bytes), expectedHash, `${name} candidate pin`);
  let sql = bytes.toString();
  let artifact;
  if (override && !override.endsWith('.sql')) {
    artifact = JSON.parse(override.endsWith('.b64') ? gunzipSync(Buffer.from(sql.trim(), 'base64')) : sql);
    assert.equal(typeof artifact.migration, 'string', 'Candidate must carry the actual proposed migration');
    sql = artifact.migration;
  }
  const parts = sql.split(`$${delimiter}$`);
  assert.equal(parts.length, 3, `One complete ${delimiter} literal`);
  const spec = JSON.parse(parts[1]);
  if (artifact?.spec) assert.deepEqual(spec, artifact.spec, 'Candidate metadata cannot override actual SQL');
  return { spec, literalHash: hash(parts[1]) };
}

const completion = await loadSpec('completion', '20261002100000_treasure_vault_complete_catalog.sql', 'completion100');
const display = await loadSpec('display', '20261002101000_treasure_vault_complete_display.sql', 'display101');
const spec100 = completion.spec;
const spec101 = display.spec;
const key = (table, row) => `${table}:${row.id}`;
const getPath = (row, path) => path.reduce((value, part) => value?.[part], row);
const setPath = (row, path, value) => {
  const parent = getPath(row, path.slice(0, -1));
  assert.ok(parent && Object.hasOwn(parent, path.at(-1)), 'Existing display leaf only');
  parent[path.at(-1)] = value;
};
const same = (left, right) => {
  try {
    assert.deepEqual(left, right);
    return true;
  } catch {
    return false;
  }
};
const normalize = (value) => {
  const row = structuredClone(value);
  delete row.updated_at;
  delete row.search_tsv;
  if (row.uuid != null) row.uuid = String(row.uuid);
  return row;
};
const pairs = (spells) => spells.map(({ spell, rank }) => [spell.id, rank]);
const tableFor = (type) =>
  ['action', 'feat', 'class-feature', 'sense', 'physical-feature', 'heritage', 'mode', 'ability-block'].includes(type)
    ? 'ability_block'
    : type === 'hazard'
      ? 'creature'
      : type.replaceAll('-', '_');

/** Independently identify actual RichText consumers, excluding cached bases and raw tooltip text. */
function isDisplayed(row, path) {
  const name = path.join('.');
  if (['description', 'special', 'craft_requirements'].includes(name)) return true;
  if (/^heightened\.text\.\d+\.text$/.test(name)) return true;
  if (
    row.type === 'creature' &&
    (name === 'details.description' || /^abilities_base\.\d+\.(description|special)$/.test(name))
  )
    return true;
  if (/^meta_data\.runes\.property\.\d+\.rune\.(description|craft_requirements)$/.test(name)) return true;
  if (path[0] !== 'operations') return false;
  let value = row,
    operation,
    operationDepth;
  for (let index = 0; index < path.length; index++) {
    if (value && typeof value === 'object' && value.id && value.type && value.data) {
      operation = value;
      operationDepth = index;
    }
    value = value[path[index]];
  }
  const tail = path.slice(operationDepth);
  return (
    (operation?.type === 'injectText' && same(tail, ['data', 'text'])) ||
    (operation?.type === 'select' &&
      tail.length === 4 &&
      tail[0] === 'data' &&
      tail[1] === 'optionsPredefined' &&
      /^\d+$/.test(String(tail[2])) &&
      tail[3] === 'description')
  );
}

/** Enumerate complete displayed fields, including nested rune, creature and operation prose. */
function displayedFields(row) {
  const result = [];
  function visit(value, path) {
    if (typeof value === 'string' && isDisplayed(row, path)) result.push({ path, text: value });
    else if (value && typeof value === 'object') {
      for (const [part, child] of Object.entries(value))
        visit(child, [...path, Array.isArray(value) ? Number(part) : part]);
    }
  }
  visit(row, []);
  return result;
}

/** Full-field differences cannot conceal new/deleted columns or non-string mechanics. */
function differences(left, right, path = []) {
  if (same(left, right)) return [];
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    assert.deepEqual(Object.keys(left).sort(), Object.keys(right).sort(), `Unchanged shape ${path}`);
    return Object.keys(left).flatMap((part) => differences(left[part], right[part], [...path, part]));
  }
  return [{ path: path.map(String), before: left, after: right }];
}

const links = (text) =>
  [...text.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_([^\s)]+)\)/g)].map((match) => ({
    literal: match[0],
    label: match[1],
    type: match[2],
    id: match[3],
  }));
const textOnly = (value) =>
  value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const visibleLabel = (value) => textOnly(value).replace(/[*_`]/g, '');
const anchors = (html) => [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => textOnly(match[1]));
const tally = (values) => values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map());
const expressions = (value) => value.match(/\[\[[\s\S]*?\]\]/g) ?? [];
const splitConditions = (value) => [...value.matchAll(/\bpersistent \[[^\]\n]+\]\(link_trait_\d+\) damage\b/gi)].length;

const terminal100 = new Map();
const predecessor100 = new Map();
for (const patch of spec100.patches) {
  assert.ok(!terminal100.has(key(patch.table, patch.final)), 'Unique full owner');
  terminal100.set(key(patch.table, patch.final), normalize(patch.final));
  predecessor100.set(key(patch.table, patch.anchor), normalize(patch.anchor));
}
for (const dependency of spec100.dependencies) {
  assert.ok(!terminal100.has(key(dependency.table, dependency.anchor)), 'Owners and dependencies are disjoint');
  terminal100.set(key(dependency.table, dependency.anchor), normalize(dependency.anchor));
  predecessor100.set(key(dependency.table, dependency.anchor), normalize(dependency.anchor));
}

/** Bind only approved UUID templates to a complete independently allocated fixture identity map. */
function allocatedCatalog(offset, createdAt) {
  const templates = [...spec101.prerequisites, ...spec101.inserts];
  const allocated = new Map(templates.map((entry, index) => [String(entry.uuid), { ...entry, id: offset + index }]));
  assert.equal(allocated.size, templates.length, 'Unique authored UUIDs');
  const beforeRows = [],
    afterRows = [];
  for (const entry of allocated.values()) {
    assert.ok(
      !Object.hasOwn(entry.row, 'id') && !Object.hasOwn(entry.row, 'created_at'),
      'Native allocated fields absent from literal'
    );
    const beforeRow = { ...structuredClone(entry.row), id: entry.id, created_at: createdAt };
    if (entry.binding) {
      const target = allocated.get(String(entry.binding.item_uuid));
      assert.ok(target?.table === 'item', 'Exact pseudopod UUID must resolve as item');
      const matching = beforeRow.operations.filter((operation) => operation.id === entry.binding.operation_id);
      assert.equal(matching.length, 1);
      assert.equal(matching[0].type, 'giveItem');
      assert.equal(matching[0].data.itemId, -30001, 'Only authored chair placeholder is substituted');
      matching[0].data.itemId = target.id;
    }
    const afterRow = structuredClone(beforeRow);
    for (const field of entry.display_fields) {
      assert.equal(getPath(beforeRow, field.path), field.before);
      const tokens = [...field.after_template.matchAll(/\{\{allocated_id:(\d+)\}\}/g)].map((match) => match[1]);
      assert.ok(
        tokens.every((uuid) => uuid === String(entry.uuid)),
        'Every approved dynamic helper is the named owner self-reference'
      );
      assert.deepEqual([...new Set(tokens)].sort(), field.bindings.map((binding) => String(binding.uuid)).sort());
      for (const binding of field.bindings) {
        const target = allocated.get(String(binding.uuid));
        assert.ok(target && target.table === binding.table && target.name === binding.name);
        assert.equal(target.row.content_source_id, binding.content_source_id);
      }
      const text = field.after_template.replace(/\{\{allocated_id:(\d+)\}\}/g, (_, uuid) =>
        String(allocated.get(uuid).id)
      );
      assert.doesNotMatch(text, /\{\{allocated_id:/, 'No unresolved or fabricated self ID');
      setPath(afterRow, field.path, text);
    }
    beforeRows.push({ table: entry.table, row: beforeRow, template: entry });
    afterRows.push({ table: entry.table, row: afterRow, template: entry });
  }
  return { beforeRows, afterRows, allocated };
}

const allocations = [
  allocatedCatalog(9000001, '2026-10-03T00:00:00+00:00'),
  allocatedCatalog(9001001, '2026-10-03T12:00:00+00:00'),
];
const final = new Map(spec101.catalog.map((entry) => [key(entry.table, entry.after), normalize(entry.after)]));
for (const entry of allocations[0].afterRows) {
  assert.ok(!final.has(key(entry.table, entry.row)), 'Validation allocation cannot collide with real catalog');
  final.set(key(entry.table, entry.row), normalize(entry.row));
}
for (const source of spec101.sources) final.set(`content_source:${source.id}`, normalize(source.row));
const fixtures = [...final].map(([id, row]) => ({ table: id.split(':')[0], row }));
const book = fixtures.filter(({ table, row }) => table !== 'content_source' && row.content_source_id === 16);
const row = (table, id) => final.get(`${table}:${id}`);
const spells = fixtures.filter(({ table }) => table === 'spell').map(({ row }) => row);
let engine, parser, directory;

before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(fixtures);
  engine.defineDefaultSources(
    'PAGE',
    spec101.sources.map(({ id }) => id)
  );
  engine.defineDefaultSources(
    'INFO',
    spec101.sources.map(({ id }) => id)
  );
  directory = await mkdtemp(join(tmpdir(), 'wg-tv-complete-links-'));
  // Reuse the engine harness; expose only three missing actual consumers in a tiny auxiliary bundle.
  const source = await readFile(join(frontend, 'src/process/content/content-store.ts'), 'utf8');
  const exports = [...source.matchAll(/export (?:async )?function ([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  const result = await build({
    absWorkingDir: frontend,
    stdin: {
      contents:
        "export { detectSpellheartSpells } from '@spells/spell-utils'; export { getContentDataFromHref } from '@common/rich_text_input/ContentLinkExtension'; export { convertContentLink } from '@drawers/drawer-utils';",
      resolveDir: frontend,
      loader: 'ts',
    },
    tsconfig: join(frontend, 'tsconfig.json'),
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
    plugins: [
      {
        name: 'local-content-boundary',
        setup(builder) {
          builder.onResolve({ filter: /^@content\/content-store$/ }, () => ({ path: 'content', namespace: 'fixture' }));
          builder.onResolve({ filter: /^@utils\/notifications$/ }, () => ({
            path: 'notification',
            namespace: 'fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents:
              path === 'content'
                ? exports.map((name) => `export function ${name}() { return []; }`).join('\n')
                : 'export function displayError() {}',
            loader: 'ts',
          }));
        },
      },
    ],
  });
  const output = join(directory, 'consumers.mjs');
  await writeFile(output, result.outputFiles[0].text);
  parser = await import(pathToFileURL(output));
});
after(async () => {
  await engine?.cleanup();
  if (directory) await rm(directory, { recursive: true, force: true });
});

/** Resolve an actual href with its drawer route, table, subtype and canonical cache helper. */
function assertDestinations(text, catalog = final) {
  for (const link of links(text)) {
    const parsed = parser.getContentDataFromHref(`link_${link.type}_${link.id}`);
    assert.equal(parsed.type, link.type);
    const drawer = parser.convertContentLink(parsed);
    assert.equal(drawer.type, link.type);
    assert.equal(drawer.data.readOnly, true);
    if (link.type === 'condition') {
      assert.ok(engine.getConditionByName(link.id.replaceAll('~', ' ')));
      continue;
    }
    const id = Number(link.id),
      table = tableFor(link.type),
      target = catalog.get(`${table}:${id}`);
    assert.ok(Number.isSafeInteger(id) && id > 0 && target, `Missing destination ${link.literal}`);
    assert.equal(drawer.data.id, id);
    if (table === 'ability_block' && link.type !== 'ability-block') assert.equal(target.type, link.type);
    if (link.type === 'hazard') assert.equal(target.type, 'hazard');
    assert.equal(engine.buildHrefFromContentData(link.type, String(id)), `link_${link.type}_${id}`);
  }
}

/** Restore every declared display leaf and prove that operation semantics and all sibling fields remain exact. */
function assertDisplayRestoration(beforeRow, afterRow, fields) {
  assert.deepEqual(
    differences(beforeRow, afterRow),
    fields.map((field) => ({
      path: field.path.map(String),
      before: field.before,
      after: getPath(afterRow, field.path),
    })),
    'Every actual change is one declared display leaf'
  );
  const restored = structuredClone(afterRow);
  for (const field of fields) {
    assert.ok(isDisplayed(beforeRow, field.path), `Real RichText consumer ${field.path}`);
    assert.equal(typeof field.before, 'string');
    const text = getPath(afterRow, field.path);
    assert.equal(typeof text, 'string');
    if (field.after != null) assert.equal(text, field.after, 'Exact approved display text, not merely a valid field');
    assert.equal(
      text.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1').replace(/[*_]/g, ''),
      field.before.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1').replace(/[*_]/g, ''),
      '101 may add links but cannot change any visible rules text'
    );
    assert.deepEqual(expressions(text), expressions(field.before), 'WG mechanics expressions are byte-identical');
    setPath(restored, field.path, field.before);
  }
  assert.deepEqual(
    restored,
    beforeRow,
    'All identity, operation, raw tooltip, metadata and mechanics fields preserved'
  );
}

/** The display step starts from every exact final source header, including cached counts. */
function assertSourceBridge(sources) {
  assert.deepEqual(
    sources,
    spec100.sources.map((source) => ({ id: source.id, name: source.name, row: source.final })),
    '101 preserves the complete100 source domain and every full source row'
  );
}

/** Allocated templates retain their authored UUID domain, full payload and attack-binding descriptor. */
function assertTemplateBridge(templates) {
  const descriptor = ({ table, uuid, name, row, binding }) => ({ table, uuid, name, row, binding });
  assert.deepEqual(
    templates.map(descriptor),
    [...spec100.prerequisites, ...spec100.inserts].map(descriptor),
    '101 preserves every exact100 template and its dynamic binding, not just the literal row'
  );
}

test('complete tracked100 and101 domains, full schemas and immutable operations match exactly', () => {
  assert.equal(spec101.completion_spec_sha256, completion.literalHash);
  assertSourceBridge(spec101.sources);
  assertTemplateBridge([...spec101.prerequisites, ...spec101.inserts]);
  assert.equal(final.size - allocations[0].afterRows.length - spec101.sources.length, terminal100.size);
  assert.equal(new Set(spec101.catalog.map((entry) => `${entry.table}:${entry.id}`)).size, terminal100.size);
  assert.deepEqual(spec100.counts.final, spec101.counts);
  for (const patch of spec100.patches) {
    assert.deepEqual(patch.anchor.operations, patch.final.operations, '100 cannot silently change any operation');
    const schema = CONTENT_SCHEMAS[patch.table.replaceAll('_', '-')];
    schema.parse(patch.anchor);
    schema.parse(patch.final);
    const changed = Object.keys(patch.final)
      .filter((name) => !same(patch.anchor[name], patch.final[name]))
      .sort();
    assert.deepEqual(changed, [...patch.changed_columns].sort());
  }
  for (const entry of spec101.catalog) {
    assert.deepEqual(
      normalize(entry.before),
      terminal100.get(`${entry.table}:${entry.id}`),
      '101 begins at exact full100 terminal owner/dependency'
    );
    assertDisplayRestoration(entry.before, entry.after, entry.display_fields);
    if (entry.before.content_source_id === 16 || entry.display_fields.length) {
      CONTENT_SCHEMAS[entry.table.replaceAll('_', '-')].parse(entry.before);
      CONTENT_SCHEMAS[entry.table.replaceAll('_', '-')].parse(entry.after);
    }
  }
  for (const allocation of allocations)
    for (const [index, entry] of allocation.afterRows.entries()) {
      CONTENT_SCHEMAS[entry.table].parse(allocation.beforeRows[index].row);
      CONTENT_SCHEMAS[entry.table].parse(entry.row);
      assertDisplayRestoration(allocation.beforeRows[index].row, entry.row, entry.template.display_fields);
      assert.equal(entry.row.created_at, allocation.beforeRows[index].row.created_at);
    }
  for (const [table, count] of Object.entries(spec101.counts))
    assert.equal(
      book.filter((entry) => entry.table === table).length,
      count,
      `Complete book ${table} domain, not a sampled cache`
    );
});

test('every displayed book reference resolves its real destination and exact ability subtype', () => {
  // Frost's Touch's four actual heightened paragraphs are separate RichText consumers.
  const frostTouch = row('spell', 5829);
  assert.equal(frostTouch.content_source_id, 16);
  const expectedHeightened = [
    {
      path: ['heightened', 'text', 0, 'text'],
      text: 'You can create simple objects of ice with up to 1 Bulk and of a level not exceeding 1. Such objects must be rigid. You can only have one such object created at a time; if you create another, the previous object melts instantly.',
    },
    { path: ['heightened', 'text', 1, 'text'], text: 'Items you create can be up to 4 Bulk and 4th level.' },
    { path: ['heightened', 'text', 2, 'text'], text: 'Items you create can be up to 8 Bulk and 8th level.' },
    { path: ['heightened', 'text', 3, 'text'], text: 'Items you create can be up to 20 Bulk and 12th level.' },
  ];
  assert.deepEqual(
    displayedFields(frostTouch).filter((field) => field.path[0] === 'heightened'),
    expectedHeightened,
    'All four independently expected source16 heightened prose leaves are covered'
  );
  for (let index = 0; index < expectedHeightened.length; index++)
    assert.equal(isDisplayed(frostTouch, ['heightened', 'text', index, 'amount']), false, 'Rank label stays raw');
  assert.equal(isDisplayed(frostTouch, ['heightened', 'data', 'text']), false, 'Opaque heightening data stays raw');
  for (const entry of book) for (const field of displayedFields(entry.row)) assertDestinations(field.text);
  for (const [type, name, id] of [
    ['trait', 'Fire', 1542],
    ['action', 'Strike', 19856],
    ['action', 'Interact', 19733],
    ['sense', 'Low-Light Vision', 19330],
    ['item', 'Armor Potency (+1)', 6719],
    ['item', 'Weapon Potency (+1)', 7950],
  ]) {
    assert.equal(engine.convertToHardcodedLink(type, name, 'reference'), `[reference](link_${type}_${id})`);
  }
});

test('every actual displayed101 field renders repeated helpers and condition anchors without nesting', () => {
  const changed = spec101.catalog.flatMap((entry) =>
    entry.display_fields.map((field) => ({ before: field.before, after: field.after }))
  );
  for (const allocation of allocations)
    for (const entry of allocation.afterRows)
      for (const field of entry.template.display_fields)
        changed.push({ before: field.before, after: getPath(entry.row, field.path) });
  for (const field of changed) {
    const beforeHtml = engine.renderRichText(field.before),
      html = engine.renderRichText(field.after);
    assert.doesNotMatch(html, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/, 'No nested anchors');
    assert.equal(
      anchors(html).length,
      anchors(beforeHtml).length +
        links(field.after).length -
        links(field.before).length +
        splitConditions(field.after) -
        splitConditions(field.before)
    );
    const expected = tally(links(field.after).map((link) => visibleLabel(link.label))),
      rendered = tally(anchors(html));
    for (const [label, count] of expected)
      assert.ok((rendered.get(label) ?? 0) >= count, `Every repeated label renders: ${label}`);
  }
  // The full book also exercises pre-existing and newly repaired prose, not just101's small write set.
  for (const entry of book)
    for (const field of displayedFields(entry.row)) {
      if (!field.text) continue;
      const html = engine.renderRichText(field.text);
      assert.doesNotMatch(
        html,
        /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/,
        `Nested book anchors ${entry.table}:${entry.row.id}:${field.path}`
      );
      const expected = tally(links(field.text).map((link) => visibleLabel(link.label))),
        rendered = tally(anchors(html));
      for (const [label, count] of expected)
        assert.ok(
          (rendered.get(label) ?? 0) >= count,
          `Complete book helper multiplicity ${entry.row.name}:${field.path}:${label}`
        );
    }
});

test('reviewed damage lists and Blood Booster shorthand keep their independent condition-help expectations', () => {
  // Printed wording has one list per ammunition variant, two potion lists and two joined bleed clauses.
  const expected = new Map([
    [11960, ['persistent', 'damage']],
    [11961, ['persistent', 'damage']],
    [11962, ['persistent', 'damage']],
    [12303, ['persistent', 'damage', 'persistent', 'damage']],
    [11780, ['persistent bleed', 'persistent', 'damage', 'persistent bleed', 'persistent', 'damage']],
    [11781, ['persistent bleed', 'persistent', 'damage', 'persistent bleed', 'persistent', 'damage']],
    [11782, ['persistent bleed', 'persistent', 'damage', 'persistent bleed', 'persistent', 'damage']],
  ]);
  for (const [id, labels] of expected) {
    const item = row('item', id);
    assert.ok(item, `Reviewed persistent-damage owner ${id} exists`);
    const html = engine.renderRichText(item.description);
    assert.deepEqual(
      anchors(html).filter((label) => ['persistent', 'persistent bleed', 'damage'].includes(label)),
      labels,
      `Printed condition occurrences remain accessible: ${item.name}`
    );
    assert.doesNotMatch(html, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
    assert.doesNotMatch(html, /conditionBlacklist|conditionblacklist|indentMod|indentmod/);
  }
});

const requiredReferences = new Map([
  [
    12426,
    [
      ['trait', 1542, 3],
      ['item', 7950, 1],
      ['item', 7862, 1],
      ['item', 13574, 1],
      ['action', 19856, 1],
      ['item', 12426, 4],
    ],
  ],
  [
    12287,
    [
      ['item', 7950, 1],
      ['item', 7862, 1],
      ['item', 7761, 1],
      ['item', 7075, 1],
      ['trait', 1576, 2],
      ['item', 12061, 3],
    ],
  ],
  [
    11768,
    [
      ['item', 6720, 1],
      ['item', 7951, 1],
      ['item', 7952, 1],
      ['item', 6721, 1],
      ['item', 6854, 4],
      ['action', 19856, 2],
      ['action', 19733, 1],
    ],
  ],
  [11771, [['sense', 19330, 1]]],
  [12104, [['trait', 2864, 1]]],
  [
    12209,
    [
      ['spell', 9090, 1],
      ['action', 19627, 1],
    ],
  ],
  [12212, [['class-feature', 24727, 1]]],
  [
    12197,
    [
      ['feat', 34421, 1],
      ['feat', 34423, 1],
    ],
  ],
]);

/** These independently reviewed destinations reject omissions even when no prior same-name helper existed. */
function assertImportantReferences(id, text) {
  const present = links(text);
  for (const [type, target, count] of requiredReferences.get(id)) {
    assert.equal(
      present.filter((link) => link.type === type && Number(link.id) === target).length,
      count,
      `Every ${type}:${target} occurrence in ${id}`
    );
  }
  assertDestinations(text);
}

test('Immortal Bastion links its printed deflect melee reference without changing the armor or its rules', async () => {
  const historical = JSON.parse(
    (
      await readFile(
        new URL('../../supabase/migrations/20261002070000_treasure_vault_immortal_bastion_prose.sql', import.meta.url),
        'utf8'
      )
    ).split('$bastion$')[1]
  );
  const patch = spec100.patches.find((entry) => entry.table === 'item' && entry.id === 12104);
  const displayEntry = spec101.catalog.find((entry) => entry.table === 'item' && entry.id === 12104);
  assert.ok(patch && displayEntry);
  const reference = engine.convertToHardcodedLink('trait', 'Entrench Melee', 'deflect melee');
  assert.equal(reference, '[deflect melee](link_trait_2864)');
  assert.equal((historical.after.match(/deflect melee/g) ?? []).length, 1);
  assert.equal(patch.anchor.description, historical.after);
  const expectedDescription = historical.after.replace('deflect melee', reference);
  const expectedFinal = { ...patch.anchor, description: expectedDescription, usage: 'worn armor' };
  const validate = (item) => {
    assertImportantReferences(12104, item.description);
    assert.equal(item.description, expectedDescription);
    assert.deepEqual(item, expectedFinal, 'Only the reviewed usage and printed reference change');
  };
  validate(patch.final);
  assert.deepEqual(patch.changed_columns, ['description', 'usage']);
  assert.deepEqual(displayEntry.before, normalize(patch.final));
  assert.deepEqual(displayEntry.after, displayEntry.before);
  assert.deepEqual(displayEntry.display_fields, []);
  const html = engine.renderRichText(patch.final.description);
  assert.equal(anchors(html).filter((label) => label === 'deflect melee').length, 1);
  assert.equal((html.match(/<abbr class="action-symbol">R<\/abbr>/g) ?? []).length, 2);
  assert.doesNotMatch(patch.final.description, /\[\+[12]\]\(link_item_/);
  for (const description of [
    historical.after,
    expectedDescription.replace('link_trait_2864', 'link_trait_2865'),
    expectedDescription.replace('link_trait_2864', 'link_item_2864'),
    expectedDescription.replace('[deflect melee]', '[Entrench Melee]'),
    `${expectedDescription} ${reference}`,
  ]) {
    assert.throws(() => validate({ ...patch.final, description }));
  }
  assert.throws(() => validate({ ...patch.final, traits: [] }));
});

test('first Fire, base gear, potency, runes, Interact and repeated references cannot disappear or change destination', () => {
  for (const [id, references] of requiredReferences) {
    const text = row('item', id).description;
    assertImportantReferences(id, text);
    for (const [type, target] of references) {
      const original = links(text).find((link) => link.type === type && Number(link.id) === target);
      assert.throws(
        () => assertImportantReferences(id, text.replace(original.literal, original.label)),
        'Deleting the first reference must fail'
      );
      assert.throws(
        () =>
          assertImportantReferences(
            id,
            text.replace(original.literal, original.literal.replace(`_${target})`, '_999999999)'))
          ),
        'Wrong destination must fail'
      );
      assert.throws(
        () =>
          assertImportantReferences(
            id,
            text.replace(
              original.literal,
              original.literal.replace(`link_${type}_`, `link_${type === 'spell' ? 'trait' : 'spell'}_`)
            )
          ),
        'Wrong type must fail'
      );
    }
  }
  const solar = engine.renderRichText(row('item', 12426).description),
    solarAnchors = anchors(solar);
  assert.equal(solarAnchors.filter((label) => label === 'persistent').length, 1);
  assert.equal(solarAnchors.filter((label) => label === 'damage').length, 1);
  assert.equal(
    solarAnchors.filter((label) => label === 'fire').length,
    3,
    'Linked Fire and persistent condition both navigate'
  );
  assert.doesNotMatch(solar, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
  assert.doesNotMatch(
    row('item', 11771).description,
    /\[low-[^\]]*\]\(link_spell_/,
    'Low-Light sense must not become the Light spell'
  );
});

test('defining headers and ordinary bonuses remain plain; all raw bonus tooltip operations are immutable', () => {
  const artificer = row('item', 11719).operations.find((operation) => operation.type === 'injectText').data.text;
  assert.ok(artificer.startsWith('**Artificer Spectacles** '));
  assert.doesNotMatch(artificer, /^\*\*\[/, 'Defining heading is not a self reference');
  assert.match(artificer, /\[Identify Magic\]\(link_action_19730\)/);
  let rawBonusOperations = 0;
  for (const entry of spec101.catalog) {
    function visit(value, path) {
      if (value && typeof value === 'object' && value.type === 'addBonusToValue') {
        assert.deepEqual(value, getPath(entry.after, path), 'Whole raw bonus operation, not just text, remains exact');
        assert.equal(
          getPath(entry.after, [...path, 'data', 'text']),
          value.data.text,
          'No helper is added to raw tooltip text, including untouched historical strings'
        );
        rawBonusOperations++;
      }
      if (value && typeof value === 'object')
        for (const [part, child] of Object.entries(value)) visit(child, [...path, part]);
    }
    visit(entry.before, []);
  }
  assert.ok(rawBonusOperations >= 118, 'Complete raw-tooltip corpus is exercised');
  for (const entry of book)
    for (const field of displayedFields(entry.row)) {
      assert.doesNotMatch(
        field.text,
        /\[\+[1-4]\]\(link_item_\d+\) (?:item|status|circumstance) bonus/i,
        'Ordinary numeric bonuses are not potency runes'
      );
      assert.doesNotMatch(
        field.text,
        /\[(?:bludgeoning|piercing|slashing)\]\(link_trait_/i,
        'Physical damage has no invented trait target'
      );
    }
  for (const entry of [...spec101.prerequisites, ...spec101.inserts]) {
    const template100 = [...spec100.prerequisites, ...spec100.inserts].find(
      (value) => value.table === entry.table && String(value.uuid) === String(entry.uuid)
    );
    assert.deepEqual(
      entry.row,
      template100.row,
      'Original authored operations and all other literal fields remain exact'
    );
  }
});

test('all101 display removals and mechanical/raw-tooltip sibling mutants fail exact restoration', () => {
  for (const [index, source] of spec101.sources.entries()) {
    for (const name of ['name', 'is_published', 'created_at']) {
      const changed = structuredClone(spec101.sources);
      changed[index].row[name] = name === 'is_published' ? !source.row[name] : 'unapproved';
      assert.throws(() => assertSourceBridge(changed), 'A changed source header cannot pass the display bridge');
    }
  }
  const changedCounts = structuredClone(spec101.sources);
  changedCounts.find((source) => source.id === 16).row.meta_data.counts.item++;
  assert.throws(() => assertSourceBridge(changedCounts), 'The exact terminal source count remains guarded');
  assert.throws(() => assertSourceBridge(spec101.sources.slice(1)), 'A missing source cannot pass');
  assert.throws(() => assertSourceBridge([...spec101.sources, spec101.sources[0]]), 'An extra source cannot pass');
  const templates = [...spec101.prerequisites, ...spec101.inserts];
  const chairIndex = templates.findIndex((entry) => entry.table === 'creature' && entry.binding);
  assert.ok(chairIndex >= 0, 'The actual authored chair has a dynamic attack binding');
  for (const mutate of [
    (entry) => delete entry.binding,
    (entry) => (entry.binding = null),
    (entry) => (entry.binding.operation_id = 'unapproved'),
    (entry) => (entry.binding.item_uuid = 'unapproved'),
    (entry) => (entry.binding.unapproved = true),
  ]) {
    const changed = structuredClone(templates);
    mutate(changed[chairIndex]);
    assert.throws(
      () => assertTemplateBridge(changed),
      'A removed or altered chair descriptor cannot pass merely because its literal row is unchanged'
    );
  }
  assert.throws(() => assertTemplateBridge(templates.slice(1)), 'The authored UUID template domain remains complete');
  for (const entry of spec101.catalog.filter((value) => value.display_fields.length)) {
    for (const field of entry.display_fields) {
      for (const link of links(field.after)) {
        const missing = structuredClone(entry.after);
        setPath(missing, field.path, field.after.replace(link.literal, link.label));
        assert.throws(() => assertDisplayRestoration(entry.before, missing, entry.display_fields));
      }
      const changedRules = structuredClone(entry.after);
      setPath(changedRules, field.path, `${field.after} Unapproved rule.`);
      assert.throws(() => assertDisplayRestoration(entry.before, changedRules, entry.display_fields));
    }
    for (const name of ['name', 'uuid', 'content_source_id', 'created_at']) {
      const changedIdentity = structuredClone(entry.after);
      changedIdentity[name] = 'unapproved';
      assert.throws(() => assertDisplayRestoration(entry.before, changedIdentity, entry.display_fields));
    }
  }
  for (const allocation of allocations)
    for (const [index, entry] of allocation.afterRows.entries()) {
      const beforeRow = allocation.beforeRows[index].row;
      const fields = entry.template.display_fields.map((field) => ({
        ...field,
        after: getPath(entry.row, field.path),
      }));
      for (const field of fields)
        for (const link of links(field.after)) {
          const missing = structuredClone(entry.row);
          setPath(missing, field.path, field.after.replace(link.literal, link.label));
          assert.throws(
            () => assertDisplayRestoration(beforeRow, missing, fields),
            'Bound self and every repeated reference are exact'
          );
        }
      const operation = entry.row.operations?.find((value) => value.type === 'giveItem');
      if (operation) {
        const wrongGrant = structuredClone(entry.row);
        wrongGrant.operations.find((value) => value.id === operation.id).data.itemId++;
        assert.throws(
          () => assertDisplayRestoration(beforeRow, wrongGrant, fields),
          'Chair attack binding cannot change'
        );
      }
    }
  const rawOwner = spec101.catalog.find((entry) =>
    entry.before.operations?.some((operation) => operation.type === 'addBonusToValue')
  );
  const raw = structuredClone(rawOwner.after);
  raw.operations.find((operation) => operation.type === 'addBonusToValue').data.text += ' [Fire](link_trait_1542)';
  assert.throws(
    () => assertDisplayRestoration(rawOwner.before, raw, rawOwner.display_fields),
    'Raw tooltip may not become a displayed operation leaf'
  );
});

// Fixed primary ranks: AoN Equipment2235/2237/2238/2236; Spells2781 and1521 establish4 and9.
const expectedCasting = new Map([
  [
    12326,
    [
      [6722, 0],
      [8805, 1],
    ],
  ],
  [12337, [[4636, 0]]],
  [
    12325,
    [
      [6722, 0],
      [4742, 4],
      [8995, 4],
    ],
  ],
  [
    12708,
    [
      [4831, 0],
      [4855, 2],
    ],
  ],
  [
    12309,
    [
      [4699, 0],
      [4619, 7],
    ],
  ],
  [
    12307,
    [
      [4699, 0],
      [4619, 7],
      [6693, 8],
    ],
  ],
  [
    12308,
    [
      [4699, 0],
      [4619, 7],
      [4612, 9],
    ],
  ],
]);

test('independent primary spellheart and wand expectations include genuine pre100 RED omissions', () => {
  for (const [id, expected] of expectedCasting)
    assert.deepEqual(
      pairs(parser.detectSpellheartSpells(row('item', id).description, spells)),
      expected,
      `Actual Spellheart panel ${id}`
    );
  for (const [id, expected] of [
    [12695, [[4571, 6]]],
    [12597, [[4999, 4]]],
  ]) {
    assert.deepEqual(pairs(engine.detectSpells(row('item', id).description, spells, true)), expected);
    assert.deepEqual(
      engine.getInventorySpellIds([{ item: row('item', id), is_equipped: true }]),
      expected.map(([spell]) => spell)
    );
  }
  for (const [id, expected, spellheart] of [
    [
      12326,
      [
        [6722, 0],
        [8805, 1],
      ],
      true,
    ],
    [12337, [[4636, 0]], true],
    [12695, [[4571, 6]], false],
  ]) {
    const baseline = predecessor100.get(`item:${id}`);
    assert.ok(baseline, 'Real authored pre100 baseline, never a forged negative fixture');
    const detected = spellheart
      ? parser.detectSpellheartSpells(baseline.description, spells)
      : engine.detectSpells(baseline.description, spells, true);
    assert.notDeepEqual(pairs(detected), expected, `True baseline RED ${id}`);
  }
  assert.deepEqual(
    engine.getInventorySpellIds([{ item: predecessor100.get('item:12597'), is_equipped: true }]),
    [4999],
    '100 baseline already contains the Cinder-only description; do not fabricate a fourth baseline RED'
  );
  const ordinaryMist = row('item', 12597).description;
  assert.match(ordinaryMist, /but the mist prevents/);
  const falseSpell = {
    ...row('item', 12597),
    description: ordinaryMist.replace('but the mist prevents', 'but the [mist](link_spell_4728) prevents'),
  };
  assert.throws(
    () => assert.deepEqual(engine.getInventorySpellIds([{ item: falseSpell, is_equipped: true }]), [4999]),
    'Linking the ordinary noun mist as a spell must fail the approved casting dependency expectation'
  );
  for (const [id, expected] of [
    [12200, [[4616, 3]]],
    [12321, [[6354, 7]]],
    [12320, [[6354, 7]]],
    [12209, [[9090, 5]]],
  ]) {
    assert.deepEqual(pairs(engine.detectSpells(row('item', id).description, spells, true)), expected);
    assert.deepEqual(engine.detectSpells(row('item', id).description, spells, false), []);
    assert.deepEqual(
      engine.getInventorySpellIds([{ item: row('item', id), is_equipped: true }]),
      [],
      'Simple references are not available inventory casts'
    );
  }
  assert.deepEqual(row('item', 12325).meta_data.spellheart_casting, { dc: 29 });
  assert.match(row('item', 12325).description, /spell attack roll[^\n]+\+13/);
});

test('all real staff, wand and spellheart memberships and ranks survive101 display-only changes', () => {
  let eligible = 0;
  for (const entry of spec101.catalog.filter(
    (value) => value.table === 'item' && value.before.content_source_id === 16
  )) {
    const beforeItem = [{ item: entry.before, is_equipped: true }],
      afterItem = [{ item: entry.after, is_equipped: true }];
    assert.deepEqual(
      engine.getInventorySpellIds(afterItem),
      engine.getInventorySpellIds(beforeItem),
      `Exact inventory dependencies ${entry.id}`
    );
    const staff = engine.filterByTraitType(afterItem, 'STAFF').length > 0;
    const wand = engine.filterByTraitType(afterItem, 'WAND').length > 0;
    const spellheart = engine.filterByTraitType(afterItem, 'SPELLHEART').length > 0;
    if (!staff && !wand && !spellheart) continue;
    const detected = (item) =>
      pairs(
        spellheart
          ? parser.detectSpellheartSpells(item.description, spells)
          : engine.detectSpells(item.description, spells, wand)
      );
    assert.deepEqual(detected(entry.after), detected(entry.before), `Real panel members and ranks ${entry.id}`);
    eligible++;
  }
  assert.equal(eligible, 231, 'Exercise the whole real eligible corpus, not a handpicked subset');
  for (const [id, attack, dc, spellId] of [
    [12326, 9, 19, 6722],
    [12337, 7, 17, 4636],
  ]) {
    engine.resetVariables('CHARACTER');
    engine.setVariable('CHARACTER', 'LEVEL', 5);
    engine.setVariable('CHARACTER', 'SPELL_ATTACK', { value: 'U' });
    engine.setVariable('CHARACTER', 'SPELL_DC', { value: 'U' });
    engine.setVariable('CHARACTER', 'ATTRIBUTE_CHA', { value: 0, partial: false });
    engine.setVariable('CHARACTER', 'CASTING_SOURCES', []);
    const stats = engine.getSpellheartStats(
      'CHARACTER',
      row('spell', spellId),
      'NONE',
      'ATTRIBUTE_CHA',
      row('item', id).meta_data.spellheart_casting,
      { level: 5, spells: { slots: [], list: [], innate_casts: [] } }
    );
    assert.deepEqual(stats.spell_attack.total, [attack, attack - 5, attack - 10]);
    assert.equal(stats.spell_dc.total, dc);
  }
});
