/**
 * item-cleaning.ts
 *
 * AI agent that cleans and enriches a single Item record from the Wanderers Guide database.
 *
 * High-level flow:
 *   fixItem(item) → agentic tool-call loop → returnFixedItem → Zod schema validation → Item
 *
 * The agent (DeepSeek reasoner or Claude) is given the raw item JSON, a detailed system prompt
 * describing PF2e conventions and WG data rules, and a set of tools it can call to look up
 * external sources (AoN, Demiplane) and the WG database itself. It iterates until it calls
 * returnFixedItem with a schema-valid result, or the caller throws on end_turn.
 *
 * Provider toggle: set PROVIDER to 'anthropic' or 'deepseek'.
 * DeepSeek uses an OpenAI-compatible API so messages/tools must be translated — see
 * toOpenAIMessages / toOpenAITools / fromOpenAIResponse below.
 */

import Anthropic from '@anthropic-ai/sdk';
import { fetchContentSources } from '@content/content-store';
import { makeRequest } from '@requests/request-manager';
import { Item, ItemSchema } from '@schemas/content';
import { RequestType } from '@schemas/requests';
import { formatZodError } from '@schemas/shared';
import { DEFAULT_VARIABLES } from '@variables/variable-manager';
import { searchAoN } from './alt-sources/aon';
import { searchDp } from './alt-sources/dp';
import { CleaningUtils } from './CleaningUtils';

const client = new Anthropic({ apiKey: import.meta.env.VITE_CLAUDE_KEY ?? '', dangerouslyAllowBrowser: true });

// Toggle between Anthropic and DeepSeek as the underlying model provider.
const PROVIDER = 'deepseek' as 'anthropic' | 'deepseek';

// All content types that can be fetched from the WG database via fetchContent.
type FetchableType =
  | 'trait'
  | 'item'
  | 'spell'
  | 'ability-block'
  | 'language'
  | 'ancestry'
  | 'background'
  | 'class'
  | 'archetype'
  | 'versatile-heritage'
  | 'class-archetype'
  | 'creature'
  | 'content-source';

// Maps each fetchable type to the corresponding WG API request type.
const FETCH_REQUEST_MAP: Record<FetchableType, RequestType> = {
  'ability-block': 'find-ability-block',
  ancestry: 'find-ancestry',
  background: 'find-background',
  class: 'find-class',
  archetype: 'find-archetype',
  'versatile-heritage': 'find-versatile-heritage',
  'class-archetype': 'find-class-archetype',
  'content-source': 'find-content-source',
  creature: 'find-creature',
  item: 'find-item',
  language: 'find-language',
  spell: 'find-spell',
  trait: 'find-trait',
};

// Cached list of official public source IDs — used to scope all non-ID lookups so the agent
// only sees published content, not homebrew or unpublished drafts.
let _officialSourceIds: number[] | null = null;
async function getOfficialSourceIds(): Promise<number[]> {
  if (_officialSourceIds) return _officialSourceIds;
  const sources = await fetchContentSources('ALL-OFFICIAL-PUBLIC');
  _officialSourceIds = sources.map((s) => s.id);
  return _officialSourceIds;
}

/**
 * The concrete implementations of every tool the agent can call.
 * These are invoked in the tool-call loop inside fixItem — the agent receives the tool name
 * and input JSON, we look up the matching function here and run it.
 *
 * Each function accepts a `log` callback so it can emit size/diagnostics without coupling to
 * the outer logging mechanism.
 */
