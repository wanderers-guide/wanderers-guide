// @ts-ignore
import { serve } from 'std/server';
import { TableName, connect } from '../_shared/helpers.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { text, content_sources } = body as {
      text: string;
      content_sources?: number[];
    };

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
  });
});
