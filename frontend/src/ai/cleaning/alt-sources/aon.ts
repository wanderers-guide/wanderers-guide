const AON_BASE_URL = 'https://2e.aonprd.com';

interface AoNSearchHit {
  _id: string;
  _score: number;
  _source: {
    id: string;
    name: string;
    type: string;
    category: string;
    url: string;
    summary: string;
    source: string[];
    source_raw: string[];
    rarity: string;
    trait?: string[];
    trait_raw?: string[];
    release_date?: string;
    primary_source: string;
    primary_source_raw: string;
  };
}

// Searches the Archives of Nethys (AoN) Elasticsearch API for PF2e content.
// Returns up to 20 hits sorted by relevance score.
export async function searchAoN(query: string) {
  const response = await fetch('https://elasticsearch.aonprd.com/aon-test/_search', {
    method: 'POST',
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      origin: 'https://2e.aonprd.com',
    },
    body: JSON.stringify({
      query: {
        function_score: {
          query: {
            bool: {
              should: [
                // Prefix matches on name/text for autocomplete-style search
                { match_phrase_prefix: { 'name.sayt': { query } } },
                { match_phrase_prefix: { 'legacy_name.sayt': { query } } },
                { match_phrase_prefix: { 'remaster_name.sayt': { query } } },
                { match_phrase_prefix: { 'text.sayt': { query, boost: 0.1 } } }, // body text is lower priority
                // Exact term matches for precise lookups
                { term: { name: query } },
                { term: { legacy_name: query } },
                { term: { remaster_name: query } },
                // Fuzzy multi-field fallback for typo tolerance
                {
                  bool: {
                    must: [
                      {
                        multi_match: {
                          query,
                          type: 'best_fields',
                          fields: ['name', 'legacy_name', 'remaster_name', 'text^0.1', 'trait_raw', 'type'],
                          fuzziness: 'auto',
                        },
                      },
                    ],
                  },
                },
              ],
              minimum_should_match: 1,
              must_not: [
                // Exclude hidden, legacy-superseded, and child items from results
                { term: { exclude_from_search: true } },
                { term: { category: 'item-bonus' } },
                { exists: { field: 'remaster_id' } }, // has a remastered version, show that instead
                { exists: { field: 'item_child_id' } }, // sub-items (e.g. specific magic items)
              ],
            },
          },
          boost_mode: 'multiply',
          functions: [
            // Boost core character-building content to the top
            { filter: { terms: { type: ['Ancestry', 'Class', 'Versatile Heritage'] } }, weight: 1.2 },
            { filter: { terms: { type: ['Trait'] } }, weight: 1.05 },
          ],
        },
      },
      size: 20,
      sort: ['_score', '_doc'],
      _source: { excludes: ['text'] }, // omit full text body to keep response size down
    }),
  });

  if (!response.ok) {
    throw new Error(`AoN search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data.hits.hits as AoNSearchHit[]).map((hit) => {
    return {
      name: hit._source.name,
      type: hit._source.type,
      category: hit._source.category,
      rarity: hit._source.rarity,
      source: hit._source.primary_source,
      summary: hit._source.summary,
      traits: hit._source.trait_raw,
      fullUrl: `${AON_BASE_URL}${hit._source.url}`,
    };
  });
}