const utilityFunctions = {
  /**
   * Fetch WG database content by type and optional filters.
   * - If `id` is provided: fetch that specific record (or records) directly.
   * - If `description` is provided: use the full-text search-data endpoint.
   * - Otherwise: use the type-specific find-* endpoint with field filters.
   * Results are capped at 5 and large string fields are trimmed to prevent context overflow.
   */
  fetchContent: async (
    {
      type,
      id,
      name,
      level,
      group,
      rarity,
      ability_block_type,
      description,
      operations_text,
    }: {
      type: FetchableType;
      id?: number | number[];
      name?: string;
      level?: number;
      group?: string;
      rarity?: string;
      ability_block_type?: string;
      description?: string;
      operations_text?: string;
    },
    log?: (type: string, data: any) => void
  ) => {
    const body: Record<string, any> = {};
    if (id !== undefined) body.id = id;
    if (name !== undefined) body.name = name.replace(/-/g, ' ');
    if (level !== undefined) body.level = level;
    if (group !== undefined) body.group = group;
    if (rarity !== undefined) body.rarity = rarity;
    if (ability_block_type !== undefined) body.type = ability_block_type;

    // Always scope to official sources unless fetching by explicit id
    if (id === undefined) {
      body.content_sources = await getOfficialSourceIds();
    }

    let rawResults: any;

    if (description || (name && !id)) {
      // Use search-data for partial/substring matching on name or description.
      // The find-* endpoints do exact name matching, so any name search without an explicit id
      // must go through search-data which supports substring matching.
      body.is_advanced = true;
      body.type = type;
      if (description) body.description = description;
      if (name) body.name = name.replace(/-/g, ' ');
      rawResults = (await makeRequest<any>('search-data', body)) ?? [];
    } else {
      rawResults = (await makeRequest<any>(FETCH_REQUEST_MAP[type], body)) ?? [];
    }

    // Normalise to a flat array — endpoints return either an array or a single record object.
    let results: any[];
    if (Array.isArray(rawResults)) {
      results = rawResults;
    } else if (rawResults && typeof rawResults === 'object' && 'id' in rawResults) {
      // Single record returned (common when id is a scalar, or name matches exactly one row)
      log?.('warn', { source: 'fetchContent', message: 'endpoint returned single object, wrapping in array', rawChars: JSON.stringify(rawResults).length });
      results = [rawResults];
    } else if (rawResults && typeof rawResults === 'object') {
      // search-data returns a multi-type aggregator: { items: [...], traits: [...], spells: [...], ... }
      // Map the requested type to its plural key in that response.
      const TYPE_TO_KEY: Record<string, string> = {
        'item': 'items', 'trait': 'traits', 'spell': 'spells',
        'ability-block': 'ability_blocks', 'language': 'languages',
        'ancestry': 'ancestries', 'background': 'backgrounds', 'class': 'classes',
        'archetype': 'archetypes', 'versatile-heritage': 'versatile_heritages',
        'class-archetype': 'class_archetypes', 'creature': 'creatures',
        'content-source': 'content_sources',
      };
      const key = TYPE_TO_KEY[type];
      if (key && Array.isArray(rawResults[key])) {
        results = rawResults[key];
      } else {
        // Still unknown — log every key+size for diagnosis
        const shapeDiag: Record<string, number> = {};
        for (const [k, v] of Object.entries(rawResults)) shapeDiag[k] = JSON.stringify(v).length;
        log?.('warn', { source: 'fetchContent', message: 'search-data response had no matching key for type', type, key, shapeDiag });
        results = [];
      }
    } else {
      results = [];
    }

    // Client-side partial name filter — the API does exact matching, so filter here for substring
    if (name) {
      const lower = name.toLowerCase();
      results = results.filter((r) => (r.name ?? '').toLowerCase().includes(lower));
    }

    // Client-side filter by operations text if requested
    if (operations_text) {
      const lower = operations_text.toLowerCase();
      results = results.filter((r) =>
        JSON.stringify(r.operations ?? '')
          .toLowerCase()
          .includes(lower)
      );
    }

    const sliced = results.slice(0, 5);

    sliced.forEach((r) => {
      const allSizes = Object.entries(r).map<[string, number]>(([k, v]) => [k, JSON.stringify(v).length]);
      // Only keep the 5 heaviest fields to avoid bloating the log
      const topFields = Object.fromEntries(allSizes.sort(([, a], [, b]) => b - a).slice(0, 5));
      log?.('size', { source: 'fetchContent', id: r.id, name: r.name, chars: JSON.stringify(r).length, topFields });
    });

    return sliced;
  },

  generateUUID: (): string => {
    return crypto.randomUUID();
  },

  // Placeholder — the real validation and extraction happens in the tool-call loop below,
  // not here. This stub exists so the function map has an entry for the tool name.
  returnFixedItem: ({ item }: { item: Item }): Item => {
    return item;
  },

  searchAoN: async ({ query }: { query: string }, log?: (type: string, data: any) => void) => {
    const result = await searchAoN(query);
    const chars = JSON.stringify(result).length;
    log?.('size', { source: 'searchAoN', query, chars });
    return result;
  },

  searchDp: async ({ query }: { query: string }, log?: (type: string, data: any) => void) => {
    const result = await searchDp(query);
    log?.('size', { source: 'searchDp', query, chars: result.length });
    return result;
  },

  fetchPageText: async ({ url }: { url: string; prompt?: string }, log?: (type: string, data: any) => void) => {
    // Fetch raw markdown — Firecrawl's onlyMainContent already strips nav/sidebars/footers.
    // We intentionally don't pass the prompt to Firecrawl's AI extraction because that returns
    // JSON instead of markdown, which is harder for the model to read and may drop exact values.
    // The agent's prompt is noted in the log for context but doesn't change what we fetch.
    const result = await CleaningUtils.fetchPageText(url);
    log?.('size', { source: 'fetchPageText', url, chars: result.length });
    return result;
  },
};

