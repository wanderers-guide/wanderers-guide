# Mobile character sheet UI exploration

Status: the expanded layout and controls were rejected. The next focus is the real Spells
page and its casting variants. Two Spells layout prototypes are now available. Earlier
material concepts remain review references, not an approved redesign. Branch: `codex/mobile-sheet-ui`.

**Do not merge this branch until the user explicitly approves merging it.** Earlier
authorization to merge reliability fixes does not apply to this UI branch.

## Latest direction: focus on Spells

On September 8, the user rejected the expanded pass because **the layout and controls felt
wrong**. Do not interpret this as a request to keep increasing opacity, enlarge every row,
or apply the same layout across more panels. The earlier positive response to the Smoked
material did not approve the subsequent layout changes.

The next discussion starts from the actual Spells page. It must account for prepared and
spontaneous casters, focus-only and ritual-only characters, innate spells, staves, wands,
spellhearts, and combinations of those sources. See [the focused Spells audit](mobile-spells-ui.md)
for the interaction map, concrete findings, and the two implemented navigation prototypes.
Neither Spells layout has been selected for production.

## Current baseline

The branch starts from main commit `02940a970a9b7d46507834a7c11ad4edf4735351`, including
the completed mobile loading and quiet-save work. Production sheet styling and behavior
remain unchanged while the material concepts below are reviewed.

Run `npm --prefix frontend run prototype:mobile-sheet` and open
`http://127.0.0.1:5175`. The opening view is now the Spells designs. The earlier glass study
is available at `/?view=smoked`. Choose **Before / After** there for
matching screenshots, **Current UI** for the original navigation map, or **Compare all**
for the three material concepts. The prototype lives beside the actual sheet in
`frontend/src/pages/character_sheet/prototype/`. It is a separate Vite entry point,
not an application route or a production build input.

The prototype uses unaltered screenshots of the public character Kip (`/sheet/142809`)
at 390 and 430 CSS pixels wide, with an 844px viewport. Its grid and nested navigation
hotspots are clickable. Other controls are visual references, not simulated game logic.
The picker capture uses the overview as its backdrop; closing it returns to the previously
selected prototype screen. The lower overview is a separate scroll-position capture.
It has no authentication, application requests, saving, or persistence. The existing
dark appearance, font, artwork, character values and density are preserved in the captures.

This captures a representative character, not every possible character variant. Source
review covers conditional surfaces below. It is not an accessibility or performance audit.

## Glass material study

Three concepts use the same public character, artwork, typeface and sample values.
All thirteen primary and nested screen states are rendered with local Mantine components
so surfaces, fields, rows and navigation can actually be inspected. These are representative
material studies, not pixel-identical replacements for the original sheet. Edit, Rest,
the header menu, catalog/currency editing and adventure creation are visual context only.
The grid includes all nine existing destinations. There are no game operations, application
API calls or saves.

| Concept | Surface treatment | Tradeoff |
| --- | --- | --- |
| Smoked glass (`/?view=smoked`) | Separate cards with 82% dark tint by default, neutral saturation and opaque text. Deeper tint preserves the earlier 88% option. | Material reference. The expanded layout and controls were subsequently rejected. |
| Unified glass (`/?view=unified`) | One 80% tinted glass frame around 94% tinted reading sections. Inner sections use dividers and do not apply blur. | An earlier alternative. Quieter edges, but fewer visual breaks between sections. |
| Frosted light (`/?view=frosted`) | 90% pale glass, dark text and darker green accents. | Optional exploration. A production light theme needs a separate scope covering drawers, editors, controls and content rendering. |

All three share three semantic roles: **glass shell**, **reading surface**, and **control
surface**. Controls and the sample menu use an opaque background. Text colors are opaque
and have a consistent primary/secondary distinction. Supporting labels are generally
12 or 13px, with 12px proficiency markers instead of the current 8px markers. The baseline
captures remain unmodified and are the authority for the exact existing layout.

The review controls switch between 390 and 430px frames, capped to the available window
width. Compare all places concepts side by side when space permits and stacks them in
narrow windows. The concept tabs support keyboard navigation and their selection is in
the URL. The selected screen is also in the URL, for example
`/?view=before-after&screen=inventory`. White and black backdrop options expose extreme
conditions independently of the illustration. Local interactions reset on reload; this is
intentional prototype behavior. They never reach the character saving or operations systems.

### Expanded smoked pass

