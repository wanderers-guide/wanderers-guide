import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import ts from 'typescript';
import { SourceValueSchema } from '../src/schemas/shared.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let item;
let cantrip;
const entity = { level: 5, spells: { slots: [], list: [], innate_casts: [] } };
const printed = { attack: 9, dc: 19 };
const source = (attribute, tradition = 'ARCANE', name = 'WIZARD') =>
  `${name}:::PREPARED-TRADITION:::${tradition}:::${attribute}`;
const totals = (stats) => ({ attack: stats.spell_attack.total, dc: stats.spell_dc.total });

before(async () => {
  engine = await createOperationEngine({ renderCastSpellDrawer: true });
  const fixtures = await readContentRows([
    { table: 'item', id: 12326 },
    { table: 'spell', id: 6722 },
    { table: 'trait', sourceIds: Array.from({ length: 10000 }, (_, id) => id) },
  ]);
  engine.setFixtures(fixtures);
  item = fixtures.find(({ table }) => table === 'item').row;
  cantrip = fixtures.find(({ table }) => table === 'spell').row;
});
after(async () => {
  await engine?.cleanup();
});

function reset({ sources = [], innate = [], proficiency = 'T', intelligence = 4, charisma = 0 } = {}) {
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'LEVEL', 5);
  engine.setVariable('CHARACTER', 'SPELL_ATTACK', { value: proficiency });
  engine.setVariable('CHARACTER', 'SPELL_DC', { value: proficiency });
  engine.setVariable('CHARACTER', 'ATTRIBUTE_INT', { value: intelligence, partial: false });
  engine.setVariable('CHARACTER', 'ATTRIBUTE_CHA', { value: charisma, partial: false });
  engine.setVariable('CHARACTER', 'CASTING_SOURCES', sources);
  engine.setVariable(
    'CHARACTER',
    'SPELL_DATA',
    innate.map((entry) => JSON.stringify({ type: 'INNATE', spellId: cantrip.id, rank: 0, casts: 1, ...entry }))
  );
}

function resolve(casting = printed, spell = cantrip, owner = entity) {
  return engine.getSpellheartStats('CHARACTER', spell, 'NONE', 'ATTRIBUTE_CHA', casting, owner);
}

test('printed Spellheart metadata validates independently and survives catalog and inventory round trips', () => {
  for (const casting of [printed, { dc: 29 }, { attack: 17 }, { attack: 0 }, { attack: -1, dc: 0 }]) {
    assert.deepEqual(engine.SpellheartCastingSchema.parse(casting), casting);
    const row = { ...item, meta_data: { ...item.meta_data, spellheart_casting: casting } };
    assert.deepEqual(engine.ItemSchema.parse(row).meta_data.spellheart_casting, casting);
    const inventoryItem = {
      id: 'saved-spellheart',
      item: row,
      is_formula: false,
      is_equipped: true,
      is_invested: false,
      is_implanted: false,
      container_contents: [],
    };
    assert.deepEqual(engine.InventoryItemSchema.parse(inventoryItem).item.meta_data.spellheart_casting, casting);
  }
  for (const casting of [
    {},
    { attack: 1.5 },
    { dc: NaN },
    { attack: Infinity },
    { dc: -Infinity },
    { dc: '19' },
    null,
    { dc: 19, attack: null },
    { dc: 19, inferred: true },
  ]) {
    assert.equal(engine.SpellheartCastingSchema.safeParse(casting).success, false);
  }
});

test('noncasters use the printed values, not fabricated Charisma or a high unused attribute', () => {
  reset({ proficiency: 'U', intelligence: 6, charisma: 6 });
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
  assert.deepEqual(totals(resolve(printed, cantrip, null)), { attack: [9, 4, -1], dc: 19 });
});

test('cantrips use each higher actual casting statistic and leveled spells always retain the printed values', () => {
  for (const [attribute, intelligence, charisma] of [
    ['ATTRIBUTE_INT', 4, 0],
    ['ATTRIBUTE_CHA', 0, 4],
  ]) {
    reset({ sources: [source(attribute)], intelligence, charisma });
    assert.deepEqual(totals(resolve()), { attack: [11, 6, 1], dc: 21 });
    assert.deepEqual(totals(resolve(printed, { ...cantrip, traits: [], rank: 3 })), { attack: [9, 4, -1], dc: 19 });
  }
  reset({ sources: [source('ATTRIBUTE_INT')] });
  assert.deepEqual(totals(resolve({ attack: 13, dc: 19 })), { attack: [13, 8, 3], dc: 21 });
  assert.deepEqual(totals(resolve({ attack: 9, dc: 23 })), { attack: [11, 6, 1], dc: 23 });
  reset({ sources: [source('ATTRIBUTE_INT')], intelligence: 2 });
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
  reset({ sources: [source('ATTRIBUTE_INT')] });
  engine.setVariable('CHARACTER', 'PROF_WITHOUT_LEVEL', true);
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
  assert.deepEqual(totals(resolve({ attack: 1, dc: 11 })), { attack: [6, 1, -4], dc: 16 });
});

