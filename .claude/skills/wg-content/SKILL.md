---
name: wg-content
description: Use whenever writing, editing, reviewing, or programmatically reading WG game content in the wanderers-guide repo — covers the data model (Postgres + frontend cache), the content link syntax, the cache-driven `convertToHardcodedLink` helper, the operations engine, and conventions for what to link in prose. Triggers on any work touching traits/actions/feats/spells/items/ancestries/classes/conditions/damage types or the descriptions/operations attached to them.
---

# Wanderers Guide Content

Two related concerns this skill covers:

1. **Linking content in prose** — turning words like *fire*, *Strike*, *Continual Recovery* into clickable drawer links inside descriptions.
2. **Reading content data** — understanding the WG data model (database schema, cache, operations) so you can query, validate, or generate content correctly.

If you're only writing prose, the linking section is enough. If you're touching anything that handles content programmatically (variables, operations, schema validation, AI-cleaning, drawers that render content), read the data section too.

# Part 1 — Content Linking

Any prose that the user reads in-app — drawer descriptions, AI-generated text, hardcoded help blurbs — should turn references to game content into clickable drawer links.

## The link format

Content links are markdown anchors with a custom href:

```markdown
[display text](link_TYPE_ID)
```

`TYPE` is the content type and `ID` is the numeric content id (or, for conditions, the name with spaces replaced by `~`). The `<RichText>` component (`frontend/src/common/RichText.tsx`) renders these as drawer-opening links. The href is parsed by `getContentDataFromHref` in `frontend/src/common/rich_text_input/ContentLinkExtension.ts`.

Valid `TYPE` values:
- **Top-level ContentTypes** — `trait`, `item`, `spell`, `class`, `archetype`, `versatile-heritage`, `class-archetype`, `ability-block`, `creature`, `ancestry`, `background`, `language`, `content-source`
- **AbilityBlock subtypes** — `action`, `feat`, `physical-feature`, `sense`, `class-feature`, `heritage`, `mode`
- **Special** — `condition` (id is the name with `~` for spaces, e.g. `link_condition_persistent~damage`)

## Always go through the helper

Never hand-write `link_TYPE_ID` strings. Use:

```ts
import { convertToHardcodedLink } from '@content/hardcoded-links';

convertToHardcodedLink('trait', 'fire')
// → "[fire](link_trait_1542)"

convertToHardcodedLink('action', 'Strike')
// → "[Strike](link_action_19856)"

convertToHardcodedLink('trait', 'disease', 'diseases')
// → "[diseases](link_trait_1857)"  (lookup uses canonical form, displays plural)
```

The helper:
- does case-insensitive name lookup against the in-memory content cache
- preserves the caller's text casing in the visible label
- accepts an optional `displayText` for plurals or sentence-case prose
- **falls back to plain text** if the cache isn't populated or the name doesn't match — so it's always safe to call

### Cache indirection (gotcha)

Ability-block subtypes (`action`, `feat`, `class-feature`, …) do **not** get their own cache. They all live in the `'ability-block'` cache with a `type` field. The helper handles this for you (it tries the type-keyed cache first, then falls back to the ability-block cache filtered by subtype). You only need to know this if you're working *on* the helper itself.

## Conditions auto-link — don't do them manually

`<RichText>` already runs every condition name from `getAllConditions()` through a whole-word regex and wraps matches in `[name](link_condition_name)`. There's also a special pass for `persistent <type> damage` patterns.

Do **not** manually wrap "frightened", "concealed", "stupefied", "persistent fire damage", etc. — they auto-link. Manually linking creates double-bracket strings the regex skips.

## What to link

| Type | Examples |
|---|---|
| **trait** | damage types (*fire*, *cold*, *electricity*, *slashing*), categories (*physical*, *spell*), materials (*cold iron*), descriptors (*death*, *poison*, *disease*) |
| **action** | basic actions (*Strike*, *Escape*, *Seek*), named activities (*Treat Wounds*, *Recall Knowledge*, *Subsist*) |
| **feat** | named feats referenced in prose (*Continual Recovery*, *Ward Medic*) |
| **spell** | specific spells mentioned by name (*Fireball*, *Charm*, *Confusion*) |
| **item** | named items |

## What NOT to link

- **Conditions** — auto-linked by RichText. Don't double-link.
- **Verbs that share a name with an action** — e.g. "hide" used as a verb in prose ≠ the *Hide* action. Check the surrounding text before linking.
- **Skill names used abstractly** — *Acrobatics*, *Athletics*, etc. when referenced as concepts (not drawer-linkable as content).
- **Attribute names** — *Strength*, *Dexterity*, etc. (not drawer-linkable).
- **Generic terms** — *spell*, *attack*, *creature* used as common nouns.

## Disambiguation

