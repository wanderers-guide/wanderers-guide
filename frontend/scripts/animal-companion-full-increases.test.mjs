import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { AbilityBlockSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002060000_animal_companion_full_increases.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/animal-companion-full-increases.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$advancements$')[1]);
const blocks = spec.blocks.map((patch) => ({
  ...patch.anchor,
  uuid: Number(patch.anchor.uuid),
  operations: patch.after,
  created_at: '',
}));
const attrs = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const track = { path: 'companion-regression', node: { value: null, children: {} } };
const walk = (operations) =>
  (operations ?? []).flatMap((op) => [
    op,
    ...walk(op.data?.trueOperations),
    ...walk(op.data?.falseOperations),
    ...(op.data?.optionsPredefined ?? []).flatMap((option) => walk(option.operations)),
  ]);
const wrappers = blocks.flatMap((block) =>
  walk(block.operations).filter((op) => op.type === 'conditional' && /^ATTRIBUTE_/.test(op.data.conditions?.[0]?.name))
);
let engine;
let corpus;
let content;
let fixtures;
before(async () => {
  engine = await createOperationEngine();
  const sourceIds = Array.from({ length: 10000 }, (_, id) => id);
  corpus = await readContentRows(['creature', 'ability_block', 'trait', 'item'].map((table) => ({ table, sourceIds })));
  fixtures = [
    ...corpus.filter(({ table, row }) => table !== 'ability_block' || !blocks.some((block) => block.id === row.id)),
    ...blocks.map((row) => ({ table: 'ability_block', row })),
  ];
  content = {
    ...emptyContent,
    items: fixtures.filter((f) => f.table === 'item').map((f) => f.row),
    traits: fixtures.filter((f) => f.table === 'trait').map((f) => f.row),
    abilityBlocks: fixtures.filter((f) => f.table === 'ability_block').map((f) => f.row),
  };
});
after(async () => {
  await engine?.cleanup();
});

test('all 26 printed modifier increases use the existing full-increase pattern and preserve all non-attribute mechanics and saved identities', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$advancements$')[1]));
  assert.equal(wrappers.length, 26);
  assert.deepEqual(
    spec.blocks.map((p) => p.adjusted),
    [4, 5, 5, 3, 9]
  );
  for (const patch of spec.blocks) {
    AbilityBlockSchema.parse({
      ...patch.anchor,
      uuid: Number(patch.anchor.uuid),
      created_at: '',
      operations: patch.after,
    });
    const restore = (operations) =>
      operations.map((op) => {
        if (op.type === 'conditional' && /^ATTRIBUTE_/.test(op.data.conditions?.[0]?.name)) {
          assert.deepEqual(
            op.data.trueOperations.map((child) => child.data.value),
            [{ value: 1 }, { value: 1 }]
          );
          return { ...structuredClone(op.data.falseOperations[0]), id: op.id };
        }
        const restored = structuredClone(op);
        if (op.type === 'conditional') {
          restored.data.trueOperations = restore(op.data.trueOperations ?? []);
          restored.data.falseOperations = restore(op.data.falseOperations ?? []);
        }
        if (op.type === 'select')
          for (const option of restored.data.optionsPredefined ?? [])
            if (option.operations) option.operations = restore(option.operations);
        return restored;
      });
    assert.deepEqual(restore(patch.after), patch.before);
  }
});

test('each wrapper produces a full printed point below and above +4, preserving any existing partial boost', async () => {
  for (const wrapper of wrappers)
    for (const [value, partial] of [
      [-4, false],
      [3, false],
      [4, false],
      [4, true],
      [5, false],
      [5, true],
      [7, false],
    ]) {
      engine.resetVariables('CHARACTER');
      const variable = wrapper.data.conditions[0].name;
      engine.setVariable('CHARACTER', variable, { value, partial });
      await engine.runOperations('CHARACTER', track, [wrapper], { doConditionals: true }, 'Animal companion');
      assert.deepEqual(
        engine.getVariable('CHARACTER', variable).value,
        { value: value + 1, partial },
        `${wrapper.id}: ${value}/${partial}`
      );
    }
});

test('ordinary character attribute boosts retain the existing half-boost behavior above +4', async () => {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'ATTRIBUTE_STR', { value: 4, partial: false });
  await engine.runOperations('CHARACTER', track, [
    { id: 'ordinary-boost-control', type: 'adjValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 1 } } },
  ]);
  assert.deepEqual(engine.getVariable('CHARACTER', 'ATTRIBUTE_STR').value, { value: 4, partial: true });
});

