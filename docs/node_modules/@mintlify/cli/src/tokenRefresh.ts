import { STYTCH_CLIENT_ID, TOKEN_ENDPOINT } from './constants.js';
import { getRefreshToken, storeCredentials } from './keyring.js';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

let inflightRefresh: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = doRefresh().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

async function doRefresh(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STYTCH_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) return null;

    const body = (await res.json().catch(() => null)) as TokenResponse | null;
    if (!body?.access_token || !body.refresh_token) return null;

    await storeCredentials(body.access_token, body.refresh_token);
    return body.access_token;
  } catch {
    return null;
  }
}
