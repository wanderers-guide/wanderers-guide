import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  buildCustomFileIndex,
  isPathbuilderUuid,
  parseCustomFileJson,
  parseFeatSlotKey,
  parseFeatValue,
  parsePathbuilderAbility,
  pathbuilderAbilityLabel,
  resolveBuild,
  stripCategoryPrefix,
} from '../src/process/import/pathbuilder/pathbuilder-resolve.ts';
import { PATHBUILDER_DERIVED_ENDPOINT, extractBuildId, fetchPathbuilderDerived, fetchPathbuilderShare } from '../src/process/import/pathbuilder/fetch-pathbuilder-share.ts';
import {
  findFreeArchetypeBranch,
  getAbilityBoostOriginForPath,
  inferPathbuilderAncestryFeatLevel,
  inferPathbuilderOperationLevel,
} from '../src/process/import/pathbuilder/pathbuilder-selection-routing.ts';
import { PathbuilderShareBuildSchema } from '../src/schemas/pathbuilder.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, 'fixtures', 'pathbuilder-kasane-1596127.json'), 'utf8'));

/**
 * Build 1596127 ("Kasane") is the regression case for the whole importer: it is
 * a level 20 Automaton Champion carrying two custom weapons, one active custom
 * buff, a container hierarchy, and an armor entry that cannot be resolved.
 * Everything below asserts against that captured payload.
 */
const resolved = resolveBuild(fixture.build, {
  buildId: fixture.build_id,
  formatVersion: fixture.format_version,
});

