import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { CreatureSchema, ItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002030000_treasure_vault_oozeform_chair.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-oozeform-chair.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$oozeform$')[1]);
const advances = JSON.parse(
  (
    await readFile(
      new URL('../../supabase/migrations/20261002060000_animal_companion_full_increases.sql', import.meta.url),
      'utf8'
    )
  ).split('$advancements$')[1]
);
const attack = { ...spec.item, id: 9902407, created_at: '' };
const chair = {
  ...spec.creature,
  id: 9902408,
  created_at: '',
  operations: spec.creature.operations.map((op) =>
    op.id === spec.attack_operation_id ? { ...op, data: { itemId: attack.id } } : op
  ),
};
const next = chair.abilities_base.find((ability) => ability.name === 'Next Advancement');
const matureChoice = next.operations[0].data.optionsPredefined.find((option) => option.title === 'Mature');
const attrs = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const expected = {
  Young: [3, 2, 3, -4, 0, 0],
  Mature: [4, 3, 4, -4, 1, 0],
  Nimble: [5, 5, 5, -4, 2, 0],
  Savage: [6, 4, 5, -4, 2, 0],
};
let engine;
let content;
let fixtures;
let senses;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true, renderPerceptionDrawer: true });
  const sourceIds = Array.from({ length: 10000 }, (_, id) => id);
  const rows = await readContentRows(['ability_block', 'trait', 'item'].map((table) => ({ table, sourceIds })));
  fixtures = [
    ...rows.filter(
      ({ table, row }) => table !== 'ability_block' || !advances.blocks.some((block) => block.id === row.id)
    ),
    ...advances.blocks.map((patch) => ({
      table: 'ability_block',
      row: { ...patch.anchor, uuid: Number(patch.anchor.uuid), created_at: '', operations: patch.after },
    })),
    { table: 'creature', row: chair },
    { table: 'item', row: attack },
  ];
  content = {
    ...emptyContent,
    items: fixtures.filter((f) => f.table === 'item').map((f) => f.row),
    traits: fixtures.filter((f) => f.table === 'trait').map((f) => f.row),
    abilityBlocks: fixtures.filter((f) => f.table === 'ability_block').map((f) => f.row),
    defaultSources: { PAGE: [1, 3, 16], INFO: [1, 3, 16] },
  };
  senses = content.abilityBlocks.filter((block) => block.type === 'sense');
  engine.setFixtures(fixtures);
});
after(async () => {
  await engine?.cleanup();
});