Some names exist as both a trait and a spell. Pick by surrounding prose:

- "a **charm** spell" or "a **fireball** spell" → link as `spell`
- "the **charm** trait" or "the **fire** trait" → link as `trait`
- "weakness to **fire**" → link as `trait` (damage type)

When the prose says the word *spell* right after, it's a spell. Otherwise it's almost always a trait.

## Conventions

- **Drop parenthetical page references** when adding a link. The link replaces the lookup, so `Continual Recovery (page 254)` becomes `[Continual Recovery](link_feat_20015)`.
- **Use `displayText` for plurals and sentence-case** — `convertToHardcodedLink('trait', 'disease', 'diseases')` for "diseases", `convertToHardcodedLink('spell', 'Fireball', 'fireball')` for lowercase prose. The lookup uses the canonical name; the user sees the natural prose.
- **Lookup is case-insensitive** — "fire", "FIRE", and "Fire" all match the *Fire* trait.

## Where in-app prose lives

Most static descriptions are template strings inside `<RichText>` blocks. The main files:

- `frontend/src/drawers/types/StatProfDrawer.tsx` — skill, save, weapon proficiency descriptions
- `frontend/src/drawers/types/StatResistWeakDrawer.tsx` — resistances, weaknesses, immunities
- `frontend/src/drawers/types/StatPerceptionDrawer.tsx` — perception, senses
- `frontend/src/drawers/types/StatHealthDrawer.tsx`, `StatAcDrawer.tsx`, `StatSpeedDrawer.tsx`, `StatAttrDrawer.tsx` — other stat blurbs
- `frontend/src/drawers/types/ManageCoinsDrawer.tsx` — coin/currency description
- `frontend/src/process/conditions/condition-handler.ts` — programmatic condition text
- `frontend/src/ai/open-ai-handler.ts` — AI-cleaned prose

When editing any of these, scan for unlinked content references and add links following the rules above.

## Verifying a change

The helper degrades gracefully when the cache isn't populated, so you can't rely on the static return value during a unit test. To verify a real link resolves:

1. Start the preview server (`preview_start`).
2. Seed the cache with the content you're linking and check the output:

```ts
const store = await import('/src/process/content/content-store.ts');
const links = await import('/src/process/content/hardcoded-links.ts');

await store.fetchTraitByName('fire');
links.convertToHardcodedLink('trait', 'fire');
// → "[fire](link_trait_1542)"
```

Use `fetchTraitByName`, `fetchSpellByName`, `fetchAbilityBlockByName`, `fetchItemByName`, `fetchLanguageByName` to seed by name. A passing seed-and-resolve test means the link will work in-app once the user's content has loaded.

# Part 2 — Reading WG Content Data

## Where content lives

- **Postgres database** — one table per content type. Schema: [data/schema.sql](data/schema.sql). Sanitized example data: [data/data.sql](data/data.sql) (a `pg_dump` of cleaned official content — useful when you need to see what real records look like).
- **Frontend cache** — `idStore` in [frontend/src/process/content/content-store.ts](frontend/src/process/content/content-store.ts), keyed by `ContentType`. Populated by `fetchContentAll`/`fetchContent`/`fetchContentById` and the `fetch{Trait|Spell|Item|AbilityBlock|Language}ByName` helpers.

Read patterns:
- **Synchronous, already loaded** — `getCachedContent<T>(type: ContentType)` returns `T[]` from the cache. Returns `[]` if not loaded yet.
- **Async, by id** — `fetchContentById<T>(type, id)` (returns `null` if missing).
- **Async, by name** — `fetch{X}ByName(name, sources?, id?)` returns first match or `null`.
- **Async, search** — `fetchContent<T>(type, filters)` for structured filters; the `search-data` request type does substring/full-text and returns a multi-type response shaped `{ items: [], traits: [], spells: [], ability_blocks: [], … }`.

## Content type taxonomy

**Top-level ContentTypes** (each has its own DB table and cache key):
`trait`, `item`, `spell`, `ability-block`, `language`, `ancestry`, `background`, `class`, `archetype`, `versatile-heritage`, `class-archetype`, `creature`, `content-source`.

**AbilityBlock subtypes** (live in the `ability_block` table, distinguished by a `type` column):
`action`, `feat`, `physical-feature`, `sense`, `class-feature`, `heritage`, `mode`.

So a "feat" is a row in `ability_block` with `type='feat'`. There is no `feat` table, no `feat` cache. The link href still uses the subtype (`link_feat_X`) — just the storage layer is shared.

## Common columns across content tables

Almost every content table has these:

| Column | Meaning |
|---|---|
| `id` | bigint primary key. This is the `ID` in `link_TYPE_ID`. |
| `uuid` | bigint, separate stable identifier for cross-source references. Don't use this for links. |
| `name` | display name. |
| `description` | markdown text, **with content links inline** (see Part 1). |
| `content_source_id` | FK to `content_source` (which book/bundle this came from). |
| `version` | usually `'1.0'`. |
| `rarity` | enum: `'COMMON' \| 'UNCOMMON' \| 'RARE' \| 'UNIQUE'`. |
| `availability` | enum: `'STANDARD' \| 'LIMITED' \| 'RESTRICTED' \| null`. |
| `meta_data` | json — type-specific extra fields (see below). |
| `operations` | `json[]` — array of operation JSON strings (see Operations below). |
| `traits` | `bigint[]` — array of trait `id`s. |
| `deprecated` | boolean — hide from default lookups. |

Type-specific extras include `level`, `actions` (action cost), `prerequisites`, `frequency`, `cost`, `trigger`, `requirements`, `access`, `special`, `bulk`, `hands`, `size`, `usage`, `craft_requirements`, `price`, `rank`, `traditions`, `range`, `area`, `targets`, `duration`, `heightened`, etc.

## Sources and scoping

`SourceValue` (in [shared.ts](frontend/src/schemas/shared.ts)) is what most fetchers accept:
- `number[]` — explicit list of `content_source_id`s.
- `'ALL-OFFICIAL-PUBLIC'` — official + public bundles (use this for prose linking).
- `'ALL-USER-ACCESSIBLE'` — everything the current user can see (official + their homebrew).
- `'ALL-HOMEBREW-PUBLIC'`, `'ALL-PUBLIC'`, `'ALL-HOMEBREW-ACCESSIBLE'` — variations.

When looking up content for description prose links, prefer official sources — homebrew name collisions can mislead the cache lookup.

## meta_data shapes

`meta_data` is type-specific JSON. The most complex is **item.meta_data**:

```jsonc
{
  "image_url": "",
  "base_item": "longsword",          // PF2e base item key (for runes/inheritance)
  "category": "martial",              // weapons: simple|martial|advanced|unarmed_attack
                                      // armor: light|medium|heavy|unarmored_defense
  "group": "sword",                   // weapons: axe|bow|sword|club|...
                                      // armor: chain|leather|plate|composite|...
  "damage": {
    "damageType": "slashing",
    "dice": 1,
    "die": "d8",
    "extra": "",
    "persistent": { "faces": 6, "number": 1, "type": "fire" }  // optional
  },
  "bulk": {},                         // empty unless overriding base
  "hardness": 0, "hp": 0, "hp_max": 0, "broken_threshold": 0,  // armor/shield only
  "is_shoddy": false,
  "unselectable": false,
  "quantity": 1,
  "material": { "type": null, "grade": null },
  "range": null, "reload": "",
  "runes": { "striking": 0, "potency": 0, "property": [...] },
  "starfinder": {}, "charges": {},
  "foundry": { "rules": [], "container_id": null, "items": [] }
}
```

Key item top-level fields: `group` (`'GENERAL' | 'WEAPON' | 'ARMOR' | 'SHIELD' | 'RUNE' | 'UPGRADE' | 'MATERIAL'`), `bulk` (string: `"0.1"` for Light, `"0"` for negligible, otherwise numeric string), `size` (defaults to `'MEDIUM'`).

For other types, common `meta_data` flags include `important`, `unselectable`, `deprecated`, plus type-specific subtype flags (e.g. trait has `class_trait`, `ancestry_trait`, `archetype_trait`, `versatile_heritage_trait`, `companion_type_trait`, `creature_trait`).

## The Operations engine

Operations model the mechanical effects content has on a character. They live in the `operations` column as a Postgres `json[]` — each element is a JSON-stringified object.

Each operation has the shape:

```ts
{ id: string /* UUID */, type: OperationType, data: { /* type-specific */ } }
```

All operation types (in [operations.ts](frontend/src/schemas/operations.ts)):
`adjValue`, `addBonusToValue`, `setValue`, `createValue`, `bindValue`, `giveAbilityBlock`, `removeAbilityBlock`, `giveLanguage`, `removeLanguage`, `conditional`, `select`, `giveSpell`, `removeSpell`, `giveItem`, `giveTrait`, `giveSpellSlot`, `injectSelectOption`, `injectText`, `sendNotification`, `defineCastingSource`.

Common patterns:

```jsonc
// Resistance — adjusts the RESISTANCES list-str variable
{ "type": "adjValue", "data": { "variable": "RESISTANCES", "value": "fire, 5" } }

// Immunity — list-str of damage types / effect types
{ "type": "adjValue", "data": { "variable": "IMMUNITIES", "value": "poison" } }

// Numeric bonus to a stat (typed bonus, optional condition text)
{
  "type": "addBonusToValue",
  "data": { "variable": "AC_BONUS", "value": 1, "type": "item", "text": "" }
}

// Conditional/circumstantial bonus with no fixed value
{
  "type": "addBonusToValue",
  "data": { "variable": "SKILL_ATHLETICS", "value": null, "type": "", "text": "to Climbing trees" }
}

// Grant a feat/action/class-feature
{
  "type": "giveAbilityBlock",
  "data": { "type": "feat", "abilityBlockId": 20015 }
}
```