The follow-up brief chose Smoked as the direction to extend, while leaving the final
production choice open. Shared styling does not require one continuous visual panel.
Keep separate overview cards, but use the same surface, border, text and control roles.
The earlier preference for Unified is retained as an alternative, not the current recommendation.

The first three-screen picker used downward arrows on destination rows. That implied an
accordion without expanding anything and was rejected. The revised picker uses nine actual
destination buttons in the current ordering, with an outlined active selection. Downward
chevrons now appear only on genuine content accordions or selection controls.

| Screen | Proposed refinement |
| --- | --- |
| Skills / Actions | Shared tab treatment. Search occupies its own row; action filters have their own row. Long weapon names wrap with bonus and damage underneath. |
| Feats / Features | Shared expandable groups and entry rows. Search checks both categories. Levels and action symbols retain their roles. |
| Inventory | Full wrapping names, secondary weapon summaries, separate equipment targets. Options remain explicit. |
| Spells | Readable rank separators, casting values and spell-slot controls. |
| Notes | Stable editor surface, compact formatting toolbar, page controls above the text. Local edits survive switching panels. |
| Details | Consistent labels and fields. Longer text gets multiline inputs; short facts can share a row. Nested navigation remains explicit. |
| Languages / Proficiencies | Wrapping pills; real expandable proficiency categories; ranks are distinct from numerical bonuses. |
| Companions | Compact Badger card with a separate removal control, confirmation and empty state. No invented companion combat calculations. |
| Extras | Quiet placeholder only. |
| Detail samples | Stronger opaque reading surface, clear close control, readable prose and metadata. |

Notes are illustrative local prose because the captured public sheet contains a long pasted
code sample. `study-descriptions.json` contains first paragraphs extracted from the sanitized
`data/data.sql` for local typography samples; content-link labels are retained as text. It is
not a new content store or a replacement for the production rich-text renderer. Expanded action
lists and proficiency rows are representative fixtures, not an exhaustive recalculation of Kip.
Catalog selection, currency management, campaign sharing, organized-play adventure editing,
full companion combat details, and complete content-drawer navigation remain outside this
visual prototype. Disabled reference controls do not imply a proposed product restriction.

### Why the current glass is harder to read

- `App.tsx` defines translucent dark and gray palettes. The shared dark-7 surface is only
  67% opaque, and explicit gray text can be translucent too.
- `utils/colors.ts` applies 16px blur with 180% saturation. The illustration's color fields
  remain prominent inside panels, so additional blur alone does not establish contrast.
- Global body and dimmed text are almost identical in lightness, while explicit gray text
  and placeholders can be much weaker. Secondary text does not have one dependable treatment.
- The overview renders six separate BlurBoxes. Some controls also use the glass helper,
  while the panel picker overrides its background with 40% black.

If a direction is selected, the existing consolidation seam is `index.css` tokens,
`App.tsx` theme/component overrides, and `glassStyle` / `BlurBox` / `ImprintButton`.
The eventual change should include menus, fields and drawers. It should not require
independent styling decisions for each character panel. No production consolidation has
been made on this branch. Fewer blurred layers are a rendering simplification, but this
study does not establish a frame-rate, battery or loading improvement.

### Checking the concepts

The manual prototype checks exercise actual rendered frames at 390 and 430px, narrow-page
overflow, hero points, skill search, spell slots, menu focus and the current screenshot
navigation. The material spec captures each concept's overview, skills, spells and menu.
The expanded spec captures the remaining primary and nested panels, sample detail overlays,
the companion empty state, destination buttons, and a matching before/after comparison.
It also checks equipment targets, cross-category feat search, local note and field edits
across navigation, and detail focus restoration. These are separate from the application's
regression suite:

```sh
npm --prefix frontend run cy:run -- --config-file src/pages/character_sheet/prototype/glass-check.config.mjs --browser electron
```

The config runs both `glass-check.cy.ts` (seven material/reference scenarios) and
`smoked-check.cy.ts` (three expanded-panel scenarios). Use Cypress's `--spec` argument
with either spec's repository-relative path from `frontend/` to run that group alone.

