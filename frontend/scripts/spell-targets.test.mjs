import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261008160000_tech_core_introductory_spells.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$tech_core_spells$')[1]);
const bugfix = { ...spec.rows.find((row) => row.name === 'Bugfix'), id: 800000 };
for (const binding of spec.bindings.filter((entry) => entry.uuid === bugfix.uuid)) {
  bugfix[binding.field] = bugfix[binding.field].replaceAll(
    `(${binding.href})`,
    `(${binding.template.replace('{{allocated_id}}', String(bugfix.id))})`
  );
}
let engine;

/** Read visible link labels from the rendered drawer, not the stored markdown. */
function linkLabels(html) {
  return [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]*>/g, ''));
}

before(async () => {
  engine = await createOperationEngine({ renderSpellDrawer: true, renderCastSpellDrawer: true });
  const headerReferences = await readContentRows([
    { table: 'trait', id: 1542 },
    { table: 'ability_block', id: 19733 },
  ]);
  engine.setFixtures([
    ...headerReferences,
    ...spec.references.map(({ table, row }) => ({ table, row })),
    { table: 'spell', row: bugfix },
  ]);
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'STARFINDER', true);
});

after(async () => engine?.cleanup());

test('Bugfix links the glitching condition in both its Targets and description', () => {
  assert.equal(bugfix.targets, '1 creature or object with the glitching condition');
  assert.doesNotMatch(bugfix.targets, /link_condition_/, 'Condition links are not manually stored');
  const html = engine.renderSpellDrawer({ id: bugfix.id });
  assert.equal(linkLabels(html).filter((label) => label === 'glitching').length, 2);
  assert.match(
    html,
    /Targets<\/span> <span\b[^>]*>1 creature or object with the <a\b[^>]*>glitching<\/a> condition<\/span>/
  );
});

test('authored Targets links resolve through the official helper and render as inline drawer links', () => {
  const fire = engine.convertToHardcodedLink('trait', 'Fire', 'fire');
  assert.notEqual(fire, 'fire', 'The exact official Fire fixture resolves');
  const html = engine.renderSpellDrawer({
    spell: { ...bugfix, targets: `1 creature with the ${fire} trait`, description: '' },
  });
  assert.deepEqual(linkLabels(html), ['fire']);
  assert.match(html, /Targets<\/span> <span\b[^>]*>1 creature with the <a\b[^>]*>fire<\/a> trait<\/span>/);
  assert.doesNotMatch(html, /\[fire\]|link_trait_|href="link_/);
});

test('plain numeric and generic Targets preserve the stat line without gaining links', () => {
  for (const targets of ['1 creature', 'up to 10 objects', '1 willing creature or unattended object']) {
    const html = engine.renderSpellDrawer({
      spell: { ...bugfix, range: '30 feet', area: '10-foot burst', targets, description: '' },
    });
    assert.deepEqual(linkLabels(html), []);
    const text = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, '');
    assert.ok(text.includes(`Range 30 feet; Area 10-foot burst; Targets ${targets}`));
    assert.match(html, /Targets<\/span> <span\b[^>]*>/, 'Targets remain inline within the existing stat line');
  }
  const withoutTargets = engine.renderSpellDrawer({ spell: { ...bugfix, targets: '', description: '' } });
  assert.doesNotMatch(withoutTargets, />Targets<\/span>/);
});

test('Targets retain inline emphasis and code without linking a condition inside code', () => {
  const html = engine.renderSpellDrawer({
    spell: { ...bugfix, targets: '1 *creature* with **tech** or `glitching` object', description: '' },
  });
  assert.match(
    html,
    /Targets<\/span> <span\b[^>]*>1 <em>creature<\/em> with <strong>tech<\/strong> or <code\b[^>]*>glitching<\/code> object<\/span>/
  );
  assert.deepEqual(linkLabels(html), []);
  assert.doesNotMatch(html, /Targets<\/span> <p\b/);
});

