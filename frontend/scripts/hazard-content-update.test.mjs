import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapToDrawerData } from '../src/drawers/drawer-utils.ts';
import { prepareHazardContentUpdate } from '../src/process/content/hazard-content-update.ts';

function makeHazard() {
  return {
    id: 71,
    uuid: 1465735844144675,
    created_at: '2026-09-28T00:00:00Z',
    updated_at: '2026-09-29T00:00:00Z',
    type: 'hazard',
    name: 'Ancient Ward',
    level: 12,
    rarity: 'RARE',
    details: {
      complexity: 'SIMPLE',
      trait_ids: [1476],
      trait_labels: ['Environmental'],
      stealth: 'DC 30',
      description: 'The ward stirs.',
      disable: 'Thievery DC 30',
      activation: {
        name: 'Sudden Pulse',
        actions: 'REACTION',
        trigger: 'A creature enters the area.',
        effect: 'The ward releases energy.',
      },
    },
    content_source_id: 400,
    deprecated: false,
    version: '1.0',
    meta_data: {
      source: { book: 'War of Immortals', page: '200', url: 'https://2e.aonprd.com/Hazards.aspx?ID=1000' },
      import_batch: 'woi',
    },
  };
}

test('hazard correction changes rules but preserves catalog identity, source, and saved snapshots', () => {
  const original = makeHazard();
  const originalBefore = structuredClone(original);
  const encounterSnapshot = structuredClone(original);
  const encounterBefore = structuredClone(encounterSnapshot);
  const edited = structuredClone(original);
  edited.name = '  Ancient Ward Revised  ';
  edited.details.disable = 'Thievery DC 32';
  edited.details.activation.effect = 'The ward releases a stronger pulse.';
  edited.id = 999;
  edited.uuid = 999;
  edited.type = 'creature';
  edited.created_at = '2000-01-01T00:00:00Z';
  edited.updated_at = '2000-01-01T00:00:00Z';
  edited.content_source_id = 1;
  edited.version = '9.9';
  edited.deprecated = true;

  const result = prepareHazardContentUpdate(original, edited);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  assert.equal(result.data.name, 'Ancient Ward Revised');
  assert.equal(result.data.details.disable, 'Thievery DC 32');
  assert.equal(result.data.details.activation.effect, 'The ward releases a stronger pulse.');
  for (const field of [
    'id',
    'uuid',
    'type',
    'created_at',
    'updated_at',
    'content_source_id',
    'version',
    'deprecated',
  ]) {
    assert.deepEqual(result.data[field], original[field], field);
  }
  assert.deepEqual(original, originalBefore);
  assert.deepEqual(encounterSnapshot, encounterBefore);
});

test('hazard correction retains citation and unknown metadata when the editor does not return them', () => {
  const original = makeHazard();
  const edited = structuredClone(original);
  edited.meta_data = {};

  const result = prepareHazardContentUpdate(original, edited);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  assert.deepEqual(result.data.meta_data, original.meta_data);
});

test('hazard correction can edit a citation leaf without losing other citation or metadata fields', () => {
  const original = makeHazard();
  const edited = structuredClone(original);
  edited.meta_data = {
    source: { page: '201' },
    import_batch: 'untrusted replacement',
  };

  const result = prepareHazardContentUpdate(original, edited);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  assert.deepEqual(result.data.meta_data, {
    source: { ...original.meta_data.source, page: '201' },
    import_batch: 'woi',
  });
});

test('simple hazard correction does not invent optional defenses, routine, or reset', () => {
  const original = makeHazard();
  const edited = structuredClone(original);
  edited.details.description = 'The ward hums quietly.';

  const result = prepareHazardContentUpdate(original, edited);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  for (const field of ['defenses', 'routine', 'reset']) {
    assert.equal(field in result.data.details, false, field);
  }
});

test('hazard correction rejects invalid values and incomplete rules', () => {
  const original = makeHazard();
  for (const change of [
    { level: Number.NaN },
    { level: 'twelve' },
    { name: '   ' },
    { name: null },
    { name: 12 },
    { details: { ...original.details, activation: undefined } },
    { details: { ...original.details, defenses: { hp: 'many' } } },
  ]) {
    const edited = { ...structuredClone(original), ...change };
    assert.equal(prepareHazardContentUpdate(original, edited).success, false, JSON.stringify(change));
  }
});

test('hazard content updates open hazard drawers without changing ordinary creature routing', () => {
  const hazard = makeHazard();
  assert.deepEqual(mapToDrawerData('hazard', hazard.id, { sourceId: hazard.content_source_id }), {
    type: 'hazard',
    data: { id: hazard.id, sourceId: hazard.content_source_id },
  });
  assert.deepEqual(mapToDrawerData('creature', hazard, { noFeedback: true }), {
    type: 'hazard',
    data: { hazard, noFeedback: true },
  });
  const creature = { id: 72, type: 'creature', name: 'Guardian' };
  assert.deepEqual(mapToDrawerData('creature', creature), {
    type: 'creature',
    data: { creature },
  });
});
