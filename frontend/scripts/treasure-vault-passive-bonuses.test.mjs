import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';
import { ContentTypeSchema, ContentUpdateSchema, ItemSchema } from '../src/schemas/content.ts';
import { OperationSchema } from '../src/schemas/operations.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const migration = await readFile(
  new URL('../../supabase/migrations/20261001050000_treasure_vault_passive_bonuses.sql', import.meta.url),
  'utf8'
);
const predicate = await readFile(
  new URL('../../supabase/release/treasure-vault-passive-bonuses.sql', import.meta.url),
  'utf8'
);
const patches = JSON.parse(migration.split('$patches$')[1]);
const dependencies = JSON.parse(migration.split('$dependencies$')[1]);
const expected = JSON.parse(predicate.split('$expected$')[1]);
const md5 = (text) => createHash('md5').update(text).digest('hex');
let engine;
let passiveHelpers;
let fixtureRows;
let originalRows;
let repairedRows;
let sequence = 0;

/** Rehearse the same exact reviewed leaves, accepting only the original NULL operations or the repaired array. */
function repair(original, patch) {
  assert.deepEqual(
    [
      original.id,
      original.name,
      String(original.uuid),
      original.content_source_id,
      original.level,
      original.group,
      original.usage,
      original.traits,
    ],
    [
      patch.id,
      patch.name,
      patch.uuid,
      patch.source,
      patch.level,
      'GENERAL',
      patch.id === 12041 ? 'other' : 'worn',
      patch.traits,
    ]
  );
  assert.deepEqual(original.meta_data?.source, patch.citation);
  assert.ok(
    [patch.description.before, patch.description.after].includes(md5(original.description)),
    'unreviewed description'
  );
  if (original.operations !== null) assert.deepEqual(original.operations, patch.operations, 'unreviewed operations');
  const proposed = structuredClone(original);
  if (md5(proposed.description) !== patch.description.after) {
    for (const replacement of patch.description.replacements) {
      assert.equal(proposed.description.split(replacement.from).length - 1, replacement.count);
      proposed.description = proposed.description.replaceAll(replacement.from, replacement.to);
    }
  }
  assert.equal(md5(proposed.description), patch.description.after);
  proposed.operations = structuredClone(patch.operations);
  return proposed;
}

