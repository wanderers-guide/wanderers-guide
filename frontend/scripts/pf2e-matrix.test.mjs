/**
 * Durable integration coverage from the PF2e audit: 1,211 comparisons over 469 calculations.
 * These are related matrix comparisons, not 1,211 independent user journeys or a full rules certification.
 * Rule oracles: Player Core pp. 400 (typed stacking), 442-447 (conditions), 44 (Unburdened Iron),
 * and the class HP/skill progression tables. Variant oracles use stamina/proficiency without level formulas.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createPf2eMatrix } from './pf2e-matrix-support.mjs';

let matrix;
let comparisons = 0;

/** Count historical audit comparisons while letting node:test fail on every discrepancy. */
function check(actual, expected, label) {
  comparisons++;
  assert.deepEqual(actual, expected, label);
}

before(async () => {
  matrix = await createPf2eMatrix();
});
after(async () => {
  await matrix?.cleanup();
});
beforeEach(() => matrix.engine.resetVariables());

const classHealth = { Fighter: 10, Wizard: 6, Rogue: 8, Monk: 10 };
const levels = [1, 3, 5, 7, 10, 15, 20];
const conditionScenarios = [
  ['Clumsy 2', [['Clumsy', 2]], { ac: -2, reflex: -2, bow: -2, spell: 0, dc: 0, sword: 0 }],
  ['Enfeebled 2', [['Enfeebled', 2]], { bow: 0, spell: 0, dc: 0 }],
  ['Frightened 1', [['Frightened', 1]], { ac: -1, reflex: -1, fort: -1, bow: -1, sword: -1, spell: -1, dc: -1 }],
  [
    'Frightened 1 + Clumsy 2',
    [
      ['Frightened', 1],
      ['Clumsy', 2],
    ],
    { ac: -2, reflex: -2, bow: -2, spell: -1, dc: -1 },
  ],
  [
    'Frightened 1 + Stupefied 2',
    [
      ['Frightened', 1],
      ['Stupefied', 2],
    ],
    { spell: -2, dc: -2 },
  ],
  [
    'Frightened 1 + Sickened 2',
    [
      ['Frightened', 1],
      ['Sickened', 2],
    ],
    { ac: -2, reflex: -2, fort: -2, bow: -2, sword: -2, spell: -2, dc: -2 },
  ],
];

for (const [className, healthPerLevel] of Object.entries(classHealth)) {
  for (const level of levels) {
    test(`${className} level ${level}: condition scope, variants, rebuilding, and builder/sheet parity`, async () => {
      const { calculate, character, condition } = matrix;
      const data = character(className, level);
      const baseline = await calculate(data);
      check(baseline.errors, [], 'baseline calculation');
      check(baseline.hp, 8 + (healthPerLevel + 2) * level, 'ancestry + class and Constitution HP');
      for (const [name, conditions, deltas] of [
        ...conditionScenarios,
        ['Drained 2', [['Drained', 2]], { hp: -2 * level, fort: -2 }],
      ]) {
        const result = await calculate(
          data,
          conditions.map(([name, rank]) => condition(name, rank))
        );
        for (const [stat, delta] of Object.entries(deltas)) {
          check(result[stat], baseline[stat] + delta, `${name}: ${stat}`);
        }
      }
      const forward = await calculate(data, [condition('Encumbered'), condition('Clumsy', 3)]);
      const reverse = await calculate(data, [condition('Clumsy', 3), condition('Encumbered')]);
      check(forward, reverse, 'condition order cannot change the result');
      check(forward.speed, Math.max(5, baseline.speed - 10), 'Encumbered speed penalty');
      check(await calculate(data), baseline, 'removing conditions restores the complete baseline');
      check(await calculate(data, [], undefined, 'CHARACTER-BUILDER'), baseline, 'builder/sheet parity');
      const stamina = await calculate({ ...data, variants: { stamina: true } });
      check(stamina.hp, 8 + Math.floor(healthPerLevel / 2) * level, 'stamina variant HP');
      check(stamina.stamina, (Math.floor(healthPerLevel / 2) + 2) * level, 'stamina variant pool');
      await calculate(character(className === 'Wizard' ? 'Fighter' : 'Wizard', 20));
      check(await calculate(data), baseline, 'switching characters clears the previous character and variant state');
    });
  }
}

