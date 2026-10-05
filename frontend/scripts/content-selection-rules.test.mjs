import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const sources = [1, 3, 12, 19, 31, 185, 256, 579];
const op = (id, type, data) => ({ id, type, data });
let engine;
let rows;
let content;
const row = (table, id) => rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
const grant = (id) =>
  op(`grant-${id}`, 'giveAbilityBlock', { type: row('ability_block', id).type, abilityBlockId: id });
const base = (level = 1, operations = [], selections = {}, details = {}) => ({
  id: 1,
  level,
  details,
  inventory: { items: [] },
  content_sources: { enabled: sources },
  options: { custom_operations: true, auto_detect_prerequisites: true },
  custom_operations: operations,
  operation_data: { selections },
});

before(async () => {
  engine = await createOperationEngine();
  rows = await readContentRows(
    ['ability_block', 'class', 'ancestry', 'trait', 'spell', 'item'].map((table) => ({ table, sourceIds: sources }))
  );
  const migration = await readFile(
    new URL('../../supabase/migrations/20261005000000_repair_content_selection_rules.sql', import.meta.url),
    'utf8'
  );
  for (const patch of JSON.parse(migration.split('$patches$')[1])) {
    const feat = row('ability_block', patch.id);
    assert.equal(feat.name, patch.name);
    assert.equal(feat.content_source_id, patch.source);
    assert.equal(patch.operation_path.reduce((value, key) => value[key], feat.operations).id, patch.operation);
    const parent = patch.path.slice(0, -1).reduce((value, key) => value[key], feat.operations);
    const key = patch.path.at(-1);
    assert.ok(
      [patch.before, patch.after].some((value) => JSON.stringify(value) === JSON.stringify(parent[key] ?? null))
    );
    parent[key] = patch.after;
  }
  const keys = {
    ability_block: 'abilityBlocks',
    class: 'classes',
    ancestry: 'ancestries',
    trait: 'traits',
    spell: 'spells',
    item: 'items',
  };
  content = {
    backgrounds: [],
    languages: [],
    sources: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    defaultSources: { PAGE: sources, INFO: sources },
  };
  for (const [table, key] of Object.entries(keys))
    content[key] = rows.filter((entry) => entry.table === table).map((entry) => entry.row);
});
after(async () => engine?.cleanup());

async function calculate(character) {
  engine.setFixtures(rows);
  const result = await engine._executeCharacterOperations({
    character: structuredClone(character),
    content,
    context: 'CHARACTER-BUILDER',
  });
  assert.deepEqual(result.errors, []);
  engine.normalizeProficiencies('CHARACTER');
  return result;
}

/** Follow real controller occurrence paths, including two grants of the same feat. */
function choices(result) {
  const output = [];
  function walk(results, prefix) {
    for (const current of results ?? []) {
      if (!current) continue;
      if (current.selection)
        output.push({
          key: `${prefix}_${current.selection.id}`,
          ...current.selection,
          selected: current.result?.source,
        });
      if (current.result)
        walk(
          current.result.results,
          current.result.source?._select_uuid
            ? `${prefix}_${current.selection?.id ? `${current.selection.id}_` : ''}${current.result.source._select_uuid}`
            : prefix
        );
    }
  }
  for (const [kind, results] of Object.entries(result.ors)) {
    if (!Array.isArray(results)) continue;
    const direct = {
      characterResults: 'character',
      classResults: 'class',
      ancestryResults: 'ancestry',
      backgroundResults: 'background',
    }[kind];
    if (direct) walk(results, direct);
    else
      for (const current of results) {
        const prefix = {
          classFeatureResults: `class-feature-${current.baseSource?.id}`,
          ancestrySectionResults: `ancestry-section-${current.baseSource?.id}`,
        }[kind];
        if (prefix) walk(current.baseResults, prefix);
      }
  }
  return output;
}
const rank = (name) => engine.compileProficiencyType(engine.getVariable('CHARACTER', name).value);
const train = (name) => op(`train-${name}`, 'adjValue', { variable: name, value: { value: 'T' } });

test('Assurance waits for later conditional trainings, filters untrained skills, and retains saved standard choices', async () => {
  const character = base(1, [
    grant(19919),
    op('later-training', 'conditional', {
      conditions: [{ id: 'level', name: 'LEVEL', type: 'num', operator: 'GREATER_THAN_OR_EQUALS', value: 1 }],
      trueOperations: [train('SKILL_CRAFTING')],
    }),
  ]);
  const choice = choices(await calculate(character)).find(
    (choice) => choice.id === row('ability_block', 19919).operations[0].id
  );
  assert.deepEqual(
    choice.options.map((option) => option.title),
    ['Crafting']
  );
  character.operation_data.selections[choice.key] = choice.options[0]._select_uuid;
  await calculate(character);
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SKILL_CRAFTING').conditionals.length, 1);
  assert.equal(rank('SKILL_CRAFTING'), 'T');
  character.custom_operations.pop();
  await calculate(character);
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SKILL_CRAFTING').conditionals.length, 0);
});