/** Load actual display, submission-type and linking helpers with the same real engine and an explicit official fixture cache. */
async function loadPassiveHelpers() {
  const directory = await mkdtemp(join(process.env.TMPDIR || '/tmp', 'wg-passive-display-'));
  try {
    const output = await build({
      absWorkingDir: frontend,
      stdin: {
        contents:
          "export { getResistWeaks } from '@utils/resist-weaks'; export { setReader } from '@variables/variable-manager'; export { setCompiler } from '@variables/variable-utils'; export { convertToHardcodedLink } from '@content/hardcoded-links'; export { convertToContentType } from '@content/content-utils'; export { setFixtures as setContentFixtures } from '@content/content-store';",
        resolveDir: frontend,
        loader: 'ts',
      },
      tsconfig: join(frontend, 'tsconfig.json'),
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
      plugins: [
        {
          name: 'same-engine-variables',
          setup(plugin) {
            plugin.onResolve({ filter: /^@variables\/variable-(manager|utils)$/ }, ({ path }) => ({
              path,
              namespace: 'engine',
            }));
            plugin.onLoad({ filter: /.*/, namespace: 'engine' }, ({ path }) => ({
              contents: path.endsWith('manager')
                ? 'let reader;export function setReader(value){reader=value;}export function getVariable(...args){return reader(...args);}'
                : 'let compiler;export function setCompiler(value){compiler=value;}export function compileExpressions(...args){return compiler(...args);}',
              loader: 'ts',
            }));
            plugin.onResolve({ filter: /^@content\/content-store$/ }, () => ({
              path: 'cache',
              namespace: 'fixture',
            }));
            plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
              contents:
                "let rows=[];export function setFixtures(value){rows=value;}export function getCachedContent(type){return rows.filter(entry=>entry.table===type.replaceAll('-','_')).map(entry=>entry.row);}",
              loader: 'ts',
            }));
          },
        },
      ],
    });
    const file = join(directory, 'helpers.mjs');
    await writeFile(file, output.outputFiles[0].text);
    const helpers = await import(pathToFileURL(file));
    helpers.setReader(engine.getVariable);
    helpers.setCompiler(engine.compileExpressions);
    helpers.setContentFixtures(fixtureRows);
    return { ...helpers, cleanup: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

/** Keep the official item snapshot intact while giving each inventory occurrence its own ID. */
function inventoryItem(item, flags = {}, suffix = '') {
  return {
    id: `passive-${item.id}${suffix}`,
    item,
    is_equipped: true,
    is_invested: true,
    is_implanted: false,
    is_formula: false,
    container_contents: [],
    ...flags,
  };
}

/** Place an occurrence in a container using the unchanged inventory representation. */
function inPack(entry) {
  return inventoryItem(
    {
      id: 990072,
      name: 'Audit pack',
      group: 'GENERAL',
      usage: 'worn',
      meta_data: { bulk: { capacity: 4 } },
      operations: [],
    },
    { container_contents: [entry] }
  );
}

/** Run the production controller against explicit local official rows and return the same variable state the sheet receives. */
async function calculate({ level = 14, items = [], enabled = [16], operations = [], characterId = 990071 } = {}) {
  const content = {
    classes: [],
    ancestries: [],
    backgrounds: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    items: enabled.includes(16) ? repairedRows : [],
    abilityBlocks: fixtureRows.filter(({ table }) => table === 'ability_block').map(({ row }) => row),
    traits: fixtureRows.filter(({ table }) => table === 'trait').map(({ row }) => row),
    defaultSources: { PAGE: enabled, INFO: [3] },
  };
  engine.setFixtures(fixtureRows);
  const character = {
    id: characterId,
    name: 'Passive bonus fixture',
    level,
    hp_current: 1,
    details: { conditions: [] },
    inventory: { items, coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
    operation_data: { selections: {} },
    content_sources: { enabled },
    meta_data: { reset_hp: false },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: operations,
  };
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  engine.importVariableStore('CHARACTER', result.store);
  return result;
}

const operation = (type, data) => ({ id: `passive-test-${++sequence}`, type, data });
const item = (id) => repairedRows.find((row) => row.id === id);
const bonuses = (variable) => engine.getVariableBonuses('CHARACTER', variable);
const bonusTotal = (variable) => engine.getProfValueParts('CHARACTER', variable).breakdown.bonusValue;

before(async () => {
  fixtureRows = await readContentRows([
    ...patches.map(({ id }) => ({ table: 'item', id })),
    ...dependencies.map(({ table, id }) => ({ table: table.replaceAll('-', '_'), id })),
    ...[1459, 1568, 1519, 1454].map((id) => ({ table: 'trait', id })),
  ]);
  originalRows = fixtureRows.filter(({ table }) => table === 'item').map(({ row }) => row);
  repairedRows = patches.map((patch) =>
    repair(
      originalRows.find(({ id }) => id === patch.id),
      patch
    )
  );
  engine = await createOperationEngine();
  passiveHelpers = await loadPassiveHelpers();
});
after(async () => {
  await passiveHelpers?.cleanup();
  await engine?.cleanup();
});

test('the exact two-item repair validates complete schemas, preserves other fields, and replays unchanged', () => {
  assert.deepEqual(
    patches.map(({ id }) => id),
    [12041, 12573]
  );
  assert.equal(
    patches.reduce((sum, patch) => sum + patch.operations.length, 0),
    5
  );
  assert.equal(new Set(patches.flatMap(({ operations }) => operations.map(({ id }) => id))).size, 5);
  for (const patch of patches) {
    const beforeRow = originalRows.find(({ id }) => id === patch.id);
    const proposed = repair(beforeRow, patch);
    ItemSchema.parse(beforeRow);
    ItemSchema.parse(proposed);
    proposed.operations.forEach((entry) => OperationSchema.parse(entry));
    assert.deepEqual(repair(proposed, patch), proposed, 'idempotent replay');
    assert.deepEqual(
      { ...proposed, operations: beforeRow.operations, description: beforeRow.description },
      beforeRow,
      'all unrelated fields preserved'
    );
    assert.deepEqual(
      proposed.meta_data.foundry,
      beforeRow.meta_data.foundry,
      'unused Foundry rules are not overwritten'
    );
    const releaseRow = expected.find(({ id }) => id === patch.id);
    assert.deepEqual(releaseRow.operations, patch.operations);
    assert.deepEqual(releaseRow.traits, patch.traits);
    assert.deepEqual(releaseRow.citation, patch.citation);
    assert.equal(releaseRow.description_md5, patch.description.after);
  }
  assert.deepEqual(JSON.parse(predicate.split('$dependencies$')[1]), dependencies);
  for (const dependency of dependencies) {
    const row = fixtureRows.find(
      (entry) => entry.table === dependency.table.replaceAll('-', '_') && entry.row.id === dependency.id
    ).row;
    assert.deepEqual(
      [row.name, String(row.uuid), row.content_source_id],
      [dependency.name, dependency.uuid, dependency.source]
    );
    if (dependency.type) assert.equal(row.type, dependency.type);
  }
});

test('official fixture links resolve through the actual cache-backed helper with action subtype indirection', () => {
  const command = passiveHelpers.convertToHardcodedLink('action', 'Command an Animal');
  const impression = passiveHelpers.convertToHardcodedLink('action', 'Make an Impression');
  const emotion = passiveHelpers.convertToHardcodedLink('trait', 'emotion');
  const hood = patches.find(({ id }) => id === 12573);
  assert.deepEqual(
    hood.description.replacements.map(({ to }) => to),
    [command, impression]
  );
  assert.equal(hood.operations[0].data.text, `to ${command} (+2 if the animal is a bear)`);
  for (const operation of patches.find(({ id }) => id === 12041).operations.slice(1)) {
    assert.equal(operation.data.text, `against ${emotion} effects`);
  }
  assert.notEqual(command, 'Command an Animal');
  assert.notEqual(impression, 'Make an Impression');
  assert.notEqual(emotion, 'emotion');
  passiveHelpers.setContentFixtures([]);
  assert.equal(passiveHelpers.convertToHardcodedLink('action', 'Command an Animal'), 'Command an Animal');
  passiveHelpers.setContentFixtures(fixtureRows);
});

test('action corrections submit the canonical ability-block type matched by the pending dependency guard', async () => {
  for (const dependency of dependencies) {
    const submittedType = passiveHelpers.convertToContentType(dependency.type ?? dependency.table);
    assert.equal(submittedType, dependency.table);
    assert.equal(ContentTypeSchema.parse(submittedType), submittedType);
    ContentUpdateSchema.parse({
      id: 1,
      created_at: '2026-10-01T00:00:00Z',
      user_id: 'fixture-user',
      type: submittedType,
      ref_id: dependency.id,
      action: 'UPDATE',
      data: {},
      content_source_id: dependency.source,
      status: { state: 'PENDING' },
      upvotes: [],
      downvotes: [],
      discord_msg_id: null,
    });
  }
  assert.equal(ContentTypeSchema.safeParse('action').success, false);
  const feedback = await readFile(new URL('../src/modals/ContentFeedbackModal.tsx', import.meta.url), 'utf8');
  assert.match(feedback, /submitContentUpdate\(\s*convertToContentType\(props\.type\)/);
  assert.match(migration, /on u\.type = d->>'table' and u\.ref_id = \(d->>'id'\)::bigint/);
  assert.match(migration, /where u\.status->>'state' = 'PENDING'/);
  const pendingGuard = migration.indexOf('Passive bonus dependency has a pending curator submission');
  assert.ok(pendingGuard > 0);
  assert.ok(pendingGuard < migration.indexOf('for patch in'), 'pending action edits block original and repaired rows');
  assert.ok(
    pendingGuard < migration.indexOf('if item_row.operations is null'),
    'pending action edits block no-op replay'
  );
});

test('Gelid Shard scales cold resistance with level and displays all three status emotion riders without unconditional saves', async () => {
  for (const level of [2, 10, 20]) {
    await calculate({ level, items: [inventoryItem(item(12041))] });
    assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), [`Cold ${level}`]);
    for (const variable of ['SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL']) {
      assert.equal(bonuses(variable).length, 1);
      assert.deepEqual(
        [bonuses(variable)[0].value, bonuses(variable)[0].type, bonuses(variable)[0].text, bonuses(variable)[0].source],
        [2, 'status', 'against [emotion](link_trait_1486) effects', 'Gelid Shard']
      );
      assert.equal(bonusTotal(variable), 0, 'an emotion rider is not an unconditional save increase');
    }
    assert.equal(bonusTotal('SKILL_DIPLOMACY'), 0, 'social DC increases are not blanket Diplomacy penalties');
  }
});

test('investment, removal, and a different character clear passive effects without editing saved inventory', async () => {
  const entries = [inventoryItem(item(12041)), inventoryItem(item(12573))];
  const saved = structuredClone(entries);
  await calculate({ items: entries });
  assert.ok(bonuses('SKILL_NATURE').length);
  await calculate({ items: entries.map((entry) => ({ ...entry, is_invested: false })) });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), []);
  assert.deepEqual(bonuses('SKILL_NATURE'), []);
  assert.deepEqual(bonuses('SAVE_FORT'), []);
  await calculate({ items: entries });
  await calculate({ characterId: 990073 });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), []);
  assert.deepEqual(bonuses('SKILL_NATURE'), []);
  assert.deepEqual(bonuses('SAVE_WILL'), []);
  assert.deepEqual(entries, saved);
});

