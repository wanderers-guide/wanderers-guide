---
name: wg-ui
description: Use whenever creating, editing, or reviewing any UI or frontend code in the wanderers-guide repo
---

# Wanderers Guide UI Guidelines

## Mantine UI

**Always use [Mantine](https://mantine.dev) components** for all UI work in this repo. Do not reach for raw HTML elements or custom CSS when a Mantine component covers the use case.

Before implementing any UI, check the Mantine docs:
- Full docs (LLM-friendly): https://mantine.dev/llms.txt

Use the available `mcp__mantine__*` tools to look up components, props, and docs inline:
- `mcp__mantine__list_items` — browse available components
- `mcp__mantine__get_item_doc` — get full docs for a component
- `mcp__mantine__get_item_props` — get prop types for a component
- `mcp__mantine__search_docs` — search across Mantine docs

## Design Patterns

Follow these established visual patterns across all pages:

### Page Layout
- **One BlurBox per page** — title, controls, and content all inside a single `BlurBox`. Never stack separate glass panels with gaps between them.
- **Header row**: title left, search/controls right on desktop. On mobile (`phoneQuery()` = max-width 36em), stack into separate rows.
- **Single `Divider`** between header and content. No double dividers.

### Two-Tier Glass System
- **Outer container**: `BlurBox` using `glassStyle()` (backdrop-filter blur, `--glass-bg-color`).
- **Inner cards**: Imprint styling — never nest `BlurBox` inside `BlurBox`. Use these constants from `@constants/data`:
  - `IMPRINT_BG_COLOR` (`rgba(222, 226, 230, 0.06)`) — base card background
  - `IMPRINT_BG_COLOR_2` (`rgba(222, 226, 230, 0.12)`) — hover card background
  - `IMPRINT_BORDER_COLOR` (`rgba(209, 213, 219, 0.2)`) — card border

### Card Hover
- **Lighten**: background from `IMPRINT_BG_COLOR` → `IMPRINT_BG_COLOR_2` (6% → 12%)
- **Lift**: `translateY(-2px)`
- **Shadow**: `boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'`
- **Transition**: `200ms ease` on transform, box-shadow, and background-color
- Use `useHover()` from `@mantine/hooks` with a `ref` on the outer card container

### Buttons & Controls
- Card actions (Edit, etc): `variant='light'` — buttons blend into cards, not sit on top.
- Tab switching: `Tabs variant='pills' radius='xl'` for compact pill tabs.
- Secondary/options: `variant='subtle'`.
- Avoid `variant='default'` inside cards (too dark in dark mode).

### Typography & Hierarchy
- Names/titles: `c='gray.2'` to pop against dimmed supporting text.
- Supporting details (ancestry, class, etc): `c='dimmed'`.
- Establish hierarchy through color weight/opacity, not just font size.

### Responsiveness
- Things **wrap, never clip**. Smaller sizes on mobile (`size='xs'` tabs, `px='sm'` padding).
- If content doesn't fit one row, give it its own row — don't force `nowrap` + overflow.
- Always validate mobile layout.

### Empty States
- Never show a blank void when search/filter returns nothing.
- Use dimmed italic text: `<Text ta='center' c='dimmed' fs='italic'>No results match "..."</Text>`

---

## Code Documentation

**Always write comments and document your code.** Every component, function, and non-obvious block of logic must be documented:

- Add a JSDoc comment above every exported component and function explaining what it does, its props/params, and any important behavior
- Add inline comments for any logic that isn't immediately self-evident
- If a piece of UI has nuanced behavior (conditional rendering, state interactions, side effects), explain it in a comment
