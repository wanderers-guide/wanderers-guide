import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createOperationEngine } from './operation-test-harness.mjs';

let engine;
let expert;
let choice;
before(async () => {
  engine = await createOperationEngine();
  const sql = await readFile(
    new URL('../../supabase/migrations/20261026000000_mine_mod_rules.sql', import.meta.url),
    'utf8'
  );
  expert = JSON.parse(sql.split('$entries$')[1]).find((entry) => entry.id === 59595).operations;
  choice = expert.find((operation) => operation.type === 'select');
});
after(async () => engine?.cleanup());
beforeEach(() => {
  engine.resetVariables();
  engine.clearDeferredOperations();
  engine.setVariable('CHARACTER', 'LEVEL', 20);
  engine.addVariable('CHARACTER', 'prof', 'SKILL_COMPUTERS', { value: 'U', attribute: 'ATTRIBUTE_INT' });
});
const adjustment = (id, variable, value) => ({ id, type: 'adjValue', data: { variable, value: { value } } });
const track = (path, saved) => ({
  path,
  node: { value: null, children: saved ? { [choice.id]: { value: saved, children: {} } } : {} },
});
const rank = (variable) => engine.compileProficiencyType(engine.getVariable('CHARACTER', variable).value);
const run = (path, operations, level, saved, flags = {}) =>
  engine.runOperations('CHARACTER', track(path, saved), operations, { sourceLevel: level, ...flags });
async function preferredExperts(extra = []) {
  await run(
    'baseline',
    [
      adjustment('computers-expert', 'SKILL_COMPUTERS', 'E'),
      adjustment('crafting-expert', 'SKILL_CRAFTING', 'E'),
      ...extra,
    ],
    1
  );
}
async function finish(results) {
  await engine.resolveFinalSkillSelections();
  engine.reconcileQualifiedResults(results);
  return results
    .find((result) => result?.selection)
    ?.selection.options.map((option) => option.variable)
    .sort();
}

for (const saved of [undefined, 'SKILL_ATHLETICS']) {
  test(`Expert level12 excludes level15 training/increases from eligibility; saved=${saved}`, async () => {
    await preferredExperts([adjustment('athletics-trained', 'SKILL_ATHLETICS', 'T')]);
    const results = await run('expert', expert, 12, saved);
    await run(
      'later',
      [adjustment('athletics-increase', 'SKILL_ATHLETICS', '1'), adjustment('stealth-trained', 'SKILL_STEALTH', 'T')],
      15
    );
    assert.deepEqual(await finish(results), ['SKILL_ATHLETICS']);
    assert.equal(rank('SKILL_ATHLETICS'), saved ? 'M' : 'E');
  });
}

test('Expert level12 includes an earlier level5 conditional training executed after ordinary passes', async () => {
  await preferredExperts();
  const results = await run('expert', expert, 12, 'SKILL_ATHLETICS');
  await run(
    'earlier',
    [
      {
        id: 'earlier-conditional',
        type: 'conditional',
        data: {
          conditions: [],
          trueOperations: [adjustment('earlier-athletics', 'SKILL_ATHLETICS', 'T')],
          falseOperations: [],
        },
      },
    ],
    5,
    undefined,
    { doOnlyConditionals: true, doConditionals: true }
  );
  assert.deepEqual(await finish(results), ['SKILL_ATHLETICS']);
  assert.equal(rank('SKILL_ATHLETICS'), 'E');
});

for (const loreLevel of [5, 15]) {
  test(`Expert level12 ${loreLevel < 12 ? 'includes earlier' : 'excludes later'} custom Lore created directly at trained rank at level${loreLevel}`, async () => {
    await preferredExperts();
    const results = await run('expert', expert, 12);
    await run(
      'lore-source',
      [
        {
          id: 'create-trained-lore',
          type: 'createValue',
          data: { variable: 'SKILL_LORE_OCCURRENCE', type: 'prof', value: { value: 'T', attribute: 'ATTRIBUTE_INT' } },
        },
      ],
      loreLevel,
      undefined,
      { doOnlyValueCreation: true }
    );
    assert.deepEqual(await finish(results), loreLevel < 12 ? ['SKILL_LORE_OCCURRENCE'] : []);
  });
}
