# Mobile Spells UI: audit and design brief

Status: two isolated layout prototypes are implemented following the September 8 audit.
Neither has been selected for production. Work stays on `codex/mobile-sheet-ui`; merging
requires explicit user approval.

The user rejected the broad mobile prototype because its layout and controls felt wrong.
The next pass is specifically about the Spells page. Do not reuse the earlier simplified
Oracle sample as proof that a new layout handles the full system.

## Reviewing the two designs

Run `npm --prefix frontend run prototype:mobile-sheet` and open
`http://127.0.0.1:5175/?view=spell-designs`. This is now the prototype's opening view.

- **Source sections:** one list of compact, genuinely collapsible source sections.
- **Source switcher:** a source selector plus rank navigation. Text search covers all sources
  and labels that scope explicitly; source identity remains visible in results.

Both use the same rows, resource behavior and sample data. The phone frames intentionally show
the Spells panel without the character identity card. The existing dark glass roles, artwork
and typeface provide context; this pass focuses on composition and controls. The earlier
current-UI capture remains reachable through Current spells.

Choose among ten scenarios: mixed sources, both prepared types, spontaneous, focus-only,
rituals-only, innate, magic items, long names/missing references, and empty. Both designs support
390px and 430px frames. The URL retains the scenario and design, for example
`/?view=spell-designs&scenario=mixed&design=switcher`.

Working sample interactions include per-preparation casting/recovery, source/rank slot pools,
a shared focus pool, cantrips without resource consumption, innate uses, staff charges,
independent wand uses, remaining-resource correction, and local spell selection. Preparation
and spellbook editing use full-width views instead of two narrow columns. Empty preparations
are summarized in the casting list but remain individually selectable in Prepare.

These interactions operate only on temporary React state. Reset samples, reload, or remounting
a design resets that instance. No character data, production operations or saving code is used.
The small spell catalog uses first-paragraph excerpts and metadata from the sanitized dump;
resource quantities and loadouts are illustrative, not validated complete characters. Staff
preparation, staff charge-plus-slot casting, wand overcharge, signature/heightening rules,
full tradition catalogs, and inventory editing remain outside these navigation prototypes.

The source-level defects below remain unfixed in production. A working filter in the isolated
mock does not constitute a fix to `SpellsPanel.tsx`.

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

The initial audit inspected the existing Oracle and prepared Wizard captures and audited all
eight list components and their management/casting flows. The local `/sheet/142809` reference
returned Private Character, so that audit did not use it as a live visual verification.

The new prototypes have their own manual browser checks:

```sh
npm --prefix frontend run cy:run -- --config-file src/pages/character_sheet/prototype/spell-design-check.config.mjs --browser electron
```

The scenario matrix renders ten loadouts in both designs at 390px and 430px, checks overflow,
and captures representative screens. Interaction checks exercise prepared duplicates, selecting
an empty slot, source switching, search across sources, variable-action filtering, stable pools,
cantrips, separate wands, staff exhaustion, resource correction, innate uses, and rituals without
a Cast button. Screenshots and logs live under the ignored `.scratch/mobile-sheet-ui/` directory.
These verify the isolated mock behavior, not the production casting engine or complete PF2e rules.

Verification on September 8: all eight browser scenarios passed, including the 40 rendered
design/scenario/width combinations. The project TypeScript check and scoped ESLint passed.
The standalone prototype build passed with the existing large-chunk warning for this separate
reference/study bundle. The desktop comparison, phone samples, and contained dialogs were also
visually inspected. A final primary-button color adjustment was checked in the rendered browser.
