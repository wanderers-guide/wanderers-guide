import Anthropic from '@anthropic-ai/sdk';
import { fetchContentSources } from '@content/content-store';
import { makeRequest } from '@requests/request-manager';
import { Item } from '@schemas/content';
import { RequestType } from '@schemas/requests';
import { DEFAULT_VARIABLES } from '@variables/variable-manager';
import { searchAoN } from './alt-sources/aon';
import { searchDp } from './alt-sources/dp';
import { CleaningUtils } from './CleaningUtils';

const client = new Anthropic({ apiKey: import.meta.env.VITE_CLAUDE_KEY ?? '', dangerouslyAllowBrowser: true });

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

let _officialSourceIds: number[] | null = null;
async function getOfficialSourceIds(): Promise<number[]> {
  if (_officialSourceIds) return _officialSourceIds;
  const sources = await fetchContentSources('ALL-OFFICIAL-PUBLIC');
  _officialSourceIds = sources.map((s) => s.id);
  return _officialSourceIds;
}

const utilityFunctions = {
  fetchContent: async ({
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
  }) => {
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

    let results: any[];

    if (description) {
      // Use search-data for description text filtering
      body.is_advanced = true;
      body.type = type;
      body.description = description;
      results = (await makeRequest<any[]>('search-data', body)) ?? [];
    } else {
      results = (await makeRequest<any[]>(FETCH_REQUEST_MAP[type], body)) ?? [];
    }

    // Client-side filter by operations text if requested
    if (operations_text && Array.isArray(results)) {
      const lower = operations_text.toLowerCase();
      results = results.filter((r) =>
        JSON.stringify(r.operations ?? '')
          .toLowerCase()
          .includes(lower)
      );
    }

    return Array.isArray(results) ? results.slice(0, 5) : results;
  },

  generateUUID: (): string => {
    return crypto.randomUUID();
  },

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

  fetchPageText: async ({ url, prompt }: { url: string; prompt?: string }, log?: (type: string, data: any) => void) => {
    const result = await CleaningUtils.fetchPageText(url, prompt);
    log?.('size', { source: 'fetchPageText', url, chars: result.length });
    return result;
  },
};

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
    description: `Fetch the content of any URL as markdown. Optionally provide a prompt to have Firecrawl use AI to extract only the relevant content — useful for large pages. Omit the prompt to get raw markdown, which is more reliable when you need exact numbers, tables, or structured data (e.g. price, damage, bulk).`,
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

const VARIABLE_REFERENCE = Object.entries(DEFAULT_VARIABLES)
  .map(([name, v]) => `${name} (${v.type})`)
  .join(', ');

const SYSTEM_PROMPT = `You are a Pathfinder 2e game content agent. Your job is to clean up and fix a single Item record from the Wanderers Guide database.

## Your Goal
Produce a corrected Item object that is fully enriched and mechanically complete. When done, call returnFixedItem with the result.

## PF2e Terminology & Linking Rules

In Pathfinder 2e, different content types have distinct capitalization conventions. Use these to identify what needs linking:

- **Items** — lowercase (e.g. "longsword", "ring of protection"). Link as [name](link_item_{id}).
- **Spells** — lowercase and italicised in print. Link as *[name](link_spell_{id})*.
- **Feats** — Title Case (e.g. "Power Attack", "Quick Draw"). In Wanderers Guide, feats are ability-blocks with type "feat". Link as [Name](link_action_{id}).
- **Actions** — Title Case (e.g. "Strike", "Raise a Shield"). In Wanderers Guide, actions are ability-blocks with type "action". Link as [Name](link_action_{id}).
- **Class features** — lowercase (e.g. "rage", "ki strike"). Also ability-blocks. Link as [name](link_action_{id}).
- **Traits** — lowercase (e.g. "magical", "electricity", "disease"). Often followed by the word "effect" (e.g. "disease effect", "poison effect") — that's a strong signal it's a trait. Link as [name](link_trait_{id}).
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

export const fixItem = async (item: Item, log: (type: string, data: any) => void): Promise<Item> => {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Fix the following item:\n\n${JSON.stringify(item, null, 2)}`,
    },
  ];

  while (true) {
    log('size', { source: 'messages', chars: JSON.stringify(messages).length });
    console.log('Current messages:', messages);
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', // 'claude-opus-4-6', // 'claude-haiku-4-5',
      max_tokens: 16384,
      tools,
      messages,
      system: SYSTEM_PROMPT,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find((b) => b.type === 'text');
      throw new Error(`Agent ended without returning a fixed item. Last message: ${text?.text}`);
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let fixedItem: Item | null = null;

      // Log any reasoning the model shared before its tool calls
      for (const block of response.content) {
        if (block.type === 'text' && block.text.trim()) {
          log('thought', block.text);
        }
      }

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        const fn = utilityFunctions[block.name as keyof typeof utilityFunctions];
        let result: string;

        try {
          const raw = await (fn as any)(block.input, log);
          if (block.name === 'returnFixedItem') {
            fixedItem = (block.input as { item: Item }).item;
            result = 'Done.';
          } else {
            result = typeof raw === 'string' ? raw : JSON.stringify(raw);
          }
        } catch (e: any) {
          log('error', e.message);
          result = `Error: ${e.message}`;
        }

        // Log tool call + result as a single combined entry
        if (block.name === 'fetchContent') {
          log('size', { source: 'fetchContent', type: (block.input as any).type, chars: result.length });
          try {
            const parsed = JSON.parse(result);
            const records: { id: number; name: string }[] = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
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
