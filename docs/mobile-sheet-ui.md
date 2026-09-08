# Mobile character sheet UI exploration

Status: current UI reference plus three glass material concepts. Branch: `codex/mobile-sheet-ui`.

**Do not merge this branch until the user explicitly approves merging it.** Earlier
authorization to merge reliability fixes does not apply to this UI branch.

## Current baseline

The branch starts from main commit `02940a970a9b7d46507834a7c11ad4edf4735351`, including
the completed mobile loading and quiet-save work. Production sheet styling and behavior
remain unchanged while the material concepts below are reviewed.

Run `npm --prefix frontend run prototype:mobile-sheet` and open
`http://127.0.0.1:5175`. The opening view compares glass concepts. Choose **Current UI**
or use `/?view=current` for the captured reference. The prototype lives beside the actual sheet in
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
Overview, Skills and Spells are rendered with local Mantine components so colors, surfaces,
search, hero points and spell slots can actually be inspected. These are representative
material studies, not pixel-identical replacements for the original sheet. Edit, Rest,
the header menu and unimplemented nested tabs are visual context only. The grid includes
the three sample destinations. There are no game operations, application API calls or saves.

| Concept | Surface treatment | Tradeoff |
| --- | --- | --- |
| Smoked glass (`/?view=smoked`) | Separate cards with 88% dark tint, neutral saturation and opaque text. | Closest to the current visual structure. Retains the many panel boundaries and blur layers. |
| Unified glass (`/?view=unified`) | One 80% tinted glass frame around 94% tinted reading sections. Inner sections use dividers and do not apply blur. | Preferred for reducing visual noise. More of the artwork is concentrated around the frame rather than behind text. |
| Frosted light (`/?view=frosted`) | 90% pale glass, dark text and darker green accents. | Optional exploration. A production light theme needs a separate scope covering drawers, editors, controls and content rendering. |

All three share three semantic roles: **glass shell**, **reading surface**, and **control
surface**. Controls and the sample menu use an opaque background. Text colors are opaque
and have a consistent primary/secondary distinction. Supporting labels are generally
12 or 13px, with 12px proficiency markers instead of the current 8px markers. The baseline
captures remain unmodified and are the authority for the exact existing layout.

The review controls switch between 390 and 430px frames, capped to the available window
width. Compare all places concepts side by side when space permits and stacks them in
narrow windows. The concept tabs support keyboard navigation and their selection is in
the URL. White and black backdrop options expose extreme conditions independently of the
illustration. Local interactions reset on reload; this is intentional prototype behavior.

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

The manual prototype check exercises actual rendered frames at 390 and 430px, narrow-page
overflow, hero points, skill search, spell slots, menu focus and the current screenshot
navigation. It captures each concept's overview, skills, spells and menu, plus a desktop
comparison. It is separate from the application's regression suite:

```sh
npm --prefix frontend run cy:run -- --config-file src/pages/character_sheet/prototype/glass-check.config.mjs --browser electron
```

Artifacts go to the ignored `.scratch/mobile-sheet-ui/glass-captures/` directory.
`glass-contrast.json` records sampled foreground/background contrast. The check composites
computed CSS background colors over solid white and black and checks sampled primary,
secondary, warning and accent colors against 4.5:1. This follows the normal-text threshold
in [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
It is a focused check of these prototype samples, not a whole-application accessibility
certification or a substitute for device testing. Decorative artwork and icons are not text.

Verified on September 8, 2026: all seven browser scenarios passed. The lowest sampled
ratios across both widths and extreme backdrops were 6.86:1 for Smoked, 7.06:1 for Unified,
and 4.96:1 for Frosted. The standalone prototype build, project TypeScript check and scoped
ESLint check passed. The prototype build has a size warning from the combined reference and
study bundle; it is not part of the production application build.

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
