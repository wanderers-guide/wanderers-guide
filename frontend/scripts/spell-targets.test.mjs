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
  engine = await createOperationEngine({ renderSpellDrawer: true });
  const fire = await readContentRows([{ table: 'trait', id: 1542 }]);
  engine.setFixtures([
    ...fire,
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