/**
 * Tool definitions passed to the model. Descriptions are written for the model, not developers —
 * they explain *when* to call each tool and what to expect back.
 */
const tools: Anthropic.Tool[] = [
  {
    name: 'fetchContent',
    description: `Fetch any game content from the Wanderers Guide database by type and optional filters. Use this to look up IDs, verify existing records, or study similar items for reference.
Supported types:
- "item": weapons, armor, wands, runes, shields, general items, etc.
- "trait": traits/tags applied to items, spells, and feats (e.g. "magical", "electricity")
- "spell": spells by name, rank, tradition
- "ability-block": feats, actions, class-features, senses, heritages, modes. Use ability_block_type to narrow.
- "language", "ancestry", "background", "class", "archetype", "versatile-heritage", "class-archetype", "creature", "content-source"
When fetching by id, pass a single number or an array of numbers.
To check how other sources present the same content, use searchAoN or searchDp instead.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: [
            'trait',
            'item',
            'spell',
            'ability-block',
            'language',
            'ancestry',
            'background',
            'class',
            'archetype',
            'versatile-heritage',
            'class-archetype',
            'creature',
            'content-source',
          ],
          description: 'The type of content to fetch',
        },
        id: {
          description: 'Fetch by specific ID or array of IDs',
          oneOf: [{ type: 'number' }, { type: 'array', items: { type: 'number' } }],
        },
        name: { type: 'string', description: 'Filter by name (case-insensitive)' },
        level: { type: 'number', description: 'Filter by level' },
        group: {
          type: 'string',
          enum: ['GENERAL', 'WEAPON', 'ARMOR', 'SHIELD', 'RUNE', 'UPGRADE', 'MATERIAL'],
          description: 'Filter items by group',
        },
        rarity: {
          type: 'string',
          enum: ['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'],
          description: 'Filter by rarity',
        },
        ability_block_type: {
          type: 'string',
          enum: ['action', 'feat', 'physical-feature', 'sense', 'class-feature', 'heritage', 'mode'],
          description: 'Filter ability-blocks by their subtype',
        },
        description: {
          type: 'string',
          description: 'Filter by text in the description field (case-insensitive substring match)',
        },
        operations_text: {
          type: 'string',
          description:
            'Filter by text anywhere in the operations JSON (case-insensitive substring match). Useful for finding items that grant a specific variable, resistance type, etc.',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'generateUUID',
    description: 'Generate a cryptographically random UUID. Call this once per operation ID needed.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'searchAoN',
    description: `Search the Archives of Nethys (AoN) for PF2e content by name. Returns up to 20 hits with metadata and a fullUrl field. Use fullUrl with fetchPageText to read the full page content.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The search term' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchDp',
    description: `Search Demiplane for PF2e content by name. Returns the search results page as markdown, which may contain links to individual content pages. Use fetchPageText on those links to read full page content.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The search term' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetchPageText',
    description: `Fetch the content of any URL, with AI noise removal applied automatically. Optionally provide a prompt describing what you are looking for — this focuses the extraction on the relevant content (e.g. "usage, bulk, traits, and activation for this item"). If omitted, all item content on the page is returned with navigation and site chrome stripped out.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The full URL to fetch' },
        prompt: {
          type: 'string',
          description: 'Optional. What to extract from the page. Omit for raw markdown when you need precise values.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'returnFixedItem',
    description: 'Return the fully cleaned and fixed item. Call this when all repairs are complete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item: {
          type: 'object',
          description: 'The complete fixed Item object',
        },
      },
      required: ['item'],
    },
  },
];

// Build a human-readable list of all known WG variables with their types so the agent knows
// exactly what variable names to reference in operations (e.g. "RESISTANCES", "AC_BONUS").
const VARIABLE_REFERENCE = Object.entries(DEFAULT_VARIABLES)
  .map(([name, v]) => `${name} (${v.type})`)
  .join(', ');