test('multiple named sources, real innate grants and current source removal are resolved without a saved synthetic source', () => {
  reset({ sources: [source('ATTRIBUTE_CHA'), source('ATTRIBUTE_INT')], intelligence: 4, charisma: 1 });
  assert.deepEqual(totals(resolve()), { attack: [11, 6, 1], dc: 21 });
  engine.setVariable('CHARACTER', 'CASTING_SOURCES', []);
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
  reset({ innate: [{ tradition: 'PRIMAL' }], charisma: 4 });
  assert.deepEqual(totals(resolve()), { attack: [11, 6, 1], dc: 21 });
  engine.setVariable('CHARACTER', 'SPELL_DATA', []);
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
  reset({ sources: ['FOCUS:::-:::DIVINE:::ATTRIBUTE_WIS'] });
  engine.setVariable('CHARACTER', 'ATTRIBUTE_WIS', { value: 4, partial: false });
  assert.deepEqual(totals(resolve()), { attack: [11, 6, 1], dc: 21 });
});

test('malformed source attributes and unsupported traditions never invent an own casting statistic', () => {
  reset({
    sources: [
      source('LEVEL'),
      source('ATTRIBUTE_INT', 'NONE'),
      ':::PREPARED-TRADITION:::ARCANE:::ATTRIBUTE_INT',
      'broken',
    ],
    innate: [{ tradition: 'NONE' }, { spellId: -1, tradition: 'PRIMAL' }],
    charisma: 6,
  });
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
});

test('partial or absent metadata never infers the missing stat, and invalid metadata preserves the compatible existing calculation', () => {
  reset({ sources: [source('ATTRIBUTE_INT')] });
  const old = engine.getSpellStats('CHARACTER', cantrip, 'NONE', 'ATTRIBUTE_CHA');
  assert.deepEqual(totals(resolve({ dc: 19 })), { attack: old.spell_attack.total, dc: 21 });
  assert.deepEqual(totals(resolve({ attack: 9 })), { attack: [11, 6, 1], dc: old.spell_dc.total });
  for (const casting of [undefined, null, {}, { attack: '9', dc: 19 }, { dc: Infinity }]) {
    assert.deepEqual(
      totals(engine.getSpellheartStats('CHARACTER', cantrip, 'NONE', 'ATTRIBUTE_CHA', casting, entity)),
      totals(old)
    );
  }
});

test('printed attack values reuse ordinary typed modifier stacking, conditions and MAP while the item DC remains fixed', () => {
  reset({ proficiency: 'U', intelligence: 0 });
  engine.addVariableBonus('CHARACTER', 'SPELL_ATTACK', 2, 'status', '', 'Spell bonus');
  engine.addVariableBonus('CHARACTER', 'ATTACK_ROLLS_BONUS', 1, 'status', '', 'Lower general bonus');
  engine.addVariableBonus('CHARACTER', 'RANGED_ATTACK_ROLLS_BONUS', 3, 'status', '', 'Higher ranged bonus');
  engine.addVariableBonus('CHARACTER', 'ATTACK_ROLLS_BONUS', -2, 'status', '', 'Frightened 2');
  engine.addVariableBonus('CHARACTER', 'SPELL_ATTACK', -1, 'status', '', 'Stupefied 1');
  engine.addVariableBonus('CHARACTER', 'SPELL_DC', -2, 'status', '', 'Frightened 2');
  assert.deepEqual(totals(resolve()), { attack: [10, 5, 0], dc: 19 });
  assert.deepEqual(totals(resolve(printed, { ...cantrip, range: 'touch' })), { attack: [9, 4, -1], dc: 19 });
  assert.equal(
    [...resolve().spell_attack.parts.values()].reduce((total, part) => total + part, 0),
    10
  );
  reset({ sources: [source('ATTRIBUTE_INT')] });
  engine.addVariableBonus('CHARACTER', 'ATTACK_ROLLS_BONUS', -2, 'status', '', 'Frightened 2');
  engine.addVariableBonus('CHARACTER', 'SPELL_DC', -2, 'status', '', 'Frightened 2');
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
});

