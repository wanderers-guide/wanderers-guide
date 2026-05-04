const SERVICE = 'mintlify';
const ACCESS_TOKEN_ACCOUNT = 'access_token';
const REFRESH_TOKEN_ACCOUNT = 'refresh_token';

async function getKeytar(): Promise<typeof import('keytar')> {
  try {
    const mod = await import('keytar');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ESM wraps CJS in { default: ... } at runtime despite types
    return mod.default ?? mod;
  } catch {
    throw new Error(
      'keytar is required for credential storage but is not installed. Install it with: npm install keytar'
    );
  }
}

export async function storeCredentials(accessToken: string, refreshToken: string): Promise<void> {
  const keytar = await getKeytar();
  await Promise.all([
    keytar.setPassword(SERVICE, ACCESS_TOKEN_ACCOUNT, accessToken),
    keytar.setPassword(SERVICE, REFRESH_TOKEN_ACCOUNT, refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  const keytar = await getKeytar();
  return keytar.getPassword(SERVICE, ACCESS_TOKEN_ACCOUNT);
}

export async function getRefreshToken(): Promise<string | null> {
  const keytar = await getKeytar();
  return keytar.getPassword(SERVICE, REFRESH_TOKEN_ACCOUNT);
}

export async function clearCredentials(): Promise<void> {
  const keytar = await getKeytar();
  await Promise.all([
    keytar.deletePassword(SERVICE, ACCESS_TOKEN_ACCOUNT),
    keytar.deletePassword(SERVICE, REFRESH_TOKEN_ACCOUNT),
  ]);
}
