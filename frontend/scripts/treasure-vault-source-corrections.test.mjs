import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261008110000_treasure_vault_source_corrections.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-source-corrections.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$source_corrections102$')[1]);
let engine;
let spells;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true, renderCastSpellDrawer: true });
  spells = await readContentRows([
    { table: 'spell', id: 6722 },
    { table: 'spell', id: 4742 },
    { table: 'spell', id: 8995 },
  ]);
  engine.setFixtures([
    ...spells,
    ...spec.patches.map(({ after: row }) => ({ table: 'item', row: { ...row, uuid: Number(row.uuid) } })),
  ]);
});
after(async () => engine?.cleanup());

test('source corrections change only the two dragon table copies and Major Fork attack values', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$source_corrections102$')[1]));
  assert.deepEqual(
    spec.patches.map((p) => p.id),
    [11937, 11944, 12325]
  );
  for (const patch of spec.patches) {
    engine.ItemSchema.parse({ ...patch.before, uuid: Number(patch.before.uuid) });
    engine.ItemSchema.parse({ ...patch.after, uuid: Number(patch.after.uuid) });
    const restored = structuredClone(patch.after);
    restored.description = patch.before.description;
    if (patch.id === 12325) {
      assert.deepEqual(patch.after.meta_data.spellheart_casting, { dc: 29, attack: 19 });
      delete restored.meta_data.spellheart_casting.attack;
      assert.equal(
        patch.after.description,
        patch.before.description.replace('is +13, and the spell DC is 29.', 'is +19, and the spell DC is 29.')
      );
    } else {
      assert.equal(
        patch.after.description,
        patch.before.description.replace(
          '| Conspirator or horned | [Poison](link_trait_1476) |',
          '| Conspirator or horned | Bludgeoning |'
        )
      );
    }
    assert.deepEqual(restored, patch.before, 'Every unrelated complete row field is retained');
  }
});

test('rendered dragon tables agree and existing item, action, spell and trait links remain clickable', () => {
  for (const patch of spec.patches.filter((p) => p.id !== 12325)) {
    const html = engine.renderRichText(patch.after.description);
    assert.match(html, /<td[^>]*>Conspirator or horned<\/td><td[^>]*>Bludgeoning<\/td>/);
    assert.doesNotMatch(html, /Conspirator or horned<\/td><td[^>]*>.*?Poison/);
    assert.match(html, /<a\b[^>]*>dragonclaw scutcheon<\/a>/);
    assert.match(html, /<a\b[^>]*>dragontooth trophy<\/a>/);
    assert.match(html, /<a\b[^>]*>Fire<\/a>/);
    assert.match(html, /<a\b[^>]*>concentrate<\/a>/);
    assert.doesNotMatch(html, /<a\b[^>]*>Bludgeoning<\/a>/);
    const preservedLinks = patch.before.description
      .match(/\]\(link_[^)]+\)/g)
      .filter((link) => link !== '](link_trait_1476)');
    assert.deepEqual(patch.after.description.match(/\]\(link_[^)]+\)/g), preservedLinks);
  }
});

test('Major Fork grants its same three spells and uses +19 with DC29 through the actual casting engine', async () => {
  const patch = spec.patches.find((p) => p.id === 12325);
  const row = { ...patch.after, uuid: Number(patch.after.uuid) };
  assert.deepEqual(
    engine
      .detectSpellheartSpells(
        row.description,
        spells.map(({ row }) => row)
      )
      .map(({ spell, rank }) => [spell.id, rank]),
    [
      [6722, 0],
      [4742, 4],
      [8995, 4],
    ]
  );
  engine.resetVariables('CHARACTER');
  engine.setVariable('CHARACTER', 'LEVEL', 12);
  engine.setVariable('CHARACTER', 'SPELL_ATTACK', { value: 'U' });
  engine.setVariable('CHARACTER', 'SPELL_DC', { value: 'U' });
  engine.setVariable('CHARACTER', 'ATTRIBUTE_CHA', { value: 0, partial: false });
  engine.setVariable('CHARACTER', 'CASTING_SOURCES', []);
  const owner = { level: 12, spells: { slots: [], list: [], innate_casts: [] } };
  for (const { row: spell } of spells) {
    const stats = engine.getSpellheartStats(
      'CHARACTER',
      spell,
      'NONE',
      'ATTRIBUTE_CHA',
      row.meta_data.spellheart_casting,
      owner
    );
    assert.deepEqual(stats.spell_attack.total, [19, 14, 9]);
    assert.equal(stats.spell_dc.total, 29);
  }
  const beforeLinks = [...patch.before.description.matchAll(/\]\(link_[^)]+\)/g)].map((m) => m[0]);
  assert.deepEqual(
    [...row.description.matchAll(/\]\(link_[^)]+\)/g)].map((m) => m[0]),
    beforeLinks
  );
  assert.match(engine.renderRichText(row.description), /is \+19, and the spell DC is 29/);
});

test('repair guards pending proposals and complete rows before leaf-only catalog writes', () => {
  assert.match(migration, /lock table public\.content_update in share mode/i);
  assert.match(migration, /order by i\.id for update/i);
  assert.match(migration, /pending curator submission/i);
  assert.match(migration, /complete reviewed state/i);
  assert.match(migration, /set description = patch->'after'->>'description',/);
  assert.match(migration, /jsonb_set\(meta_data, '\{spellheart_casting,attack\}', '19'::jsonb, true\)/);
  assert.doesNotMatch(migration, /update public\.(character|encounter|content_update|content_source)\b/i);
  assert.doesNotMatch(release, /^\s*(do|update|insert|delete|alter|create|lock)\b/im);
});

test('corrected catalog values never overwrite saved Major Fork casting overrides or snapshots', () => {
  const patch = spec.patches.find((p) => p.id === 12325);
  const canonical = { ...structuredClone(patch.after), uuid: Number(patch.after.uuid) };
  const saved = { ...structuredClone(patch.before), uuid: Number(patch.before.uuid) };
  saved.description = 'Saved custom description';
  const original = structuredClone(saved);
  assert.deepEqual(engine.resolveSpellheartCasting(saved, canonical), { dc: 29 });
  assert.deepEqual(saved, original);
  saved.meta_data.spellheart_casting = { dc: 31, attack: 21 };
  assert.deepEqual(engine.resolveSpellheartCasting(saved, canonical), { dc: 31, attack: 21 });
  assert.equal(saved.description, 'Saved custom description');
  assert.deepEqual(canonical.meta_data.spellheart_casting, { dc: 29, attack: 19 });
});