test('the captured v121 share payload passes the wire schema and fetch parser', async () => {
  const parsed = PathbuilderShareBuildSchema.safeParse(fixture.build);
  assert.equal(parsed.success, true);

  const stringTyped = structuredClone(fixture.build);
  stringTyped.listCustomFiles[0].type = '1';

  const reparsed = PathbuilderShareBuildSchema.safeParse(stringTyped);
  assert.equal(reparsed.success, true);

  // The type discriminator is opaque and has drifted between Pathbuilder
  // payloads. Preserve unexpected scalar/object values instead of rejecting
  // the entire share before we can resolve the actual Custom File JSON.
  const driftedType = structuredClone(fixture.build);
  driftedType.listCustomFiles[2].type = { kind: 'custom-content' };
  const driftedParsed = PathbuilderShareBuildSchema.safeParse(driftedType);
  assert.equal(driftedParsed.success, true);

  const response = new Response(
    JSON.stringify({
      success: true,
      version: '121',
      build: JSON.stringify(stringTyped),
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );

  const fetched = await fetchPathbuilderShare('1596127', {
    fetchImpl: async () => response,
  });

  assert.equal(fetched.ok, true);
  if (fetched.ok) {
    assert.equal(fetched.formatVersion, '121');
    assert.equal(fetched.build.listCustomFiles?.[0]?.type, 1);
  }
});

test('official JSON export is fetched only by the separately supplied export ID', async () => {
  const calculated = {
    name: 'Kasane',
    class: 'Champion',
    level: 7,
    abilities: { str: 19 },
  };
  let requestedUrl = '';

  const fetched = await fetchPathbuilderDerived('476951', {
    fetchImpl: async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ success: true, build: calculated }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(requestedUrl, `${PATHBUILDER_DERIVED_ENDPOINT}?id=476951`);
  assert.deepEqual(fetched, calculated);
});

test('share payload restores the selected heritage and devotion spell without manual choices', () => {
  // Pathbuilder v121 omits characterData.heritage in this captured share, but
  // records "Heritage Feat" and the Champion devotion-spell special selection.
  assert.equal(resolved.identity.name, 'Kasane');
  assert.equal(resolved.identity.level, 20);
  assert.equal(resolved.identity.ancestry, 'Automaton');
  assert.equal(resolved.identity.heritage, 'Hunter Automaton');
  assert.equal(resolved.identity.className, 'Champion');
  assert.equal(resolved.identity.gender, 'Female?');
  assert.equal(resolved.buildId, '1596127');
  assert.equal(resolved.formatVersion, '121');
  assert.ok(
    resolved.specialSelections.some(
      (choice) =>
        choice.slot === 'Devotion Spells' &&
        choice.prompt === 'Select Initial Devotion Spell' &&
        choice.value === 'Lay on Hands'
    ),
    'Lay on Hands must be retained from hashMapSpecialSelections'
  );
});

/** Verify compact Pathbuilder ability tokens match the labels emitted by WG attribute selectors. */
test('level-1 class boosts and free-archetype branches route to native WG operations', () => {
  assert.equal(getAbilityBoostOriginForPath('class_abc'), 'levelled');
  assert.equal(getAbilityBoostOriginForPath('class-feature-123'), 'levelled');
  assert.equal(getAbilityBoostOriginForPath('ancestry_abc'), 'ancestry');
  assert.equal(getAbilityBoostOriginForPath('background_abc'), 'background');

  assert.equal(
    inferPathbuilderOperationLevel(
      'class-feature-1110485945182216_9594307d-b111-437f-a55a-de101e8d46b1-2_a525eb70-e18f-4a95-80d9-29f6aaee0d3e-2_1c575456-4cb7-44eb-a153-9d6884b272a8-2',
      1
    ),
    2,
    'a nested class-feature path must recover the explicit feat level instead of trusting the enclosing level-1 result'
  );
  assert.equal(
    inferPathbuilderOperationLevel('class_7ed73bc5-6a92-497c-8fc9-2a6dc408f40b', 1),
    1,
    'paths without an explicit level suffix must preserve the operation engine level'
  );
  assert.equal(
    inferPathbuilderOperationLevel('class_720d2fe6-f042-4353-8313-1293375b1301-2', 1),
    1,
    'the class skill-training selector suffix is an index, not a character level'
  );
  assert.equal(
    inferPathbuilderOperationLevel('ancestry_957ee14b-c6dc-44eb-881b-e99a1b4e5118-3', 1),
    1,
    'the ancestry language selector suffix is an index, not a character level'
  );
  assert.equal(
    inferPathbuilderOperationLevel('class-feature-123_7be7c32a-5d54-4d20-8cda-3e4c7a0a0ba6-3', 17),
    17,
    'the apex attribute selector suffix is an index, not a character level'
  );

  assert.equal(
    inferPathbuilderAncestryFeatLevel('9f26290c-a2db-4c45-9b34-5053e60c106d-0', true),
    1
  );
  assert.equal(
    inferPathbuilderAncestryFeatLevel('9f26290c-a2db-4c45-9b34-5053e60c106d-1', true),
    1
  );
  assert.equal(
    inferPathbuilderAncestryFeatLevel('9f26290c-a2db-4c45-9b34-5053e60c106d-2', true),
    3
  );
  assert.equal(
    inferPathbuilderAncestryFeatLevel('9f26290c-a2db-4c45-9b34-5053e60c106d-4', true),
    7
  );
  assert.equal(
    inferPathbuilderAncestryFeatLevel('9f26290c-a2db-4c45-9b34-5053e60c106d-4', false),
    17
  );
  assert.equal(
    inferPathbuilderAncestryFeatLevel('3fd6a268-771b-49fc-93ed-9b53695d1a29', true),
    undefined,
    'non-feat ancestry selectors do not encode a slot index'
  );
  assert.equal(
    inferPathbuilderOperationLevel(
      'ancestry-section-4419086668321027_9f26290c-a2db-4c45-9b34-5053e60c106d-4',
      1
    ),
    1,
    'the generic level resolver must not treat an ancestry slot index as a character level'
  );

  const dedication = findFreeArchetypeBranch(
    [
      { title: 'Add Archetype Feat', _select_uuid: 'feat' },
      { title: 'Add Dedication', _select_uuid: 'dedication' },
    ],
    [{ name: 'Rogue Dedication', level: 4 }],
    4
  );
  assert.equal(dedication?._select_uuid, 'dedication');

  const archetypeFeat = findFreeArchetypeBranch(
    [
      { title: 'Add Archetype Feat', _select_uuid: 'feat' },
      { title: 'Add Dedication', _select_uuid: 'dedication' },
    ],
    [{ name: 'Dismantle Spell', level: 6 }],
    6
  );
  assert.equal(archetypeFeat?._select_uuid, 'feat');
});

test('Pathbuilder ability tokens map to native WG attribute labels', () => {
  const labels = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };

  for (const [ability, label] of Object.entries(labels)) {
    assert.equal(pathbuilderAbilityLabel(ability), label);
    assert.equal(parsePathbuilderAbility(ability), ability);
  }
});

/** Unsupported explicit key ability tokens are distinct from omitted key abilities. */
test('invalid explicit key ability tokens are reported as unresolved', () => {
  const fromShare = resolveBuild({
    characterData: {
      characterName: 'Invalid key ability fixture',
      className: 'Wizard',
      keyability: 'intelligence',
    },
  });
  assert.deepEqual(fromShare.unresolved, [
    {
      kind: 'variant',
      ref: 'characterData.keyability',
      reason: 'Unsupported Pathbuilder key ability token "intelligence"',
    },
  ]);

  const fromDerived = resolveBuild(
    { characterData: { characterName: 'Invalid derived fixture', className: 'Wizard' } },
    { derived: { keyability: 'mystery' } }
  );
  assert.deepEqual(fromDerived.unresolved, [
    {
      kind: 'variant',
      ref: 'derived.keyability',
      reason: 'Unsupported Pathbuilder key ability token "mystery"',
    },
  ]);

  const omitted = resolveBuild({
    characterData: { characterName: 'Missing key ability fixture', className: 'Wizard' },
  });
  assert.deepEqual(omitted.unresolved, []);
});

/** Invalid indexes must be visible to the strict importer rather than being silently dropped. */
test('invalid ability indexes are reported instead of silently disappearing', () => {
  const invalid = resolveBuild({
    characterData: {
      characterName: 'Invalid boost fixture',
      characterLevel: 2,
      keyability: 'str',
      hashMapAbilityBoosts: { '1': [0, 6] },
      hashMapAncestryFreeBoostSelections: { '0': -1 },
      backgroundBoostLimitedSelection: 6,
      getBackgroundBoostFreeSelection: 2,
      listPlayerWeapons: [{ weaponName: 'Longsword', attackAbilityRef: 6 }],
    },
  });

  assert.deepEqual(
    invalid.abilityBoosts.map(({ ability, origin }) => ({ ability, origin })),
    [
      { ability: 'str', origin: 'levelled' },
      { ability: 'con', origin: 'background' },
    ]
  );
  const expectedUnresolved = [
    {
      ref: 'hashMapAbilityBoosts[1]',
      reason: 'Pathbuilder ability index 6 is outside the supported range 0..5',
    },
    {
      ref: 'hashMapAncestryFreeBoostSelections[0]',
      reason: 'Pathbuilder ability index -1 is outside the supported range 0..5',
    },
    {
      ref: 'backgroundBoostLimitedSelection',
      reason: 'Pathbuilder ability index 6 is outside the supported range 0..5',
    },
    {
      ref: 'listPlayerWeapons[0].attackAbilityRef',
      reason: 'Pathbuilder ability index 6 is outside the supported range 0..5',
    },
  ].sort((a, b) => a.ref.localeCompare(b.ref));
  assert.deepEqual(
    invalid.unresolved
      .map(({ ref, reason }) => ({ ref, reason }))
      .sort((a, b) => a.ref.localeCompare(b.ref)),
    expectedUnresolved
  );
});

/** Verify the full imported boost set for Arsene can be represented by native WG selectors. */
test('Arsene ability boosts retain every Pathbuilder choice', () => {
  const arsene = resolveBuild(
    {
      characterData: {
        characterName: 'Arsene (Reset)',
        characterLevel: 7,
        ancestry: 'Fleshwarp',
        heritage: 'Ifrit',
        className: 'Wizard',
        background: 'Criminal',
        keyability: 'int',
        hashMapAncestryFreeBoostSelections: { '0': 3 },
        backgroundBoostLimitedSelection: 3,
        getBackgroundBoostFreeSelection: 1,
        hashMapAbilityBoosts: {
          '1': [1, 2, 3, 5],
          '2': [1],
          '3': [4],
          '4': [2],
          '5': [3],
          '7': [3],
        },
      },
    },
    { buildId: '1596127' }
  );

  assert.equal(arsene.identity.keyAbility, 'int');
  assert.deepEqual(
    Object.fromEntries(
      ['levelled', 'ancestry', 'background'].map((origin) => [
        origin,
        arsene.abilityBoosts.filter((boost) => boost.origin === origin).map((boost) => boost.ability),
      ])
    ),
    {
      levelled: ['dex', 'con', 'int', 'cha', 'dex', 'wis', 'con', 'int', 'int'],
      ancestry: ['int'],
      background: ['int', 'dex'],
    }
  );
  assert.deepEqual(
    arsene.abilityBoosts.map(({ level }) => level),
    [1, 1, 1, 1, 1, 1, 1, 2, 3, 4, 5, 7],
    'resolved boosts remain ordered by level'
  );
});

/** Verify a derived-only key ability still reaches the native import representation. */
test('derived key ability is retained when share characterData does not contain it', () => {
  const resolvedFromDerived = resolveBuild(
    {
      characterData: {
        characterName: 'Wizard fixture',
        characterLevel: 7,
        className: 'Wizard',
      },
    },
    {
      buildId: '1',
      derived: { keyability: 'INT' },
    }
  );

  assert.equal(resolvedFromDerived.identity.keyAbility, 'int');
});

/** The share payload wins when both payload forms contain a key ability. */
test('share key ability takes precedence over derived key ability', () => {
  const resolvedFromBoth = resolveBuild(
    {
      characterData: {
        className: 'Wizard',
        keyability: 'dex',
      },
    },
    {
      derived: { keyability: 'int' },
    }
  );

  assert.equal(resolvedFromBoth.identity.keyAbility, 'dex');
});

test('the BACKGROUND_ prefix is stripped but nothing else is mangled', () => {
  assert.equal(resolved.identity.background, 'Bounty Hunter');
  assert.equal(stripCategoryPrefix('BACKGROUND_Bounty Hunter'), 'Bounty Hunter');
  assert.equal(stripCategoryPrefix('Bounty Hunter'), 'Bounty Hunter');
  assert.equal(stripCategoryPrefix(undefined), undefined);
});

test('level-1 ancestry/background boosts and trained-only skills are preserved', () => {
  assert.deepEqual(
    resolved.abilityBoosts
      .filter((boost) => boost.level === 1)
      .map((boost) => boost.ability),
    ['con', 'str', 'dex', 'cha', 'con', 'str', 'wis']
  );
  assert.deepEqual(resolved.trainedSkills, ['Athletics', 'Acrobatics', 'Stealth']);
});


test('Pathbuilder keeps languages and active custom effects in the resolved payload', () => {
  assert.deepEqual(resolved.languages, ['Common']);
  assert.equal(resolved.activeCustomBuffs.length, 1);
  assert.equal(resolved.activeCustomBuffs[0].name, 'ABP Spell Attack Bonus');
  assert.equal(resolved.activeCustomBuffs[0].stacks, 1);
  assert.equal(resolved.activeCustomBuffs[0].custom?.listCustomEffects?.[0]?.effectType, 8);
  assert.equal(resolved.activeCustomBuffs[0].custom?.listCustomEffects?.[0]?.bonusAmount, 1);
});

test('json.php-derived spellcaster data resolves spell source instead of reporting it as unmapped', () => {
  const build = structuredClone(fixture.build);
  build.characterData.hashMapPlayerSpells = {
    'Message&0&0': {
      spellList: 0,
      spellName: 'Message',
      heighten: 0,
    },
  };

  const derived = {
    spellCasters: [
      {
        name: 'Wizard',
        magicTradition: 'arcane',
        spellcastingType: 'prepared',
      },
    ],
  };

  const derivedResolved = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived,
  });

  assert.equal(derivedResolved.spells[0].source, 'Wizard');
  assert.equal(derivedResolved.spells[0].tradition, 'arcane');
  assert.equal(derivedResolved.unresolved.some((entry) => entry.kind === 'spell-source'), false);
});

