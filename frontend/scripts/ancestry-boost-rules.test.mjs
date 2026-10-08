import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine } from './operation-test-harness.mjs';
let engine;
const op = (id, type, data) => ({ id, type, data });
const boost = (id, name) => op(id, 'adjValue', { variable: `ATTRIBUTE_${name}`, value: { value: 1 } });
const free = (id) =>
  op(id, 'select', {
    title: 'Select an Attribute',
    modeType: 'FILTERED',
    optionType: 'ADJ_VALUE',
    optionsFilters: { id: `${id}-filter`, type: 'ADJ_VALUE', group: 'ATTRIBUTE', value: { value: 1 } },
    optionsPredefined: [],
  });
const custom = (id, title, operations) => ({ id, type: 'CUSTOM', title, operations });
const ancestry = {
  id: 100001,
  name: 'Frame test ancestry',
  trait_id: 100002,
  content_source_id: 1,
  operations: [
    boost('int', 'INT'),
    op('cha', 'adjValue', { variable: 'ATTRIBUTE_CHA', value: { value: -1 } }),
    op('frame', 'select', {
      title: 'Select a Frame',
      modeType: 'PREDEFINED',
      optionType: 'CUSTOM',
      optionsPredefined: [
        custom('small', 'Small', [
          op('small-size', 'setValue', { variable: 'SIZE', value: 'small' }),
          boost('small-dex', 'DEX'),
        ]),
        custom('medium', 'Medium', [
          op('medium-size', 'setValue', { variable: 'SIZE', value: 'medium' }),
          op('medium-boost', 'select', {
            title: 'Select an Attribute',
            modeType: 'PREDEFINED',
            optionType: 'CUSTOM',
            optionsPredefined: [
              custom('medium-dex', 'Dexterity', [boost('dex', 'DEX')]),
              custom('medium-str', 'Strength', [boost('str', 'STR')]),
            ],
          }),
        ]),
        custom('large', 'Large', [
          op('large-size', 'setValue', { variable: 'SIZE', value: 'large' }),
          boost('large-str', 'STR'),
        ]),
      ],
    }),
    free('free'),
  ],
};
const content = {
  abilityBlocks: [],
  ancestries: [ancestry],
  classes: [],
  classArchetypes: [],
  backgrounds: [],
  items: [],
  languages: [],
  spells: [],
  traits: [],
  sources: [],
  archetypes: [],
  versatileHeritages: [],
  defaultSources: { PAGE: [1], INFO: [1] },
};
const base = () => ({
  id: 1,
  level: 1,
  details: { ancestry },
  inventory: { items: [] },
  content_sources: { enabled: [1] },
  options: {},
  operation_data: { selections: {} },
});
before(async () => {
  engine = await createOperationEngine();
  engine.setFixtures([{ table: 'ancestry', row: ancestry }]);
});
after(async () => engine?.cleanup());
const value = (n) => engine.getVariable('CHARACTER', n)?.value;
async function calc(ch) {
  const result = await engine._executeCharacterOperations({
    character: structuredClone(ch),
    content,
    context: 'CHARACTER-BUILDER',
  });
  assert.deepEqual(result.errors, []);
  return result;
}
function choices(r) {
  const out = [];
  function walk(results, prefix) {
    for (const c of results ?? []) {
      if (!c) continue;
      if (c.selection) out.push({ key: `${prefix}_${c.selection.id}`, ...c.selection, selected: c.result?.source });
      if (c.result)
        walk(
          c.result.results,
          c.result.source?._select_uuid
            ? `${prefix}_${c.selection?.id ? `${c.selection.id}_` : ''}${c.result.source._select_uuid}`
            : prefix
        );
    }
  }
  walk(r.ors.ancestryResults, 'ancestry');
  return out;
}
async function select(ch, id, name) {
  const r = await calc(ch);
  const c = choices(r).find((x) => x.id === id);
  assert.ok(c);
  const opt = c.options.find((x) => (x.title ?? x.name ?? x.variable) === name || x.variable === name);
  assert.ok(opt, `${name} missing from ${id}`);
  ch.operation_data.selections[c.key] = opt._select_uuid;
  return calc(ch);
}
test('selected frame boosts exclude only that frame and the fixed Intelligence boost', async () => {
  for (const [frame, attribute, other] of [
    ['Small', 'DEX', 'STR'],
    ['Large', 'STR', 'DEX'],
  ]) {
    const ch = base();
    const r = await select(ch, 'frame', frame);
    assert.equal(value('SIZE'), frame.toLowerCase());
    assert.equal(value(`ATTRIBUTE_${attribute}`).value, 1);
    const freeChoice = choices(r).find((x) => x.id === 'free');
    assert.ok(!freeChoice.options.some((x) => ['ATTRIBUTE_INT', `ATTRIBUTE_${attribute}`].includes(x.variable)));
    assert.ok(freeChoice.options.some((x) => x.variable === `ATTRIBUTE_${other}`));
  }
});
test('nested medium frame choices constrain the outer free boost', async () => {
  for (const attribute of ['Dexterity', 'Strength']) {
    const ch = base();
    await select(ch, 'frame', 'Medium');
    const r = await select(ch, 'medium-boost', attribute);
    const variable = attribute === 'Dexterity' ? 'ATTRIBUTE_DEX' : 'ATTRIBUTE_STR';
    assert.equal(value(variable).value, 1);
    assert.ok(
      !choices(r)
        .find((x) => x.id === 'free')
        .options.some((x) => x.variable === variable)
    );
  }
});
test('changing a frame ignores a conflicting saved free boost, including after reload', async () => {
  const ch = base();
  await select(ch, 'frame', 'Large');
  await select(ch, 'free', 'ATTRIBUTE_DEX');
  assert.equal(value('ATTRIBUTE_DEX').value, 1);
  let r = await select(ch, 'frame', 'Small');
  assert.equal(value('ATTRIBUTE_DEX').value, 1);
  assert.equal(value('ATTRIBUTE_STR').value, 0);
  assert.equal(choices(r).find((x) => x.id === 'free').selected, undefined);
  r = await calc(structuredClone(ch));
  assert.equal(value('ATTRIBUTE_DEX').value, 1);
  assert.equal(choices(r).find((x) => x.id === 'free').selected, undefined);
});
test('alternate ancestry boosts retain frame size and replace nested boosts and flaws', async () => {
  for (const frame of ['Small', 'Medium', 'Large']) {
    const ch = base();
    await select(ch, 'frame', frame);
    if (frame === 'Medium') await select(ch, 'medium-boost', 'Dexterity');
    ch.options.alternate_ancestry_boosts = true;
    let r = await calc(ch);
    assert.equal(value('SIZE'), frame.toLowerCase());
    for (const a of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) assert.equal(value(`ATTRIBUTE_${a}`).value, 0);
    assert.ok(!choices(r).some((x) => x.id === 'medium-boost'));
    const c = choices(r).find((x) => x.id.startsWith('eadjpcd7'));
    await select(ch, c.id, 'ATTRIBUTE_DEX');
    r = await calc(ch);
    assert.equal(value('ATTRIBUTE_DEX').value, 1);
    const other = choices(r).find((x) => x.id.startsWith('eadjpcd7') && !x.selected);
    assert.ok(!other.options.some((x) => x.variable === 'ATTRIBUTE_DEX'));
  }
});
