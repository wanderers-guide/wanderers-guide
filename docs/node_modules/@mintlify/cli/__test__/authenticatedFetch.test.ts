import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { authenticatedFetch } from '../src/authenticatedFetch.js';

const mockGetAccessToken = vi.fn();
const mockGetRefreshToken = vi.fn();
const mockStoreCredentials = vi.fn();

vi.mock('../src/keyring.js', () => ({
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...args),
  storeCredentials: (...args: unknown[]) => mockStoreCredentials(...args),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('authenticatedFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubEnv('MINTLIFY_SESSION_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends access token from keyring', async () => {
    mockGetAccessToken.mockResolvedValue('access-123');
    mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));

    await authenticatedFetch('http://test/api');

    expect(mockFetch).toHaveBeenCalledWith('http://test/api', {
      headers: { Authorization: 'Bearer access-123' },
    });
  });

  it('falls back to MINTLIFY_SESSION_TOKEN env var', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    vi.stubEnv('MINTLIFY_SESSION_TOKEN', 'env-token');
    mockFetch.mockResolvedValueOnce(makeResponse(200));

    await authenticatedFetch('http://test/api');

    expect(mockFetch).toHaveBeenCalledWith('http://test/api', {
      headers: { Authorization: 'Bearer env-token' },
    });
  });

  it('throws when no token is available', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    await expect(authenticatedFetch('http://test/api')).rejects.toThrow('Not authenticated');
  });

  it('refreshes token on 401 and retries', async () => {
    mockGetAccessToken.mockResolvedValue('expired-token');
    mockGetRefreshToken.mockResolvedValue('refresh-123');
    mockStoreCredentials.mockResolvedValue(undefined);

    mockFetch
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(
        makeResponse(200, {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          token_type: 'bearer',
          expires_in: 3600,
        })
      )
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await authenticatedFetch('http://test/api');

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenLastCalledWith('http://test/api', {
      headers: { Authorization: 'Bearer new-access' },
    });
  });

  it('falls back to env token when refresh fails', async () => {
    mockGetAccessToken.mockResolvedValue('expired-token');
    mockGetRefreshToken.mockResolvedValue('bad-refresh');
    vi.stubEnv('MINTLIFY_SESSION_TOKEN', 'env-token');

    mockFetch
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(400, { error: 'invalid_grant' }))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await authenticatedFetch('http://test/api');

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenLastCalledWith('http://test/api', {
      headers: { Authorization: 'Bearer env-token' },
    });
  });

  it('returns original 401 when refresh fails and no env token', async () => {
    mockGetAccessToken.mockResolvedValue('expired-token');
    mockGetRefreshToken.mockResolvedValue('bad-refresh');

    mockFetch
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(400, { error: 'invalid_grant' }));

    const res = await authenticatedFetch('http://test/api');

    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to env token when no refresh token exists', async () => {
    mockGetAccessToken.mockResolvedValue('expired-token');
    mockGetRefreshToken.mockResolvedValue(null);
    vi.stubEnv('MINTLIFY_SESSION_TOKEN', 'env-token');

    mockFetch
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await authenticatedFetch('http://test/api');

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith('http://test/api', {
      headers: { Authorization: 'Bearer env-token' },
    });
  });

  it('returns original 401 when no refresh token and no env token', async () => {
    mockGetAccessToken.mockResolvedValue('expired-token');
    mockGetRefreshToken.mockResolvedValue(null);

    mockFetch.mockResolvedValueOnce(makeResponse(401));

    const res = await authenticatedFetch('http://test/api');

    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh when only env token is available', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    vi.stubEnv('MINTLIFY_SESSION_TOKEN', 'env-token');

    mockFetch.mockResolvedValueOnce(makeResponse(401));

    const res = await authenticatedFetch('http://test/api');

    expect(res.status).toBe(401);
    expect(mockGetRefreshToken).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('merges custom headers with auth header', async () => {
    mockGetAccessToken.mockResolvedValue('token-123');
    mockFetch.mockResolvedValueOnce(makeResponse(200));

    await authenticatedFetch('http://test/api', {
      headers: { Accept: 'application/json' },
    });

    expect(mockFetch).toHaveBeenCalledWith('http://test/api', {
      headers: { Accept: 'application/json', Authorization: 'Bearer token-123' },
    });
  });
});