test('json.php-derived armor data recovers an armor name missing from playerArmor', () => {
  const build = structuredClone(fixture.build);
  build.characterData.playerArmor = {
    potency: 1,
    listPropertyRunes: ['Raiment'],
    armorName: 'be5e11f6-4459-4080-9107-8145dd57014b',
  };

  const derivedResolved = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      armor: [{ name: 'Full Plate', pot: 1, res: 'greater resilient', worn: true }],
    },
  });

  assert.equal(derivedResolved.armor?.name, 'Full Plate');
  assert.equal(derivedResolved.armor?.raw, 'be5e11f6-4459-4080-9107-8145dd57014b');
  assert.equal(derivedResolved.armorPotency, 1);
  assert.equal(derivedResolved.armorResilience, 2);
  assert.equal(derivedResolved.armorRunes.includes('Raiment'), true);
  assert.equal(derivedResolved.unresolved.some((entry) => entry.kind === 'armor'), false);

  const noResilienceRune = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      armor: [{ name: 'Full Plate', res: 'None', worn: true }],
    },
  });
  assert.equal(noResilienceRune.armorResilience, 0);
  assert.equal(
    noResilienceRune.hints.some((hint) => /resilience rune .* could not be mapped/i.test(hint)),
    false,
    'a known empty resilience state must not produce a false warning'
  );
});