test('Assurance binds a trained Lore and lets multiple Lores retain separate saved choices', async () => {
  const character = base(
    1,
    ['SAILING', 'CITY', 'UNTRAINED'].map((name) =>
      op(`lore-${name}`, 'createValue', {
        variable: `SKILL_LORE_${name}`,
        type: 'prof',
        value: { value: name === 'UNTRAINED' ? 'U' : 'T', attribute: 'ATTRIBUTE_INT' },
      })
    )
  );
  character.custom_operations.push(grant(19919));
  const choice = choices(await calculate(character)).find((choice) => choice.title === 'Select a Skill');
  assert.deepEqual(
    choice.options.map((option) => option.title),
    ['Lore']
  );
  character.operation_data.selections[choice.key] = choice.options[0]._select_uuid;
  const lore = choices(await calculate(character)).find((choice) => choice.title === 'Select a Lore Skill');
  assert.equal(lore.options.length, 2);
  character.operation_data.selections[lore.key] = lore.options.find((option) =>
    option.title.includes('Sailing')
  )._select_uuid;
  await calculate(character);
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SKILL_LORE_SAILING').conditionals.length, 1);
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SKILL_LORE_CITY').conditionals.length, 0);
  await calculate(structuredClone(character));
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SKILL_LORE_SAILING').conditionals.length, 1);
});

test('all twelve legal Monk paths survive reload and invalid saved paths do not grant ranks', async () => {
  const paths = [31263, 31266, 31269].map((id) => row('ability_block', id).operations[0]);
  const labels = ['Fortitude', 'Reflex', 'Will'];
  const variables = { Fortitude: 'SAVE_FORT', Reflex: 'SAVE_REFLEX', Will: 'SAVE_WILL' };
  for (const first of labels)
    for (const second of labels.filter((label) => label !== first))
      for (const third of [first, second]) {
        const selections = Object.fromEntries(
          paths.map((path, index) => [
            `class-feature-${[31263, 31266, 31269][index]}_${path.id}`,
            path.data.optionsPredefined.find((option) => option.title === [first, second, third][index]).id,
          ])
        );
        const result = await calculate(base(15, [], selections, { class: row('class', 111) }));
        assert.equal(rank(variables[third]), 'L');
        assert.equal(rank(variables[[first, second].find((label) => label !== third)]), 'M');
        const available = choices(result);
        assert.equal(available.find((choice) => choice.id === paths[1].id).options.length, 2);
        assert.equal(available.find((choice) => choice.id === paths[2].id).options.length, 2);
      }
  const selections = Object.fromEntries(
    paths.map((path, index) => [
      `class-feature-${[31263, 31266, 31269][index]}_${path.id}`,
      path.data.optionsPredefined.find((option) => option.title === ['Fortitude', 'Fortitude', 'Will'][index]).id,
    ])
  );
  await calculate(base(15, [], selections, { class: row('class', 111) }));
  assert.equal(rank('SAVE_FORT'), 'M');
  assert.equal(rank('SAVE_WILL'), 'E');
});

test('Awakened Animal prerequisites match owned heritage, physical features, and the Aquatic trait', async () => {
  for (const heritage of [27940, 27942]) {
    const character = base(5, [], {}, { ancestry: row('ancestry', 97) });
    const heritageChoice = choices(await calculate(character)).find((choice) => choice.title === 'Select a Heritage');
    character.operation_data.selections[heritageChoice.key] = String(heritage);
    if (heritage === 27942) {
      const aquatic = choices(await calculate(character)).find((choice) =>
        choice.options.some((option) => option.title === 'Aquatic')
      );
      character.operation_data.selections[aquatic.key] = aquatic.options.find(
        (option) => option.title === 'Aquatic'
      )._select_uuid;
    }
    await calculate(character);
    for (const [feat, expected] of [
      [27863, heritage === 27942 ? 'FULLY' : 'NOT'],
      [27879, heritage === 27940 ? 'FULLY' : 'NOT'],
      [27872, 'FULLY'],
    ]) {
      assert.equal(engine.meetsPrerequisites('CHARACTER', row('ability_block', feat).prerequisites).result, expected);
    }
    assert.notEqual(engine.meetsPrerequisites('CHARACTER', ['Some unknown special requirement']).result, 'FULLY');
  }
});

test('Anvil Dwarf retains and displays both crafting specialties after reload', async () => {
  const character = base(1, [grant(26832)]);
  const specialties = choices(await calculate(character)).filter((choice) => choice.title === 'Select a Specialty');
  assert.equal(specialties.length, 2);
  for (const [index, choice] of specialties.entries())
    character.operation_data.selections[choice.key] = choice.options.find(
      (option) => option.title === ['Artistry', 'Blacksmithing'][index]
    )._select_uuid;
  await calculate(character);
  assert.deepEqual(
    (await engine.getSelectedOptions(character, row('ability_block', 20570).operations[0])).map(
      (option) => option.title
    ),
    ['Artistry', 'Blacksmithing']
  );
  assert.equal(engine.getFinalVariableValue('CHARACTER', 'SKILL_CRAFTING').conditionals.length, 2);
});

