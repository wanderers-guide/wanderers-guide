import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${frontend}/package.json`)('esbuild');
const migration = await readFile(
  new URL('../../supabase/migrations/20260929010000_war_of_immortals_mythic_variants.sql', import.meta.url),
  'utf8'
);
const entries = JSON.parse(migration.split('$entries$')[1]);
const directory = await mkdtemp(join(tmpdir(), 'wg-mythic-variants-'));
const outfile = join(directory, 'content.mjs');
after(() => rm(directory, { recursive: true, force: true }));
await build({
  entryPoints: [`${frontend}/src/schemas/content.ts`],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${frontend}/tsconfig.json`,
});
const { CreatureSchema } = await import(pathToFileURL(outfile));

const expected = [
  {
    name: 'Mythic Gogiteth',
    id: 3400,
    templateId: 10097,
    level: 12,
    page: '170',
    uuid: 6013160830717984,
    hp: 250,
    skill: 'SKILL_STEALTH',
    before: '+4',
    after: '+11',
    attacks: ['Jaws', 'Leg'],
  },
  {
    name: 'Mythic Ogre Boss',
    id: 3401,
    templateId: 10221,
    level: 7,
    page: '171',
    uuid: 2709413115764620,
    hp: 130,
    skill: 'SKILL_ATHLETICS',
    before: '+0',
    after: '+4',
    attacks: ['Ogre Hook', 'Javelin'],
  },
  {
    name: 'Mythic Lich',
    id: 3402,
    templateId: 10176,
    level: 12,
    page: '172',
    uuid: 4237591398100435,
    hp: 190,
    skill: null,
    attacks: ['Hand'],
  },
  {
    name: 'Mythic Griffon',
    id: 3403,
    templateId: 10111,
    level: 4,
    page: '173',
    uuid: 3169015473517639,
    hp: 60,
    skill: 'SKILL_ACROBATICS',
    before: '+2',
    after: '+6',
    attacks: ['Beak', 'Talon', 'Wing'],
  },
];

const contentRows = await readContentRows([
  ...expected.map(({ templateId }) => ({ table: 'creature', id: templateId })),
  ...[6765, 7830, 7734, 7051].map((id) => ({ table: 'item', id })),
]);
const creatureById = new Map(contentRows.filter(({ table }) => table === 'creature').map(({ row }) => [row.id, row]));
const itemById = new Map(contentRows.filter(({ table }) => table === 'item').map(({ row }) => [row.id, row]));
const traitIds = new Set([4072, 4214]);
const languageIds = new Set();
const spellIds = new Set();
for (const creature of creatureById.values()) {
  for (const operation of creature.operations) {
    if (operation.type === 'giveTrait') traitIds.add(operation.data.traitId);
    if (operation.type === 'giveLanguage') languageIds.add(operation.data.languageId);
    if (operation.type === 'giveSpell') spellIds.add(operation.data.spellId);
  }
  for (const owned of creature.inventory?.items ?? []) {
    for (const id of owned.item.traits ?? []) traitIds.add(id);
  }
}
for (const entry of entries) {
  for (const ability of entry.abilities) for (const id of ability.traits ?? []) traitIds.add(id);
}
const referenceRows = await readContentRows([
  ...[...traitIds].map((id) => ({ table: 'trait', id })),
  ...[...languageIds].map((id) => ({ table: 'language', id })),
  ...[...spellIds].map((id) => ({ table: 'spell', id })),
]);
referenceRows.find(({ table, row }) => table === 'trait' && row.id === 4072).row.meta_data.creature_trait = true;

let engine;
before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

const prepared = [
  [6, 4431],
  [6, 4581],
  [6, 4924],
  [5, 4663],
  [5, 4663],
  [5, 4904],
  [5, 4943],
  [4, 4572],
  [4, 4622],
  [4, 4628],
  [4, 4906],
  [3, 4418],
  [3, 4630],
  [3, 4704],
  [3, 4925],
  [2, 4421],
  [2, 4614],
  [2, 4801],
  [2, 4822],
  [1, 4599],
  [1, 4599],
  [1, 4625],
  [1, 4881],
  [0, 4562],
  [0, 4636],
  [0, 4720],
  [0, 4831],
  [0, 4890],
];