test('saved snapshot metadata wins; only exact cached identity may supply missing metadata and nothing is written back', () => {
  const snapshot = {
    ...item,
    uuid: 159508880647118,
    description: 'Unchanged saved custom description',
    meta_data: { ...item.meta_data },
  };
  // Model an older saved item explicitly, even after the catalog gains printed casting metadata.
  delete snapshot.meta_data.spellheart_casting;
  const canonical = {
    ...item,
    uuid: snapshot.uuid,
    description: 'Current canonical description',
    meta_data: { ...item.meta_data, spellheart_casting: printed },
  };
  const before = structuredClone({ snapshot, canonical });
  assert.deepEqual(engine.resolveSpellheartCasting(snapshot, canonical), printed);
  assert.deepEqual(engine.resolveSpellheartCasting(JSON.parse(JSON.stringify(snapshot)), canonical), printed);
  for (const other of [
    undefined,
    { ...canonical, id: -1 },
    { ...canonical, content_source_id: 1 },
    { ...canonical, uuid: 2 },
    { ...canonical, uuid: String(snapshot.uuid) },
  ]) {
    assert.equal(engine.resolveSpellheartCasting(snapshot, other), undefined);
  }
  for (const uuid of [undefined, null, '159508880647118', 0, Infinity, 1.5]) {
    assert.equal(engine.resolveSpellheartCasting({ ...snapshot, uuid }, canonical), undefined);
  }
  const own = { ...snapshot, meta_data: { ...snapshot.meta_data, spellheart_casting: { dc: 27 } } };
  assert.deepEqual(engine.resolveSpellheartCasting(own, canonical), { dc: 27 });
  own.meta_data.spellheart_casting = { dc: '27' };
  assert.equal(
    engine.resolveSpellheartCasting(own, canonical),
    undefined,
    'an invalid saved override is not silently replaced'
  );
  assert.deepEqual({ snapshot, canonical }, before);
});

test('all forty-six real older Spellhearts recover printed casting after catalog and saved-inventory validation', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20261002100000_treasure_vault_complete_catalog.sql', import.meta.url),
    'utf8'
  );
  const parts = migration.split('$completion100$');
  assert.equal(parts.length, 3);
  const patches = JSON.parse(parts[1]).patches.filter(
    (patch) => patch.table === 'item' && patch.final.meta_data?.spellheart_casting
  );
  assert.equal(patches.length, 46);
  for (const patch of patches) {
    const canonical = engine.ItemSchema.parse(patch.final);
    const saved = engine.InventoryItemSchema.parse(
      JSON.parse(
        JSON.stringify({
          id: `saved-${patch.id}`,
          item: engine.ItemSchema.parse(patch.anchor),
          is_formula: false,
          is_equipped: true,
          is_invested: false,
          is_implanted: false,
          container_contents: [],
        })
      )
    );
    assert.equal(Object.hasOwn(saved.item, 'uuid'), false);
    assert.equal(Object.hasOwn(canonical, 'uuid'), false);
    assert.equal(saved.item.meta_data?.spellheart_casting, undefined);
    const before = structuredClone({ saved, canonical });
    assert.deepEqual(
      engine.resolveSpellheartCasting(saved.item, canonical),
      patch.final.meta_data.spellheart_casting,
      `printed casting for ${saved.item.name}`
    );
    assert.deepEqual({ saved, canonical }, before);
    assert.deepEqual(JSON.parse(JSON.stringify(saved)), before.saved);
    for (const change of [
      { id: canonical.id + 1 },
      { content_source_id: canonical.content_source_id + 1 },
      { created_at: '' },
      { created_at: canonical.created_at + ' ' },
      { name: 'Different item' },
      { level: canonical.level + 1 },
      { group: 'Different group' },
    ]) {
      assert.equal(engine.resolveSpellheartCasting(saved.item, { ...canonical, ...change }), undefined);
    }
    for (const uuid of [null, '159508880647118', 0, Infinity, 1.5, 159508880647118]) {
      assert.equal(engine.resolveSpellheartCasting({ ...saved.item, uuid }, canonical), undefined);
      assert.equal(engine.resolveSpellheartCasting(saved.item, { ...canonical, uuid }), undefined);
    }
    const custom = { ...saved.item, meta_data: { ...saved.item.meta_data, spellheart_casting: { dc: 27 } } };
    assert.deepEqual(engine.resolveSpellheartCasting(custom, canonical), { dc: 27 });
    custom.meta_data.spellheart_casting = { dc: '27' };
    assert.equal(engine.resolveSpellheartCasting(custom, canonical), undefined);
  }
});