test('Ursine Hood keeps Nature training and unrelated checks unchanged at every tested proficiency rank', async () => {
  for (const rank of ['U', 'T', 'E', 'M', 'L']) {
    await calculate({
      level: 20,
      items: [inventoryItem(item(12573))],
      operations: [operation('setValue', { variable: 'SKILL_NATURE', value: { value: rank } })],
    });
    const nature = engine.getVariable('CHARACTER', 'SKILL_NATURE');
    assert.equal(engine.compileProficiencyType(nature.value), rank);
    assert.equal(bonusTotal('SKILL_NATURE'), 0);
    assert.deepEqual(
      bonuses('SKILL_NATURE').map(({ value, type, text, source }) => ({ value, type, text, source })),
      [
        {
          value: 1,
          type: 'item',
          text: 'to [Command an Animal](link_action_19614) (+2 if the animal is a bear)',
          source: 'Ursine Avenger Hood',
        },
      ]
    );
    assert.equal(bonusTotal('SKILL_DIPLOMACY'), 0, 'the timed wilderness penalty stays contextual');
  }
});

test('existing container eligibility stays unchanged for worn Ursine Hood and other-usage Gelid Shard', async () => {
  await calculate({ items: [inPack(inventoryItem(item(12573)))] });
  assert.deepEqual(bonuses('SKILL_NATURE'), [], 'worn gear in a container is not active');
  await calculate({ items: [inPack(inventoryItem(item(12041)))] });
  assert.deepEqual(
    passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'),
    ['Cold 14'],
    'the controller already permits invested other-usage items in containers'
  );
  await calculate({ items: [inPack(inventoryItem(item(12041), { is_invested: false }))] });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), []);
});

