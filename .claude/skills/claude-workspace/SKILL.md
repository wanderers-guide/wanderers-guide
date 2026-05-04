---
name: claude-workspace
description: General developer workflow guidance for the wanderers-guide repo — how to verify changes (render the app, take screenshots, read the DOM), how to bypass authentication for testing (public character sheet, drawer-open URL), and pointers to where shared theming/styles live. Use this whenever you're working in the repo and need to verify behavior in a browser, or when picking where to put styles. Works alongside `wg-ui` (visual/Mantine patterns) and `wg-content` (data model + linking).
---

# Wanderers Guide Developer Workflow

This skill covers the cross-cutting how-to-work-in-this-repo basics: verifying changes, accessing content without authentication, and where shared styling lives. It complements `wg-ui` (visual/Mantine patterns) and `wg-content` (data model + linking).

## Where the user-facing docs live

The repo ships its own Mintlify documentation site at `docs/`. **Read these whenever you need to know how something is supposed to work for end users**, not just how it's implemented:

- **[docs/index.mdx](docs/index.mdx)** — homepage and entry point.
- **[docs/development.mdx](docs/development.mdx)** — local-dev setup (Supabase CLI + Docker), running the API and Cypress tests. Mirrors what you'd give a new contributor.
- **[docs/docker.md](docs/docker.md)** — full self-hosting wiring notes.
- **[docs/guides/content-model.mdx](docs/guides/content-model.mdx)** — the WG data model, operations engine, and content-link syntax (the `wg-content` skill is the deeper version).
- **[docs/api-reference/introduction.mdx](docs/api-reference/introduction.mdx)** — public API overview, JSend response format, base URL.
- **[docs/api-reference/quickstart.mdx](docs/api-reference/quickstart.mdx)** — first-request example in curl / JS / Python.
- **[docs/api-reference/authentication.mdx](docs/api-reference/authentication.mdx)** — JWT vs API key, character access grants, rate limits.
- **[docs/api-reference/openapi.json](docs/api-reference/openapi.json)** — full OpenAPI 3.1 spec for all 53 Edge Function endpoints. Source of truth for request/response shapes.
- **[docs/api-reference/<group>/](docs/api-reference/)** — per-endpoint MDX shells (one per OpenAPI path), grouped by `content/`, `characters/`, `campaigns/`, `gm/`, `users/`, `search/`, `files/`, `integrations/`.

The docs site is wired up via [docs/docs.json](docs/docs.json) (Maple theme, sidebar groups). To preview locally: `npm run docs:dev` (binds to `:3210`). To check for broken links: `npm run docs:check`.

### Keeping docs in sync (mandatory)

**Treat the docs as part of the code.** Any change in the same conversation that touches one of the artifacts below MUST update the matching doc page in the same change set. No "I'll do the docs later" — they rot in days.

| You changed... | Update at minimum... |
|---|---|
| An Edge Function in `supabase/functions/<name>/` (request body shape, response shape, error codes, auth rules, side effects, what gets deleted/created) | [docs/api-reference/openapi.json](docs/api-reference/openapi.json) — path schema, summary/description if behavior changed. The per-endpoint MDX shell at `docs/api-reference/<group>/<name>.mdx` re-renders from OpenAPI automatically. |
| Added a new Edge Function | New entry in [openapi.json](docs/api-reference/openapi.json), new MDX shell under the right group, add it to the right group in [docs/docs.json](docs/docs.json) so it shows in the sidebar. |
| Removed an Edge Function | Drop the path from [openapi.json](docs/api-reference/openapi.json), delete its MDX shell, remove from [docs/docs.json](docs/docs.json) nav. |
| `_shared/helpers.ts` (auth flow, `connect()`, rate limits, JWT generation) | [docs/api-reference/authentication.mdx](docs/api-reference/authentication.mdx). |
| `_shared/rate-limit.ts` (limits, buckets, headers) | The "Rate limits" section of [authentication.mdx](docs/api-reference/authentication.mdx). |
| Content schema (`schema.sql` columns), entity types in `_shared/content.d.ts`, or `operations.d.ts` | Component schemas in [openapi.json](docs/api-reference/openapi.json). For data-model concepts, [docs/guides/content-model.mdx](docs/guides/content-model.mdx). |
| docker-compose, Dockerfile, env vars | [docs/docker.md](docs/docker.md) and the Docker section in [docs/development.mdx](docs/development.mdx). |
| Local setup steps, `npm` script names, `data/*.sh` scripts | [docs/development.mdx](docs/development.mdx) (and the README if it duplicates anything). |

**Verification step before reporting any API/setup change as "done":** run `npm run docs:check` (mint broken-links). If you renamed or removed something, also run `mint dev` and click through the affected page to make sure the playground renders.

When you spot drift in passing (the doc says X but the code does Y), flag it and fix in the same change. The docs are the contract.

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