function selections(advancement, initialSize = 'Medium') {
  const size = chair.operations.find((op) => op.type === 'select');
  const result = {
    [`creature_${size.id}`]: size.data.optionsPredefined.find((option) => option.title === initialSize).id,
  };
  if (advancement === 'Young') return result;
  const prefix = `ability-${next.id}_${next.operations[0].id}`;
  result[prefix] = matureChoice.id;
  if (['Nimble', 'Savage'].includes(advancement)) {
    const mature = content.abilityBlocks.find((block) => block.id === 40304);
    const advanced = mature.operations.find((op) => op.type === 'select');
    result[`${prefix}_${matureChoice.id}_${matureChoice.operations[0].id}_${advanced.id}`] =
      advanced.data.optionsPredefined.find((option) => option.title === advancement).id;
  }
  return result;
}
async function calculate(level, advancement, initialSize = 'Medium', suppliedChair = chair) {
  const owner = await engine._executeCharacterOperations({
    character: { ...summoner([]), level, companions: { list: [] } },
    content,
    context: 'CHARACTER-SHEET',
  });
  const creature = {
    ...structuredClone(suppliedChair),
    inventory: { items: [inventoryItem(structuredClone(attack), { is_equipped: true })] },
    operation_data: { selections: selections(advancement, initialSize) },
  };
  const before = structuredClone(creature);
  const result = await engine._executeCreatureOperations({
    id: 'COMPANION_OOZE',
    creature,
    content,
    charStore: owner.store,
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(creature, before);
  engine.importVariableStore('COMPANION_OOZE', result.store);
  return { ...result, creature };
}

test('the exact complete pair validates, keeps canonical book citations and introduces no global sense/action scaffold', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$oozeform$')[1]));
  CreatureSchema.parse(chair);
  ItemSchema.parse(attack);
  assert.equal(chair.type, 'creature');
  assert.equal(chair.level, -100);
  assert.equal(chair.content_source_id, 16);
  assert.equal(attack.meta_data.unselectable, true);
  assert.equal(attack.meta_data.category, 'unarmed_attack');
  assert.deepEqual(attack.traits, [2398, 1569]);
  assert.equal(attack.meta_data.source.url, 'https://2e.aonprd.com/Companions.aspx?ID=55');
  assert.equal(chair.meta_data.source.url, attack.meta_data.source.url);
  assert.deepEqual(spec.baseline_counts, { item: 1118, creature: 1, trait: 24 });
  assert.deepEqual(spec.terminal_counts, { item: 1119, creature: 2, trait: 24 });
  assert.deepEqual(
    chair.abilities_base.map((ability) => ability.name),
    ['Next Advancement', 'Motion Sense', 'Mount', 'Support', 'Extend Pseudopod']
  );
});

test('all young/mature/nimble/savage stages at owner levels1,5,10,20 calculate printed attributes, HP, attack dice, damage, speed and precision', async () => {
  for (const level of [1, 5, 10, 20])
    for (const advancement of Object.keys(expected)) {
      const result = await calculate(level, advancement);
      assert.deepEqual(
        attrs.map((attr) => result.store.variables[`ATTRIBUTE_${attr}`].value),
        expected[advancement].map((value) => ({ value, partial: false })),
        `${level}/${advancement}`
      );
      assert.equal(
        engine.getFinalHealthValue('COMPANION_OOZE'),
        6 + (6 + expected[advancement][2]) * level,
        `${level}/${advancement}/HP`
      );
      assert.equal(result.store.variables.SPEED.value, 20);
      assert.ok(result.store.variables.EXTRA_ITEM_IDS.value.includes(String(attack.id)));
      const weapon = engine.getWeaponStats('COMPANION_OOZE', attack);
      assert.equal(weapon.damage.dice, advancement === 'Young' ? 1 : 2);
      assert.equal(
        weapon.damage.bonus.total,
        expected[advancement][0] + (advancement === 'Nimble' ? 2 : advancement === 'Savage' ? 3 : 0)
      );
      const collected = engine.collectEntitySenses(
        'COMPANION_OOZE',
        senses.filter((sense) => [1, 3, 16].includes(sense.content_source_id))
      );
      assert.ok(
        collected.imprecise.some(
          (sense) => sense.senseName === 'Motion Sense' && sense.range === '30' && sense.sense === undefined
        )
      );
      assert.ok(!collected.precise.some((sense) => sense.senseName === 'Motion Sense'));
    }
});

test('both printed initial sizes are selectable and standard mature growth does not enlarge a Large chair', async () => {
  for (const initial of ['Medium', 'Large'])
    for (const advancement of ['Young', 'Mature']) {
      const result = await calculate(10, advancement, initial);
      assert.equal(result.store.variables.SIZE.value, advancement === 'Young' ? initial.toLowerCase() : 'large');
    }
});

test('the real operation grant inserts one equipped hidden attack and reload does not duplicate it', async () => {
  const result = await calculate(10, 'Young');
  let entity = { ...result.creature, inventory: { items: [] } };
  await new Promise((resolve) => {
    engine.addExtraItems('COMPANION_OOZE', content.items, entity, (update) => {
      entity = update(entity);
      resolve();
    });
  });
  assert.equal(entity.inventory.items.length, 1);
  assert.equal(entity.inventory.items[0].item.id, attack.id);
  assert.equal(entity.inventory.items[0].is_equipped, true);
  assert.deepEqual(entity.meta_data.given_item_ids, [attack.id]);
  engine.addExtraItems('COMPANION_OOZE', content.items, JSON.parse(JSON.stringify(entity)), (update) => {
    entity = update(entity);
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(entity.inventory.items.length, 1);
});

test('manual support, mount and advanced maneuver retain printed restrictions without granting permanent reach or inferred immunity', () => {
  const support = chair.abilities_base.find((ability) => ability.name === 'Support');
  const extend = chair.abilities_base.find((ability) => ability.name === 'Extend Pseudopod');
  const mount = chair.abilities_base.find((ability) => ability.name === 'Mount');
  assert.equal(support.actions, 'ONE-ACTION');
  assert.match(support.description, /unattended object within 15 feet/);
  assert.match(support.special, /only other actions.*basic \[move\]/);
  assert.equal(extend.actions, 'ONE-ACTION');
  assert.match(extend.requirements, /learned its advanced maneuver through nimble or savage/);
  assert.match(extend.description, /until the beginning of your next turn/);
  assert.deepEqual([support.operations, extend.operations, mount.operations], [[], [], []]);
  assert.doesNotMatch(mount.description, /same size|size or larger/i);
  assert.doesNotMatch(JSON.stringify(chair.operations), /IMMUNIT|4173/);
  assert.match(engine.renderRichText(extend.description), /Extend|Strike|reach 10 feet/);
  assert.equal(engine.convertToHardcodedLink('action', 'Strike'), '[Strike](link_action_19856)');
  assert.equal(engine.convertToHardcodedLink('trait', 'Agile'), '[Agile](link_trait_1569)');
});

test('Motion Sense lookup never links opposite precision across every printed range and source ordering', () => {
  const motion = senses.filter((sense) => sense.name.startsWith('Motion Sense'));
  assert.equal(motion.length, 5);
  for (const ordered of [motion, [...motion].reverse()])
    for (const [precision, range, expectedId] of [
      ['precise', '20', 22880],
      ['precise', '30', 22879],
      ['precise', '40', 22881],
      ['precise', '60', 22882],
      ['imprecise', '30', 29457],
      ['imprecise', '20', undefined],
      ['vague', '30', undefined],
    ]) {
      engine.resetVariables('CHARACTER');
      engine.setVariable('CHARACTER', `SENSES_${precision.toUpperCase()}`, [`motion sense, ${range}`]);
      const result = engine
        .collectEntitySenses('CHARACTER', ordered)
        [precision].find((sense) => sense.senseName === 'Motion Sense');
      assert.equal(result.sense?.id, expectedId, `${precision}/${range}`);
      assert.equal(result.range, range);
      assert.equal(result.type, precision);
    }
});

test('all official senses preserve declared precision, neutral aliases still link and conflicting declarations fail closed', () => {
  const declared = senses.filter((sense) =>
    (sense.operations ?? []).some(
      (op) => ['adjValue', 'setValue'].includes(op.type) && /^SENSES_(PRECISE|IMPRECISE|VAGUE)$/.test(op.data.variable)
    )
  );
  assert.ok(declared.length >= 65);
  for (const sense of declared)
    for (const op of sense.operations.filter((op) => /^SENSES_/.test(op.data?.variable))) {
      const precision = op.data.variable.slice(7).toLowerCase();
      const entries = Array.isArray(op.data.value) ? op.data.value : [op.data.value];
      for (const entry of entries) {
        engine.resetVariables('CHARACTER');
        engine.setVariable('CHARACTER', op.data.variable, [entry]);
        const collected = engine.collectEntitySenses('CHARACTER', senses)[precision];
        for (const found of collected)
          if (found.sense) {
            const buckets = found.sense.operations
              .filter(
                (operation) =>
                  ['adjValue', 'setValue'].includes(operation.type) && /^SENSES_/.test(operation.data.variable)
              )
              .map((operation) => operation.data.variable);
            assert.ok(
              buckets.length === 0 || buckets.every((bucket) => bucket === op.data.variable),
              `${sense.name} resolved to ${found.sense.name}`
            );
          }
      }
    }
  const neutral = { ...senses[0], id: 9902409, name: 'Neutral Sense', operations: [] };
  const conflict = {
    ...neutral,
    name: 'Motion Sense',
    operations: [
      { id: 'conflict-a', type: 'adjValue', data: { variable: 'SENSES_PRECISE', value: 'motion sense' } },
      { id: 'conflict-b', type: 'adjValue', data: { variable: 'SENSES_IMPRECISE', value: 'motion sense' } },
    ],
  };
  for (const precision of ['precise', 'imprecise', 'vague']) {
    engine.resetVariables('CHARACTER');
    engine.setVariable('CHARACTER', `SENSES_${precision.toUpperCase()}`, ['neutral sense', 'motion sense, 30']);
    const found = engine.collectEntitySenses('CHARACTER', [neutral, conflict])[precision];
    assert.equal(found.find((sense) => sense.senseName === 'Neutral Sense').sense.id, neutral.id);
    assert.equal(found.find((sense) => sense.senseName === 'Motion Sense').sense, undefined);
  }
  const lifesense = senses.find((sense) => sense.id === 25907);
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'SENSES_PRECISE', ['lifesense, 30']);
  assert.equal(
    engine.collectEntitySenses('CHARACTER', [lifesense]).precise.find((sense) => sense.senseName === 'Lifesense').sense,
    undefined
  );
});

test('the real Perception drawer shows imprecise Motion Sense without a precise-description link when only its book dependencies are enabled', async () => {
  await calculate(10, 'Mature');
  const enabled = senses.filter((sense) => [1, 3, 16].includes(sense.content_source_id));
  const rendered = engine.renderPerceptionDrawer('COMPANION_OOZE', enabled);
  assert.match(rendered, /Motion Sense \(30 ft\.\)/);
  assert.ok(!rendered.includes('sense-22879'));
  assert.ok(!rendered.includes('despite the fact that it can&#x27;t see'));
});

test('migration and release are strict complete-pair gates and preserve all unrelated content and source count siblings', () => {
  const body = migration.split('$oozeform$')[2];
  for (const marker of [
    'share row exclusive mode',
    'partial import',
    'duplicate UUID',
    'existing official or orphan identity requires review',
    'replay counts drift',
    'replay item drift',
    'replay creature drift',
    'unrelated item drift',
    'unrelated creature drift',
    'source captured CAS failed',
    'final source drift',
    'final dependency drift',
    'final pending content requires review',
  ])
    assert.ok(body.includes(marker), marker);
  assert.ok(body.indexOf('public.creature,public.item') < body.indexOf('public.content_source s'));
  assert.match(body, /\{16,meta_data,counts,item\}/);
  assert.match(body, /\{16,meta_data,counts,creature\}/);
  assert.doesNotMatch(body, /\{16,meta_data,counts,trait\}/);
  assert.match(release, /count\(\*\)=13/);
  assert.match(release, /\) is true/);
});