test('duplicate occurrences do not duplicate conditional bonuses or stack cold resistance', async () => {
  await calculate({
    items: [
      inventoryItem(item(12041)),
      inventoryItem(structuredClone(item(12041)), {}, '-second'),
      inventoryItem(item(12573)),
      inventoryItem(structuredClone(item(12573)), {}, '-second'),
    ],
  });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), ['Cold 14']);
  for (const variable of ['SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL', 'SKILL_NATURE'])
    assert.equal(bonuses(variable).length, 1);
});

test('existing stronger resistances and typed modifiers keep their normal stacking behavior', async () => {
  const operations = [
    operation('adjValue', { variable: 'RESISTANCES', value: 'cold, 30' }),
    ...['SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL'].flatMap((variable) => [
      operation('addBonusToValue', { variable, value: 1, type: 'status', text: '' }),
      operation('addBonusToValue', { variable, value: 3, type: 'status', text: '' }),
    ]),
    operation('addBonusToValue', { variable: 'SKILL_NATURE', value: 2, type: 'item', text: '' }),
    operation('addBonusToValue', { variable: 'SKILL_NATURE', value: 1, type: 'item', text: '' }),
  ];
  await calculate({ items: [inventoryItem(item(12041)), inventoryItem(item(12573))], operations });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), ['Cold 30']);
  for (const variable of ['SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL']) {
    assert.equal(bonusTotal(variable), 3);
    assert.equal(engine.getFinalVariableValue('CHARACTER', variable).conditionals.length, 1);
  }
  assert.equal(bonusTotal('SKILL_NATURE'), 2);
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SKILL_NATURE').conditionals.length, 1);
});