test('unresolved share armor UUID uses a uniquely identified worn Automaton chassis among multiple worn rows', () => {
  const build = structuredClone(fixture.build);
  build.characterData.playerArmor = {
    ...(build.characterData.playerArmor ?? {}),
    armorName: 'be5e11f6-4459-4080-9107-8145dd57014b',
    potency: 1,
    listPropertyRunes: ['Raiment'],
  };

  const recovered = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      ancestry: 'Automaton',
      level: 20,
      armor: [
        { name: 'Automaton Chassi (10th level)', worn: true, pot: 1, res: 'major resilient', runes: ['Raiment'] },
        { name: 'Clothing', worn: true },
      ],
    },
  });

  assert.equal(recovered.armor?.name, 'Automaton Chassi (10th level)');
  assert.equal(recovered.armor?.kind, 'standard');
  assert.equal(recovered.armor?.raw, 'be5e11f6-4459-4080-9107-8145dd57014b');
  assert.equal(recovered.armorPotency, 1);
  assert.equal(recovered.armorResilience, 3);
  assert.equal(recovered.unresolved.some((entry) => entry.kind === 'armor'), false);
  assert.ok(
    recovered.hints.some((hint) => /multiple armor rows as worn/i.test(hint)),
    'conflicting worn flags should remain visible even when the chassis row is identifiable'
  );
});

