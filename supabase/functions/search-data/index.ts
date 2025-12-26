// @ts-ignore
import { serve } from 'std/server';
import { TableName, connect } from '../_shared/helpers.ts';
import type {
  AbilityBlockType,
  ActionCost,
  Availability,
  ContentType,
  ItemGroup,
  JSendResponseSuccess,
  Rarity,
  Size,
} from '../_shared/content';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { SupabaseClient } from '@supabase/supabase-js';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { text, content_sources, is_advanced, ...params } = body as {
      // Simple
      text?: string;
      content_sources?: number[];

      // Advanced
      is_advanced?: boolean;
      type?: ContentType;

      // Shared
      name?: string;
      rarity?: Rarity;
      availability?: Availability;
      traits?: number[];
      description?: string;
      cost?: string;
      trigger?: string;
      requirements?: string;
      level_min?: number;
      level_max?: number;
      size?: Size;

      // Spell
      rank_min?: number;
      rank_max?: number;
      cast?: ActionCost | string;
      traditions?: string[];
      defense?: string;
      range?: string;
      area?: string;
      targets?: string;
      duration?: string;
      spell_type?: 'FOCUS' | 'RITUAL' | 'NORMAL';

      // Ability Block
      actions?: ActionCost;
      prerequisites?: string[];
      frequency?: string;
      access?: string;
      special?: string;
      ab_type?: AbilityBlockType;

      // Item
      bulk?: string;
      group?: ItemGroup;
      hands?: string;
      craft_requirements?: string;
      usage?: string;
    };

    if (is_advanced) {
      return await handleAdvancedSearch(client, {
        content_sources,
        ...params,
      });
    } else {
      return await handleSimpleSearch(client, text || '', content_sources);
    }
  });
});

/// Advanced search token handlers

type SearchToken =
  | { type: 'word'; value: string }
  | { type: 'phrase'; value: string }
  | { type: 'wildcard'; value: string };

type ParsedSearch = {
  positive: SearchToken[];
  negative: SearchToken[];
};

function parseSimpleSearch(input: string): ParsedSearch {
  const positive: SearchToken[] = [];
  const negative: SearchToken[] = [];

  const tokenRegex = /(-)?("(?:[^"\\]|\\.)*"|\S+)/gi;

  for (const match of input.matchAll(tokenRegex)) {
    const isNegated = !!match[1];
    const raw = match[2];

    let token: SearchToken;

    if (raw.startsWith('"')) {
      token = { type: 'phrase', value: raw.slice(1, -1) };
    } else if (raw.includes('*')) {
      token = { type: 'wildcard', value: raw };
    } else {
      token = { type: 'word', value: raw };
    }

    (isNegated ? negative : positive).push(token);
  }

  return { positive, negative };
}

/**
 * Handles an advanced search with multiple filters.
 * @param client - Supabase client
 * @param filters - Search filters
 * @returns - Search results categorized by content type
 */
