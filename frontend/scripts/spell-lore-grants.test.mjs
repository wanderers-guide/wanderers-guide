import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { GiveSpellDataSchema, OperationGiveAbilityBlockSchema } from '../src/schemas/operations.ts';
import { SpellInnateEntrySchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let fixtures;
let lore;
let spell;
const content = {
  abilityBlocks: [],
  items: [],
  classes: [],
  traits: [],
  ancestries: [],
  backgrounds: [],
  languages: [],
  spells: [],
  archetypes: [],
  versatileHeritages: [],
  classArchetypes: [],
  sources: [],
  defaultSources: { PAGE: [], INFO: [] },
};
const op = (id, type, data) => ({ id, type, data });
const set = (variable, value) => op(`set-${variable}`, 'setValue', { variable, value });
const grantLore = (id, subject) =>
  op(id, 'giveAbilityBlock', { type: 'feat', abilityBlockId: lore.id, grantedLore: subject });
const innateData = (attribute) => ({
  spellId: spell.id,
  type: 'INNATE',
  tradition: 'OCCULT',
  rank: 1,
  casts: 3,
  attribute,
});
const character = (operations, level = 1, selections = {}) => ({
  id: 990181,
  name: 'Spell and Lore fixture',
  level,
  details: {},
  inventory: { items: [] },
  operation_data: { selections },
  options: { custom_operations: true },
  custom_operations: operations,
});
const calculate = async (entity, context = 'CHARACTER-SHEET') => {
  const result = await engine._executeCharacterOperations({ character: entity, content, context });
  engine.importVariableStore('CHARACTER', result.store);
  assert.deepEqual(result.errors, []);
  return result;
};
const rank = (name) => {
  const variable = engine.getVariable('CHARACTER', name);
  return variable ? engine.compileProficiencyType(variable.value) : undefined;
};

before(async () => {
  engine = await createOperationEngine({ exportJson: true });
  fixtures = await readContentRows([
    { table: 'ability_block', id: 19873 },
    { table: 'spell', id: 4623 },
  ]);
  lore = fixtures.find(({ table }) => table === 'ability_block').row;
  spell = fixtures.find(({ table }) => table === 'spell').row;
  assert.equal(lore.name, 'Additional Lore');
  content.abilityBlocks = [lore];
  content.spells = [spell];
});
after(async () => {
  await engine?.cleanup();
});
beforeEach(() => {
  engine.resetVariables();
  engine.clearDeferredOperations();
  engine.setFixtures(fixtures);
});

test('optional metadata preserves old operations and saved counters and rejects unsupported attributes', () => {
  assert.equal(GiveSpellDataSchema.parse(innateData(undefined)).attribute, undefined);
  assert.equal(OperationGiveAbilityBlockSchema.parse(grantLore('grant', undefined)).data.grantedLore, undefined);
  const saved = { spell_id: 1, tradition: 'OCCULT', rank: 1, casts_max: 1, casts_current: 0 };
  assert.equal(SpellInnateEntrySchema.parse(saved).attribute, undefined);
  for (const attribute of [
    'ATTRIBUTE_STR',
    'ATTRIBUTE_DEX',
    'ATTRIBUTE_CON',
    'ATTRIBUTE_INT',
    'ATTRIBUTE_WIS',
    'ATTRIBUTE_CHA',
  ]) {
    assert.equal(GiveSpellDataSchema.parse(innateData(attribute)).attribute, attribute);
  }
  assert.throws(() => GiveSpellDataSchema.parse(innateData('ATTRIBUTE_LUCK')));
});

test('mixed innate attributes calculate independent attacks, DCs and saved counters for the same spell', async () => {
  const entity = character(
    [
      set('ATTRIBUTE_INT', { value: 4 }),
      set('ATTRIBUTE_CHA', { value: 1 }),
      op('intelligence', 'giveSpell', innateData('ATTRIBUTE_INT')),
      op('default', 'giveSpell', innateData(undefined)),
    ],
    5
  );
  await calculate(entity);
  const entries = engine.collectEntitySpellcasting('CHARACTER', entity).innate;
  assert.equal(entries.length, 2);
  const intelligence = entries.find(({ attribute }) => attribute === 'ATTRIBUTE_INT');
  const charisma = entries.find(({ attribute }) => attribute === 'ATTRIBUTE_CHA');
  assert.equal(engine.getSpellStats('CHARACTER', spell, 'OCCULT', intelligence.attribute).spell_dc.total, 21);
  assert.equal(engine.getSpellStats('CHARACTER', spell, 'OCCULT', charisma.attribute).spell_dc.total, 18);
  assert.notEqual(engine.getInnateSpellKey(intelligence), engine.getInnateSpellKey(charisma));
  entity.spells = {
    innate_casts: [
      { ...intelligence, casts_current: 2 },
      { ...charisma, attribute: undefined, casts_current: 1 },
    ],
  };
  await calculate(JSON.parse(JSON.stringify(entity)));
  const reloaded = engine.collectEntitySpellcasting('CHARACTER', entity).innate;
  assert.deepEqual(
    reloaded.map(({ attribute, casts_current }) => [attribute, casts_current]),
    [
      ['ATTRIBUTE_INT', 2],
      ['ATTRIBUTE_CHA', 1],
    ]
  );
  assert.match(engine.getInnateSpellPdfLabel('CHARACTER', spell, intelligence), /INT, \+11, DC 21/);
  assert.equal(engine.getInnateSpellPdfLabel('CHARACTER', spell, charisma), spell.name);
  const exported = await engine.getJsonV4Content(entity, 'CHARACTER', content);
  assert.deepEqual(
    exported.innate_spells.map(({ stats }) => stats.spell_dc.total),
    [21, 18]
  );

  const intelligenceOnly = character(
    [set('ATTRIBUTE_INT', { value: 4 }), op('intelligence', 'giveSpell', innateData('ATTRIBUTE_INT'))],
    5
  );
  await calculate(intelligenceOnly);
  const singleAttributeExport = await engine.getJsonV4Content(intelligenceOnly, 'CHARACTER', content);
  assert.equal(singleAttributeExport.proficiencies.INNATE_SPELL_ATTACK.total, '+11');
  assert.equal(Number(singleAttributeExport.proficiencies.INNATE_SPELL_DC.total), 21);
});

for (const mode of ['FILTERED', 'PREDEFINED'])
  test(`${mode} spell selections carry the selected casting attribute`, async () => {
    const data =
      mode === 'FILTERED'
        ? {
            optionsFilters: {
              id: 'spell-filter',
              type: 'SPELL',
              level: { min: 0, max: 10 },
              spellData: innateData('ATTRIBUTE_WIS'),
            },
          }
        : {
            optionsPredefined: [
              { id: 'spell-choice', type: 'SPELL', operation: op('spell', 'giveSpell', innateData('ATTRIBUTE_WIS')) },
            ],
          };
    const selection = op('choose-spell', 'select', { title: 'Spell', optionType: 'SPELL', modeType: mode, ...data });
    const entity = character([selection], 1, {
      'character_choose-spell': mode === 'FILTERED' ? String(spell.id) : 'spell-choice',
    });
    await calculate(entity);
    assert.equal(engine.collectEntitySpellcasting('CHARACTER', entity).innate[0].attribute, 'ATTRIBUTE_WIS');
  });

for (const [level, expected] of [
  [1, 'T'],
  [2, 'T'],
  [3, 'E'],
  [6, 'E'],
  [7, 'M'],
  [14, 'M'],
  [15, 'L'],
  [20, 'L'],
]) {
  test(`specified Lore follows Additional Lore progression at level ${level}`, async () => {
    const entity = character([grantLore('elven', 'Elven Lore'), grantLore('sailing', 'Sailing')], level);
    const original = structuredClone(lore);
    for (const context of ['CHARACTER-BUILDER', 'CHARACTER-SHEET']) {
      const result = await calculate(entity, context);
      assert.equal(rank('SKILL_LORE_ELVEN'), expected);
      assert.equal(rank('SKILL_LORE_SAILING'), expected);
      assert.doesNotMatch(JSON.stringify(result.ors), /"selection".*Select a Lore/);
    }
    assert.deepEqual(lore, original, 'the shared feat and its authored operations remain unchanged');
  });
}

test('empty Lore preserves normal choices, while specified Lore ignores obsolete saved subject choices', async () => {
  const blank = await calculate(character([grantLore('blank', '   ')]));
  assert.match(JSON.stringify(blank.ors), /Select a Lore/);
  assert.equal(rank('SKILL_LORE_ELVEN'), undefined);
  const entity = character([grantLore('fixed', 'Elven Lore')], 7, {
    'character_fixed_old-selection': 'SKILL_LORE_OTHER',
  });
  await calculate(entity);
  assert.equal(rank('SKILL_LORE_ELVEN'), 'M');
  assert.equal(rank('SKILL_LORE_OTHER'), 'U', 'saved subjects can exist, but this grant must not train them');
});

test('removing a parent revokes its named Lore and preserves an independent parent grant', async () => {
  const parent = (id, subject) => ({
    ...lore,
    id,
    name: `Parent ${id}`,
    operations: [grantLore(`lore-${id}`, subject)],
  });
  const parents = [parent(990210, 'Elven'), parent(990211, 'Dwarven')];
  engine.setFixtures([...fixtures, ...parents.map((row) => ({ table: 'ability_block', row }))]);
  const give = (id) => op(`parent-${id}`, 'giveAbilityBlock', { type: 'feat', abilityBlockId: id });
  await calculate(
    character(
      [give(990210), give(990211), op('remove-parent', 'removeAbilityBlock', { type: 'feat', abilityBlockId: 990210 })],
      15
    )
  );
  assert.equal(rank('SKILL_LORE_ELVEN'), undefined);
  assert.equal(rank('SKILL_LORE_DWARVEN'), 'L');
});

test('a named Lore grant neither lowers existing ranks nor grants an unrelated replacement skill', async () => {
  const operations = [
    op('existing', 'createValue', {
      variable: 'SKILL_LORE_ELVEN',
      type: 'prof',
      value: { value: 'M', attribute: 'ATTRIBUTE_INT' },
    }),
    grantLore('elven', 'Elven'),
  ];
  const result = await calculate(character(operations));
  assert.equal(rank('SKILL_LORE_ELVEN'), 'M');
  assert.doesNotMatch(JSON.stringify(result.ors), /Select a Skill to be Trained/);
  await calculate(
    character([...operations, op('remove-lore', 'removeAbilityBlock', { type: 'feat', abilityBlockId: lore.id })])
  );
  assert.equal(rank('SKILL_LORE_ELVEN'), 'M');
});

test('Lore remains scoped to Additional Lore and to an active conditional grant', async () => {
  const unrelated = { ...lore, id: 990212, name: 'Other feat' };
  engine.setFixtures([...fixtures, { table: 'ability_block', row: unrelated }]);
  const result = await calculate(
    character([op('other', 'giveAbilityBlock', { type: 'feat', abilityBlockId: unrelated.id, grantedLore: 'Elven' })])
  );
  assert.equal(rank('SKILL_LORE_ELVEN'), undefined);
  assert.match(JSON.stringify(result.ors), /Select a Lore/);
  await calculate(
    character(
      [
        op('inactive', 'conditional', {
          conditions: [{ id: 'level', name: 'LEVEL', type: 'num', operator: 'GREATER_THAN', value: 5 }],
          trueOperations: [grantLore('elven', 'Elven')],
        }),
      ],
      1
    )
  );
  assert.equal(rank('SKILL_LORE_ELVEN'), undefined);
});
