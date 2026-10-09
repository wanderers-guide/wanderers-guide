import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { CONTENT_SCHEMAS } from './content-schemas.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migrationPath = '20261008190000_tech_core_general_spells.sql';
const migration = await readFile(new URL('../../supabase/migrations/' + migrationPath, import.meta.url), 'utf8');
const release = await readFile(new URL('../../supabase/release/tech-core-general-spells.sql', import.meta.url), 'utf8');
const parse = (sql) => {
  const parts = sql.split('$tech_core_general$');
  assert.equal(parts.length, 3, 'One complete reviewed spec literal');
  return JSON.parse(parts[1]);
};
const spec = parse(migration);
const expected = [
  ['Alchemical Shot', 1, 'TWO-ACTIONS', '148', '406-alchemical-shot'],
  ['Angelic Signal', 3, 'REACTION', '148', '407-angelic-signal'],
  ['Biomechanical Symbiosis', 2, 'TWO-ACTIONS', '148', '409-biomechanical-symbiosis'],
  ['Blinding Emoji', 5, 'TWO-ACTIONS', '148', '410-blinding-emoji'],
  ['Bolster Weapon', 2, 'TWO-ACTIONS', '148', '411-bolster-weapon'],
  ['Bombarding Emojis', 4, 'TWO-ACTIONS', '148', '412-bombarding-emojis'],
  ['Boot Loop', 7, 'TWO-ACTIONS', '149', '413-boot-loop'],
  ['Build Booster Ring', 4, 'TWO-ACTIONS', '149', '414-build-booster-ring'],
  ['Build Bulkhead Stronghold', 10, 'TWO-ACTIONS', '149', '415-build-bulkhead-stronghold'],
  ['Build Healing Station', 3, 'THREE-ACTIONS', '150', '416-build-healing-station'],
  ['Build Sentries', 3, 'ONE-TO-THREE-ACTIONS', '150', '417-build-sentries'],
  ['Build Shield Generator', 4, 'TWO-ACTIONS', '150', '418-build-shield-generator'],
  ['Burstmoji', 4, 'TWO-ACTIONS', '150', '419-burstmoji'],
  ['Cable Management', 4, 'TWO-ACTIONS', '150', '420-cable-management'],
  ['Censormoji', 3, 'REACTION', '150', '421-censormoji'],
  ['Circuit Trace', 2, 'TWO-ACTIONS', '150', '422-circuit-trace'],
  ['Comfortmoji', 1, 'TWO-ACTIONS', '151', '423-comfortmoji'],
  ['Corrupt Machine', 2, 'TWO-ACTIONS', '151', '425-corrupt-machine'],
  ['Cosmic Eddy', 5, 'TWO-ACTIONS', '151', '426-cosmic-eddy'],
  ['Cosmic Radiation Rods', 4, 'TWO-ACTIONS', '151', '427-cosmic-radiation-rods'],
  ['Crymoji', 1, 'TWO-ACTIONS', '151', '428-crymoji'],
  ['Dancemoji', 3, 'TWO-ACTIONS', '151', '429-dancemoji'],
  ['Divine Firewall', 8, 'TWO-ACTIONS', '152', '430-divine-firewall'],
  ['Divine Machine', 5, 'TWO-ACTIONS', '152', '431-divine-machine'],
  ['Emoji Armament', 3, 'TWO-ACTIONS', '152', '432-emoji-armament'],
  ['Emoji Shield', 2, 'TWO-ACTIONS', '152', '433-emoji-shield'],
  ['Emoji Spam', 4, 'TWO-ACTIONS', '152', '434-emoji-spam'],
  ['Emoji Spray', 1, 'TWO-ACTIONS', '153', '435-emoji-spray'],
  ['Emoji Tsunami', 7, 'THREE-ACTIONS', '153', '436-emoji-tsunami'],
  ['Exhale Toxins', 1, 'TWO-ACTIONS', '153', '438-exhale-toxins'],
  ['Explosive Recall', 6, 'TWO-ACTIONS', '153', '439-explosive-recall'],
  ['Flight of the Lightning Bees', 8, 'TWO-ACTIONS', '153', '440-flight-of-the-lightning-bees'],
  ['Ghostmoji', 4, 'TWO-ACTIONS', '153', '441-ghostmoji'],
  ['Holographic Stand-In', 4, 'TWO-ACTIONS', '154', '442-holographic-stand-in'],
  ['Hot Swap', 3, 'THREE-ACTIONS', '154', '443-hot-swap'],
  ['Infectious Virus', 4, 'TWO-ACTIONS', '154', '444-infectious-virus'],
  ['Infuse Ammo', 3, 'ONE-ACTION', '154', '445-infuse-ammo'],
  ['Instant Messaging', 3, 'TWO-ACTIONS', '155', '446-instant-messaging'],
  ['Judgment Cannon', 7, 'THREE-ACTIONS', '155', '447-judgment-cannon'],
  ['Junk Form', 6, 'TWO-ACTIONS', '155', '449-junk-form'],
  ['Junkify', 1, 'TWO-ACTIONS', '156', '454-junkify'],
  ['Kill Dash Nine', 9, 'TWO-ACTIONS', '156', '455-kill-dash-nine'],
  ['Light Shift', 4, 'TWO-ACTIONS', '157', '456-light-shift'],
  ['Mycorrhizal Supremacy', 9, 'TWO-ACTIONS', '157', '458-mycorrhizal-supremacy'],
  ['Nanite Snipe', 1, 'TWO-ACTIONS', '157', '459-nanite-snipe'],
  ['One with Junk', 3, 'TWO-ACTIONS', '157', '460-one-with-junk'],
  ['Optic Blast', 2, 'TWO-ACTIONS', '157', '461-optic-blast'],
  ['Optics Feed', 1, 'TWO-ACTIONS', '157', '462-optics-feed'],
  ['Paywall', 5, 'THREE-ACTIONS', '158', '463-paywall'],
  ['Positronic Helmet', 3, 'TWO-ACTIONS', '158', '464-positronic-helmet'],
  ['Prayermoji', 5, 'TWO-ACTIONS', '158', '465-prayermoji'],
  ['Read Memory', 1, 'TWO-ACTIONS', '158', '466-read-memory'],
  ['Reflective Paneling', 5, 'TWO-ACTIONS', '158', '467-reflective-paneling'],
  ['Reparative Nanites', 1, 'TWO-ACTIONS', '158', '468-reparative-nanites'],
  ['Rewire Flesh', 5, 'TWO-ACTIONS', '158', '469-rewire-flesh'],
  ['Robo-Fist', 2, 'ONE-ACTION', '159', '470-robo-fist'],
  ['Scrap Shell', 1, 'REACTION', '159', '471-scrap-shell'],
  ['Scrap Spray', 1, 'TWO-ACTIONS', '159', '472-scrap-spray'],
  ['Shield Wall', 6, 'THREE-ACTIONS', '159', '473-shield-wall'],
  ['Spark of the Spirit', 6, 'TWO-ACTIONS', '159', '474-spark-of-the-spirit'],
  ['Summon Drift Prophet', 5, 'THREE-ACTIONS', '159', '475-summon-drift-prophet'],
  ['Summon Giant Robot', 9, 'THREE-ACTIONS', '159', '476-summon-giant-robot'],
  ['Sure Tracking', 2, 'TWO-ACTIONS', '160', '477-sure-tracking'],
  ['Surveillance Vision', 4, '1 minute', '160', '478-surveillance-vision'],
  ['Technological Combustion', 5, 'TWO-ACTIONS', '160', '479-technological-combustion'],
  ['Technophobia', 5, 'TWO-ACTIONS', '160', '480-technophobia'],
  ['Transfer Consciousness', 8, 'THREE-ACTIONS', '160', '481-transfer-consciousness'],
  ['Turbulent Toys', 3, 'TWO-ACTIONS', '160', '482-turbulent-toys'],
  ['Upgrade Construct', 3, 'TWO-ACTIONS', '161', '483-upgrade-construct'],
  ['Wall of Coiling Lightning', 6, 'THREE-ACTIONS', '161', '484-wall-of-coiling-lightning'],
  ['Wall of Junk', 5, 'THREE-ACTIONS', '161', '485-wall-of-junk'],
  ['Wishborne Shot', 1, 'ONE-ACTION', '161', '486-wishborne-shot'],
  ['Cosmic Bombardment', 1, 'ONE-TO-THREE-ACTIONS', '181', '503-cosmic-bombardment'],
  ['Cosmic Cannon', 0, 'TWO-ACTIONS', '181', '504-cosmic-cannon'],
  ['Cosmic Fortification', 1, 'ONE-ACTION', '181', '505-cosmic-fortification'],
  ['Cosmic Repairs', 1, 'TWO-ACTIONS', '181', '506-cosmic-repairs'],
];
const at = (row, path) => path.reduce((value, key) => value[key], row);
const set = (row, path, value) => {
  path.slice(0, -1).reduce((node, key) => node[key], row)[path.at(-1)] = value;
};
const richFields = (row) => [
  ...['description', 'requirements', 'targets', 'trigger', 'cost', 'range', 'area', 'duration']
    .filter((key) => typeof row[key] === 'string' && row[key])
    .map((key) => ({ path: [key], text: row[key] })),
  ...row.heightened.text.map((entry, index) => ({
    path: ['heightened', 'text', String(index), 'text'],
    text: entry.text,
  })),
];
const fixtures = [];
const ids = new Map([...spec.prior_rows, ...spec.rows].map((row, index) => [row.uuid, 9700000 + index]));
let harness;