async function handleAdvancedSearch(
  client: SupabaseClient<any, 'public', any>,
  filters: {
    type?: ContentType;
    name?: string;
    rarity?: Rarity;
    availability?: Availability;
    traits?: number[];
    description?: string;
    cost?: string;
    trigger?: string;
    requirements?: string;
    level_min?: number;
    level_max?: number;
    size?: Size;
    rank_min?: number;
    rank_max?: number;
    spell_type?: 'FOCUS' | 'RITUAL' | 'NORMAL';
    cast?: ActionCost | string;
    traditions?: string[];
    defense?: string;
    range?: string;
    area?: string;
    targets?: string;
    duration?: string;
    actions?: ActionCost;
    prerequisites?: string[];
    frequency?: string;
    access?: string;
    special?: string;
    ab_type?: AbilityBlockType;
    bulk?: string;
    group?: ItemGroup;
    hands?: string;
    craft_requirements?: string;
    usage?: string;
    content_sources?: number[];
  }
): Promise<JSendResponseSuccess> {
  function applySimpleSearch(
    query: PostgrestFilterBuilder<any, any, any>,
    column: string,
    search: string
  ) {
    const parsed = parseSimpleSearch(search);

    // -----------------------------
    // AND: plain words
    // -----------------------------
    for (const t of parsed.positive) {
      if (t.type === 'word') {
        query = query.ilike(column, `%${t.value}%`);
      }
    }

    // -----------------------------
    // OR: phrases / wildcards
    // -----------------------------
    const orClauses = parsed.positive
      .filter((t) => t.type !== 'word')
      .map((t) => {
        switch (t.type) {
          case 'phrase':
            return `${column}.ilike.%${t.value}%`;

          case 'wildcard':
            return `${column}.ilike.${t.value.replace(/\*/g, '%')}`;
        }
      });
    if (orClauses.length) {
      query = query.or(orClauses.join(','));
    }

    // -----------------------------
    // NOT: negatives (unchanged)
    // -----------------------------
    for (const t of parsed.negative) {
      query = query.not(column, 'ilike', `%${t.value.replace(/\*/g, '%')}%`);
    }

    return query;
  }

  const applyCommonFilters = (query: PostgrestFilterBuilder<any, any, any>) => {
    if (filters.name) {
      query = applySimpleSearch(query, 'name', filters.name);
    }
    if (filters.description) {
      query = applySimpleSearch(query, 'description', filters.description);
    }
    if (filters.rarity) {
      query = query.eq('rarity', filters.rarity);
    }
    if (filters.availability) {
      query = query.eq('availability', filters.availability);
    }
    if (filters.traits?.length) {
      query = query.contains('traits', filters.traits);
    }
    if (filters.cost) {
      query = applySimpleSearch(query, 'cost', filters.cost);
    }
    if (filters.trigger) {
      query = applySimpleSearch(query, 'trigger', filters.trigger);
    }
    if (filters.requirements) {
      query = applySimpleSearch(query, 'requirements', filters.requirements);
    }
    if (filters.size) {
      query = query.eq('size', filters.size);
    }
    if (filters.content_sources?.length) {
      query = query.in('content_source_id', filters.content_sources);
    }

    // First sort by level/rank
    if (filters.type === 'spell') {
      query = query.order('rank', { ascending: true });
    } else {
      query = query.order('level', { ascending: true });
    }

    // Secondary sort by name
    query = query.order('name', { ascending: true });

    return query;
  };

  const searchAbilityBlocks = async () => {
    let q = client.from('ability_block').select();
    q = applyCommonFilters(q);

    if (filters.actions) q = q.eq('actions', filters.actions);
    if (filters.ab_type) q = q.eq('type', filters.ab_type);
    if (filters.level_min !== undefined) q = q.gte('level', filters.level_min);
    if (filters.level_max !== undefined) q = q.lte('level', filters.level_max);
    if (filters.frequency) q = applySimpleSearch(q, 'frequency', filters.frequency);
    if (filters.prerequisites?.length) q = q.contains('prerequisites', filters.prerequisites);
    if (filters.access) q = applySimpleSearch(q, 'access', filters.access);
    if (filters.special) q = applySimpleSearch(q, 'special', filters.special);

    const { data } = await q;
    return data ?? [];
  };

  const searchSpells = async () => {
    let q = client.from('spell').select();
    q = applyCommonFilters(q);

    if (filters.rank_min !== undefined) q = q.gte('rank', filters.rank_min);
    if (filters.rank_max !== undefined) q = q.lte('rank', filters.rank_max);
    if (filters.cast) q = q.eq('cast', filters.cast);
    if (filters.traditions?.length) q = q.overlaps('traditions', filters.traditions);
    if (filters.range) q = applySimpleSearch(q, 'range', filters.range);
    if (filters.area) q = applySimpleSearch(q, 'area', filters.area);
    if (filters.targets) q = applySimpleSearch(q, 'targets', filters.targets);
    if (filters.duration) q = applySimpleSearch(q, 'duration', filters.duration);
    if (filters.defense) q = applySimpleSearch(q, 'defense', filters.defense);
    if (filters.spell_type) {
      if (filters.spell_type === 'FOCUS') {
        q = q
          .or(['traits.cs.{1856}', 'meta_data->focus.not.is.null'].join(','))
          .not('meta_data->focus', 'eq', false);
      } else if (filters.spell_type === 'RITUAL') {
        q = q.not('meta_data->ritual', 'is', null).not('meta_data->ritual', 'eq', false);
      } else if (filters.spell_type === 'NORMAL') {
        q = q
          .or(['meta_data->focus.is.null', 'meta_data->focus.eq.false'].join(','))
          .or(['meta_data->ritual.is.null', 'meta_data->ritual.eq.false'].join(','));
      }
    }

    const { data } = await q;
    return data ?? [];
  };

  const searchItems = async () => {
    let q = client.from('item').select();
    q = applyCommonFilters(q);

    if (filters.level_min !== undefined) q = q.gte('level', filters.level_min);
    if (filters.level_max !== undefined) q = q.lte('level', filters.level_max);
    if (filters.bulk) q = q.eq('bulk', filters.bulk);
    if (filters.group) q = q.eq('group', filters.group);
    if (filters.hands) q = q.eq('hands', filters.hands);
    if (filters.usage) q = applySimpleSearch(q, 'usage', filters.usage);
    if (filters.craft_requirements)
      q = applySimpleSearch(q, 'craft_requirements', filters.craft_requirements);

    const { data } = await q;
    return data ?? [];
  };

  const simpleTableSearch = async (table: TableName) => {
    let q = client.from(table).select();
    q = applyCommonFilters(q);
    const { data } = await q;
    return data ?? [];
  };

  let results: {
    ability_blocks?: any[];
    ancestries?: any[];
    archetypes?: any[];
    backgrounds?: any[];
    classes?: any[];
    creatures?: any[];
    items?: any[];
    languages?: any[];
    spells?: any[];
    traits?: any[];
    versatile_heritages?: any[];
  } = {};

  if (filters.type) {
    if (filters.type === 'ability-block') {
      results.ability_blocks = await searchAbilityBlocks();
    } else if (filters.type === 'spell') {
      results.spells = await searchSpells();
    } else if (filters.type === 'item') {
      results.items = await searchItems();
    } else if (filters.type === 'creature') {
      results.creatures = []; // Creature search not implemented yet
    } else if (filters.type === 'ancestry') {
      results.ancestries = await simpleTableSearch('ancestry');
    } else if (filters.type === 'archetype') {
      results.archetypes = await simpleTableSearch('archetype');
    } else if (filters.type === 'background') {
      results.backgrounds = await simpleTableSearch('background');
    } else if (filters.type === 'class') {
      results.classes = await simpleTableSearch('class');
    } else if (filters.type === 'language') {
      results.languages = await simpleTableSearch('language');
    } else if (filters.type === 'trait') {
      results.traits = await simpleTableSearch('trait');
    } else if (filters.type === 'versatile-heritage') {
      results.versatile_heritages = await simpleTableSearch('versatile_heritage');
    }
  }

  return {
    status: 'success',
    data: {
      ability_blocks: results.ability_blocks ?? [],
      ancestries: results.ancestries ?? [],
      archetypes: results.archetypes ?? [],
      backgrounds: results.backgrounds ?? [],
      classes: results.classes ?? [],
      creatures: results.creatures ?? [],
      items: results.items ?? [],
      languages: results.languages ?? [],
      spells: results.spells ?? [],
      traits: results.traits ?? [],
      versatile_heritages: results.versatile_heritages ?? [],
    },
  };
}