test('actual Frightened, Sickened and Stupefied conditions retain one typed penalty across printed and own attacks', () => {
  const conditions = [
    { ...engine.getConditionByName('Frightened'), value: 2 },
    { ...engine.getConditionByName('Stupefied'), value: 1 },
  ];
  const saved = structuredClone(conditions);
  reset({ proficiency: 'U', intelligence: 0 });
  engine.applyConditions('CHARACTER', conditions);
  assert.deepEqual(totals(resolve()), { attack: [7, 2, -3], dc: 19 });
  reset({ sources: [source('ATTRIBUTE_INT')] });
  engine.applyConditions('CHARACTER', conditions);
  assert.deepEqual(totals(resolve()), { attack: [9, 4, -1], dc: 19 });
  engine.applyConditions('CHARACTER', [{ ...engine.getConditionByName('Sickened'), value: 3 }]);
  assert.deepEqual(totals(resolve()), { attack: [8, 3, -2], dc: 19 });
  assert.deepEqual(totals(resolve(printed, { ...cantrip, traits: [], rank: 3 })), { attack: [6, 1, -4], dc: 19 });
  assert.deepEqual(conditions, saved);
});

test('the actual Spellheart list uses the reactive official catalog and preserves every saved inventory value', async () => {
  const sourceText = await readFile(
    new URL('../src/pages/character_sheet/panels/spells_list/SpellheartSpellsList.tsx', import.meta.url),
    'utf8'
  );
  const ast = ts.createSourceFile(
    'SpellheartSpellsList.tsx',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const component = ast.statements.find((node) => ts.isFunctionDeclaration(node));
  const declaration = component.body.statements.find(
    (node) =>
      ts.isVariableStatement(node) && node.declarationList.declarations[0].name.getText(ast) === 'processedSpellhearts'
  );
  const compiled = ts.transpileModule(declaration.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ESNext },
  }).outputText;
  const process = new Function(
    'props',
    'sourceKey',
    'SourceValueSchema',
    'resolveSpellheartCasting',
    'detectSpellheartSpells',
    'useMemo',
    `${compiled}; return processedSpellhearts;`
  );
  const snapshot = { ...item, uuid: 159508880647118, meta_data: { ...item.meta_data } };
  // A disabled source cannot fill missing metadata, but saved printed values remain authoritative.
  delete snapshot.meta_data.spellheart_casting;
  const canonical = { ...snapshot, meta_data: { ...snapshot.meta_data, spellheart_casting: printed } };
  const inventory = { id: 'saved-owner', item: snapshot, is_equipped: true, container_contents: [] };
  const props = {
    spellhearts: [inventory],
    allSpells: [cantrip],
    canonicalItems: [canonical],
    contentSources: [{ id: 16, user_id: null, is_published: true }],
  };
  const original = structuredClone(props);
  const run = (sources) =>
    process(
      props,
      Array.isArray(sources) ? sources.join(',') : sources,
      SourceValueSchema,
      engine.resolveSpellheartCasting,
      () => [{ spell: structuredClone(cantrip), rank: 0 }],
      (callback) => callback()
    );
  assert.deepEqual(run([16])[0].casting, printed);
  assert.deepEqual(run('ALL-OFFICIAL-PUBLIC')[0].casting, printed);
  assert.equal(run([1, 3])[0].casting, undefined, 'a row from a disabled book cannot supply metadata');
  for (const sourceIds of [
    [3, 3.5],
    [3, 9007199254740992],
  ]) {
    assert.equal(
      run(SourceValueSchema.parse(sourceIds))[0].casting,
      undefined,
      'a numeric scope never becomes an unrestricted mode because one ID is not a safe integer'
    );
  }
  assert.equal(run('INVALID-MODE')[0].casting, undefined, 'unknown source fingerprints fail closed');
  props.canonicalItems = [];
  assert.equal(run([16])[0].casting, undefined);
  props.canonicalItems = [{ ...canonical, meta_data: { ...canonical.meta_data, spellheart_casting: { dc: 31 } } }];
  assert.deepEqual(run([16])[0].casting, { dc: 31 }, 'a newly loaded catalog row is used, not a stale global cache');
  props.canonicalItems = [canonical];
  for (const source of [
    { id: 16, user_id: 'homebrew-owner', is_published: true },
    { id: 16, user_id: null, is_published: false },
  ]) {
    props.contentSources = [source];
    assert.equal(run([16])[0].casting, undefined);
  }
  props.contentSources = original.contentSources;
  snapshot.meta_data = { ...snapshot.meta_data, spellheart_casting: { dc: 27 } };
  assert.deepEqual(run([1, 3])[0].casting, { dc: 27 }, 'explicit saved item data remains usable without the book');
  delete snapshot.meta_data.spellheart_casting;
  assert.deepEqual(props, original, 'processing never changes the saved item description, operations or settings');
  assert.match(
    declaration.getText(ast),
    /props\.spellhearts, props\.allSpells, props\.canonicalItems, props\.contentSources, sourceKey/
  );
});