test('Starfinder weapon critical effects resolve in either system without expanding the system picker', () => {
  for (const starfinder of [false, true]) {
    engine.resetVariables();
    engine.setVariable('CHARACTER', 'STARFINDER', starfinder);
    for (const group of [
      'corrosive',
      'cryo',
      'flame',
      'grenade',
      'laser',
      'mental',
      'missile',
      'plasma',
      'poison',
      'shock',
      'sniper',
      'sonic',
    ])
      assert.ok(engine.getWeaponSpecialization(group)?.description, group);
    assert.equal(
      engine.getWeaponSpecializations().some((effect) => effect.name === 'Cryo'),
      starfinder
    );
    assert.equal(engine.getWeaponSpecialization('unknown'), undefined);
    assert.equal(engine.getWeaponSpecialization('GRENADE').description, 'Varies depending on grenade.');
  }
});

test('Walking Armory uses either attribute for penalties and Strength alone for worn armor Bulk', async () => {
  for (const [strength, constitution] of [
    [0, 4],
    [4, 2],
    [4, 4],
    [0, 0],
    [4, 3],
  ]) {
    const character = base(1, [
      op('str', 'setValue', { variable: 'ATTRIBUTE_STR', value: { value: strength } }),
      op('con', 'setValue', { variable: 'ATTRIBUTE_CON', value: { value: constitution } }),
      grant(45773),
    ]);
    const armor = {
      id: 'armor',
      item: row('item', 19561),
      is_equipped: true,
      is_formula: false,
      is_invested: false,
      container_contents: [],
    };
    character.inventory.items.push(armor);
    await calculate(character);
    const stats = engine.getAcParts('CHARACTER', armor.item);
    assert.equal(stats.checkPenalty, Math.max(strength, constitution) >= 4 ? 0 : -3);
    assert.equal(stats.speedPenalty, Math.max(strength, constitution) >= 4 ? -5 : -10);
    assert.equal(engine.getItemBulk(armor, 'CHARACTER'), strength >= 4 ? 3 : 4);
    assert.equal(engine.getInvBulk(character.inventory, 'CHARACTER'), strength >= 4 ? 3 : 4);
    assert.equal(engine.getBulkLimit('CHARACTER'), 5 + strength + Math.ceil(constitution / 2));
    assert.equal(engine.getBulkLimitImmobile('CHARACTER'), 10 + strength + constitution);
    assert.equal(engine.getItemBulk({ ...armor, is_equipped: false }, 'CHARACTER'), 5);
    assert.equal(engine.getItemBulk(armor), 4);
    engine.applyEquipmentPenalties('CHARACTER', character);
    assert.equal(engine.getFinalVariableValue('CHARACTER', 'SPEED').bonus, stats.speedPenalty);
  }
});

test('armor Bulk discounts respect the minimum and the explicit creature store', async () => {
  await calculate(base(1, [grant(45773), op('str', 'setValue', { variable: 'ATTRIBUTE_STR', value: { value: 4 } })]));
  engine.resetVariables('CREATURE_2');
  const armor = { id: 'light-armor', item: { ...row('item', 19561), bulk: '1' }, is_equipped: true };
  assert.equal(engine.getItemBulk(armor, 'CHARACTER'), 1);
  assert.equal(engine.getItemBulk({ ...armor, item: { ...armor.item, bulk: '0.1' } }, 'CHARACTER'), 0.1);
  assert.equal(engine.getItemBulk(armor, 'CREATURE_2'), 1);
  assert.equal(engine.getItemBulk({ ...armor, item: row('item', 19561) }, 'CREATURE_2'), 4);
});

test('Greater Spell Runes grants the selected fifth-rank spell as an arcane innate spell', async () => {
  const character = base(12, [grant(30205)]);
  const selected = choices(await calculate(character)).find((choice) => choice.options[0]?.rank === 5);
  assert.ok(selected);
  character.operation_data.selections[selected.key] = selected.options[0]._select_uuid;
  await calculate(character);
  const innate = engine
    .collectEntitySpellcasting('CHARACTER', character)
    .innate.find((spell) => spell.spell_id === selected.options[0].id);
  assert.equal(innate.rank, 5);
  assert.equal(innate.tradition, 'ARCANE');
});

test('Advanced Thaumaturgy caps available class feats at half character level, rounded down', async () => {
  for (const level of [8, 9, 12, 20]) {
    const selected = choices(await calculate(base(level, [grant(22643)]))).find(
      (choice) => choice.id === row('ability_block', 22643).operations[0].id
    );
    assert.ok(selected.options.length);
    assert.ok(selected.options.every((option) => option.level <= Math.floor(level / 2)));
    assert.ok(selected.options.some((option) => option.level === Math.floor(level / 2) - (Math.floor(level / 2) % 2)));
  }
});