test('unresolved share armor UUID falls back to the chassis rule when JSON worn rows are ambiguous', () => {
  const build = structuredClone(fixture.build);
  build.characterData.characterLevel = 7;
  build.characterData.playerArmor = {
    ...(build.characterData.playerArmor ?? {}),
    armorName: 'be5e11f6-4459-4080-9107-8145dd57014b',
    potency: 1,
    listPropertyRunes: ['Raiment'],
  };

  const recovered = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      ancestry: 'Automaton',
      level: 7,
      armor: [
        { name: 'Clothing', worn: true },
        { name: 'Other unidentified armor', worn: true },
      ],
    },
  });

  assert.equal(recovered.armor?.name, 'Automaton Chassi (5th level)');
  assert.equal(recovered.armor?.kind, 'standard');
  assert.equal(recovered.armor?.raw.startsWith('inferred: Reinforced Chassis'), true);
  assert.equal(recovered.armorPotency, 1);
  assert.equal(recovered.unresolved.some((entry) => entry.kind === 'armor'), false);
  assert.ok(
    recovered.hints.some((hint) => /reconstructed the automaton reinforced chassis/i.test(hint)),
    'the selected ancestry feat should explain why the chassis was reconstructed'
  );
  assert.ok(
    recovered.hints.some((hint) => /multiple armor rows as worn/i.test(hint)),
    'contradictory JSON worn flags should still be reported'
  );
});

