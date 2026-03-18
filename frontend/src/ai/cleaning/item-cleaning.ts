import Anthropic from '@anthropic-ai/sdk';
import { fetchContentSources } from '@content/content-store';
import { makeRequest } from '@requests/request-manager';
import { Item } from '@typing/content';
import { RequestType } from '@typing/requests';

const client = new Anthropic({ apiKey: import.meta.env.VITE_CLAUDE_KEY!, dangerouslyAllowBrowser: true });

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
  }: {
    type: FetchableType;
    id?: number | number[];
    name?: string;
    level?: number;
    group?: string;
    rarity?: string;
    ability_block_type?: string;
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

    return await makeRequest(FETCH_REQUEST_MAP[type], body);
  },

  generateUUID: (): string => {
    return crypto.randomUUID();
  },

  returnFixedItem: ({ item }: { item: Item }): Item => {
    return item;
  },
};

const tools: Anthropic.Tool[] = [
  {
    name: 'fetchContent',
    description: `Fetch any game content from the database by type and optional filters.
Supported types:
- "item": weapons, armor, wands, runes, shields, general items, etc.
- "trait": traits/tags applied to items, spells, and feats (e.g. "magical", "electricity")
- "spell": spells by name, rank, tradition
- "ability-block": feats, actions, class-features, senses, heritages, modes. Use ability_block_type to narrow.
- "language", "ancestry", "background", "class", "archetype", "versatile-heritage", "class-archetype", "creature", "content-source"
When fetching by id, pass a single number or an array of numbers.`,
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

## Steps To Follow

### 1. Understand the item
Read the item's description, meta_data (a plain JSON object), traits (array of numeric IDs), and operations.

### 2. Fix the description
Rewrite the description using rich inline markdown links following the rules above. Additional formatting rules:
- Action costs use this HTML: <abbr cost="{ACTION_COST}" class="action-symbol">{N}</abbr>
  Valid ACTION_COST values: ONE-ACTION, TWO-ACTIONS, THREE-ACTIONS, REACTION, FREE-ACTION,
  ONE-TO-TWO-ACTIONS, ONE-TO-THREE-ACTIONS, TWO-TO-THREE-ACTIONS
- Activation lines should be formatted as:
  **Activate—Title** <abbr cost="TWO-ACTIONS" class="action-symbol">2</abbr> ([trait](link_trait_ID), ...); **Effect** ...
- Remove * * * horizontal dividers — use a semicolon or line break instead
- Do NOT add markdown headers (#) or bullet lists unless the original had them

### 3. Fix the usage field
Normalize usage: replace hyphens with spaces (e.g. "held-in-one-hand" → "held in one hand").

### 4. Fix meta_data
meta_data is stored as JSON. Fix these:
- Add missing default fields: image_url (""), is_shoddy (false), unselectable (false), starfinder ({}), charges ({}), bulk ({})
- damage object should have: { damageType, dice, die, extra: "" }
- For each entry in runes.property (which has { name, id }), fetch the full rune item by ID and embed it as a "rune" field:
  runes.property = [{ name, id, rune: <full Item object> }, ...]

### 5. Fix operations
Operations model the mechanical effects the item grants while equipped/invested. Look at what the description says the item does — resistances, bonuses, ability grants, etc.

To know what operations to write, first fetch 2–3 similar items (same group, similar effects) and study their operations arrays for patterns. Then model the operations for this item accordingly.

Operation schema:
{ id: string (UUID), type: OperationType, data: { ... } }

Common operation types:
- adjValue: { variable: string, value: string }
  - For resistances: variable = "RESISTANCES", value = "damage_type, amount" (e.g. "electricity, 5")
  - For immunities: variable = "IMMUNITIES", value = "damage_type"
- addBonusToValue: { variable: string, value: number | string, type: string, text: string }
  - For item bonuses to AC, attacks, saves, etc.
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

**Legacy vs. Remaster traits:**
Pathfinder 2e has two editions — the legacy edition and the remaster (2023+). Some traits exist in both a legacy and a remaster version (e.g. the Monk trait exists as both a legacy ID and a remaster ID). If you notice that an item's traits array contains a legacy-edition trait AND the item's 'content_source_id' corresponds to a remaster-era book, this is probably a bug. When in doubt, prefer the remaster/non-legacy version of a trait.

## Important Notes
- Before each tool call (or batch of tool calls), briefly explain in plain text what you're about to do and why. This reasoning will be logged.
- Never invent IDs. Always fetch content by name to find the correct numeric ID.
- meta_data must be returned as a plain JSON object (not a serialized string).
- The top-level "group" field categorizes the item type: GENERAL (misc items, consumables, gear), WEAPON, ARMOR, SHIELD, RUNE (PF2e only — runes applied to weapons/armor), UPGRADE (SF2e only — upgrades applied to weapons/armor). If the group looks wrong, fetch 2–3 items with the same name pattern or from the same content source to confirm the correct group before changing it.
- Preserve all restricted fields unchanged (id, created_at, content_source_id, version, uuid).
- Only model passive effects (resistances, bonuses, senses) as operations. Active abilities (Activate actions) are described in the description, not operations.
- **Unarmed attacks** (e.g. "fist", "claw", "jaws", "tail", "horn") are always level 0, have unselectable: true in meta_data, and have size: "MEDIUM". These are not purchasable items — they exist only as base attack profiles.
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
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
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
          const raw = await (fn as any)(block.input);
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
          try {
            const parsed = JSON.parse(result);
            const records: { id: number; name: string }[] = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
            log('tool', { name: block.name, input: block.input, records, contentType: (block.input as any).type });
          } catch {
            log('tool', { name: block.name, input: block.input, resultText: result?.slice(0, 400) });
          }
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
