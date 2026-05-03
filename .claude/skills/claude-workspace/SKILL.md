---
name: claude-workspace
description: General developer workflow guidance for the wanderers-guide repo — how to verify changes (render the app, take screenshots, read the DOM), how to bypass authentication for testing (public character sheet, drawer-open URL), and pointers to where shared theming/styles live. Use this whenever you're working in the repo and need to verify behavior in a browser, or when picking where to put styles. Works alongside `wg-ui` (visual/Mantine patterns) and `wg-content` (data model + linking).
---

# Wanderers Guide Developer Workflow

This skill covers the cross-cutting how-to-work-in-this-repo basics: verifying changes, accessing content without authentication, and where shared styling lives. It complements `wg-ui` (visual/Mantine patterns) and `wg-content` (data model + linking).

## Verifying changes — render, screenshot, read the DOM

**You should actually run the app and look at it**, not just rely on type checking. The repo's UI behavior is rarely fully provable from the code alone.

Default workflow when you change anything user-facing:

1. **Start the preview server** with `mcp__Claude_Preview__preview_start` (config lives in [.claude/launch.json](.claude/launch.json) — `npm --prefix frontend run dev` on port 5173).
2. **Navigate** with `preview_eval` (`window.location.href = '/sheet/142809'`) or click via `preview_click`.
3. **Verify** — pick the lightest tool that proves the thing you care about:
   - `preview_snapshot` — accessibility tree, shows text content and structure. **Prefer this over screenshots** when you only need to confirm text or structure.
   - `preview_eval` — read DOM directly (`document.querySelector('.mantine-Drawer-content')?.textContent`) or compute things from the page state.
   - `preview_inspect` — computed CSS for a specific element (use for spacing/color/typography questions).
   - `preview_screenshot` — actual visual confirmation. Use when shape/spacing/color is the point of the change.
   - `preview_console_logs level='error'` — runtime errors.
   - `preview_logs level='error'` — server compile errors.

When something doesn't work, **read the DOM** to understand why before touching the code again. `preview_eval` returning the actual rendered HTML/text/computed-style answers most "is it broken?" questions in one round trip.

## Reading data.sql to understand content shape

[data/data.sql](data/data.sql) is a sanitized `pg_dump` of cleaned official content. **You're free to read it any time** to understand how WG content is structured — schemas tell you the columns, `data.sql` shows you what real values look like.

It's especially useful when you're trying to understand UI that renders content (a drawer, a card, a list) and need to know what fields actually contain. Faster than spelunking through the schema and Zod files when you just want to see a real row.

To find examples:
```bash
# COPY blocks mark the start of each table's data
grep -n "^COPY public\." data/data.sql

# Read a few sample rows after a COPY header
sed -n '13031,13035p' data/data.sql   # e.g. trait rows
```

The `wg-content` skill has the full data-model breakdown — this is just a pointer to the example data.

## Bypassing auth for verification

Most pages require login, which makes script-driven verification awkward. Two URL patterns let you verify content rendering without auth:

### Open any content drawer

Append `?open=link_TYPE_ID` to the URL — App.tsx watches for this query param and opens the corresponding drawer:

```
http://localhost:5173/?open=link_spell_4623          # opens Fireball spell
http://localhost:5173/?open=link_trait_1542          # opens Fire trait
http://localhost:5173/?open=link_action_19856        # opens Strike action
http://localhost:5173/?open=link_feat_20015          # opens Continual Recovery feat
```

The `TYPE` and `ID` slots use the same values as content links in prose (see `wg-content` for the full type list). The drawer relies on the in-memory content cache; if the cache is empty (e.g. you just landed on the home page in a fresh tab), the drawer may render blank because the content fetch hasn't populated yet. Combining with a sheet URL avoids this:

```
http://localhost:5173/sheet/142809?open=link_spell_4623
```

This loads the sheet (which fetches content) and opens the drawer in the same navigation.

### Public character sheet

Public/shared characters render without auth:

```
http://localhost:5173/sheet/142809
```

Useful for verifying any character-sheet UI change — health, AC, save, skill, perception, resist/weak, condition, inventory, spells, feats, notes, etc. — without needing to log in.

If you need a different character, ask the user — they'll have a preferred public character ID.

## Where styles live

**Always prefer Mantine theming over one-off CSS.** Two files own all shared styling:

- **[frontend/src/App.tsx](frontend/src/App.tsx)** — Mantine theme via `createTheme(...)` (search for `generateTheme`). This is where the `dark`/`gray` color scales, `primaryColor`, `defaultRadius`, fonts, and per-component `vars` (Popover, Menu, HoverCard, …) are set. Add or tweak component-wide styling here, not in individual components.
- **[frontend/src/index.css](frontend/src/index.css)** — global CSS variables (`--glass-bg-color`, `--imprint-bg-color`, `--imprint-border-color`, etc.) keyed off `data-mantine-color-scheme`. Add new shared tokens here so they exist on both light and dark.

Rules of thumb:
- **No one-off custom CSS.** If you find yourself writing inline `style={{ ... }}` with hand-tuned colors, paddings, or typography that don't reference a theme value, that's a smell — promote the value into `App.tsx` (theme) or `index.css` (CSS variable) instead.
- **Use `IMPRINT_BG_COLOR`/`IMPRINT_BG_COLOR_2`/`IMPRINT_BORDER_COLOR`** from `@constants/data` for cards (also documented in `wg-ui`).
- **Component-wide overrides** (e.g. "all Popovers should use this dark color") go in `App.tsx`'s theme `components` map, not on individual `<Popover />` instances.
- **Use Mantine's design tokens** — `theme.radius.md`, `c='gray.2'`, `c='dimmed'`, `gap={10}`, `px='sm'` — instead of literal pixel/hex values.

The `wg-ui` skill has the visual design patterns (cards, glass, hover, typography, responsive) — this skill just points you at *where* to make the change.