const SYSTEM_PROMPT = `You are a Pathfinder 2e game content agent. Your job is to clean up and fix a single Item record from the Wanderers Guide database.

## Your Goal
Produce a corrected Item object that is fully enriched and mechanically complete. When done, call returnFixedItem with the result.

## PF2e Terminology & Linking Rules

In Pathfinder 2e, different content types have distinct capitalization conventions. Use these to identify what needs linking:

- **Items** — always written in lowercase (e.g. "longsword", "ring of protection"). Link as [name](link_item_{id}). Never capitalise the link text even if the source does.
- **Spells** — always written in lowercase and italicised. Link as *[name](link_spell_{id})*. Never capitalise the link text even if the source does.
- **Feats** — Title Case (e.g. "Power Attack", "Quick Draw"). In Wanderers Guide, feats are ability-blocks with type "feat". Link as [Name](link_action_{id}).
- **Actions** — Title Case (e.g. "Strike", "Raise a Shield"). In Wanderers Guide, actions are ability-blocks with type "action". Link as [Name](link_action_{id}).
- **Class features** — always written in lowercase (e.g. "rage", "ki strike"). Also ability-blocks. Link as [name](link_action_{id}). Never capitalise the link text even if the source does.
- **Traits** — always written in lowercase (e.g. "magical", "electricity", "disease"). Often followed by the word "effect" (e.g. "disease effect", "poison effect") — that's a strong signal it's a trait. Link as [name](link_trait_{id}). Never capitalise the link text even if the source does.
- **Conditions** — DO NOT link. Conditions (unconscious, dying, frightened, slowed, etc.) are plain lowercase text only. The system auto-links them. Never wrap a condition in a markdown link.

All feats, actions, and class features are called "ability blocks" in Wanderers Guide. Use fetchContent with type "ability-block" and the appropriate ability_block_type ("feat", "action", "class-feature", etc.) to find their IDs.

**Link every occurrence** of linkable content in the description — not just the first. Unlike AoN which only links on first mention, Wanderers Guide links every instance.

## Steps To Follow

### 1. Understand the item
Read the item's description, meta_data (a plain JSON object), traits (array of numeric IDs), and operations.

### 2. Cross-reference external sources
Before rewriting anything, always look the item up on both AoN and Demiplane to get full context:
1. Call 'searchAoN' with the item's name, then call 'fetchPageText' on the most relevant result's fullUrl to read the full AoN page.
2. Call 'searchDp' with the item's name, then call 'fetchPageText' on the most relevant URL found in the results to read the full Demiplane page.
Use both pages together to verify mechanics, traits, description wording, and operations before making any changes.

Also frequently use fetchContent to search for similar or related content in the WG database (similiar traits, group, category, type, etc) to understand the conventions used. If no external match exists and the item appears to be a custom unarmed attack (e.g. for a companion, familiar, or class feature), treat it as intentionally custom: do not change its traits or damage amounts — those are almost certainly already correct. Only clean up formatting, meta_data defaults, and structural issues.

### 3. Fix the description
Rewrite the description using rich inline markdown links following the rules above. Additional formatting rules:
- Action costs use this HTML: <abbr cost="{ACTION_COST}" class="action-symbol">{N}</abbr>
  Valid ACTION_COST values: ONE-ACTION, TWO-ACTIONS, THREE-ACTIONS, REACTION, FREE-ACTION,
  ONE-TO-TWO-ACTIONS, ONE-TO-THREE-ACTIONS, TWO-TO-THREE-ACTIONS
  Only add action symbols when AoN explicitly shows an action cost. Do not add them to inline references to action names (e.g. "Interact" in a sentence is just text, not an action symbol).
- Activation lines should be formatted as:
  **Activate—Title** <abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr> ([trait](link_trait_ID), ...); **Effect** ...
- Remove * * * horizontal dividers — use a semicolon or line break instead
- Do NOT add markdown headers (#) or bullet lists unless the original had them

### 3. Fix the usage field
Many existing WG items have incorrect usage values that this cleaning process exists to fix. Never use other WG items as justification for setting usage.

Follow exactly what the AoN page says — nothing else:
- If AoN shows a **"Usage"** line (e.g. "worn gloves", "held in one hand"), set the usage field to that exact value. Normalize it: replace hyphens with spaces.
- If AoN shows only a **"Hands"** entry with no separate "Usage" line, set usage to an empty string ("") and only set the "hands" field in meta_data. **Do NOT set usage to "held in one hand" or any other value — leave it empty.**
- If AoN shows neither Usage nor Hands, set usage to an empty string (""). Do not guess based on what the item "seems like".

### 4. Fix meta_data
meta_data is stored as JSON. Fix these:
- Add missing default fields: image_url (""), is_shoddy (false), unselectable (false), starfinder ({}), charges ({}), bulk ({})
- damage object should have: { damageType, dice, die, extra: "" }
- For each entry in runes.property (which has { name, id }), fetch the full rune item by ID and embed it as a "rune" field:
  runes.property = [{ name, id, rune: <full Item object> }, ...]
- **Bulk**: The top-level bulk field is a string. "L" (light bulk) = "0.1". "0" = negligible/no bulk. "1", "2", etc. are normal bulk values. Store bulk as a numeric string: "0.1", "0", "1", "2", etc.
- **Hardness, HP, broken_threshold**: Only relevant for armor and shields — don't chase these values for other item types. If they're clearly stated for an armor/shield item, set them; otherwise don't worry about them.

### 5. Fix operations
Operations model the mechanical effects the item grants while equipped/invested. Look at what the description says the item does — resistances, bonuses, ability grants, etc.

**Known variables and their types:**
${VARIABLE_REFERENCE}

**Always fetch similar WG content before writing any operations.** Use fetchContent with filters to find items with comparable effects. Copy the structure of existing operations exactly — variable names, types, and data shapes must match what the WG system already uses. Never invent operation schemas from scratch.

Operation schema:
{ id: string (UUID), type: OperationType, data: { ... } }

Common operation types:
- adjValue: { variable: string, value: string }
  - For resistances: variable = "RESISTANCES", value = "damage_type, amount" (e.g. "electricity, 5")
  - For immunities: variable = "IMMUNITIES", value = "damage_type"
- addBonusToValue: { variable: string, value: number | string | null, type: string, text: string }
  - value: the numeric bonus (e.g. 1, 2, 5). null if the effect is conditional text with no fixed bonus.
  - type: the bonus type as a lowercase string ("item", "status", "circumstance", "untyped", etc). Empty string if no type.
  - text: the condition or scope of the bonus (e.g. "to Climbing trees", "to Perception checks"). Empty string if unconditional.
  - Examples:
    - "+1 item bonus to Climbing trees" → value: 1, type: "item", text: "to Climbing trees"
    - "+5 status bonus" → value: 5, type: "status", text: ""
    - Conditional text with no bonus → value: null, type: "", text: "the condition text"
- giveAbilityBlock: { type: AbilityBlockType, abilityBlockId: number }
  - Fetch the ability block by name to get its ID

Always call generateUUID once per operation to get a fresh UUID for its id field.

### 6. Fix traits if needed
Trait IDs in the traits array are numbers (or sometimes strings — leave them as-is).

**Do NOT add traits for these reasons — they are handled automatically:**
- Traits that come from the base weapon (via meta_data.base_item) — e.g. agile, free-hand, finesse on a base dagger. These are inherited at render time and must not be duplicated here.
- The "magical" trait — automatically applied whenever the item has any rune.
- **Damage-type traits (acid, fire, cold, electricity, sonic, poison, etc.) — Don't add these just because the item deals that damage type. Dealing acid damage does NOT always mean an item has the acid trait. Damage type and traits are completely separate concepts in PF2e. This is a common mistake — do not make it.**

The traits array should only contain traits that are **explicitly granted by this specific item itself**, beyond what the base weapon or runes/upgrade already provide. When in doubt, leave the trait array as-is rather than adding.

**WG data-tracking traits:**
Some items in the WG database have extra traits that are not PF2e game traits — they are used internally for data tracking and filtering. This is most common on class features (e.g. a trait named after the class or feature category). Do not remove these unless you are certain they are a mistake. If in doubt, leave them.

**Legacy vs. Remaster traits:**
Pathfinder 2e has two editions — the legacy edition and the remaster (2023+). Some traits exist in both a legacy and a remaster version (e.g. the Monk trait exists as both a legacy ID and a remaster ID). If you notice that an item's traits array contains a legacy-edition trait AND the item's 'content_source_id' corresponds to a remaster-era book, this is probably a bug. When in doubt, prefer the remaster/non-legacy version of a trait.

## Important Notes
- Before each tool call (or batch of tool calls), briefly explain in plain text what you're about to do and why. This reasoning will be logged.
- Never invent IDs. Always fetch content by name to find the correct numeric ID.
- meta_data must be returned as a plain JSON object (not a serialized string).
- **meta_data.category and meta_data.group mean different things for weapons vs armor.** Leave them absent on all other item types (GENERAL, SHIELD, RUNE, etc.).
  - **Armor** — category: the armor weight class ("light", "medium", "heavy", "unarmored_defense"). group: the armor specialization group — valid PF2e values: "Chain", "Composite", "Leather", "Plate", "Skeletal", "Wood"; valid SF2e values: "Cloth", "Ceramic", "Polymer".
  - **Weapons** — category: the proficiency category ("simple", "martial", "advanced", "unarmed_attack"). group: the weapon specialization group — valid PF2e values: "axe", "bomb", "bow", "brawling", "club", "crossbow", "dart", "firearm", "flail", "hammer", "knife", "pick", "polearm", "projectile", "shield", "sling", "spear", "sword"; valid SF2e values: "corrosive", "cryo", "flame", "grenade", "laser", "mental", "missile", "plasma", "poison", "shock", "sniper", "sonic". Any value not in these lists is wrong and must be corrected.
- The top-level "group" field categorizes the item type. The ONLY valid values are: GENERAL (misc items, consumables, gear), WEAPON, ARMOR, SHIELD, RUNE (PF2e only — runes applied to weapons/armor), UPGRADE (SF2e only — upgrades applied to weapons/armor), MATERIAL (for things like silver ore or adamantine ingots). Any other value (e.g. "CATALYST", "POISON", etc.) is wrong and must be corrected — default to GENERAL unless the item is clearly a weapon, armor, shield, rune, upgrade, or material.
- Preserve all restricted fields unchanged (id, created_at, content_source_id, version, uuid).
- Only model passive effects (resistances, bonuses, senses) as operations. Active abilities (Activate actions) are described in the description, not operations.
- **Unarmed attacks** (e.g. "fist", "claw", "jaws", "tail", "horn") are always level 0, have unselectable: true in meta_data, and have size: "MEDIUM". These are not purchasable items — they exist only as base attack profiles. Many unarmed attacks in the WG database are custom-coded for specific class features, companions, or familiars and will not have a matching entry on AoN or Demiplane. Do not try to match them to an external source. Clean them using the rules here and the item's own description only.
- **Size defaults to MEDIUM.** The vast majority of items in the system are medium-sized. If an item has no size or an unusual size that isn't clearly justified, default it to "MEDIUM".
- **Data quality note:** Some existing items in the database have incorrect field values (wrong level, size, group, traits, etc.). This cleaning process exists precisely to correct those errors. If something looks wrong, trust these rules over the stored data.`;

