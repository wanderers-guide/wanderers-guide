import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const expectedSpells = [
  'Arcane Explosion',
  'Banishing Touch',
  'Beseech Arcanotheign',
  'Bounty of the Sky',
  'Darkened Forest Form',
  'Devouring Dark Form',
  'Diadem of Divine Radiance',
  'Discomfiting Whisper',
  "Earth's Bile",
  'Embodiment of Battle',
  'Final Fate of the Locust Host',
  'Garden of Healing',
  "Garden of the Green Man's Growth",
  'It Is Written',
  'Manifest Will',
  "Nymph's Grace",
  'Part the Mists to Paradise',
  'Perceive the Threads of Fate',
  "Rainbow's End",
  'River Carving Mountains',
  'Seize Identity',
  'Spellsurge',
  'Store Time',
  'Summon Oliphaunt of Jandelay',
  'Travel by Turtle',
  'Traveling Workshop',
  "Trickster's Feathers",
  "Trickster's Mirrors",
  "Vindicator's Judgement",
  "Vindicator's Mark",
];
const expectedRituals = [
  'Awaken Curse',
  'Band of Heroes',
  'City of Sin',
  'Create Demiplane',
  'Curse of Calamity',
  'Embodied Font',
  'Freedom',
  'Imprisonment',
  'Kaiju Ward',
  "Ocean's Roar",
  'Unbearable Cacophony',
  'Void Harvest',
  'Wild Feast',
  'World in Shadow',
];

test('War of Immortals spells and rituals have complete source citations', async () => {
  const rows = (await readContentRows([{ table: 'spell', sourceIds: [400] }])).map(({ row }) => row);
  assert.equal(rows.length, 44);
  assert.equal(rows.filter((row) => row.meta_data?.ritual).length, 14);
  assert.equal(rows.filter((row) => !row.meta_data?.ritual).length, 30);
  const aonName = (name) =>
    name
      .replace('Discomfiting Whispers', 'Discomfiting Whisper')
      .replace("Vindicator's Judgment", "Vindicator's Judgement")
      .toLowerCase();
  assert.deepEqual(
    rows
      .filter((row) => !row.meta_data?.ritual)
      .map((row) => aonName(row.name))
      .sort(),
    expectedSpells.map((name) => name.toLowerCase()).sort()
  );
  assert.deepEqual(
    rows
      .filter((row) => row.meta_data?.ritual)
      .map((row) => aonName(row.name))
      .sort(),
    expectedRituals.map((name) => name.toLowerCase()).sort()
  );

  const sql = await readFile(
    new URL('../../supabase/migrations/20260927000000_war_of_immortals_provenance.sql', import.meta.url),
    'utf8'
  );
  const patches = JSON.parse(sql.split('$patches$')[1]).filter(({ table }) => table === 'spell');
  assert.deepEqual(
    patches.map(({ id }) => id).sort((left, right) => left - right),
    [7271, 7280]
  );
  for (const patch of patches) {
    const row = rows.find(({ id }) => id === patch.id);
    assert.ok(row, `missing spell ${patch.id}`);
    assert.equal(row.name, patch.name);
    assertReviewedTransition(row.meta_data?.source, undefined, patch.cite, `spell:${patch.id} citation`);
    row.meta_data = { ...row.meta_data, source: patch.cite };
  }

  const urls = new Set();
  for (const row of rows) {
    const citation = row.meta_data?.source;
    assert.equal(citation?.book, 'War of Immortals', `${row.name} book`);
    assert.match(citation.page, /^\d+$/, `${row.name} page`);
    const url = new URL(citation.url);
    assert.equal(url.hostname, '2e.aonprd.com', `${row.name} host`);
    assert.match(url.search, /^\?ID=\d+$/, `${row.name} ID`);
    assert.match(
      url.pathname,
      row.meta_data?.ritual ? /^\/(MythicRituals|Rituals)\.aspx$/ : /^\/(MythicSpells|Spells)\.aspx$/,
      `${row.name} category`
    );
    assert.ok(!urls.has(citation.url), `duplicate citation ${citation.url}`);
    urls.add(citation.url);
  }
  assert.equal(urls.size, 44);
});