for (const [armorName, strength, expectedAc, expectedSpeed] of [
  ['Leather Armor', 0, 20, 25],
  ['Breastplate', 2, 22, 20],
  ['Breastplate', 3, 22, 25],
  ['Full Plate', 3, 23, 15],
  ['Full Plate', 4, 23, 20],
]) {
  test(`official ${armorName}, Strength +${strength}: armor cap and Strength threshold`, async () => {
    const data = matrix.character('Fighter', 5);
    data.inventory.items = [
      {
        id: 'matrix-armor',
        item: matrix.items[armorName],
        is_equipped: true,
        is_invested: false,
        container_contents: [],
      },
    ];
    data.custom_operations.find((operation) => operation.data.variable === 'ATTRIBUTE_STR').data.value = {
      value: strength,
    };
    const result = await matrix.calculate(data);
    check(result.ac, expectedAc, 'armor class');
    check(result.speed, expectedSpeed, 'armor speed penalty');
  });
}

test('official Fighter: general/melee status bonuses share one limit, while a penalty still applies', async () => {
  const data = matrix.character('Fighter');
  const baseline = await matrix.calculate(data);
  const mixed = await matrix.calculate(data, [], () => {
    matrix.bonus('ATTACK_ROLLS_BONUS', 1, 'status', 'General status');
    matrix.bonus('MELEE_ATTACK_ROLLS_BONUS', 2, 'status', 'Melee status');
  });
  check(mixed.sword, baseline.sword + 2, 'general and melee status bonuses');
  const same = await matrix.calculate(data, [], () => {
    matrix.bonus('ATTACK_ROLLS_BONUS', 1, 'status', 'First bonus');
    matrix.bonus('ATTACK_ROLLS_BONUS', 2, 'status', 'Second bonus');
    matrix.bonus('ATTACK_ROLLS_BONUS', -1, 'status', 'Penalty');
  });
  check(same.sword, baseline.sword + 1, 'highest bonus and worst penalty apply separately');
});

for (const [label, penalties, expected] of [
  ['one 5-foot penalty', [[-5, 'status']], 25],
  ['one 10-foot penalty', [[-10, 'status']], 20],
  [
    'different penalty types',
    [
      [-10, 'status'],
      [-10, 'circumstance'],
    ],
    10,
  ],
  [
    'suppressed same-type penalty',
    [
      [-10, 'status'],
      [-15, 'status'],
    ],
    15,
  ],
]) {
  test(`official Fighter with Unburdened Iron enabled: ${label}`, async () => {
    const result = await matrix.calculate(matrix.character('Fighter'), [], () => {
      matrix.engine.setVariable('CHARACTER', 'UNBURDENED_IRON', true);
      penalties.forEach(([amount, type], index) => matrix.bonus('SPEED', amount, type, `Penalty ${index}`));
    });
    check(result.speed, expected, 'reduce only one eligible penalty before re-stacking');
  });
}

test('official Wizard: explicit Drained HP loss survives rebuilding and replay', async () => {
  const data = matrix.character('Wizard');
  await matrix.calculate(data);
  const edited = matrix.engine.changeEntityConditions('CHARACTER', data, [matrix.condition('Drained', 2)]);
  const result = await matrix.calculate(edited, edited.details.conditions);
  const normalized = matrix.engine.confirmHealth(
    `${edited.hp_current}`,
    result.hp,
    edited,
    undefined,
    false,
    'normalize'
  );
  check(normalized?.entity.hp_current ?? edited.hp_current, 10, 'Drained 2 removes 2 × level HP exactly once');
  check(
    matrix.engine.changeEntityConditions('CHARACTER', edited, edited.details.conditions).hp_current,
    10,
    'replayed edit cannot remove HP twice'
  );
});

test('official Rogue: historical skill choices survive level oscillation, removal, reassignment, and restoration', async () => {
  const data = matrix.character('Rogue', 1);
  const skills = [
    'SKILL_MEDICINE',
    'SKILL_ARCANA',
    'SKILL_NATURE',
    'SKILL_SOCIETY',
    'SKILL_OCCULTISM',
    'SKILL_RELIGION',
    'SKILL_CRAFTING',
  ];
  const path = (id) => {
    const feature = matrix.feature(id);
    assert.ok(feature, `Missing skill-increase feature ${id}`);
    return `class-feature-${id}_${feature.operations[0].id}`;
  };
  matrix.engine.getClassSkillTrainings('CHARACTER', 7).forEach((operation, index) => {
    data.operation_data.selections[`class_${operation.id}`] = skills[index];
  });
  for (const id of [21349, 19381, 19385]) data.operation_data.selections[path(id)] = 'SKILL_MEDICINE';
  for (const level of [1, 2, 3, 6, 7, 14, 15, 20, 1, 20, 2, 15, 7, 3, 1]) {
    data.level = level;
    const result = await matrix.calculate(data);
    check(
      matrix.rank('SKILL_MEDICINE'),
      level >= 15 ? 'L' : level >= 7 ? 'M' : level >= 2 ? 'E' : 'T',
      `Medicine at level ${level}`
    );
    check(result.errors, [], `operation errors at level ${level}`);
  }
  data.level = 20;
  delete data.operation_data.selections[path(19381)];
  await matrix.calculate(data);
  check(matrix.rank('SKILL_MEDICINE'), 'M', 'removing the middle increase');
  data.operation_data.selections[path(19385)] = 'SKILL_ARCANA';
  await matrix.calculate(data);
  check(['SKILL_MEDICINE', 'SKILL_ARCANA'].map(matrix.rank), ['E', 'E'], 'reassigning the late increase');
  data.operation_data.selections[path(19381)] = 'SKILL_MEDICINE';
  data.operation_data.selections[path(19385)] = 'SKILL_MEDICINE';
  await matrix.calculate(data);
  check(['SKILL_MEDICINE', 'SKILL_ARCANA'].map(matrix.rank), ['L', 'T'], 'restoring historical increases');
});