Artifacts go to the ignored `.scratch/mobile-sheet-ui/glass-captures/` directory.
`glass-contrast.json` and `smoked-contrast.json` record sampled foreground/background contrast. The check composites
computed CSS background colors over solid white and black and checks sampled primary,
secondary, warning and accent colors against 4.5:1. This follows the normal-text threshold
in [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
It is a focused check of these prototype samples, not a whole-application accessibility
certification or a substitute for device testing. Decorative artwork and icons are not text.

The initial material study was verified on September 8, 2026: all seven browser scenarios passed. The lowest sampled
ratios across both widths and extreme backdrops were 6.86:1 for Smoked, 7.06:1 for Unified,
and 4.96:1 for Frosted.

The expanded pass was also verified on September 8: the seven material/reference scenarios
passed again, followed by all three expanded scenarios in a separate run. The expanded
contrast report contains 48 screen/width/backdrop samples, with a minimum of 5.79:1 under
the more translucent Smoked treatment. The standalone prototype build, project TypeScript
check and scoped ESLint check passed. The prototype build has a size warning from the
combined reference, editor and study bundle; it is not part of the production application build.

The larger text and separate metadata lines use more vertical space, especially in Feats
and Inventory. Compare that readability/density tradeoff in the prototype before adopting
the treatment. No phone performance gain or full game interaction coverage is claimed.

## Navigation map

The mobile sheet begins with its overview, even though the internal active panel defaults
to Skills & Actions. Panel choice is not stored in the URL. Selecting a panel retains the
identity card and replaces the remaining overview sections with one panel.

| Surface | Current structure |
| --- | --- |
| App shell | 50px header with hamburger and logo. Header collapses after outer scrolling. |
| Identity | Portrait, name, ancestry, background, class, Edit, Rest, level and XP. |
| Overview | HP and temporary HP; conditions and hero points; attributes; AC and saves; perception, speed and class DC. |
| Panel picker | Fixed bottom-right grid button. Full-width overview button, then four paired rows. |
| Skills & Actions | Skills / Actions & Abilities tabs; searches, ranks, action filters and accordions. |
| Feats & Features | Search; Feats / Features segments; grouped category accordions. |
| Inventory | Search, compact item rows, options menu for bulk, Add Item and currency. |
| Spells | Search, action filters, casting-source accordions, rank and resource controls. |
| Notes | One rich-text page. Floating page menu and page settings controls. |
| Details | Information / Languages / Proficiencies tabs; Information has General / Organized Play tabs. |
| Companions | Companion cards or an empty state; cards open creature drawers. |
| Extras | Existing “More to come!” placeholder, still listed in navigation. |
| Drawers | Right-side detail overlay, close/history-back control, phone scroll lock. |

The picker orders its paired rows as Skills & Actions / Feats & Features,
Inventory / Spells, Notes / Details, and Companions / Extras.

## Conditional surfaces

- Modes appears when modes are available, with an active count when applicable.
- Campaign appears when the character belongs to a campaign.
- Dice appears when the character's dice-roller option is enabled.
- Stamina rules add Stamina, Resolve and Breather to health.
- An equipped shield adds its shield presentation.
- Prepared, spontaneous, innate and focus casting produce different spell controls.
- Companion cards, shared notes and organized-play data vary by character.

## Observations for the next discussion

- Panel selection hides the overview stats. There is no persistent top-level panel title
  or tab bar on the phone; the grid menu indicates the selected destination.
- Panels unmount when switching, so local searches and nested tab choices can reset.
- The outer app scroll area contains fixed-height panel scroll areas. Their heights are
  500 or 555px based on measured sheet content, not remaining phone viewport height.
- The overview responds to the viewport breakpoint; panel navigation responds to the
  measured panel width minus 60px. Those measurements can disagree near the breakpoint.
- Spells, Companions and Extras remain available whether the character uses them or not.

These are discussion points, not approved redesign decisions. Preserve the user's preference
for intentional visual changes and quiet saving throughout the exploration.

## Refreshing the reference

The manual Cypress capture is deliberately outside the normal E2E spec directory. It visits
only the public sheet, anonymously, and blocks application writes at the request boundary.
It records viewport screenshots and visible control rectangles, not tokens or API payloads.

```sh
npm --prefix frontend run cy:run -- --config-file src/pages/character_sheet/prototype/capture.config.mjs --browser electron
```

The capture browser window is taller than the emulated phone so Cypress does not resize the
page while taking screenshots. A dimension guard rejects mismatches between the screenshot
and recorded hotspot viewport. See the [Cypress browser launch documentation](https://docs.cypress.io/api/node-events/browser-launch-api#set-screen-size-when-running-headless).

Rendered source anchors: `CharacterSheetPage.tsx` (overview and picker), its `panels/` and
`sections/` directories, `nav/Layout.tsx` (shell and outer scroll), and
`drawers/DrawerBase.tsx` (drawer presentation).
