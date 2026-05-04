import { getAccessToken } from './keyring.js';
import { refreshAccessToken } from './tokenRefresh.js';

async function getKeyringToken(): Promise<string | null> {
  try {
    return await getAccessToken();
  } catch {
    return null;
  }
}

export async function authenticatedFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  const keyringToken = await getKeyringToken();
  const envToken = process.env.MINTLIFY_SESSION_TOKEN;
  const token = keyringToken ?? envToken;

  if (!token) {
    throw new Error('Not authenticated. Run `mint login` to authenticate.');
  }

  const makeRequest = (t: string) =>
    fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${t}` },
    });

  const res = await makeRequest(token);
  if (res.status !== 401) return res;

  // If the keyring token expired, try refreshing it
  if (keyringToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return makeRequest(refreshed);
  }

  // Fall back to the env session token if it wasn't already used
  if (envToken && token !== envToken) {
    return makeRequest(envToken);
  }

  return res;
}
