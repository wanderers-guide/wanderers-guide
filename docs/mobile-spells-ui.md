# Mobile Spells UI: audit and design brief

Status: inspected and mapped on September 8, 2026. No replacement layout has been selected
or implemented. Work stays on `codex/mobile-sheet-ui`; merging requires explicit user approval.

The user rejected the broad mobile prototype because its layout and controls felt wrong.
The next pass is specifically about the Spells page. Do not reuse the earlier simplified
Oracle sample as proof that a new layout handles the full system.

## What the page needs to support

| Case | Meaning of the displayed rows and controls |
| --- | --- |
| Prepared from a spellbook | Individual prepared slots, including duplicates and empty slots. Spellbook editing and daily preparation are distinct jobs. |
| Prepared from a tradition | Individual slots, with selection from the tradition instead of a private known-spell list. |
| Spontaneous | Repertoire entries at learned ranks, with a shared slot pool for each source and rank. |
| Focus only or mixed | Source-specific spells and casting stats, but one character-wide focus pool. Focus cantrips are separate from point-consuming spells. |
| Innate | Per-spell uses, rank and tradition, including unlimited-use entries. |
| Rituals only or mixed | Reference and list management, without ordinary casting resources. |
| Staves | Separate item identity and charge pool for each equipped staff. Preparation and charge/slot choices are additional flows. |
| Wands | Per-item uses, broken state and overcharge flow. Duplicate wands must retain independent resources. |
| Spellhearts | Separate item identity and item-granted spells. The present implementation only displays the first detected spell and does not implement resource tracking. |
| Mixed sources | Sources can use different attributes and traditions. A shared spell name or ID does not imply a shared rank, pool or item. |

The actual editor exposes `PREPARED-LIST`, `PREPARED-TRADITION`,
`SPONTANEOUS-REPERTOIRE`, and sources with no ordinary casting type. These are implemented
through eight list components under `frontend/src/pages/character_sheet/panels/spells_list/`.

## Findings

The existing 390px Oracle capture visibly truncates the search placeholder because the action
filters consume the same row. The prepared Wizard integration capture shows six unprepared
cantrip rows ahead of the first prepared ranked spell. Empty slots are meaningful, but repeating
large empty rows makes it harder to reach spells during play.

Source review adds these issues:

- **Management on mobile:** `ManageSpellsModal` uses two fixed half-width columns for the
  spellbook/preparation variant. Each column has its own scrolling area.
- **Competing header controls:** source titles, Manage buttons, focus counters, staff controls
  and accordion toggles share narrow headers. Nested interactive targets deserve attention.
- **Resource ambiguity:** `SpellSlotSelect.current` represents resources used, while innate
  and wand callers describe it as remaining casts. The numeric explanation appears in a hover
  card. The replacement should show an explicit remaining count on touch screens.
- **Repeated focus controls:** every focus source presents the same shared pool. A consolidated
  pool must preserve the different sources' casting stats.
- **Sparse and mixed characters:** a focus-only or rituals-only character should be simple;
  a mixed-source character should retain source identity without a long wall of competing controls.

There are also behavioral findings to retain independently of design preference:

1. `SpellsPanel.tsx` rejects every candidate inside `checkSpell` when the action filter is not
   `ALL`, before the final action-cost check. Executing the actual filter expression with two
   synthetic spells returned 2 results for All and 0 for both one-action and two-action filters,
   where each specific filter should return 1. This confirms the filter defect at the code-path
   level; it was not reproduced through the live production UI in this pass.
2. Repertoire rank expansion iterates all list entries without checking their source. A spell
   ID present in multiple casting sources can pick up another source's rank. This is a
   source-level finding requiring an integration reproduction.
3. Staff slot/charge updates include a delayed update, and spontaneous staff selection identifies
   rank without source. Exercise those choices with more than one casting source.
4. Cast drawers receive exhaustion state and callbacks when opened. Exercise changes made while
   a drawer is open and reopening the same spell at another rank.

No behavioral fixes were made as part of this audit.

## Candidate structures to compare

**Compact source sections:** retain one scrollable list, with restrained source headers and
compact spell rows. Put resource counts beside their source/rank or item. Make search usable
across sources and preserve source labels in results. This is the more familiar starting point.

**One source at a time:** use a source selector to show the chosen spell list, plus an explicit
All search view. This reduces visible complexity for mixed characters, but adds navigation
when switching between ordinary spells, focus spells and items during a turn.

Both candidates should distinguish the casting view from preparation and spellbook/repertoire
editing. This is a proposed organization, not a decision to introduce a mandatory new tab or
hide controls. A spell row should remain compact and open its detail/casting interaction.
Empty preparations could be summarized per rank with a clear route to Prepare, while retaining
their exact number and any slot restrictions in the preparation view.

Use shared spell-row, source-header, search and rank presentation where appropriate. Resource
behavior must remain distinct: prepared slot identity, spontaneous source/rank pools, shared
focus points, innate uses, and per-item resources are separate inputs to those controls.

## Verification required for a replacement

Render both prepared types, spontaneous, focus-only, rituals-only, limited/unlimited innate,
each item path, and a mixed-source fixture at phone and desktop widths. Include duplicate
preparations, duplicate items, the same spell across sources and ranks, empty/exhausted states,
long homebrew names, missing references, and unmatched search. Filters must not alter resource
totals. Preparation and casting must affect exactly the intended slot, pool or item.

This pass inspected the existing Oracle and prepared Wizard captures and audited all eight
list components and their management/casting flows. The local `/sheet/142809` reference returned
Private Character, so it was not used as a live visual verification. The other modes were
mapped from source, not rendered as a complete scenario suite. No production characters were
changed, and no new design has been presented as validated.
