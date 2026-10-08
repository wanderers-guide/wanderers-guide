export const PATREON_URL = 'https://www.patreon.com/wanderersguide';
export const DISCORD_URL = 'https://discord.gg/FxsFZVvedr';
export const LEGACY_URL = 'https://legacy.wanderersguide.app/';
export const DOCS_URL = import.meta.env.DEV ? 'http://localhost:3210/' : 'https://docs.wanderersguide.app/';
const patreonClientId =
  import.meta.env.VITE_PATREON_CLIENT_ID || 'aBqIxkTVj_uSKpBKZV53_ldY96n2GHgUvAKKVdwTURDE5T0n-1SgRgXVSzKkd0a0';
// identity alone includes memberships to the app creator's campaign; no access to unrelated pledges.
export const PATREON_AUTH_URL = `https://www.patreon.com/oauth2/authorize?${new URLSearchParams({
  response_type: 'code',
  client_id: patreonClientId,
  redirect_uri: `${window.location.origin}/auth/patreon/redirect`,
  scope: 'identity identity[email]',
})}`;
