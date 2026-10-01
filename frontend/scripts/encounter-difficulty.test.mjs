import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { calculateDifficulty } from '../src/utils/encounter-difficulty.ts';
import { createHazardCombatant } from '../src/utils/encounter-hazard.ts';

const migration = await readFile(
  new URL('../../supabase/migrations/20260928020000_war_of_immortals_hazards.sql', import.meta.url),
  'utf8'
);
const hazards = JSON.parse(migration.split('$entries$')[1]).map((entry, index) => ({
  id: index + 1,
  uuid: entry.uuid,
  created_at: '',
  type: 'hazard',
  name: entry.name,
  level: entry.level,
  rarity: 'RARE',
  details: entry.details,
  content_source_id: 400,
  deprecated: false,
  version: '1.0',
  meta_data: null,
}));
const encounter = { meta_data: { party_level: 7, party_size: 4 } };
const resolveLevel = (entity) => entity.level;
const creature = (level, ally = false) => ({ _id: `creature-${level}`, type: 'CREATURE', ally, data: { level } });
const difficulty = (combatants, settings = encounter) => calculateDifficulty(settings, combatants, resolveLevel);

test('every legacy creature XP value and difficulty threshold stays unchanged', () => {
  for (const [offset, xp] of [
    [-5, 0],
    [-4, 10],
    [-3, 15],
    [-2, 20],
    [-1, 30],
    [0, 40],
    [1, 60],
    [2, 80],
    [3, 120],
    [4, 160],
    [5, 200],
  ]) {
    assert.equal(difficulty([creature(7 + offset)]).xp, xp);
  }
  for (const [level, status] of [
    [7, 'Trivial'],
    [8, 'Low'],
    [9, 'Moderate'],
    [10, 'Severe'],
    [11, 'Extreme'],
    [12, 'IMPOSSIBLE'],
  ]) {
    assert.equal(difficulty([creature(level)]).status, status);
  }
});
test('official simple hazard uses one fifth XP while all complex hazards use creature XP', () => {
  for (const hazard of hazards) {
    const settings = { meta_data: { party_level: hazard.level, party_size: 4 } };
    assert.equal(
      difficulty([createHazardCombatant(hazard, hazard.name)], settings).xp,
      hazard.details.complexity === 'SIMPLE' ? 8 : 40
    );
  }
  const wind = createHazardCombatant(
    hazards.find((hazard) => hazard.name === 'Wind Surge'),
    'wind'
  );
  assert.equal(difficulty([creature(7), wind]).xp, 48);
  assert.equal(difficulty([wind], { meta_data: { party_level: 3, party_size: 4 } }).xp, 32);
  assert.equal(difficulty([wind], { meta_data: { party_level: 12, party_size: 4 } }).xp, 0);
});
test('mixed-level party means preserve the existing fractional-level creature budget', () => {
  const allies = [2, 2, 3, 3].map((level) => creature(level, true));
  assert.deepEqual(difficulty([...allies, creature(6)], { meta_data: {} }), {
    xp: 140,
    status: 'Extreme',
    color: 'red',
  });
  for (const [offset, xp] of [
    [0.5, 20],
    [1.5, 60],
    [3.5, 140],
    [4.5, 180],
  ]) {
    assert.equal(difficulty([creature(7 + offset)]).xp, xp);
  }
});
test('hazard disabled state and stray ally flag never change XP or party size/level', () => {
  const wind = createHazardCombatant(
    hazards.find((hazard) => hazard.name === 'Wind Surge'),
    'wind'
  );
  const combatants = [...Array.from({ length: 4 }, () => creature(7, true)), creature(9), wind];
  const settings = { meta_data: {} };
  assert.deepEqual(difficulty(combatants, settings), { status: 'Moderate', color: 'yellow', xp: 88 });
  assert.deepEqual(
    difficulty([...combatants.slice(0, -1), { ...wind, ally: true, hazard_state: { disabled: true } }], settings),
    difficulty(combatants, settings)
  );
});
test('shared resolver still controls living levels but never receives a hazard', () => {
  const wind = createHazardCombatant(
    hazards.find((hazard) => hazard.name === 'Wind Surge'),
    'wind'
  );
  let calls = 0;
  const result = calculateDifficulty(encounter, [creature(-100), wind], (entity) => {
    calls++;
    assert.equal(entity.level, -100);
    return 7;
  });
  assert.equal(calls, 1);
  assert.equal(result.xp, 48);
});
