import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKeytar = {
  setPassword: vi.fn().mockResolvedValue(undefined),
  getPassword: vi.fn().mockResolvedValue('test-token'),
  deletePassword: vi.fn().mockResolvedValue(true),
};

vi.mock('keytar', () => ({
  default: mockKeytar,
  setPassword: mockKeytar.setPassword,
  getPassword: mockKeytar.getPassword,
  deletePassword: mockKeytar.deletePassword,
}));

describe('keyring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('stores access and refresh tokens via keytar', async () => {
    const { storeCredentials } = await import('../src/keyring.js');
    await storeCredentials('access', 'refresh');
    expect(mockKeytar.setPassword).toHaveBeenCalledWith('mintlify', 'access_token', 'access');
    expect(mockKeytar.setPassword).toHaveBeenCalledWith('mintlify', 'refresh_token', 'refresh');
  });

  it('retrieves the access token via keytar', async () => {
    const { getAccessToken } = await import('../src/keyring.js');
    const token = await getAccessToken();
    expect(token).toBe('test-token');
    expect(mockKeytar.getPassword).toHaveBeenCalledWith('mintlify', 'access_token');
  });

  it('retrieves the refresh token via keytar', async () => {
    const { getRefreshToken } = await import('../src/keyring.js');
    const token = await getRefreshToken();
    expect(token).toBe('test-token');
    expect(mockKeytar.getPassword).toHaveBeenCalledWith('mintlify', 'refresh_token');
  });

  it('deletes both tokens via keytar', async () => {
    const { clearCredentials } = await import('../src/keyring.js');
    await clearCredentials();
    expect(mockKeytar.deletePassword).toHaveBeenCalledWith('mintlify', 'access_token');
    expect(mockKeytar.deletePassword).toHaveBeenCalledWith('mintlify', 'refresh_token');
  });

  it('throws a helpful error when keytar is not installed', async () => {
    vi.doMock('keytar', () => {
      throw new Error('Cannot find module');
    });
    const { storeCredentials } = await import('../src/keyring.js');
    await expect(storeCredentials('a', 'b')).rejects.toThrow(
      'keytar is required for credential storage but is not installed'
    );
  });
});
