import { CleaningUtils } from '../CleaningUtils';

const DP_BASE_URL = 'https://app.demiplane.com/nexus/pathfinder2e';

// Searches Demiplane for PF2e content and returns AI-extracted results focused on the query.
export async function searchDp(query: string): Promise<string> {
  const url = `${DP_BASE_URL}/search-results?nexus=pathfinder2e&referringNexus=pathfinder2e&term=${encodeURIComponent(query)}`;
  const prompt = `Extract information related to "${query}". All content must be about this topic. Focus on concise, relevant details and ignore unrelated information. Return the result as markdown.`;
  return CleaningUtils.fetchPageText(url, prompt);
}