/** Supply the casting view's character context without invoking a cast or remote read. */
function renderHeaderDrawer(kind, row) {
  if (kind === 'castSpell') {
    return engine.renderCastSpellDrawer({
      id: row.id,
      spell: row,
      exhausted: false,
      tradition: 'ARCANE',
      attribute: 'ATTRIBUTE_INT',
      storeId: 'CHARACTER',
      entity: null,
    });
  }
  return engine[`render${kind[0].toUpperCase() + kind.slice(1)}Drawer`]({ [kind]: row });
}

test('casting view Targets resolve authored links and conditions without changing plain prose', () => {
  const fire = engine.convertToHardcodedLink('trait', 'Fire', 'fire');
  const html = renderHeaderDrawer('castSpell', {
    ...bugfix,
    targets: `1 *creature* with the ${fire} trait while glitching, not \`glitching\``,
    description: '',
  });
  assert.deepEqual(linkLabels(html), ['fire', 'glitching']);
  assert.match(html, /Targets<\/span> <span\b[^>]*>1 <em>creature<\/em>/);
  assert.match(html, /<code\b[^>]*>glitching<\/code>/);
  assert.doesNotMatch(html, /link_trait_|href="link_/);
  const plain = renderHeaderDrawer('castSpell', { ...bugfix, targets: '1 creature', description: '' });
  assert.match(plain, /Targets<\/span> <span\b[^>]*>1 creature<\/span>/);
  assert.deepEqual(linkLabels(plain), []);
  const empty = renderHeaderDrawer('castSpell', { ...bugfix, targets: '', description: '' });
  assert.doesNotMatch(empty, />Targets<\/span>/);
});

for (const kind of ['spell', 'action', 'feat', 'castSpell']) {
  test(`${kind} Trigger and Cost lines render every authored link and automatic condition`, () => {
    const fire = engine.convertToHardcodedLink('trait', 'Fire', 'fire');
    const interact = engine.convertToHardcodedLink('action', 'Interact', 'Interact');
    assert.notEqual(fire, 'fire', 'Fire resolves through the exact official fixture');
    assert.notEqual(interact, 'Interact', 'Interact resolves through the exact official fixture');
    const isSpell = kind === 'spell' || kind === 'castSpell';
    const base = isSpell ? bugfix : spec.references.find(({ row }) => row.name === 'Counteract').row;
    const row = {
      ...base,
      ...(isSpell ? {} : { type: kind, prerequisites: [], operations: [], traits: [] }),
      trigger: `You ${interact} with a ${fire} object while glitching`,
      cost: `1 ${fire} object`,
      description: '',
      targets: '',
    };
    const html = renderHeaderDrawer(kind, row);
    assert.equal(linkLabels(html).filter((label) => label === 'fire').length, 2);
    assert.equal(linkLabels(html).filter((label) => label === 'Interact').length, 1);
    assert.equal(linkLabels(html).filter((label) => label === 'glitching').length, 1);
    assert.doesNotMatch(html, /\[fire\]|\[Interact\]|link_trait_|link_action_|href="link_/);
    assert.match(html, /Trigger<\/span> <span\b/);
    assert.match(html, /Cost<\/span> <span\b/);
  });

  test(`${kind} ordinary Trigger and Cost prose stays inline, and empty fields stay absent`, () => {
    const isSpell = kind === 'spell' || kind === 'castSpell';
    const base = isSpell ? bugfix : spec.references.find(({ row }) => row.name === 'Counteract').row;
    const row = {
      ...base,
      ...(isSpell ? {} : { type: kind, prerequisites: [], operations: [], traits: [] }),
      trigger: 'An ally is targeted by an attack',
      cost: '50 credits',
      description: '',
      targets: '',
    };
    const html = renderHeaderDrawer(kind, row);
    assert.deepEqual(linkLabels(html), []);
    assert.match(html, /Trigger<\/span> <span\b[^>]*>An ally is targeted by an attack<\/span>/);
    assert.match(html, /Cost<\/span> <span\b[^>]*>50 credits<\/span>/);
    const empty = renderHeaderDrawer(kind, { ...row, trigger: '', cost: '' });
    assert.doesNotMatch(empty, />Trigger<\/span>|>Cost<\/span>/);
  });
}
