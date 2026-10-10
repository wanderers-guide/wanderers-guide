import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SpellSlotSchema } from '../src/schemas/content.ts';
import {
  OperationGiveSpellSchema,
  OperationGiveSpellSlotSchema,
  SpellMetadataSchema,
} from '../src/schemas/operations.ts';

test('ordinary spell slots and grants remain byte-equivalent after schema parsing', () => {
  const slot = { rank: 7, source: 'PREPARED', spell_id: 4623, exhausted: true, color: 'blue' };
  assert.deepEqual(SpellSlotSchema.parse(slot), slot);
  const grant = {
    id: 'member',
    type: 'giveSpell',
    data: { type: 'NORMAL', spellId: 4623, castingSource: 'PREPARED', rank: 3 },
  };
  assert.deepEqual(OperationGiveSpellSchema.parse(grant), grant);
});

test('named spell lists and restricted preparations survive actual operation and saved-slot schemas', () => {
  const data = { type: 'NORMAL', castingSource: 'PREPARED', listSources: ['CACHE'], rank: 3 };
  assert.deepEqual(SpellMetadataSchema.parse(data), data);
  const op = {
    id: 'restricted',
    type: 'giveSpellSlot',
    data: { castingSource: 'PREPARED', spellListSource: 'CACHE', slots: [{ lvl: 14, rank: 7, amt: 1 }] },
  };
  assert.deepEqual(OperationGiveSpellSlotSchema.parse(op), op);
  const slot = { rank: 7, source: 'PREPARED', spell_id: 4623, exhausted: true, spell_list_source: 'CACHE' };
  assert.deepEqual(SpellSlotSchema.parse(JSON.parse(JSON.stringify(slot))), slot);
});

test('authored list references reject empty strings and incorrect types', () => {
  for (const listSources of [[''], [1], null, 'CACHE']) {
    assert.equal(SpellMetadataSchema.safeParse({ type: 'NORMAL', listSources }).success, false);
  }
  for (const spellListSource of ['', 1, null, ['CACHE']]) {
    assert.equal(
      OperationGiveSpellSlotSchema.safeParse({
        id: 'restricted',
        type: 'giveSpellSlot',
        data: { castingSource: 'PREPARED', spellListSource, slots: [] },
      }).success,
      false
    );
    assert.equal(
      SpellSlotSchema.safeParse({ rank: 7, source: 'PREPARED', spell_list_source: spellListSource }).success,
      false
    );
  }
});
