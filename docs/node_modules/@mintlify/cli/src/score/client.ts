import { authenticatedFetch } from '../authenticatedFetch.js';
import { API_URL } from '../constants.js';
import type { ResolveResult, ScoreResponse } from './types.js';

export async function resolveScoreForUrl(url: string): Promise<ResolveResult> {
  const endpoint = new URL(`${API_URL}/api/cli/score`);
  endpoint.searchParams.set('url', url);

  const res = await authenticatedFetch(endpoint.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (res.status !== 200 && res.status !== 202) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error (${res.status}): ${body || res.statusText}`);
  }

  return res.json() as Promise<ResolveResult>;
}

export async function fetchScoreBySlug(slug: string): Promise<ScoreResponse | null> {
  const endpoint = new URL(`${API_URL}/api/cli/score/${encodeURIComponent(slug)}`);

  const res = await authenticatedFetch(endpoint.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 202) return null;

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error (${res.status}): ${body || res.statusText}`);
  }

  return res.json() as Promise<ScoreResponse>;
}