before(async () => {
  harness = await createOperationEngine({ renderRichText: true });
  fixtures.push(...structuredClone(spec.references));
  for (const proposed of [...spec.prior_rows, ...spec.rows]) {
    const row = { ...structuredClone(proposed), id: ids.get(proposed.uuid), created_at: '2026-10-08T19:00:00+00:00' };
    for (const binding of spec.bindings.filter((entry) => entry.owner_uuid === row.uuid)) {
      const text = at(row, binding.path);
      assert.equal(text.split('(' + binding.href + ')').length - 1, binding.occurrences);
      set(
        row,
        binding.path,
        text.replaceAll('(' + binding.href + ')', '(link_spell_' + ids.get(binding.target_uuid) + ')')
      );
    }
    fixtures.push({ table: 'spell', row });
  }
  harness.setFixtures(fixtures);
  harness.resetVariables('CHARACTER');
  harness.setVariable('CHARACTER', 'STARFINDER', true);
  harness.setVariable('CHARACTER', 'PATHFINDER', false);
});
after(async () => {
  await harness?.cleanup();
});
const spell = (name) =>
  fixtures.find(({ table, row }) => table === 'spell' && row.content_source_id === 900 && row.name === name).row;

test('the exact 76 reviewed general spells retain final ranks, costs, sources and citations', () => {
  assert.deepEqual(spec, parse(release));
  assert.equal(
    createHash('sha256').update(JSON.stringify(spec)).digest('hex'),
    '625934ee9794b965d104ce5bfd740ee65167cb462638ef60c75b02808981b6e1'
  );
  assert.equal(spec.rows.length, expected.length);
  assert.equal(expected.length, 76);
  assert.deepEqual(
    spec.rows.map((row) => row.name),
    expected.map(([name]) => name)
  );
  assert.equal(new Set(spec.rows.map((row) => row.uuid)).size, 76);
  assert.equal(new Set(spec.rows.map((row) => row.meta_data.source.url)).size, 76);
  for (const [name, rank, cast, page, slug] of expected) {
    const proposed = spec.rows.find((row) => row.name === name);
    assert.equal(proposed.rank, rank, name);
    assert.equal(proposed.cast, cast, name);
    assert.equal(proposed.uuid, uploadUtils.uniqueId(name, 'spell', rank, 900));
    assert.equal(proposed.content_source_id, 900);
    assert.deepEqual(proposed.meta_data.source, {
      book: 'Tech Core',
      page,
      url: 'https://2e.aonsrd.com/spells/' + slug,
    });
    assert.equal(proposed.meta_data.foundry.is_focus, false);
    assert.equal(Object.hasOwn(proposed, 'id'), false, 'Actual identities are allocated, never copied from a fixture');
    assert.equal(Object.hasOwn(proposed, 'created_at'), false);
    CONTENT_SCHEMAS.spell.parse(spell(name));
  }
  for (const name of ['Animate Armor', 'Conjure Junkrod', 'Junk Grenade', 'Junkbot', 'Junk Weapon']) {
    assert.equal(
      spec.rows.some((row) => row.name === name),
      false,
      name + ' remains outside this approved batch'
    );
  }
  const intro = awaitIntroLiteral;
  assert.deepEqual(spec.prior_rows, intro.rows);
  assert.equal(spec.bindings.length, 8);
  assert.equal(
    spec.bindings.reduce((sum, entry) => sum + entry.occurrences, 0),
    9
  );
  assert.deepEqual(
    spec.bindings.filter((entry) => entry.path[0] === 'heightened').map((entry) => entry.path),
    [['heightened', 'text', '0', 'text']]
  );
});

