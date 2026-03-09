import Anthropic from '@anthropic-ai/sdk';
import { upsertItem } from '@content/content-creation';
import { fetchContent, fetchContentSources } from '@content/content-store';
import { Item, ItemGroup, Rarity } from '@typing/content';

const client = new Anthropic({ apiKey: import.meta.env.VITE_CLAUDE_KEY!, dangerouslyAllowBrowser: true });

const utilityFunctions: Record<string, (args: any) => any> = {
  upsertItem: ({ item }: { item: Item }) => {
    if (!item.id || item.id <= 0) {
      throw new Error('Item must have a valid ID for updating');
    }

    console.warn(`Upserting item: ${item}`);
    return item; // upsertItem(item);
  },
  fetchItems: async ({
    id,
    name,
    level,
    group,
    rarity,
  }: {
    id?: number;
    name?: string;
    level?: number;
    group?: ItemGroup;
    rarity?: Rarity;
  }) => {
    // Limit to only public official sources
    const contentSources = await fetchContentSources('ALL-OFFICIAL-PUBLIC');

    return await fetchContent<Item>('item', {
      id,
      name: name?.replace(/-/g, ' '),
      level,
      group,
      rarity,
      content_source_id: contentSources,
    });
  },
};

const tools: Anthropic.Tool[] = [
  {
    name: 'upsertItem',
    description: 'Create or update an item in the database',
    input_schema: {
      type: 'object' as const,
      properties: {
        item: {
          type: 'object',
          description: 'The full Item object to upsert',
        },
      },
      required: ['item'],
    },
  },
  {
    name: 'fetchItems',
    description: 'Fetch items filtered by any combination of fields',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'Fetch a specific item by ID' },
        name: { type: 'string', description: 'Filter by item name' },
        level: { type: 'number', description: 'Filter by item level' },
        group: {
          type: 'string',
          enum: ['GENERAL', 'WEAPON', 'ARMOR', 'SHIELD', 'RUNE', 'UPGRADE', 'MATERIAL'],
          description: 'Filter by item group',
        },
        rarity: {
          type: 'string',
          enum: ['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'],
          description: 'Filter by rarity',
        },
      },
      required: [],
    },
  },
];

export async function runItemAgent(task: string) {
  console.log(`\n🤖 Task: ${task}\n`);
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: task }];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      tools,
      messages,
      system: `You are an agent managing game items. You can fetch and upsert items.
               When modifying items, always fetch the existing item first to preserve all existing fields.
               The Item type has these groups: GENERAL, WEAPON, ARMOR, SHIELD, RUNE, UPGRADE, MATERIAL.
               Rarity values are: COMMON, UNCOMMON, RARE, UNIQUE.`,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find((b) => b.type === 'text');
      console.log(`\n✅ Done: ${text?.text}`);
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`🔧 Calling: ${block.name}`, block.input);
        const fn = utilityFunctions[block.name];
        let result: string;

        try {
          const raw = await fn(block.input);
          result = typeof raw === 'string' ? raw : JSON.stringify(raw);
        } catch (e: any) {
          result = `Error: ${e.message}`;
        }

        console.log(`   Result preview:`, result?.slice(0, 150));
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }
}
