# Mobile character sheet UI exploration

Status: baseline capture only. Branch: `codex/mobile-sheet-ui`.

**Do not merge this branch until the user explicitly approves merging it.** Earlier
authorization to merge reliability fixes does not apply to this UI branch.

## Current baseline

The branch starts from main commit `02940a970a9b7d46507834a7c11ad4edf4735351`, including
the completed mobile loading and quiet-save work. No redesign is proposed in this pass.

Run `npm --prefix frontend run prototype:mobile-sheet` and open
`http://127.0.0.1:5175`. The prototype lives beside the actual sheet in
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
