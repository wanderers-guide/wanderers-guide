import { CleaningUtils } from '../CleaningUtils';

const DP_BASE_URL = 'https://app.demiplane.com/nexus/pathfinder2e';

// Searches Demiplane for PF2e content. Returns a compact list of search results with
// their names, types, and full URLs so the agent can fetchPageText on the best match.
export async function searchDp(query: string): Promise<string> {
  const url = `${DP_BASE_URL}/search-results?nexus=pathfinder2e&referringNexus=pathfinder2e&term=${encodeURIComponent(query)}`;
  const prompt = `Extract every search result on this page as a JSON array. Each entry should have: name (string), type (content type e.g. item/spell/feat), description (short summary if shown), and url (the full link to that result's page). Do not include anything else.`;
  return CleaningUtils.fetchPageText(url, prompt);
}
