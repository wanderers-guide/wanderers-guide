# Community follow-up closeout

This follows the [curated branch decisions](curated-decisions.md) and the private
Discord review covering August 21 through September 4, 2026. Discord messages were
read only. No replies, reactions, content approvals, or production database edits
were made.

## Repository consolidation

- Installed `setup`, `quzzar-workplace`, `quzzar-frontend`, `quzzar-backend`, and
  `quzzar-design` from `Quzzar/skills` at
  `b6e5cb5b0a9ebd9096805ce8228202d7385c432c`. See [setup report](quzzar-setup.md).
- Committed the existing Codex configuration and project-specific skill routing.
  The actual npm/Mantine/Supabase stack and main-branch release workflow take
  precedence over generic upstream defaults.
- Removed three retired worktrees and 54 retired local feature branches. Current
  files already contain every environment setting from the retired worktrees;
  no new credentials archive was created.
- After explicit publishing approval, pushed the six reviewed commits through
  `9ab3e825` and deleted the 33 retired remote feature branches with exact SHA guards.
  Only `main` and `gh-pages` remain remotely. The production schema refresh and docs
  deployment passed; the generated schema commit was fast-forwarded into local main.

## Publishing follow-up

The first clean GitHub runner exposed a missing direct `esbuild` dependency in the
new regression harness. Local verification had found an existing installation.
Declared the tested version `0.25.12` directly and regenerated the lockfile. This
removed entries for previously removed packages without changing application
package versions. CI, E2E, and Docker now use `npm ci --legacy-peer-deps` to install
the committed dependency graph.

An isolated clean install succeeded and passed all 47 rules/UI tests, seven
audit CLI tests, and the production build. The initial published application commit passed the complete
[API and Cypress E2E workflow](https://github.com/wanderers-guide/wanderers-guide/actions/runs/33926851182).

## Follow-ups

| Report | Result |
| --- | --- |
| Archetype skill feats appear in class/Free Archetype choices | Use one shared eligibility rule for both entry points. Preserve explicit Skill filters and normal skill feat choices. |
| Universal ancestry feats are missing | Recognize the existing All Ancestries trait while preserving level, required traits, visibility, and feat type. |
| Inventory item descriptions omit injected text | Use the same injection renderer as catalog items and the correct character/companion store. |
| Rascal Style progression | Already correct in current main. An exact-data controller regression verifies trained/expert/master/legendary at levels 1/3/7/15. No speculative rules change. |
| A no-language override leaves ancestry languages on the sheet | Apply explicit final replacements to both language names and IDs. Invalid input reports a recoverable error; grants remain, loading finishes, and the operation remains editable. |
| Eidolon gear and natural attack setup | Derive fundamental potency/striking runes from the selected invested held weapon or invested handwraps. Preserve ordinary item investment and saved attack data. Add a Configure attacks route into the companion inventory. |

The browser review also exposed an item icon crash when optional bulk metadata was
missing and nested inventory buttons that intercepted pointer actions. These are
included in the inventory correction.

Named Dragon Handwraps are recognized alongside canonical Handwraps of Mighty Blows.
Property rune compatibility and other equipment benefits remain manual; this change
does not claim to automate every rule under Gear And Your Eidolon.

Language overrides run after grants and before deferred variable bindings. Earlier
conditionals retain their existing evaluation order. Name lookup uses explicit source
scope, and ambiguous names require IDs rather than guessing a source.

Ivory Chompers and both Musical Accompaniment records are currently available through
the live public API and their scoped source listings. See [content findings](content-followups.md).
Further investigation requires the affected character's settings and picker steps.

## Verification

- Rules and UI regression suite: 47 passed. Tests bundle actual operation/controller
  code, actual item handlers, actual drawer rendering, and Mantine inventory controls.
  Exact checked-in Rascal, ancestry, skill-feat, staff, and Dragon Handwraps data are
  included. No database credentials are needed for these tests.
- Read-only audit CLI: 7 passed against loopback HTTP fixtures.
- Production build: TypeScript, Vite, and PWA packaging passed. The final browser
  preview uses the production bundle with only its API destination set to the local
  Docker test stack. The rendered entry asset was verified as `index-CZKJ6uhx.js`
  on a fresh preview origin; production service-worker upgrades were not tested.
- Lint: 0 errors, 70 pre-existing warnings. Docs: no broken links; the existing
  Mintlify OpenAPI-version/config warning remains. Existing large-chunk and stale
  Browserslist warnings also remain.
- Standards review identified error recovery and language-source cache scoping;
  both are fixed and covered by tests. Spec review identified ordinary investment
  loss and missing named handwraps; exact-data reproductions now pass.
- Authenticated browser verification used an existing local test account and a
  synthetic character. Pointer Invest/Divest works without opening the item drawer.
  Selecting Nightmare Cudgel preserves its and Whispering Staff's ordinary investments.
  Configure attacks opens the eidolon's Inventory; the +2 striking source produces
  attack +9 and damage 2d8+4. Injected text is visible in the inventory description.
- Responsive checks use a 390-pixel viewport. Inventory controls have no nested
  buttons, document width equals viewport width, and action labels fit their buttons.
  The final production preview reports no console errors.
- Removed the synthetic local character after verification and stopped the task's
  development and preview servers. The existing local test account was unchanged.

Saved evidence: [rules](followup-rules.log), [audit CLI](followup-audit.log),
[build](followup-build.log), [lint](followup-lint.log), [docs](followup-docs.log),
[mobile inventory](screenshots/inventory-mobile-final.png), and
[injected item description](screenshots/injection-mobile-final.png).

The initial local verification did not run the full Cypress and Deno API suites;
both subsequently passed in GitHub's E2E workflow after publishing. This change adds
no edge endpoint or SQL migration; inventory persists its optional source ID in the
existing JSON payload. Existing-account sign-in and the affected inventory paths were
also exercised against the local stack. Source-specific content reports remain
unreproduced for the original users, as described above.