test('an explicit share armor name wins over contradictory multiple worn flags', () => {
  const build = structuredClone(fixture.build);
  build.characterData.playerArmor = {
    ...(build.characterData.playerArmor ?? {}),
    armorName: 'Full Plate',
    potency: 1,
    listPropertyRunes: [],
  };

  const recovered = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      ancestry: 'Automaton',
      armor: [
        { name: 'Full Plate', worn: true, pot: 1 },
        { name: 'Automaton Chassi (10th level)', worn: true, pot: 1 },
      ],
    },
  });

  assert.equal(recovered.armor?.name, 'Full Plate');
  assert.equal(recovered.armor?.raw, 'Full Plate');
  assert.equal(
    recovered.hints.some((hint) => /row matching the share armor identity "Full Plate" was used/i.test(hint)),
    true,
    'the share armor identity should explain the resolution choice'
  );
});

test('a uniquely worn JSON armor row replaces Pathbuilder’s placeholder Unarmored value', () => {
  const build = structuredClone(fixture.build);
  build.characterData.ancestry = 'Human';
  build.characterData.playerArmor = {
    ...(build.characterData.playerArmor ?? {}),
    armorName: 'Unarmored',
    potency: 1,
    listPropertyRunes: ['Raiment'],
  };
  for (const [slot, value] of Object.entries(build.characterData.hashMapFeatSelections ?? {})) {
    if (String(value).toLowerCase().includes('reinforced chassis')) {
      delete build.characterData.hashMapFeatSelections[slot];
    }
  }

  const recovered = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      ancestry: 'Human',
      armor: [{ name: 'Full Plate', worn: true, pot: 1 }],
    },
  });

  assert.equal(recovered.armor?.name, 'Full Plate');
  assert.equal(recovered.armor?.kind, 'standard');
  assert.equal(recovered.armorPotency, 1);
  assert.ok(
    recovered.hints.some((hint) => /share payload says Unarmored.*Full Plate/i.test(hint)),
    'the source disagreement should be recorded'
  );
});

test('ambiguous derived armor rows are not guessed as equipped armor', () => {
  const build = structuredClone(fixture.build);
  build.characterData.ancestry = 'Human';
  for (const [slot, value] of Object.entries(build.characterData.hashMapFeatSelections ?? {})) {
    if (String(value).toLowerCase().includes('reinforced chassis')) {
      delete build.characterData.hashMapFeatSelections[slot];
    }
  }

  const ambiguous = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      ancestry: 'Human',
      armor: [
        { name: 'Full Plate', worn: false },
        { name: 'Leather Armor' },
      ],
    },
  });

  assert.equal(ambiguous.armor, undefined);
  assert.ok(
    ambiguous.hints.some((hint) => /does not identify a unique worn item/i.test(hint)),
    'multiple armor candidates without a worn marker must be reported instead of guessed'
  );
});

test('rule variants map onto WG CharacterVariants keys', () => {
  assert.equal(resolved.variants.ancestry_paragon, true);
  assert.equal(resolved.variants.free_archetype, true);
  assert.equal(resolved.variants.gradual_attribute_boosts, true);
});