const awaitIntroLiteral = JSON.parse(
  (
    await readFile(
      new URL('../../supabase/migrations/20261008160000_tech_core_introductory_spells.sql', import.meta.url),
      'utf8'
    )
  ).split('$tech_core_spells$')[1]
);

test('all 265 authored occurrences use the actual helper and all 300 rich fields render without artifacts', () => {
  let links = 0;
  let fields = 0;
  for (const proposed of spec.rows) {
    const row = spell(proposed.name);
    for (const field of richFields(row)) {
      fields++;
      assert.doesNotMatch(field.text, /@@WGTCREF|@UUID|@Check|@Damage|\[\[|\{\{allocated:|link_condition_|—/);
      for (const match of field.text.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_([0-9]+)\)/g)) {
        const [, display, type, rawId] = match;
        const table = ['action', 'feat', 'class-feature', 'mode', 'heritage', 'sense'].includes(type)
          ? 'ability_block'
          : type.replaceAll('-', '_');
        const target = fixtures.find(
          (candidate) => candidate.table === table && candidate.row.id === Number(rawId)
        )?.row;
        assert.ok(target, proposed.name + ': exact guarded target exists');
        if (table === 'ability_block') assert.equal(target.type, type);
        assert.notEqual(target.content_source_id, 590, 'No playtest name-collision target');
        assert.equal(harness.convertToHardcodedLink(type, target.name, display), match[0]);
        if (type === 'spell')
          assert.ok(
            field.text.includes('_' + match[0] + '_') || field.text.includes('*' + match[0] + '*'),
            'Named spell reference remains italic'
          );
        links++;
      }
      assert.doesNotMatch(harness.renderRichText(field.text), /@@WGTCREF|@UUID|\[\[|\(link_|\{\{allocated:/);
    }
  }
  assert.equal(links, 265);
  assert.equal(fields, 300);
});

// Each entry pins an exact display, target identity, path and count, not a global noun scan.
const occurrences = [
  ['Build Sentries', ['description'], 'action', 'Hide', 'Hiding', 19726, 1, false],
  ['Build Sentries', ['description'], 'action', 'Sneak', 'Sneaking', 19850, 1, false],
  ['Emoji Shield', ['description'], 'trait', 'Light', 'light', 1517, 1, false],
  ['Judgment Cannon', ['description'], 'trait', 'Spirit', 'spirit', 1556, 1, false],
  ['Prayermoji', ['description'], 'trait', 'Spirit', 'spirit', 1556, 1, false],
  ['Prayermoji', ['heightened', 'text', '0', 'text'], 'trait', 'Spirit', 'spirit', 1556, 1, false],
  ['Blinding Emoji', ['description'], 'spell', 'Blinding Emoji', 'blinding emoji', null, 1, true],
  ['Emoji Spray', ['description'], 'spell', 'Emoji Spray', 'emoji spray', null, 2, true],
  ['Robo-Fist', ['description'], 'item', 'Fist', 'fist', 9252, 2, false],
  ['Surveillance Vision', ['description'], 'trait', 'Visual', 'visual', 1479, 0, false],
];
for (const [name, path, type, targetName, display, targetId, count, italic] of occurrences) {
  test(name + ': exact ' + display + ' occurrence regression at ' + path.join('.'), () => {
    const row = spell(name);
    const link = harness.convertToHardcodedLink(type, targetName, display);
    const id = targetId ?? spell(targetName).id;
    assert.equal(link, '[' + display + '](link_' + type + '_' + id + ')');
    const expectedText = italic ? '_' + link + '_' : link;
    const text = at(row, path);
    assert.equal(text.split(expectedText).length - 1, count);
    // Reconstruct the one reviewed omission/wrong-link mutant and require this same oracle to reject it.
    const mutant =
      count > 0
        ? text.replaceAll(expectedText, italic ? '_' + display + '_' : display)
        : text.replace('visual senses', link + ' senses');
    assert.notEqual(mutant, text);
    assert.notEqual(mutant.split(expectedText).length - 1, count);
    const html = harness.renderRichText(text);
    const labels = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]*>/g, ''));
    assert.equal(labels.filter((label) => label === display).length, count);
  });
}

test('ordinary light, force, body parts, physical damage and auto conditions keep their intended meaning', () => {
  assert.equal(spell('Emoji Shield').description.split('light').length - 1, 3);
  assert.equal(
    spell('Robo-Fist').description.split('fist').length - 1,
    6,
    'Four generic body-part references stay plain beside two named attack references'
  );
  assert.equal(spell('Robo-Fist').description.split('[fist]').length - 1, 2);
  assert.ok(spell('Judgment Cannon').description.includes('divine force'));
  assert.equal(spell('Judgment Cannon').description.includes('[force]'), false);
  assert.ok(spell('Alchemical Shot').description.includes('piercing damage'));
  assert.equal(spell('Alchemical Shot').description.includes('[piercing]'), false);
  assert.ok(spell('Light Shift').description.includes('occupied space'), 'Keep confirmed official wording');
  const emoji = harness.renderRichText(spell('Emoji Shield').description);
  for (const condition of ['dazzled', 'blinded']) assert.match(emoji, new RegExp('<a\\b[^>]*>' + condition + '<\\/a>'));
  assert.equal(spell('Emoji Shield').description.includes('link_condition_'), false);
});

test('all current complete dependencies and source headers remain exact, including null900 and false4506', async () => {
  assert.equal(spec.references.length, 92);
  assert.deepEqual(
    spec.sources.map((row) => row.id),
    [1, 3, 7, 15, 579, 793, 900]
  );
  assert.equal(spec.sources.find((row) => row.id === 900).required_content_sources, null);
  assert.equal(
    spec.references.find(({ table, row }) => table === 'trait' && row.id === 4506).row.meta_data.creature_trait,
    false
  );
  const current = await readContentRows([
    ...spec.references.map(({ table, row }) => ({ table, id: row.id })),
    ...spec.sources.map((row) => ({ table: 'content_source', id: row.id })),
  ]);
  const normalize = (row) => {
    const result = structuredClone(row);
    delete result.updated_at;
    delete result.search_tsv;
    if (result.uuid != null) result.uuid = Number(result.uuid);
    if (typeof result.created_at === 'string')
      result.created_at = result.created_at.replace(' ', 'T').replace(/([+-][0-9]{2})$/, '$1:00');
    return result;
  };
  for (const reference of spec.references) {
    const actual = current.find(({ table, row }) => table === reference.table && row.id === reference.row.id)?.row;
    assert.ok(actual);
    assert.deepEqual(normalize(actual), reference.row);
  }
  for (const source of spec.sources) {
    const actual = current.find(({ table, row }) => table === 'content_source' && row.id === source.id)?.row;
    assert.ok(actual);
    assert.deepEqual(Object.fromEntries(Object.keys(source).map((key) => [key, actual[key]])), source);
  }
  const requirements = JSON.parse(
    await readFile(new URL('../../supabase/release/requirements.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(requirements[migrationPath], { check: 'tech-core-general-spells.sql', order: 'before-functions' });
  const [before, , after] = migration.split('$tech_core_general$');
  assert.doesNotMatch(
    before + after,
    /\b(?:update\s+\S+\s+set|delete from|truncate|alter table|grant|revoke|security definer)\b/i
  );
  assert.match(migration, /if status\.aliases=76 and status\.exact_rows then return/);
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /Tech Core general spell readback differs/);
});
