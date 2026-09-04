# Content availability follow-ups — 2026-09-04

Both reported content entries are currently available through the live public API. No missing-content defect was reproduced, and no duplicate content or database changes were made.

## Verified records

Read-only POST requests used the frontend's existing public anonymous API configuration. Every request below returned HTTP 200 and `status: success`; no credentials or private character records were retained.

| Content | Source | Live evidence |
| --- | --- | --- |
| Ivory Chompers, item **19795** | **731**, Guilt of the Grave World | `find-item` with `id: 19795, content_sources: [731]` returned the item. The complete source listing, `content_sources: [731]`, also included it among 25 items. Common, level 0; `meta_data.unselectable` is false and `meta_data.deprecated` is absent. |
| Musical Accompaniment, spell **8837** | **842**, Impossible Magic | `find-spell` with `id: 8837, content_sources: [842]` returned the remastered spell. The complete source listing also included it among 99 spells. Common, rank 0, arcane/occult; no unselectable/deprecated metadata. |
| Musical Accompaniment (legacy), spell **6152** | **21**, Firebrands (backport) | `find-spell` with `id: 6152, content_sources: [21]` returned the legacy spell. Common, rank 0, arcane/occult; no unselectable/deprecated metadata. |

`find-content-source` with `homebrew: false, published: true` returned all three sources among 99 official published sources. Each has `require_key: false` and no deprecation marker. Source 731 requires Starfinder Player Core (579); sources 842 and 21 require Player Core (1). These rows are also present in `data/data.sql` (item line 20740; spells lines 26372 and 25759).

## Configuration and next action

Character pickers use the character's explicitly enabled books, not every publicly available source: `CharacterSheetPage.tsx:106` defines the page scope from `content_sources.enabled`, and `AddItemsModal.tsx:45–48` fetches that scope. In the builder, **Enable All applies to its book group** (`CharBuilderHome.tsx:335–360`). Ivory Chompers belongs to the Starfinder Core group; enabling all Pathfinder books alone does not enable source 731. Impossible Magic is a Pathfinder Core source, while Firebrands is under Lost Omens.

If either report still occurs, obtain the affected character's enabled source IDs and exact picker/search steps. Confirm 731 for the item or 842 for the remastered spell. Inspect active advanced filters and character `BLACKLIST_ITEMS`/`BLACKLIST_SPELLS` (`content-hidden.ts:24–37`). Musical Accompaniment is a cantrip: the spell-slot picker intentionally excludes cantrips from nonzero-rank slots (`ManageSpellsModal.tsx:322–325`); advanced search can additionally restrict tradition/rank/source.

Then reproduce in that character, recording whether the scoped API response contains the record and whether the UI hides it. The original affected character and browser cache were not available for this investigation, so user-specific configuration or stale client state remains unverified. Current evidence supports no content repair; do not create duplicate records.