test('four mythic variants retain official identity, stat-block notes, and required actions', () => {
  assert.equal(entries.length, 4);
  assert.equal(new Set(entries.map(({ uuid }) => uuid)).size, 4);
  for (const spec of expected) {
    const entry = entries.find(({ name }) => name === spec.name);
    assert.ok(entry, spec.name);
    assert.equal(entry.uuid, spec.uuid);
    assert.equal(entry.level, spec.level);
    assert.equal(entry.template_id, spec.templateId);
    assert.equal(entry.page, spec.page);
    assert.equal(entry.url, `https://2e.aonprd.com/Monsters.aspx?ID=${spec.id}`);
    assert.equal(
      entry.stat_block.recall_knowledge.includes(`DC ${spec.level === 7 ? 28 : spec.level === 4 ? 24 : 35}`),
      true
    );
    assert.ok(entry.stat_block.listed_skills.length >= 3);
    assert.deepEqual(
      entry.stat_block.listed_senses,
      entry.name === 'Mythic Griffon' ? ['darkvision', 'scent'] : ['darkvision']
    );
    assert.equal(
      entry.abilities.some(({ name }) => name === 'Mythic Power'),
      true
    );
    if (entry.name !== 'Mythic Lich') {
      assert.equal(
        entry.abilities.some(({ name }) => name === 'Mythic Skill'),
        true
      );
      assert.equal(entry.abilities.find(({ name }) => name === 'Mythic Skill').cost, '1 Mythic Point');
    }
    for (const ability of entry.abilities) {
      assert.ok(ability.description.length > 20, `${entry.name}: ${ability.name}`);
      assert.doesNotMatch(
        ability.description,
        /@Check|@Template|\\\[\\\[|AllAroundVision|NegativeHealing|ImprovedGrab/
      );
    }
    const template = creatureById.get(spec.templateId);
    assert.equal(template.name, entry.template_name);
    assert.deepEqual(
      template.inventory.items.map(({ item }) => item.name),
      spec.attacks
    );
    if (spec.skill) {
      assert.equal(entry.skill_variable, spec.skill);
      assert.equal(entry.old_skill_bonus, spec.before);
      assert.equal(entry.new_skill_bonus, spec.after);
      assert.equal(
        template.operations.filter(
          (operation) =>
            operation.type === 'addBonusToValue' &&
            operation.data.variable === spec.skill &&
            operation.data.value === spec.before
        ).length,
        1
      );
    }
  }
});

test('mythic conditions, equipment, and the complete lich spell preparation are explicit', () => {
  const [gogiteth, ogre, lich, griffon] = entries;
  assert.match(gogiteth.abilities.find(({ name }) => name === 'Hazard Immunity').description, /own lair/);
  assert.match(gogiteth.abilities.find(({ name }) => name === 'Mythic Resilience').description, /Reflex and Will/);
  assert.match(ogre.abilities.find(({ name }) => name === 'Mythic Resistance').description, /non-mythic/);
  assert.match(ogre.abilities.find(({ name }) => name === 'Mythic Ferocity').description, /wounded 3/);
  assert.deepEqual(ogre.catalog_items, [6765]);
  assert.deepEqual(lich.catalog_items, [7830, 7734, 7051]);
  assert.match(lich.stat_block.items_note, /teleport/);
  assert.match(lich.abilities.find(({ name }) => name === 'Siphon Life').description, /DC 34 Fortitude/);
  assert.match(griffon.abilities.find(({ name }) => name === 'Unimpeded').description, /automatically succeeds/);
  assert.equal(prepared.length, 28);
  assert.equal(prepared.filter(([rank, id]) => rank === 5 && id === 4663).length, 2);
  assert.equal(prepared.filter(([rank, id]) => rank === 1 && id === 4599).length, 2);
  assert.match(migration, /'ARCANE_PREPARED_SPELLS:::PREPARED-TRADITION:::ARCANE:::ATTRIBUTE_INT'/);
  assert.match(migration, /physical \(except magical bludgeoning\), 10/);
  assert.doesNotMatch(migration, /update public\.creature|update public\.content_source/i);
});

test('catalog references and projected creature rows satisfy the content schema', () => {
  assert.equal(itemById.get(6765).name, 'Breastplate');
  assert.equal(itemById.get(7830).name, 'Staff of Fire (Greater)');
  assert.equal(itemById.get(7734).name, 'Magic Scroll (6th-rank Spell)');
  assert.equal(itemById.get(7051).name, 'Invisibility Potion');

  for (const spec of expected) {
    const entry = entries.find(({ name }) => name === spec.name);
    const template = creatureById.get(spec.templateId);
    const source = { book: 'War of Immortals', page: entry.page, url: entry.url };
    const inventory = structuredClone(template.inventory);
    inventory.items = inventory.items.map((owned) => ({
      ...owned,
      item: {
        ...owned.item,
        price: null,
        bulk: null,
        hands: null,
        craft_requirements: null,
        usage: null,
        meta_data: { ...owned.item.meta_data, reload: undefined, foundry: undefined },
      },
    }));
    for (const id of entry.catalog_items ?? []) {
      inventory.items.push({
        id: `catalog-${id}`,
        item: itemById.get(id),
        is_formula: false,
        is_equipped: false,
        is_invested: false,
        is_implanted: false,
        container_contents: [],
      });
    }
    const abilities_base = entry.abilities.map((ability) => ({
      id: -1,
      created_at: '',
      name: ability.name,
      actions: ability.actions ?? null,
      level: entry.level,
      rarity: 'COMMON',
      frequency: ability.frequency ?? null,
      cost: ability.cost ?? null,
      trigger: ability.trigger ?? null,
      requirements: ability.requirements ?? null,
      description: ability.description,
      special: null,
      prerequisites: null,
      type: 'action',
      traits: ability.traits ?? [],
      operations: null,
      access: null,
      meta_data: { source },
      content_source_id: 400,
      version: '1.0',
    }));
    const projected = {
      ...template,
      name: entry.name,
      level: entry.level,
      rarity: 'RARE',
      uuid: entry.uuid,
      content_source_id: 400,
      meta_data: { source, stat_block: entry.stat_block },
      inventory,
      details: { ...template.details, description: entry.description },
      abilities_base,
      experience: Number(template.experience ?? 0),
      hp_current: spec.hp,
      hp_temp: 0,
      stamina_current: 0,
      resolve_current: 0,
      operation_data: null,
      deprecated: false,
      spells:
        entry.name === 'Mythic Lich'
          ? {
              slots: prepared.map(([rank, spell_id]) => ({ rank, spell_id, source: 'ARCANE_PREPARED_SPELLS' })),
              list: [],
              focus_point_current: 0,
              innate_casts: [],
            }
          : template.spells,
    };
    const result = CreatureSchema.safeParse(projected);
    assert.equal(result.success, true, `${entry.name}: ${result.success ? '' : JSON.stringify(result.error.issues)}`);
  }
});

test('all four variants calculate their published skills, saves, perception, and attacks', async () => {
  const fixtures = [...contentRows, ...referenceRows];
  engine.setFixtures(fixtures);
  const content = {
    defaultSources: { PAGE: [1, 3, 7, 8, 256, 400], INFO: [1, 3, 7, 8, 256, 400] },
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    items: fixtures.filter(({ table }) => table === 'item').map(({ row }) => row),
    spells: fixtures.filter(({ table }) => table === 'spell').map(({ row }) => row),
    languages: fixtures.filter(({ table }) => table === 'language').map(({ row }) => row),
    traits: fixtures.filter(({ table }) => table === 'trait').map(({ row }) => row),
  };
  const parent = await engine._executeCharacterOperations({
    character: { id: 1, name: 'Creature calculation fixture', level: 1, details: {}, inventory: { items: [] } },
    content,
    context: 'CHARACTER-SHEET',
  });
  const expectedTotals = new Map([
    ['Mythic Gogiteth', { perception: '+21', saves: ['+25', '+22', '+20'], skill: '+28', ac: 31, attacks: [26, 26] }],
    ['Mythic Ogre Boss', { perception: '+12', saves: ['+17', '+12', '+15'], skill: '+20', ac: 25, attacks: [19, 12] }],
    ['Mythic Lich', { perception: '+20', saves: ['+17', '+21', '+23'], skill: '+28', ac: 31, attacks: [24] }],
    ['Mythic Griffon', { perception: '+13', saves: ['+13', '+13', '+7'], skill: '+15', ac: 21, attacks: [14, 14, 14] }],
  ]);

  for (const spec of expected) {
    const entry = entries.find(({ name }) => name === spec.name);
    const template = creatureById.get(spec.templateId);
    const operations = structuredClone(template.operations).filter(
      (operation) =>
        !(
          entry.name === 'Mythic Lich' &&
          operation.type === 'addBonusToValue' &&
          operation.data.text === '+1 status to all saves vs. vitality'
        )
    );
    for (const operation of operations) {
      if (
        operation.type === 'addBonusToValue' &&
        operation.data.variable === entry.skill_variable &&
        operation.data.value === entry.old_skill_bonus
      )
        operation.data.value = entry.new_skill_bonus;
      if (entry.name === 'Mythic Lich' && operation.type === 'giveTrait' && operation.data.traitId === 1846)
        operation.data.traitId = 4214;
      if (entry.name === 'Mythic Lich' && operation.type === 'defineCastingSource')
        operation.data.value = 'ARCANE_PREPARED_SPELLS:::PREPARED-TRADITION:::ARCANE:::ATTRIBUTE_INT';
      if (
        entry.name === 'Mythic Lich' &&
        operation.type === 'addBonusToValue' &&
        ['SPELL_ATTACK', 'SPELL_DC'].includes(operation.data.variable) &&
        operation.data.value === '+23'
      )
        operation.data.value = '+20';
    }
    operations.push({ id: entry.mythic_op_id, type: 'giveTrait', data: { traitId: 4072 } });
    if (entry.name === 'Mythic Lich')
      operations.push({
        id: 'c3a0b6a8-72f7-42b4-8d66-02581e6bbae8',
        type: 'adjValue',
        data: { variable: 'RESISTANCES', value: 'physical (except magical bludgeoning), 10' },
      });
    const creature = {
      ...template,
      name: entry.name,
      rarity: 'RARE',
      content_source_id: 400,
      operations,
      abilities_base: [],
      inventory: structuredClone(template.inventory),
      hp_current: spec.hp,
    };
    const id = `MYTHIC_VARIANT_${spec.id}`;
    const result = await engine._executeCreatureOperations({ id, creature, content, charStore: parent.store });
    assert.deepEqual(result.errors, [], `${entry.name}: operation errors`);
    const totals = expectedTotals.get(entry.name);
    assert.equal(engine.getFinalProfValue(id, 'PERCEPTION'), totals.perception, `${entry.name}: Perception`);
    assert.deepEqual(
      ['SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL'].map((name) => engine.getFinalProfValue(id, name)),
      totals.saves,
      `${entry.name}: saving throws`
    );
    assert.equal(
      engine.getFinalProfValue(id, entry.skill_variable ?? 'SKILL_ARCANA'),
      totals.skill,
      `${entry.name}: mythic skill`
    );
    assert.equal(engine.getFinalAcValue(id), totals.ac, `${entry.name}: AC`);
    assert.equal(engine.getFinalHealthValue(id), spec.hp, `${entry.name}: HP`);
    assert.deepEqual(
      creature.inventory.items.map(({ item }) => engine.getWeaponStats(id, item).attack_bonus.total[0]),
      totals.attacks,
      `${entry.name}: attacks`
    );
    if (entry.name === 'Mythic Lich') {
      const spells = engine.getSpellStats(id, null, 'ARCANE', 'ATTRIBUTE_INT');
      assert.equal(spells.spell_attack.total[0], 26);
      assert.equal(spells.spell_dc.total, 36);
    }
  }
});
