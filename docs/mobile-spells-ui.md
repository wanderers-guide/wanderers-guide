# Mobile Spells UI: audit and design brief

Status: the latest review pairs three inspected Mobbin references with limited arrangement
sketches. The casting-model mock still compares prepared and spontaneous casting side by side,
with dedicated layouts for every currently supported spell source and its item states.
The user rejected the earlier September 8 layout studies as clunky. Those remain review
references, not proposed production designs. Work stays on `codex/mobile-sheet-ui`; merging
requires explicit user approval.

The user rejected the broad mobile prototype because its layout and controls felt wrong.
The next pass is specifically about the Spells page. Do not reuse the earlier simplified
Oracle sample as proof that a new layout handles the full system.

## Feedback on the Spells studies

The user described the whole comparison as "kind of clunky" and did not like it. Do not
treat passing interaction checks as design approval or keep polishing these structures as
though either was selected.

Rendered review suggests two contributors: source sections spend substantial vertical space
on metadata and rank headings around small groups, while the switcher stacks source, search
and rank controls before the spell list. These are the agent's diagnosis, not yet the user's
confirmed reasons. The user's next instruction was to retry with three rough arrangements
using shapes and placement ideas before building the actual UI.

The proposed next direction keeps the earlier smoked material preference and puts spell
names first: quieter grouping, less persistent management UI, and compact rows with readable
resource counts and comfortable touch targets. Source identity and separate resources still
need to remain clear. A replacement composition has not been selected.

## Latest review: Mobbin references

On September 9, the user requested Mobbin setup and real UI examples before revisiting the
design. The global Codex Mobbin MCP configuration was added and OAuth reported success.
Its tools were not exposed to the running task, so reference research used Mobbin's public
Explore pages through the browser. No authenticated MCP search was performed in this pass.

Open `http://127.0.0.1:5175/?view=spell-references&pattern=browse`, now the default preview.
Three review tabs pair actual hosted screenshots with observations and our static sketches:

- [Ultrahuman: Breathing Protocols](https://mobbin.com/explore/screens/b7af4af8-5458-485c-887a-bd81ecbbfe01):
  repeated rows and restrained dividers. The suggested spell list keeps readable secondary text
  and omits decorative thumbnails. Switch Prepared/Spontaneous to compare resource placement.
- [Saturn Calendar: Class List](https://mobbin.com/explore/screens/e9572bcf-347b-4fd3-8680-eda6f59cb547):
  filled and empty positions in one editor. Our sketch retains duplicate preparations, slot
  identity and restrictions. The play-list sketch summarizes empty preparations per rank.
- [Target: Item List](https://mobbin.com/explore/screens/3f313f42-170f-4c42-b55b-cd84610db824):
  a contained sheet with a clear bottom action. Our staff sketch reserves description space,
  payment choices and an explicit cost alongside Cast. This is not a batch-casting proposal.

Also inspected [Origin: Updated Overview](https://mobbin.com/explore/screens/413f86df-ddd9-4956-8dfa-515256bd949d).
Its per-category amounts illustrate resource ownership, but the large gauge and nested cards
would consume too much of this spell list. It was not selected for the board.

These are design inferences from screenshots, not measured usability findings or an approved
composition. The board uses existing casting fixtures; search, rows, slot fields and Cast
are static placement shapes. Only the reference tabs, model toggle and links are interactive.
The complete interactive model study remains accessible through All casting models.
Mobbin images remain remotely hosted with attribution and source links; they are not copied
into the repo. A fallback link remains available if a hosted image cannot load.

Verification: three reference tabs and the casting-model toggle were exercised; all three
reference images loaded. Desktop and 390px screenshots were inspected without horizontal
overflow. TypeScript, scoped ESLint and the isolated prototype build passed. Production UI,
casting, saves and deployment remain unchanged; this branch still requires merge approval.

## Earlier review: casting models and items

The user agreed that prepared and spontaneous casting should share a visual language while
placing resources differently. This is a per-source distinction, not a character-wide mode.
They requested expanded mocks for both and the remaining spell and item surfaces.

Open `http://127.0.0.1:5175/?view=spell-models&group=casting`.
The Compare control selects prepared/spontaneous, preparation types, focus/innate/rituals,
staves/wands/spellhearts, mixed sources, empty/exhausted/missing states, or item readiness/damage.

- Prepared entries show individual Ready/Used states and distinct empty/restricted slots.
  Prepare opens a full-width slot editor. Spellbook access appears only for the book variant.
- Spontaneous entries use one counter per source/rank. The signature example offers casting
  ranks in the detail view. Repertoire management has its own location.
- Focus spells share a single pool while retaining their origins. Cantrips do not consume it.
- Innate activations show their own frequency. Ritual details reserve space for requirements
  and participants without an ordinary spell-slot Cast control.
- Staves have preparation state, one charge pool and per-spell charge costs. Preparation
  reserves the optional prepared-slot sacrifice; it is disabled after preparation in the sample.
  Spontaneous casting offers charges alone or one charge plus a named eligible source/slot.
- Wands retain item identity, rank, daily use and overcharge history. Used wands lead through
  confirmation and outcome sketches. Broken, destroyed and already-overcharged items cannot
  use the ordinary casting control, including a repaired wand already overcharged that day.
- Spellheart sketches show attachment, a repeatable cantrip, and independent daily activations.
  Broken and unaffixed states disable casting. This multi-activation layout is proposed behavior;
  the production spellheart renderer currently handles only the first detected spell.

All cases reuse the previous phone frame, modal containment, sample catalog and source types.
The new source rows and dialogs are specific to these casting-model wireframes. The generic
page Manage button is absent when source-specific controls already provide those paths.

Quantities, source builds and item spell combinations are illustrative, not complete legal
characters or canonical item records. Search, rank/payment selection, and preparation fields
are interactive local drafts. Cast, recovery, resource correction and Done end a preview path
without spending resources, writing saves or invoking production operations. Restriction
eligibility, full spell catalogs, specialty-item effects and all heightening exceptions are
not implemented by this mock. Scrolls remain outside the existing Spells panel source types.

The item state sketches were checked against [staff rules](https://2e.aonprd.com/Rules.aspx?ID=3211),
[wand rules](https://2e.aonprd.com/Rules.aspx?ID=3218),
[spellheart rules](https://2e.aonprd.com/Rules.aspx?ID=1510), and the independent activations
in a [major five-feather wreath](https://2e.aonprd.com/Equipment.aspx?ID=5152).

Verification: all seven comparison boards rendered without horizontal overflow in the
inspected phone frames (roughly 344px to 390px). Browser interactions covered preparation,
resource correction, signature rank selection, spontaneous staff payment, overcharge outcomes,
zero-charge cantrip casting, broken-item blocking and mixed-source search. TypeScript, scoped
ESLint, the standalone prototype build and docs link checks passed. The existing prototype
bundle-size warning and unrelated docs OpenAPI warning remain. These checks validate the mock,
not the production rules engine.

## Earlier review: three rough wireframes

Open `http://127.0.0.1:5175/?view=spell-wireframes&scenario=mixed&layout=all`.
This earlier board remains a reference. Its review controls can
isolate A, B, or C and switch the sample character.

- **A. One spell list:** rank groups contain spells from all sources, with source identity in
  each row. A spell opens the detail/casting area at the bottom of the phone.
- **B. Resources first:** prepared slots appear as individual boxes. Spontaneous rank pools,
  focus pools and items open their own spell choices. Empty slots open the preparation area.
- **C. Quick spells:** a small set of pinned spells occupies the initial screen. All spells
  opens the full list, where individual entries can be pinned or unpinned.

These intentionally use neutral outlines, labeled rectangles and description placeholders.
The character header and sheet navigation are reserved space. Manage and Resources reveal
placement diagrams, not implemented editors. Cast and Done only finish a preview path and
update an explanatory note outside the phone; quantities never change. Pins and search are
temporary local state. This is not a visual treatment proposal or another rules simulation.

The diagrams reuse the earlier ten sample loadouts and their resource helpers, preserving
separate prepared slots and item copies. No production UI or casting code is involved.

The wireframes passed TypeScript, scoped ESLint and the standalone prototype build. Browser
inspection covered mixed-source layouts at 344px, a 390px detail panel, long homebrew names,
prepared slot and preparation paths, focus and spontaneous pool selection, and pinning a spell
from the full list. These are diagram and navigation checks, not casting-engine tests.

## Earlier review: the two styled designs

Run `npm --prefix frontend run prototype:mobile-sheet` and open
`http://127.0.0.1:5175/?view=spell-designs`. These are the rejected styled references.

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
