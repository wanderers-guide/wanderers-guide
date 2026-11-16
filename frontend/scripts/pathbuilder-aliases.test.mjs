import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PATHBUILDER_ALIASES,
  findPathbuilderMatch,
  findPathbuilderMatches,
  pathbuilderAliasKey,
  pathbuilderNameCandidates,
} from '../src/process/import/pathbuilder/pathbuilder-aliases.ts';

const entries = (...names) => names.map((name) => ({ name }));
const nameOf = (entry) => entry.name;
const resolve = (category, requested, names) =>
  findPathbuilderMatch(category, requested, entries(...names), nameOf)?.name;

test('exact WG names always win over an alias target', () => {
  assert.equal(
    resolve('spell', 'Magic Missile', ['Magic Missile', 'Force Barrage']),
    'Magic Missile'
  );
  assert.equal(
    resolve('item', 'Rations', ['Rations', 'Rations (1 week)']),
    'Rations'
  );
});

test('legacy spell names resolve to Remastered WG spells', () => {
  const samples = {
    'Magic Missile': 'Force Barrage',
    'Produce Flame': 'Ignition',
    'Burning Hands': 'Breathe Fire',
    'Mage Armor': 'Mystic Armor',
    'Chill Touch': 'Void Warp',
    'Color Spray': 'Dizzying Colors',
    'Dimension Door': 'Translocate',
    'Magic Weapon': 'Runic Weapon',
    'See Invisibility': 'See the Unseen',
    'Plane Shift': 'Interplanar Teleport',
  };
  for (const [legacy, remastered] of Object.entries(samples)) {
    assert.equal(resolve('spell', legacy, [remastered]), remastered, legacy);
  }
});

test('legacy feat and class-feature names resolve to Remastered WG feats', () => {
  const samples = {
    'Attack of Opportunity': 'Reactive Strike',
    'Power Attack': 'Vicious Swing',
    'Smite Evil': 'Smite',
    'Wild Shape': 'Untamed Form',
    'Point-Blank Shot': 'Point Blank Stance',
    'Gnoll Weapon Familiarity': 'Kholo Weapon Familiarity',
  };
  for (const [legacy, remastered] of Object.entries(samples)) {
    assert.equal(resolve('feat', legacy, [remastered]), remastered, legacy);
  }
});

test('legacy equipment names resolve, including toolkits and runs', () => {
  const samples = {
    "Thieves' Tools": "Thieves' Toolkit",
    "Healer's Tools": "Healer's Toolkit",
    "Alchemist's Tools": "Alchemist's Toolkit",
    'Repair Kit': 'Repair Toolkit',
    "Healer's Tools (Expanded)": "Healer's Toolkit (Expanded)",
    'Spell-Storing Rune': 'Spell Reservoir',
    'Boots of Speed': 'Propulsive Boots',
  };
  for (const [legacy, remastered] of Object.entries(samples)) {
    assert.equal(resolve('item', legacy, [remastered]), remastered, legacy);
  }
});

test('ancestry, heritage, and language renames resolve', () => {
  assert.equal(resolve('ancestry', 'Gnoll', ['Kholo', 'Human']), 'Kholo');
  assert.equal(resolve('ancestry', 'Grippli', ['Tripkee', 'Human']), 'Tripkee');
  assert.equal(resolve('heritage', 'Ifrit', ['Naari', 'Oread']), 'Naari');
  assert.equal(resolve('heritage', 'Aasimar', ['Nephilim']), 'Nephilim');
  assert.equal(resolve('heritage', 'Tiefling', ['Nephilim']), 'Nephilim');
  assert.equal(resolve('heritage', 'Half-Elf', ['Aiuvarin']), 'Aiuvarin');
  assert.equal(resolve('heritage', 'Half-Orc', ['Dromaar']), 'Dromaar');

  const languages = {
    Abyssal: 'Chthonian',
    Aquan: 'Thalassic',
    Auran: 'Sussuran',
    Celestial: 'Empyrean',
    Druidic: 'Wildsong',
    Gnoll: 'Kholo',
    Ignan: 'Pyric',
    Infernal: 'Diabolic',
    Sylvan: 'Fey',
    Terran: 'Petran',
    Undercommon: 'Sakvroth',
  };
  for (const [legacy, remastered] of Object.entries(languages)) {
    assert.equal(resolve('language', legacy, [remastered]), remastered, legacy);
  }
});

test('unqualified legacy names resolve to a unique qualified record only', () => {
  assert.equal(
    resolve('feat', "Ember's Eyes (Darkvision)", ["Ember's Eyes"]),
    "Ember's Eyes"
  );
  assert.equal(
    resolve('feat', 'Evasiveness', ['Evasiveness (Rogue)']),
    'Evasiveness (Rogue)'
  );
});

test('ambiguous or absent targets fail closed instead of guessing', () => {
  // One legacy feat merged into a Remastered feat, but both class versions are
  // legal records at this selector: the importer must not pick one.
  assert.equal(
    resolve('feat', 'Stance Savant', ['Opening Stance', 'Reflexive Stance']),
    undefined
  );
  // A generic name matching two class-qualified records is ambiguous.
  assert.equal(
    resolve('feat', 'Evasiveness', ['Evasiveness (Rogue)', 'Evasiveness (Swashbuckler)']),
    undefined
  );
  // The alias target is not in the loaded content package.
  assert.equal(resolve('spell', 'Magic Missile', ['Fireball']), undefined);
  // No alias and no exact match.
  assert.equal(resolve('item', 'Nonexistent Widget', ['Rope']), undefined);
});

test('match lists expose ambiguity so callers can report it', () => {
  assert.deepEqual(
    findPathbuilderMatches(
      'feat',
      'Evasiveness',
      entries('Evasiveness (Rogue)', 'Evasiveness (Swashbuckler)'),
      nameOf
    ).map(nameOf),
    ['Evasiveness (Rogue)', 'Evasiveness (Swashbuckler)']
  );
});

test('registry invariants: canonical keys, real targets, no self-mapping', () => {
  const minimums = { item: 48, spell: 140, feat: 140, ancestry: 2, heritage: 5, language: 11 };
  for (const [category, minimum] of Object.entries(minimums)) {
    const table = PATHBUILDER_ALIASES[category];
    assert.ok(Object.keys(table).length >= minimum, `${category} alias count`);
    for (const [legacy, targets] of Object.entries(table)) {
      assert.ok(targets.length > 0, `${category}:${legacy} has no target`);
      for (const target of targets) {
        assert.notEqual(
          pathbuilderAliasKey(legacy),
          pathbuilderAliasKey(target),
          `${category}:${legacy} maps to itself`
        );
        assert.ok(
          pathbuilderNameCandidates(category, legacy).includes(target),
          `${category}:${legacy} candidate expansion`
        );
      }
    }
  }
});

test('candidate expansion keeps the original first and de-duplicates', () => {
  assert.deepEqual(pathbuilderNameCandidates('spell', 'Magic Missile'), [
    'Magic Missile',
    'Force Barrage',
  ]);
  assert.deepEqual(pathbuilderNameCandidates('spell', 'Force Barrage'), ['Force Barrage']);
});