test('custom references, quantities, containers and runes are preserved', () => {
  assert.equal(resolved.weapons.length, 5);
  assert.equal(resolved.weapons[0].quantity, 4);
  assert.equal(resolved.weapons[3].kind, 'custom');
  assert.equal(resolved.weapons[3].name, 'Stinger');
  assert.equal(resolved.weapons[4].kind, 'custom');
  assert.equal(resolved.weapons[4].name, 'Crimson Blade');
  assert.deepEqual(resolved.weapons[4].runes, ['Wounding']);
  assert.equal(resolved.containers.length, 1);
  assert.equal(resolved.containers[0].name, 'Backpack');
  assert.equal(resolved.containers[0].items.find((item) => item.name === 'Chalk')?.quantity, 10);
  assert.equal(resolved.containers[0].items.find((item) => item.name === 'Rations')?.quantity, 2);
});

test('missing shared armor name is reconstructed from an Automaton Reinforced Chassis feat', () => {
  assert.equal(resolved.armor?.name, 'Automaton Chassi (10th level)');
  assert.equal(resolved.armor?.kind, 'standard');
  assert.equal(resolved.armorRunes.includes('Raiment'), true);
  assert.equal(resolved.armorPotency, 1);
  assert.equal(resolved.armorResilience, null, 'missing json.php data must not be converted to an assumed zero-rank rune');
  assert.equal(resolved.unresolved.some((entry) => entry.kind === 'armor'), false);
  assert.ok(
    resolved.hints.some((hint) => /did not provide a resilience rune rank/i.test(hint)),
    'missing resilience evidence must be reported explicitly'
  );
  assert.ok(
    resolved.hints.some((hint) => /reconstructed the automaton reinforced chassis/i.test(hint)),
    'the inferred armor must be recorded in import diagnostics'
  );
});

test('armor resilience is preserved from the share when the source actually provides it', () => {
  const basicResilientBuild = structuredClone(fixture.build);
  basicResilientBuild.characterData.playerArmor = {
    ...(basicResilientBuild.characterData.playerArmor ?? {}),
    res: 'resilient',
  };
  const basicResilient = resolveBuild(basicResilientBuild, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
  });
  assert.equal(basicResilient.armorResilience, 1, 'Resilient must map to rank 1');

  const majorResilientBuild = structuredClone(fixture.build);
  majorResilientBuild.characterData.playerArmor = {
    ...(majorResilientBuild.characterData.playerArmor ?? {}),
    res: 'major resilient',
  };
  const majorResilient = resolveBuild(majorResilientBuild, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
  });
  assert.equal(majorResilient.armorResilience, 3, 'Major Resilient must map to rank 3 from the share payload');

  const numericResilientBuild = structuredClone(fixture.build);
  numericResilientBuild.characterData.playerArmor = {
    ...(numericResilientBuild.characterData.playerArmor ?? {}),
    res: 2,
  };
  const numericResilient = resolveBuild(numericResilientBuild, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
  });
  assert.equal(numericResilient.armorResilience, 2, 'numeric resilience ranks must survive schema parsing');

  const unknownResilientBuild = structuredClone(fixture.build);
  unknownResilientBuild.characterData.playerArmor = {
    ...(unknownResilientBuild.characterData.playerArmor ?? {}),
    res: 'homebrew resilient tier',
  };
  const unknownResilient = resolveBuild(unknownResilientBuild, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
  });
  assert.equal(unknownResilient.armorResilience, null, 'unrecognized ranks must remain unknown, not guessed');
  assert.ok(
    unknownResilient.hints.some((hint) => /share resilience rune "homebrew resilient tier" could not be mapped/i.test(hint)),
    'unrecognized source data must be explicitly reported'
  );
});