### Variables

The system has ~166 named variables defined in [variable-manager.ts:DEFAULT_VARIABLES](frontend/src/process/variables/variable-manager.ts) — attributes (`ATTRIBUTE_STR`/`DEX`/`CON`/`INT`/`WIS`/`CHA`), saves (`SAVE_FORT`/`REFLEX`/`WILL`), proficiencies (`SKILL_*`, `WEAPON_*`, `ARMOR_*`), defenses (`AC_BONUS`, `RESISTANCES`, `WEAKNESSES`, `IMMUNITIES`), HP, speeds, perception, casting stats, and more.

Variable types: `'attr' | 'prof' | 'num' | 'str' | 'bool' | 'list-str'`.

When writing operations, **always look up similar existing content first** (`fetchContent` filtered by `operations_text`) and copy the exact shape — variable names, `value` formats, and `type` strings must match the schema. Inventing variable names breaks the engine silently.

### UUIDs

Each operation needs its own UUID (the `id` field). Use `crypto.randomUUID()` once per operation. Don't reuse IDs across operations; the engine relies on them for deduplication.

## Reading data.sql for examples

[data.sql](data/data.sql) is a `pg_dump` of cleaned official content. To find real records:

```bash
# Find the COPY block for the table you're interested in
grep -n "^COPY public\." data/data.sql

# Read a few rows after the COPY header (tab-separated)
sed -n '13031,13035p' data/data.sql   # e.g. trait rows
```

Useful when the schema doesn't tell you the actual shape of `meta_data` or `operations` for a given content type.

## Capitalization conventions in prose (PF2e)

When you need to *generate* descriptions or fix existing ones (rather than just link them), the AI-cleaning prompt at [item-cleaning.ts](frontend/src/ai/cleaning/item-cleaning.ts) codifies the PF2e style rules:

- **Items** — lowercase ("longsword", "ring of protection"). Link as `[name](link_item_X)`.
- **Spells** — lowercase + italicized. Link as `*[name](link_spell_X)*`.
- **Feats** — Title Case ("Power Attack"). Link as `[Name](link_feat_X)`.
- **Actions** — Title Case ("Strike", "Raise a Shield"). Link as `[Name](link_action_X)`.
- **Class features** — lowercase ("rage", "ki strike"). Link as `[name](link_class-feature_X)`. Never capitalize the link text even if the source does.
- **Traits** — lowercase ("magical", "electricity"). Often followed by *effect* ("disease effect", "poison effect"). Link as `[name](link_trait_X)`.
- **Conditions** — DO NOT link. Auto-handled (see Part 1).

**Link every occurrence** — unlike Archives of Nethys which only links the first mention of a thing, WG links every instance in a description.

## Action-cost markup

Inside descriptions, action costs use a custom `<abbr>` tag that the renderer converts to action symbols:

```html
<abbr cost="ONE-ACTION" class="action-symbol">1</abbr>
<abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr>
<abbr cost="REACTION" class="action-symbol">R</abbr>
```

Valid `cost` values: `ONE-ACTION`, `TWO-ACTIONS`, `THREE-ACTIONS`, `REACTION`, `FREE-ACTION`, `ONE-TO-TWO-ACTIONS`, `ONE-TO-THREE-ACTIONS`, `TWO-TO-THREE-ACTIONS`. Only insert these when the source explicitly shows an action cost — *not* for inline references to action names in prose.

Activation lines have a standard format:

```markdown
**Activate—Title** <abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr> ([trait](link_trait_X), ...); **Effect** ...
```

## When you're cleaning/generating content programmatically

The AI-cleaning system at [frontend/src/ai/cleaning/](frontend/src/ai/cleaning/) is the canonical reference. Read [item-cleaning.ts](frontend/src/ai/cleaning/item-cleaning.ts)'s `SYSTEM_PROMPT` for the full set of rules — it covers item-specific things this skill doesn't repeat (usage vs hands disambiguation, base-item inheritance, rune handling, legacy vs remaster traits, unarmed-attack exceptions, the no-damage-trait-from-damage-type rule, etc.).

If you're building a new agent or validator that reads WG content, mirror its tool layout: `fetchContent` (scoped to official sources by default), `fetch{X}ByName` for resolving names to IDs, `searchAoN`/`searchDp` for cross-referencing official PF2e sources, and Zod-schema validation on any output before persisting.
