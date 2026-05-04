import {
  getFeedback,
  getFeedbackByPage,
  getBuckets,
  getBucketThreads,
  getConversations,
  getKpi,
  getSearches,
  getViews,
  getVisitors,
} from '../../src/analytics/client.js';

vi.mock('../../src/keyring.js', () => ({
  getAccessToken: vi.fn().mockResolvedValue(null),
  getRefreshToken: vi.fn().mockResolvedValue(null),
  storeCredentials: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.stubEnv('MINTLIFY_SESSION_TOKEN', 'test-token');
  vi.stubEnv('MINTLIFY_API_URL', 'http://test-server:5000');
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function mockOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

function mockError(status: number, body: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Bad Request',
    text: () => Promise.resolve(body),
  });
}

function calledUrl(): string {
  const arg = mockFetch.mock.calls[0]![0];
  return typeof arg === 'string' ? arg : String(arg);
}

function calledUrlObj(): URL {
  return new URL(calledUrl());
}

describe('client auth', () => {
  it('throws when no session token is set', async () => {
    vi.stubEnv('MINTLIFY_SESSION_TOKEN', '');
    await expect(getFeedback({ dateFrom: '2024-01-01', dateTo: '2024-01-31' })).rejects.toThrow(
      'Not authenticated'
    );
  });

  it('sends session cookie header', async () => {
    mockOk({ feedback: [], nextCursor: null, hasMore: false });
    await getFeedback({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });
});

describe('client request handling', () => {
  it('throws on API error', async () => {
    mockError(400, 'Invalid params');
    await expect(getFeedback({ dateFrom: '2024-01-01', dateTo: '2024-01-31' })).rejects.toThrow(
      'API error (400): Invalid params'
    );
  });

  it('passes subdomain as query param when provided', async () => {
    mockOk({ feedback: [], nextCursor: null, hasMore: false });
    await getFeedback({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'my-docs');
    expect(calledUrlObj().searchParams.get('subdomain')).toBe('my-docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/feedback');
  });

  it('omits subdomain param when not provided', async () => {
    mockOk({ feedback: [], nextCursor: null, hasMore: false });
    await getFeedback({ dateFrom: '2024-01-01', dateTo: '2024-01-31' });
    expect(calledUrlObj().searchParams.has('subdomain')).toBe(false);
  });

  it('sets query params and omits undefined values', async () => {
    mockOk({ feedback: [], nextCursor: null, hasMore: false });
    await getFeedback({
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      limit: 10,
      cursor: undefined,
    });
    expect(calledUrlObj().searchParams.get('dateFrom')).toBe('2024-01-01');
    expect(calledUrlObj().searchParams.get('limit')).toBe('10');
    expect(calledUrlObj().searchParams.has('cursor')).toBe(false);
  });
});

describe('endpoint paths', () => {
  it('getKpi', async () => {
    mockOk({ humanVisitors: 0 });
    await getKpi({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/kpi');
    expect(calledUrlObj().searchParams.get('subdomain')).toBe('docs');
  });

  it('getFeedbackByPage', async () => {
    mockOk({ feedback: [], hasMore: false });
    await getFeedbackByPage({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/feedback/by-page');
  });

  it('getConversations', async () => {
    mockOk({ conversations: [], nextCursor: null, hasMore: false });
    await getConversations({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/assistant');
  });

  it('getSearches', async () => {
    mockOk({ searches: [], totalSearches: 0, nextCursor: null });
    await getSearches({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/searches');
  });

  it('getViews', async () => {
    mockOk({ totals: {}, views: [], hasMore: false });
    await getViews({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/views');
  });

  it('getVisitors', async () => {
    mockOk({ totals: {}, visitors: [], hasMore: false });
    await getVisitors({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/visitors');
  });

  it('getBuckets', async () => {
    mockOk({ data: [], pagination: { total: 0 } });
    await getBuckets({ dateFrom: '2024-01-01', dateTo: '2024-01-31' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/conversations/buckets');
    expect(calledUrlObj().searchParams.get('subdomain')).toBe('docs');
  });

  it('getBucketThreads', async () => {
    mockOk({ data: [], pagination: { total: 0, hasMore: false, nextCursor: null } });
    await getBucketThreads('bucket-123', { dateFrom: '2024-01-01' }, 'docs');
    expect(calledUrlObj().pathname).toBe('/api/cli/analytics/conversations/buckets/bucket-123');
    expect(calledUrlObj().searchParams.get('subdomain')).toBe('docs');
  });
});