test('armor rune state alone does not invent armor for an ordinary build', () => {
  const build = structuredClone(fixture.build);
  for (const [slot, value] of Object.entries(build.characterData.hashMapFeatSelections ?? {})) {
    if (String(value).toLowerCase().includes('reinforced chassis')) {
      delete build.characterData.hashMapFeatSelections[slot];
    }
  }

  const withoutChassis = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
  });

  assert.equal(withoutChassis.armor, undefined);
  assert.equal(withoutChassis.armorRunes.includes('Raiment'), true);
  assert.equal(withoutChassis.armorPotency, 1);
  assert.equal(withoutChassis.unresolved.some((entry) => entry.kind === 'armor'), false);
  assert.ok(
    withoutChassis.hints.some((hint) => /preserving the default unarmored state/i.test(hint)),
    'ordinary characters must retain ambiguous rune state without fabricated armor'
  );
});

test('build id extraction accepts ids/URLs and rejects arbitrary text', () => {
  assert.equal(extractBuildId('1596127'), '1596127');
  assert.equal(extractBuildId('https://pathbuilder2e.com/app.html?emailedBuildID=1596127'), '1596127');
  assert.equal(extractBuildId('https://pathbuilder2e.com/app.html?id=1596127'), '1596127');
  assert.equal(extractBuildId('not-a-build-abc'), null);
  assert.equal(extractBuildId('build 1596127 please'), null);
  assert.equal(extractBuildId(-1), null);
  assert.equal(extractBuildId(1596127.5), null);
});

test('custom item schema preserves generic Custom Pack fields', () => {
  const entry = {
    type: 5,
    uniqueIdentifier: '00000000-0000-0000-0000-000000000001',
    json: JSON.stringify({
      uniqueIdentifier: '00000000-0000-0000-0000-000000000001',
      name: 'Gloves of Combustion',
      bulk: 'L',
      traits: 'Fire, Staff, 3rd Party, Invested, Unique',
      category: 8,
      itemLevel: 9,
    }),
  };

  const parsed = parseCustomFileJson(entry);
  assert.equal(parsed?.name, 'Gloves of Combustion');
  assert.equal(parsed?.bulk, 'L');
  assert.equal(parsed?.traits, 'Fire, Staff, 3rd Party, Invested, Unique');
  assert.equal(parsed?.category, 8);
});

test('custom file index accepts Pathbuilder uniqueIdentifier misspellings', () => {
  const index = buildCustomFileIndex(fixture.build.listCustomFiles);
  assert.equal(index.size, 3);
  assert.equal(index.get('aed7ec78-7487-4428-80f6-8f4334f7dce7')?.name, 'Stinger');
  assert.equal(index.get('de586c2c-938e-413e-b3e9-38ed676b83b7')?.name, 'Crimson Blade');
});
/** json.php lists the equipped shield as a second worn "armor" row; it must not hide the real armor. */
test('a worn shield row does not make non-chassis armor ambiguous', () => {
  const build = structuredClone(fixture.build);
  build.characterData.ancestry = 'Human';
  for (const [slot, value] of Object.entries(build.characterData.hashMapFeatSelections ?? {})) {
    if (String(value).toLowerCase().includes('reinforced chassis')) {
      delete build.characterData.hashMapFeatSelections[slot];
    }
  }
  build.characterData.playerArmor = { armorName: 'be5e11f6-4459-4080-9107-8145dd57014b', potency: 1 };
  build.characterData.playerShieldNew = { shieldName: 'Cold Iron Buckler (Low-Grade)', shieldDamage: 0 };

  const resolvedWithShieldRow = resolveBuild(build, {
    buildId: fixture.build_id,
    formatVersion: fixture.format_version,
    derived: {
      armor: [
        { name: 'Full Plate', prof: 'heavy', worn: true, pot: 1 },
        { name: 'Cold Iron Buckler (Low-Grade)', prof: 'shield', worn: true },
      ],
    },
  });

  assert.equal(resolvedWithShieldRow.armor?.name, 'Full Plate');
  assert.equal(
    resolvedWithShieldRow.hints.some((hint) => /multiple armor rows as worn/i.test(hint)),
    false
  );
});
