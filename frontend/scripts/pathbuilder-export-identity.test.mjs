import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertPathbuilderDerivedMatchesShare,
} from '../src/process/import/pathbuilder/pathbuilder-export-identity.ts';

const share = {
  characterName: 'Kasane',
  className: 'Champion',
  characterLevel: 7,
  ancestry: 'Automaton',
  heritage: 'Hunter Automaton',
};

const derived = {
  name: 'Kasane',
  class: 'Champion',
  level: 7,
  keyability: 'str',
  ancestry: 'Automaton',
  heritage: 'Hunter Automaton',
  abilities: { str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 16 },
  acTotal: { acTotal: 24, shieldBonus: '1' },
};

test('share and automatically-derived export identity must match exactly', () => {
  assert.doesNotThrow(() => assertPathbuilderDerivedMatchesShare(share, derived));

  assert.throws(
    () => assertPathbuilderDerivedMatchesShare(share, { ...derived, name: 'Another Character' }),
    /mismatch for name/
  );
  assert.throws(
    () => assertPathbuilderDerivedMatchesShare(share, { ...derived, class: 'Wizard' }),
    /mismatch for class/
  );
  assert.throws(
    () => assertPathbuilderDerivedMatchesShare(share, { ...derived, level: 8 }),
    /mismatch for level/
  );
  assert.throws(
    () => assertPathbuilderDerivedMatchesShare(share, { ...derived, ancestry: 'Elf' }),
    /mismatch for ancestry/
  );
});

test('optional mechanical identity fields must agree when both payloads provide them', () => {
  const shareWithMechanics = {
    ...share,
    background: 'BACKGROUND_Bounty Hunter',
    keyability: 'STR',
  };
  const exportWithMechanics = {
    ...derived,
    background: 'Bounty Hunter',
    keyability: 'str',
  };

  // Pathbuilder encodes the share background with a category prefix and differs
  // in keyability casing between payloads. Equivalent values must still match.
  assert.doesNotThrow(() =>
    assertPathbuilderDerivedMatchesShare(shareWithMechanics, exportWithMechanics)
  );

  assert.throws(
    () =>
      assertPathbuilderDerivedMatchesShare(
        { ...shareWithMechanics, keyability: 'dex' },
        exportWithMechanics
      ),
    /mismatch for key ability/
  );
  assert.throws(
    () =>
      assertPathbuilderDerivedMatchesShare(shareWithMechanics, {
        ...exportWithMechanics,
        background: 'Criminal',
      }),
    /mismatch for background/
  );
  assert.throws(
    () =>
      assertPathbuilderDerivedMatchesShare(shareWithMechanics, {
        ...exportWithMechanics,
        heritage: 'Ifrit',
      }),
    /mismatch for heritage/
  );
});

test('missing identity on either side fails closed', () => {
  assert.throws(
    () => assertPathbuilderDerivedMatchesShare(share, { ...derived, name: undefined }),
    /JSON export is missing name/
  );
  assert.throws(
    () => assertPathbuilderDerivedMatchesShare({ ...share, className: undefined }, derived),
    /share payload is missing class/
  );
});
