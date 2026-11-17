import type { PublicUser } from './content.d.ts';

export type PatreonConnectionStatus =
  | 'not_connected'
  | 'connected'
  | 'migration_required'
  | 'reconnect_required';

/** Derive migration state from verified grant provenance; cached tiers never prove v2 consent. */
export function getPatreonConnectionStatus(
  patreon: PublicUser['patreon'],
  currentClientId = Deno.env.get('PATREON_V2_CLIENT_ID') ?? '',
): PatreonConnectionStatus {
  if (!patreon?.patreon_user_id && !patreon?.access_token && !patreon?.tier) return 'not_connected';
  if (!patreon?.access_token || (patreon.oauth_scopes && !patreon.oauth_scopes.includes('identity')))
    return 'reconnect_required';
  if (currentClientId && patreon.oauth_client_id === currentClientId) return 'connected';
  // Missing provenance cannot prove that a still-working v2 token is invalid.
  return 'migration_required';
}
