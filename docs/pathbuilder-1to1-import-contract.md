# Pathbuilder 2e 1:1 Import Contract

## Scope

The Pathbuilder importer must reproduce the character represented by the share payload without silently dropping player choices. The raw share payload remains the authoritative editor-state input. json.php is enrichment only because shared builds can legitimately return 404/403.

## Required invariants

1. A required Pathbuilder selection with no matching Wanderer's Guide option is a hard import failure. It must never be downgraded to a warning.
2. Selection resolution is bounded and deterministic. A malformed or non-converging operation tree must fail before character creation.
3. Character creation happens only after all required selections are resolved.
4. Unresolved data is retained in import provenance and explicitly reported. Character creation success is separate from mechanical parity: a known AC discrepancy is a fatal parity failure; an uncertain armor reference remains a field-level warning; a required selection or other fatal integrity failure remains blocking.
5. Custom Files remain verbatim in provenance and are materialized as private WG content when needed.
6. The importer must preserve Pathbuilder weapon state needed for the imported sheet, including potency, striking, property runes, selected attack ability, and two-hand state.
7. Regression tests use captured real Pathbuilder payloads. Build 1597410 is the primary golden case and its PDF is the human-readable sheet oracle.

## Verification layers

- Wire: Pathbuilder share payload validates and unknown fields survive.
- Resolution: every payload choice is represented in the normalized build.
- Construction: WG operations converge to a fully populated Character without unresolved required selections.
- Mechanical parity: the operation engine's final values are compared to golden expected values where an independent Pathbuilder derived payload is unavailable.
- Online certification: when json.php is available, identity and mechanical parity checks run before creation. AC component or derived-total mismatches fail closed, so a stale or incomplete armor export cannot create a character with contradictory defenses.

## Golden build 1597410

The captured share payload is level 7 Kasane, Automaton / Hunter Automaton, Champion, with ancestry paragon and free archetype enabled. The checked-in PDF oracle records ability scores 18/14/16/10/12/16, HP 99, Speed 45, Perception +10, Fort +14, Ref +11, Will +12, Athletics +18, plus the listed attacks and focus/innate spell state. The later Defense-tab screenshot supplied for this same build shows AC 27 with the level-5 Reinforced Chassis, a +1 potency rune, and the Raiment property rune; the old PDF/derived fixture value of AC 24 must therefore be treated as a contradictory source value, not as proof that AC 27 is wrong.

When Pathbuilder omits `playerArmor.armorName`, do not infer that an Automaton is unarmored solely from the model default. If both Automaton ancestry and the selected Reinforced Chassis feat are recorded, reconstruct the appropriate chassis tier from character level and carry over the share's armor rune/potency state. If a unique worn JSON armor row provides a Resilient rune label, preserve its rank as a saving-throw rune; warn when a supplied label cannot be recognized. Armor rune fields absent from both payloads cannot be reconstructed reliably and must not be guessed. For other builds, orphaned rune/potency data does not create a free AC bonus or an invented armor item: preserve it in import provenance and emit a non-blocking warning. If the JSON target and the resulting WG AC differ, block character creation and report both values, their numerical difference, and the source evidence that explains—or fails to explain—the discrepancy. A reconstructed chassis whose derived AC matches the Pathbuilder export is accepted.

The real json.php?id=1597410 endpoint returned 404 during capture. The absence of derived data is therefore a tested and supported condition, not a reason to fabricate a derived fixture.

For this golden build, the Pathbuilder PDF reports 45-foot Speed: Automaton base 25, Hunter Automaton's displayed quadruped speed (+5), Fleet (+5), Blessed Swiftness (+5), and the Crimson Blade (+5). Wanderer's Guide's shared Hunter Automaton entry currently preserves the hands-free requirement as conditional explanatory text but contributes no numeric Speed. The importer therefore applies a character-scoped +5 base-speed adjustment (rather than a typed bonus) to mirror the Pathbuilder sheet total while preserving that original condition text. This compatibility adjustment is limited to characters whose selected heritage is Hunter Automaton; it does not modify the shared rules content.

## Editor-state and naming bridges

Some Pathbuilder mechanics only exist in share editor state or under names that differ from current WG content. These bridges are explicit and covered by tests:

- **Worn armor vs. shield:** json.php lists the equipped shield in the same `armor` array with `worn: true`. Shield rows (and the row matching `playerShieldNew.shieldName`) are excluded from worn-armor disambiguation; the shield is resolved separately.
- **Remastered names:** a central registry (`pathbuilder-aliases.ts`) maps legacy Pathbuilder names to current WG names for items, spells, feats, ancestries, heritages, and languages. It covers Paizo's Remaster renames and merges (for example Magic Missile → Force Barrage, Ifrit → Naari, Aasimar/Tiefling → Nephilim, Gnoll → Kholo, Abyssal → Chthonian, Thieves' Tools → Thieves' Toolkit). Exact WG names always win; aliases are consulted only when the source name is absent, and an alias that matches more than one record is treated as ambiguous and left unresolved.
- **Versatile heritages:** these are not part of the engine's ancestry-filtered heritage list, so the importer synthesizes the `versatile-heritage.heritage_id` block and reruns the engine before resolving the sibling ancestry feats that depend on the granted trait.
- **Selector wording aliases:** recorded prompts are matched to WG selector titles where only the wording differs (for example Pathbuilder "Select Thesis" and WG "Select a Thesis Topic").
- **Custom effect spell grants:** `effectType 10` carries the granted spell name in `proficiencyName`. It becomes a `giveSpell` operation when the spell resolves in WG content and the focus trait identifies a focus spell; an unresolvable grant remains a blocking unresolved-mechanics warning.

## Non-goals

This contract does not claim every future Pathbuilder rule or third-party custom effect is executable. Unsupported mechanical effects must remain explicitly represented and must block a certified 1:1 import when they affect calculated character state.