test('cast drawer stat lines retain every label without React list-key warnings', () => {
  const spell = {
    ...cantrip,
    cast: 'Cast a Spell',
    requirements: 'Hands free',
    cost: '1 gp',
    trigger: 'A creature approaches',
    range: '30 feet',
    area: '10-foot burst',
    targets: '1 creature',
    defense: 'AC',
    duration: '1 minute',
    traditions: ['ARCANE', 'DIVINE'],
    meta_data: { ...cantrip.meta_data, image_url: 'unused|||unused|||unused|||unused' },
  };
  const warnings = [];
  const originalError = console.error;
  let html;
  reset({ proficiency: 'U', intelligence: 0 });
  try {
    console.error = (...args) => {
      if (/unique.*key.*prop/.test(String(args[0]))) warnings.push(String(args[0]));
      else originalError(...args);
    };
    html = engine.renderCastSpellDrawer({
      id: spell.id,
      spell,
      exhausted: false,
      tradition: 'ARCANE',
      attribute: 'ATTRIBUTE_CHA',
      storeId: 'CHARACTER',
      entity,
    });
  } finally {
    console.error = originalError;
  }
  const text = html.replace(/<[^>]*>/g, '').replaceAll('<!-- -->', '');
  for (const value of [
    'Cast',
    'Hands free',
    '1 gp',
    'A creature approaches',
    '30 feet',
    '10-foot burst',
    '1 creature',
    'AC',
    '1 minute',
    'ARCANE',
    'DIVINE',
  ])
    assert.ok(text.includes(value), `the ${value} stat line remains visible`);
  assert.deepEqual(warnings, [], 'stat-line lists need keys on their outer elements');
});

test('the actual cast drawer renders printed and higher-own values while ordinary casts keep the unchanged path', async () => {
  // This SSR fixture omits artwork through the existing invalid-icon path; browser checks use real artwork.
  const spell = { ...cantrip, meta_data: { ...cantrip.meta_data, image_url: 'unused|||unused|||unused|||unused' } };
  const data = {
    id: cantrip.id,
    spell,
    exhausted: false,
    tradition: 'NONE',
    attribute: 'ATTRIBUTE_CHA',
    storeId: 'CHARACTER',
    entity,
  };
  const text = (html) => html.replace(/<[^>]*>/g, '').replaceAll('<!-- -->', '');
  reset({ proficiency: 'U', intelligence: 0 });
  assert.match(
    text(engine.renderCastSpellDrawer({ ...data, spellheartCasting: printed })),
    /Attack\+9 \/ \+4 \/\s*-1DC19/
  );
  reset({ sources: [source('ATTRIBUTE_INT')] });
  assert.match(
    text(engine.renderCastSpellDrawer({ ...data, spellheartCasting: printed })),
    /Attack\+11 \/ \+6 \/\s*\+1DC21/
  );
  assert.match(text(engine.renderCastSpellDrawer(data)), /Attack\+7 \/ \+2 \/\s*-3DC17/);
  assert.match(
    text(
      engine.renderCastSpellDrawer({ ...data, spell: { ...spell, traits: [], rank: 3 }, spellheartCasting: printed })
    ),
    /Attack\+9 \/ \+4 \/\s*-1DC19/
  );
  const list = await readFile(
    new URL('../src/pages/character_sheet/panels/spells_list/SpellheartSpellsList.tsx', import.meta.url),
    'utf8'
  );
  const entry = await readFile(
    new URL('../src/pages/character_sheet/panels/spells_list/SpellListEntrySection.tsx', import.meta.url),
    'utf8'
  );
  assert.match(list, /spellheartCasting=\{spellheart\.casting\}/);
  assert.match(entry, /spellheartCasting: props\.spellheartCasting/);
  for (const file of [
    'StaffSpellsList.tsx',
    'WandSpellsList.tsx',
    'PreparedSpellsList.tsx',
    'SpontaneousSpellsList.tsx',
    'InnateSpellsList.tsx',
    'FocusSpellsList.tsx',
  ]) {
    const other = await readFile(
      new URL(`../src/pages/character_sheet/panels/spells_list/${file}`, import.meta.url),
      'utf8'
    );
    assert.ok(!other.includes('spellheartCasting'), `${file} never opts into item-fixed casting statistics`);
  }
});
