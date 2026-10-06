import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getContentUpdateChangedFields,
  getContentUpdateReviewFields,
} from '../src/process/content/content-update-review.ts';

test('review detects removed fields and metadata, false, null, and empty values', () => {
  const original = {
    uuid: 1,
    description: 'Old',
    access: 'Restricted',
    prerequisites: ['A'],
    meta_data: { unselectable: true, ancestry_trait: true, source: { page: '12' } },
  };
  const submitted = {
    uuid: 2,
    description: '',
    prerequisites: null,
    meta_data: { unselectable: false, source: { page: '13' } },
  };
  assert.deepEqual(
    getContentUpdateChangedFields(original, submitted).sort(),
    ['access', 'ancestry_trait', 'description', 'prerequisites', 'source', 'unselectable'].sort()
  );
});

test('key order does not produce spurious review changes and nested changes list each field once', () => {
  assert.deepEqual(
    getContentUpdateChangedFields(
      { uuid: 1, meta_data: { source: { page: '12', book: 'Book' } } },
      { uuid: 2, meta_data: { source: { book: 'Book', page: '12' } } }
    ),
    []
  );
  assert.deepEqual(
    getContentUpdateChangedFields(
      { details: { defenses: { ac: 20, hp: 30 } } },
      { details: { defenses: { ac: 21, hp: 40 } } }
    ),
    ['details']
  );
});

test('review distinguishes ability block subtypes and exposes hidden and repeatable settings', () => {
  const fields = getContentUpdateReviewFields(
    'ability-block',
    { type: 'heritage', meta_data: { unselectable: true, can_select_multiple_times: false } },
    { type: 'feat', meta_data: null }
  );
  assert.deepEqual(fields, [
    { label: 'Content type', original: 'Feat', submitted: 'Heritage' },
    { label: 'Hidden', original: 'No (default)', submitted: 'Yes' },
    { label: 'Repeatable', original: 'No (default)', submitted: 'No' },
  ]);
});

test('trait review exposes classification switches without conflating creature and ancestry traits', () => {
  const fields = getContentUpdateReviewFields(
    'trait',
    {
      meta_data: {
        creature_trait: true,
        ancestry_trait: false,
        class_trait: true,
        archetype_trait: true,
        versatile_heritage_trait: true,
        companion_type_trait: true,
        important: true,
      },
    },
    null
  );
  for (const label of [
    'Creature trait',
    'Class trait',
    'Archetype trait',
    'Versatile heritage trait',
    'Companion type trait',
    'Important trait',
  ]) {
    assert.equal(fields.find((field) => field.label === label).submitted, 'Yes');
  }
  assert.equal(fields.find((field) => field.label === 'Ancestry trait').submitted, 'No');
  assert.ok(fields.every((field) => field.original === 'Unavailable'));
});

test('review can inspect incomplete submissions without trusting invalid metadata or subtype values', () => {
  const fields = getContentUpdateReviewFields('creature', { type: 12, meta_data: [] }, null);
  assert.equal(fields[0].submitted, 'Creature');
  assert.equal(fields.length, 1, 'creatures have no hidden selection setting');
  assert.equal(getContentUpdateReviewFields('trait', { meta_data: [] }, null)[1].submitted, 'No (default)');
  assert.equal(getContentUpdateReviewFields('creature', { type: 'hazard' }, null)[0].submitted, 'Hazard');
});