// Unified content block type used internally throughout the agent loop.
// Anthropic's SDK uses this natively; we map DeepSeek responses into the same shape.
type AgentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, any> };

/**
 * Translates the internal Anthropic-style message history into the OpenAI chat format
 * required by the DeepSeek API. Key differences:
 * - Tool results become role:"tool" messages (not user messages with tool_result blocks).
 * - reasoning_content (DeepSeek's chain-of-thought) must be round-tripped on assistant turns
 *   for multi-turn tool loops to work correctly.
 * - Tool calls become tool_calls on the assistant message.
 */
function toOpenAIMessages(messages: Anthropic.MessageParam[], system: string): any[] {
  const result: any[] = [{ role: 'system', content: system }];
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        result.push({ role: 'user', content: msg.content });
      } else if (Array.isArray(msg.content)) {
        const toolResults = (msg.content as any[]).filter((b) => b.type === 'tool_result');
        const textBlocks = (msg.content as any[]).filter((b) => b.type === 'text');
        for (const tr of toolResults) {
          result.push({
            role: 'tool',
            tool_call_id: tr.tool_use_id,
            content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
          });
        }
        if (textBlocks.length > 0) {
          result.push({ role: 'user', content: textBlocks.map((b: any) => b.text).join('\n') });
        }
      }
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        result.push({ role: 'assistant', content: msg.content });
      } else if (Array.isArray(msg.content)) {
        const textBlocks = (msg.content as any[]).filter((b) => b.type === 'text');
        const thinkingBlocks = (msg.content as any[]).filter((b) => b.type === 'thinking');
        const toolUseBlocks = (msg.content as any[]).filter((b) => b.type === 'tool_use');
        const assistantMsg: any = {
          role: 'assistant',
          content: textBlocks.map((b: any) => b.text).join('\n') || null,
        };
        // Required for deepseek-reasoner multi-turn tool loops
        if (thinkingBlocks.length > 0) {
          assistantMsg.reasoning_content = thinkingBlocks.map((b: any) => b.thinking).join('\n');
        }
        if (toolUseBlocks.length > 0) {
          assistantMsg.tool_calls = toolUseBlocks.map((b: any) => ({
            id: b.id,
            type: 'function',
            function: { name: b.name, arguments: JSON.stringify(b.input) },
          }));
        }
        result.push(assistantMsg);
      }
    }
  }
  return result;
}