/**
 * Handles a simple text search across multiple content tables.
 * @param client - Supabase client
 * @param text - Search text
 * @param content_sources - Optional content source IDs to filter by
 * @returns - Search results categorized by content type
 */
async function handleSimpleSearch(
  client: SupabaseClient<any, 'public', any>,
  text: string,
  content_sources?: number[]
): Promise<JSendResponseSuccess> {
  if (text.length < 2) {
    return {
      status: 'success',
      data: {
        ability_blocks: [],
        ancestries: [],
        archetypes: [],
        backgrounds: [],
        classes: [],
        creatures: [],
        items: [],
        languages: [],
        spells: [],
        traits: [],
        versatile_heritages: [],
      },
    };
  }

  const searchTable = async function (tableName: TableName, text: string) {
    let query = client.from(tableName).select();
    if (content_sources) {
      query = query.in('content_source_id', content_sources);
    }
    query = query.textSearch('name', text, {
      type: 'websearch',
      config: 'english',
    });
    const { data, error } = await query;
    if (error) {
      return [];
    } else {
      return data;
    }
  };

  const results = await Promise.all([
    searchTable('ability_block', text),
    searchTable('ancestry', text),
    searchTable('archetype', text),
    searchTable('background', text),
    searchTable('class', text),
    searchTable('creature', text),
    searchTable('item', text),
    searchTable('language', text),
    searchTable('spell', text),
    searchTable('trait', text),
    searchTable('versatile_heritage', text),
  ]);

  return {
    status: 'success',
    data: {
      ability_blocks: results[0],
      ancestries: results[1],
      archetypes: results[2],
      backgrounds: results[3],
      classes: results[4],
      creatures: results[5],
      items: results[6],
      languages: results[7],
      spells: results[8],
      traits: results[9],
      versatile_heritages: results[10],
    },
  };
}