test('source choices do not grant catalog passives or discard an owned snapshot and old saved rows stay unchanged', async () => {
  const entries = [inventoryItem(item(12041)), inventoryItem(item(12573))];
  await calculate({ enabled: [16] });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), []);
  await calculate({ enabled: [], items: entries });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), ['Cold 14']);
  assert.equal(
    bonuses('SKILL_NATURE').length,
    1,
    'owned snapshot retains its existing eligibility without the book enabled'
  );
  await calculate({ enabled: [] });
  assert.deepEqual(bonuses('SKILL_NATURE'), []);
  const oldSaved = entries.map((entry) => ({
    ...structuredClone(entry),
    item: { ...structuredClone(entry.item), operations: null },
  }));
  const saved = structuredClone(oldSaved);
  await calculate({ items: oldSaved });
  assert.deepEqual(passiveHelpers.getResistWeaks('CHARACTER', 'RESISTANCES'), []);
  assert.deepEqual(bonuses('SKILL_NATURE'), []);
  assert.deepEqual(oldSaved, saved, 'catalog repair does not mutate saved item snapshots');
});

test('the two prose replacements preserve all other wording and explicit modifiers reject stale or NULL fields', () => {
  const hood = item(12573);
  assert.match(hood.description, /\[Command an Animal\]\(link_action_19614\)/);
  assert.match(hood.description, /\[Make an Impression\]\(link_action_19739\)/);
  assert.doesNotMatch(hood.description, /\\\[\\\[/);
  assert.equal(item(12041).description, originalRows.find(({ id }) => id === 12041).description);
  for (const patch of patches) {
    const original = originalRows.find(({ id }) => id === patch.id);
    for (const invalid of [
      { operations: [] },
      { operations: [{ id: 'unreviewed', type: 'adjValue', data: { variable: 'RESISTANCES', value: 'fire, 9' } }] },
      { description: 'changed' },
      { description: null },
      { traits: [] },
      { traits: null },
      { uuid: null },
      { content_source_id: null },
      { usage: 'held in 1 hand' },
      { meta_data: null },
    ]) {
      assert.throws(() => repair({ ...original, ...invalid }, patch));
    }
  }
});

test('database repair checks pending edits before replay, retains json[] and the release evaluator fails closed', () => {
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
    /public\.ability_block a[\s\S]*?dependencies[\s\S]*?'ability-block'[\s\S]*?order by a\.id for share/
  );
  assert.match(childPrelocks, /public\.item i[\s\S]*?jsonb_array_elements\(patches\)[\s\S]*?order by i\.id for update/);
  assert.match(childPrelocks, /public\.trait t[\s\S]*?dependencies[\s\S]*?'trait'[\s\S]*?order by t\.id for share/);
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /order by id for update/);
  assert.match(migration, /for share of t/);
  assert.match(migration, /for share of a/);
  assert.match(
    migration,
    /item_row\.usage is distinct from \(case when item_row\.id = 12041 then 'other' else 'worn' end\)/
  );
  assert.match(migration, /next_operations json\[\]/);
  assert.match(migration, /array\(select value::json from jsonb_array_elements\(patch->'operations'\)\)/);
  assert.match(
    migration,
    /item_row\.operations is not null and\s+to_jsonb\(item_row\.operations\) is distinct from patch->'operations'/
  );
  assert.ok(migration.indexOf("where type = 'item'") < migration.indexOf('next_description := item_row.description'));
  assert.ok(
    migration.indexOf('Passive bonus dependency has a pending curator submission') < migration.indexOf('for patch in')
  );
  assert.match(migration, /to_jsonb\(operations\) is not distinct from to_jsonb\(item_row\.operations\)/);
  assert.match(migration, /update public\.item set operations = next_operations, description = next_description/);
  assert.doesNotMatch(migration, /update public\.(character|inventory|content_update|ability_block)/);
  assert.doesNotMatch(migration, /set meta_data|jsonb_set|51111|Winter's Kiss/);
  assert.match(predicate, /select 'treasure-vault-passive-bonuses'::text as id/);
  assert.match(predicate, /i\.id is not null/);
  assert.match(predicate, /to_jsonb\(i\.operations\) = patch->'operations'\) is true/);
  assert.match(predicate, /count\(\*\) = 4 and bool_and/);
  assert.match(predicate, /is_published is true/);
});