// Translates Anthropic-style tool definitions into the OpenAI function-calling format.
function toOpenAITools(anthropicTools: Anthropic.Tool[]): any[] {
  return anthropicTools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.input_schema },
  }));
}

// Translates a single DeepSeek response choice back into the internal AgentBlock[] format.
// reasoning_content → thinking block, tool_calls → tool_use blocks.
function fromOpenAIResponse(choice: any): { stopReason: 'end_turn' | 'tool_use'; content: AgentBlock[] } {
  const message = choice.message;
  const content: AgentBlock[] = [];
  if (message.reasoning_content) content.push({ type: 'thinking', thinking: message.reasoning_content });
  if (message.content) content.push({ type: 'text', text: message.content });
  if (message.tool_calls) {
    for (const tc of message.tool_calls) {
      content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments) });
    }
  }
  return { stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn', content };
}

/**
 * Single entry point for a model call — abstracts over the provider.
 * Returns a normalised { stopReason, content } regardless of whether we hit Anthropic or DeepSeek.
 */
async function callModel(
  messages: Anthropic.MessageParam[],
  system: string
): Promise<{ stopReason: 'end_turn' | 'tool_use'; content: AgentBlock[] }> {
  if (PROVIDER === 'anthropic') {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', // 'claude-opus-4-6', // 'claude-haiku-4-5',
      max_tokens: 16384,
      tools,
      messages,
      system,
    });
    return {
      stopReason: response.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
      content: response.content as AgentBlock[],
    };
  }

  // DeepSeek (OpenAI-compatible)
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_KEY ?? ''}` },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      max_tokens: 16384,
      tools: toOpenAITools(tools),
      messages: toOpenAIMessages(messages, system),
    }),
  });
  const data = await res.json();
  // Surface API errors (e.g. context-length exceeded) as a proper thrown Error
  // rather than crashing on data.choices[0] being undefined.
  if (!res.ok || !data.choices?.[0]) {
    throw new Error(data.error?.message ?? JSON.stringify(data));
  }
  return fromOpenAIResponse(data.choices[0]);
}

/**
 * If the serialised message history exceeds `thresholdChars`, compresses old tool results
 * down to short stubs so the next model call doesn't hit the context limit.
 *
 * Strategy:
 * - Always preserve message[0] (the original item) and the last two messages (the current round).
 * - Walk oldest-to-newest through everything in between, replacing large tool result content
 *   with "[omitted — was N chars]". Stop as soon as we're back under the threshold.
 * - Returns a deep copy — the real `messages` array is never mutated, so full history is
 *   preserved for logging and future rounds.
 */
function compressOldToolResults(
  messages: Anthropic.MessageParam[],
  thresholdChars = 250_000
): Anthropic.MessageParam[] {
  if (JSON.stringify(messages).length <= thresholdChars) return messages;

  const trimmed: Anthropic.MessageParam[] = JSON.parse(JSON.stringify(messages));

  // i=0 is the original item — never touch it.
  // Last 2 entries are the current assistant turn + its tool results — preserve those too.
  for (let i = 1; i < trimmed.length - 2; i++) {
    const msg = trimmed[i];
    if (msg.role !== 'user' || !Array.isArray(msg.content)) continue;
    for (const block of msg.content as any[]) {
      if (block.type === 'tool_result' && typeof block.content === 'string' && block.content.length > 500) {
        block.content = `[omitted — was ${block.content.length} chars]`;
      }
    }
    if (JSON.stringify(trimmed).length <= thresholdChars) break;
  }

  return trimmed;
}

/**
 * Main entry point. Runs the agentic tool-call loop until the model calls returnFixedItem
 * with a schema-valid item, then returns that item.
 *
 * Loop structure:
 *   1. Call the model with current message history.
 *   2. If stop_reason is end_turn without a returnFixedItem call → throw (agent gave up).
 *   3. For each tool_use block:
 *      a. Execute the matching utility function.
 *      b. For returnFixedItem: validate against ItemSchema. If invalid, send the Zod error
 *         back as the tool result so the model can self-correct and retry.
 *      c. Log the call for the UI to display.
 *      d. Append the tool result to the next user message.
 *   4. If returnFixedItem succeeded, return the validated item. Otherwise loop.
 */
export const fixItem = async (item: Item, log: (type: string, data: any) => void): Promise<Item> => {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Fix the following item:\n\n${JSON.stringify(item, null, 2)}`,
    },
  ];

  while (true) {
    const callMessages = compressOldToolResults(messages);
    log('size', { source: 'messages', chars: JSON.stringify(callMessages).length });
    console.log('Current messages:', callMessages);
    const { stopReason, content } = await callModel(callMessages, SYSTEM_PROMPT);

    messages.push({ role: 'assistant', content: content as any });

    if (stopReason === 'end_turn') {
      const text = content.find((b) => b.type === 'text') as (AgentBlock & { type: 'text' }) | undefined;
      const blocks = content.map((b) => b.type).join(', ') || 'no blocks';
      throw new Error(`Agent ended without returning a fixed item. Blocks: [${blocks}]. Last message: ${text?.text ?? '(none)'}`);
    }

    if (stopReason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let fixedItem: Item | null = null;

      // Log any reasoning the model shared before its tool calls.
      // thinking blocks = DeepSeek's chain-of-thought (reasoning_content).
      // text blocks = any explanation the model wrote before calling tools.
      for (const block of content) {
        if (block.type === 'thinking' && (block as any).thinking?.trim()) {
          log('thought', (block as any).thinking);
        } else if (block.type === 'text' && block.text.trim()) {
          log('thought', block.text);
        }
      }

      for (const block of content) {
        if (block.type !== 'tool_use') continue;

        const fn = utilityFunctions[block.name as keyof typeof utilityFunctions];
        let result: string;

        try {
          const raw = await (fn as any)(block.input, log);
          if (block.name === 'returnFixedItem') {
            // Validate the candidate against the Zod schema. If it fails, send the error
            // back to the model so it can correct and call returnFixedItem again.
            const candidate = (block.input as { item: Item }).item;
            const parsed = ItemSchema.safeParse(candidate);
            if (!parsed.success) {
              result = `Schema validation failed — fix these issues and call returnFixedItem again:\n- ${formatZodError(candidate, parsed.error)}`;
            } else {
              fixedItem = parsed.data as Item;
              result = 'Done.';
            }
          } else {
            result = typeof raw === 'string' ? raw : JSON.stringify(raw);
          }
        } catch (e: any) {
          log('error', e.message);
          result = `Error: ${e.message}`;
        }

        // Emit a structured log entry for each tool call so the UI can render it.
        // Different tools get different log shapes — fetchContent shows result count,
        // search tools show a snippet, fetchPageText shows the URL.
        if (block.name === 'fetchContent') {
          log('size', { source: 'fetchContent', type: (block.input as any).type, chars: result.length });
          try {
            const parsed = JSON.parse(result);
            const raw: any[] = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
            // Only store id+name — full objects would blow localStorage quota
            const records: { id: number; name: string }[] = raw.map((r) => ({ id: r.id, name: r.name }));
            log('tool', { name: block.name, input: block.input, records, contentType: (block.input as any).type });
          } catch {
            log('tool', { name: block.name, input: block.input, resultText: result?.slice(0, 400) });
          }
        } else if (block.name === 'searchAoN') {
          log('tool', {
            name: `searchAoN("${(block.input as any).query}")`,
            input: block.input,
            resultText: result?.slice(0, 200),
          });
        } else if (block.name === 'searchDp') {
          log('tool', {
            name: `searchDp("${(block.input as any).query}")`,
            input: block.input,
            resultText: result?.slice(0, 200),
          });
        } else if (block.name === 'fetchPageText') {
          log('tool', { name: `fetchPageText`, input: block.input, resultText: (block.input as any).url });
        } else if (block.name !== 'returnFixedItem') {
          log('tool', { name: block.name, input: block.input, resultText: result?.slice(0, 400) });
        }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }

      if (fixedItem) return fixedItem;

      messages.push({ role: 'user', content: toolResults });
    }
  }
};