test('all five shared advancement blocks calculate through the actual creature controller, including every specialized choice', async () => {
  engine.setFixtures(fixtures);
  const owner = await engine._executeCharacterOperations({
    character: { ...summoner([]), level: 15, companions: { list: [] } },
    content,
    context: 'CHARACTER-SHEET',
  });
  for (const block of blocks) {
    const select = block.operations.find((op) => op.type === 'select');
    const choices = block.id === 40308 ? select.data.optionsPredefined : [null];
    for (const choice of choices) {
      const creature = {
        id: -9906,
        name: 'Shared advancement control',
        level: -100,
        details: {},
        abilities_base: [],
        abilities_added: [],
        inventory: { items: [] },
        operations: [
          ...attrs.map((attr, i) => ({
            id: `base-${i}`,
            type: 'setValue',
            data: { variable: `ATTRIBUTE_${attr}`, value: { value: 5, partial: false } },
          })),
          { id: 'advancement-grant', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: block.id } },
        ],
        operation_data: { selections: choice ? { [`creature_advancement-grant_${select.id}`]: choice.id } : {} },
      };
      const result = await engine._executeCreatureOperations({
        id: 'COMPANION_ADVANCEMENT',
        creature,
        content,
        charStore: owner.store,
      });
      assert.deepEqual(result.errors, []);
      const increments = Object.fromEntries(attrs.map((attr) => [`ATTRIBUTE_${attr}`, 0]));
      const active = choice ? choice.operations : block.operations.filter((op) => op.type !== 'select');
      for (const op of walk(active))
        if (op.type === 'conditional' && /^ATTRIBUTE_/.test(op.data.conditions?.[0]?.name))
          increments[op.data.conditions[0].name]++;
      assert.deepEqual(
        attrs.map((attr) => result.store.variables[`ATTRIBUTE_${attr}`].value),
        attrs.map((attr) => ({ value: 5 + increments[`ATTRIBUTE_${attr}`], partial: false })),
        `${block.name}/${choice?.title ?? 'base'}`
      );
    }
  }
});

test('every official dump companion that grants these shared blocks keeps young stats unchanged and gains full mature, nimble and savage increases', async () => {
  const rows = corpus.filter((f) => f.table === 'creature');
  const consumers = rows.filter(
    ({ row }) =>
      (row.operations ?? []).some((op) => op.type === 'giveTrait' && op.data.traitId === 3842) &&
      (row.abilities_base ?? []).some((ability) =>
        walk(ability.operations).some((op) => op.type === 'giveAbilityBlock' && op.data.abilityBlockId === 40304)
      )
  );
  assert.ok(consumers.length >= 18, `expected broad official companion corpus; got ${consumers.length}`);
  engine.setFixtures(fixtures);
  const owner = await engine._executeCharacterOperations({
    character: { ...summoner([]), level: 10, companions: { list: [] } },
    content,
    context: 'CHARACTER-SHEET',
  });
  for (const { row } of consumers) {
    const creature = {
      ...structuredClone(row),
      level: -100,
      inventory: { items: [] },
      abilities_added: [],
      operation_data: { selections: {} },
    };
    const young = await engine._executeCreatureOperations({
      id: 'COMPANION_CORPUS',
      creature,
      content,
      charStore: owner.store,
    });
    assert.deepEqual(young.errors, []);
    const initial = attrs.map((attr) => young.store.variables[`ATTRIBUTE_${attr}`].value.value);
    for (const [ids, increases] of [
      [[40304], [1, 1, 1, 0, 1, 0]],
      [
        [40304, 40305],
        [2, 3, 2, 0, 2, 0],
      ],
      [
        [40304, 40306],
        [3, 2, 2, 0, 2, 0],
      ],
    ]) {
      creature.operations = [
        ...row.operations,
        ...ids.map((abilityBlockId) => ({
          id: `corpus-grant-${abilityBlockId}`,
          type: 'giveAbilityBlock',
          data: { type: 'feat', abilityBlockId },
        })),
      ];
      const result = await engine._executeCreatureOperations({
        id: 'COMPANION_CORPUS',
        creature,
        content,
        charStore: owner.store,
      });
      assert.deepEqual(result.errors, [], row.name);
      assert.deepEqual(
        attrs.map((attr) => ({
          value: result.store.variables[`ATTRIBUTE_${attr}`].value.value,
          partial: !!result.store.variables[`ATTRIBUTE_${attr}`].value.partial,
        })),
        initial.map((value, index) => ({ value: value + increases[index], partial: false })),
        `${row.name}/${ids}`
      );
    }
  }
});

test('guarded migration validates complete old or new graphs, captures each owner and preserves source metadata', () => {
  const body = migration.split('$advancements$')[2];
  for (const requirement of [
    'lock table public.content_update in share mode',
    'owner baseline drift',
    'unreviewed operation graph',
    'captured CAS failed',
    'immediate readback drift',
    'final owner readback drift',
    'source baseline drift',
    'final pending content requires review',
  ])
    assert.ok(body.includes(requirement), requirement);
  for (const sql of [body, release]) {
    assert.match(sql, /lower\(btrim\(u\.data->>'name'\)\)=lower\(btrim\(s->>'name'\)\)/);
    assert.match(sql, /lower\(btrim\(u\.data->>'name'\)\)=lower\(btrim\(p#>>'\{anchor,name\}'\)\)/);
    assert.match(sql, /u\.ref_id=\(p->>'id'\)::bigint/);
    assert.match(sql, /u\.data->>'uuid'=p#>>'\{anchor,uuid\}'/);
    assert.match(sql, /u\.content_source_id=\(p#>>'\{anchor,content_source_id\}'\)::bigint/);
  }
  assert.match(release, /count\(\*\)=5/);
  assert.match(release, /\) is true/);
});