test('official Wizard finesse attack ignores Enfeebled when Dexterity is better', async () => {
  const data = matrix.character('Wizard');
  const baseline = await matrix.calculate(data);
  const result = await matrix.calculate(data, [matrix.condition('Enfeebled', 2)]);
  check(result.dagger, baseline.dagger, 'Dexterity finesse attack');
});

test('official Fighter Strength attack stacks Frightened and Enfeebled as one status penalty', async () => {
  const data = matrix.character('Fighter');
  const baseline = await matrix.calculate(data);
  const result = await matrix.calculate(data, [matrix.condition('Frightened', 1), matrix.condition('Enfeebled', 2)]);
  check(result.sword, baseline.sword - 2, 'Strength attack status penalty');
});

test('official Fighter armor and an extra item AC bonus do not stack', async () => {
  const data = matrix.character('Fighter');
  data.inventory.items = [
    {
      id: 'matrix-armor',
      item: matrix.items.Breastplate,
      is_equipped: true,
      is_invested: false,
      container_contents: [],
    },
  ];
  const result = await matrix.calculate(data, [], () => matrix.bonus('AC_BONUS', 1, 'item', 'Additional item AC'));
  check(result.ac, 22, 'breastplate competes with the additional item bonus');
});

test('official Dwarf and Unburdened Iron feat apply the same penalty rules through a real content grant', async () => {
  const data = matrix.character('Fighter');
  data.details.ancestry = matrix.dwarf;
  data.custom_operations.push({
    id: 'matrix-grant-unburdened',
    type: 'giveAbilityBlock',
    data: { type: 'feat', abilityBlockId: 20661 },
  });
  const baseline = await matrix.calculate(data);
  for (const [label, penalties, delta] of [
    ['one 5-foot penalty', [[-5, 'status']], 0],
    [
      'different penalty types',
      [
        [-10, 'status'],
        [-10, 'circumstance'],
      ],
      -15,
    ],
    [
      'suppressed same-type penalty',
      [
        [-10, 'status'],
        [-15, 'status'],
      ],
      -10,
    ],
  ]) {
    const result = await matrix.calculate(data, [], () =>
      penalties.forEach(([amount, type], index) => matrix.bonus('SPEED', amount, type, `Penalty ${index}`))
    );
    check(result.speed, Math.max(5, baseline.speed + delta), label);
  }
});

test('healing stable or nonlethal knockouts cannot create another Wounded increase', () => {
  const data = matrix.character('Wizard');
  data.hp_current = 0;
  data.details.conditions = [matrix.condition('Unconscious')];
  const healed = matrix.engine.confirmHealth('1', 48, data);
  check(
    healed.entity.details.conditions.some((condition) => condition.name === 'Wounded'),
    false,
    'nonlethal knockout'
  );
  data.details.conditions = [matrix.condition('Unconscious'), matrix.condition('Wounded', 1)];
  const awake = matrix.engine.confirmHealth('1', 48, data);
  check(
    awake.entity.details.conditions.find((condition) => condition.name === 'Wounded')?.value,
    1,
    'already stabilized knockout'
  );
});

for (const level of [1, 5, 10, 20]) {
  test(`official Wizard level ${level}: proficiency without level removes exactly the level contribution`, async () => {
    const data = matrix.character('Wizard', level);
    const normal = await matrix.calculate(data);
    const noLevel = await matrix.calculate({ ...data, variants: { proficiency_without_level: true } });
    check([noLevel.ac, noLevel.spell], [normal.ac - level, normal.spell - level], 'AC and spell proficiency');
  });
}

test('the complete original audit matrix executes as a regression suite', (context) => {
  assert.equal(comparisons, 1211, 'all historical audit comparisons ran');
  assert.equal(matrix.calculations, 469, '434 broad-matrix and 35 edge-matrix calculations ran');
  context.diagnostic(
    `${comparisons} rule comparisons across ${matrix.calculations} actual engine calculations; fixture identity and error checks are additional invariants.`
  );
});
