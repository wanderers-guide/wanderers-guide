import { authenticatedFetch } from '../authenticatedFetch.js';
import { API_URL } from '../constants.js';
import type {
  BucketThreadsResponse,
  BucketsResponse,
  ConversationResponse,
  FeedbackByPageResponse,
  FeedbackResponse,
  KpiResponse,
  SearchResponse,
  ViewsResponse,
  VisitorsResponse,
} from './types.js';

type Params = Record<string, string | number | undefined>;

async function request<T>(path: string, params: Params = {}): Promise<T> {
  const url = new URL(`${API_URL}/api/cli/analytics${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await authenticatedFetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error (${res.status}): ${body || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export function getKpi(
  opts: {
    dateFrom: string;
    dateTo: string;
    page?: string;
  },
  subdomain?: string
) {
  return request<KpiResponse>('/kpi', { ...opts, subdomain });
}

export function getFeedback(
  opts: {
    dateFrom: string;
    dateTo: string;
    limit?: number;
    cursor?: string;
    source?: string;
    status?: string;
  },
  subdomain?: string
) {
  return request<FeedbackResponse>('/feedback', { ...opts, subdomain });
}

export function getFeedbackByPage(
  opts: {
    dateFrom: string;
    dateTo: string;
    limit?: number;
    source?: string;
    status?: string;
  },
  subdomain?: string
) {
  return request<FeedbackByPageResponse>('/feedback/by-page', { ...opts, subdomain });
}

export function getConversations(
  opts: {
    dateFrom: string;
    dateTo: string;
    limit?: number;
    cursor?: string;
  },
  subdomain?: string
) {
  return request<ConversationResponse>('/assistant', { ...opts, subdomain });
}

export function getSearches(
  opts: {
    dateFrom: string;
    dateTo: string;
    limit?: number;
    cursor?: string;
  },
  subdomain?: string
) {
  return request<SearchResponse>('/searches', { ...opts, subdomain });
}

export function getViews(
  opts: {
    dateFrom: string;
    dateTo: string;
    limit?: number;
    offset?: number;
  },
  subdomain?: string
) {
  return request<ViewsResponse>('/views', { ...opts, subdomain });
}

export function getVisitors(
  opts: {
    dateFrom: string;
    dateTo: string;
    limit?: number;
    offset?: number;
  },
  subdomain?: string
) {
  return request<VisitorsResponse>('/visitors', { ...opts, subdomain });
}

export function getBuckets(
  opts: {
    dateFrom?: string;
    dateTo?: string;
    topK?: number;
  },
  subdomain?: string
) {
  return request<BucketsResponse>('/conversations/buckets', { ...opts, subdomain });
}

export function getBucketThreads(
  bucketId: string,
  opts: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    cursor?: string;
  },
  subdomain?: string
) {
  return request<BucketThreadsResponse>(`/conversations/buckets/${encodeURIComponent(bucketId)}`, {
    ...opts,
    subdomain,
  });
}
