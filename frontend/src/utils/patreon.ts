import type { PublicUser } from '@schemas/content';

/** Use server-derived migration state, including profiles cached before that state existed. */
export function getPatreonReconnectTarget(user: PublicUser | null): 'self' | 'game_master' | null {
  const patreon = user?.patreon;
  if (!patreon) return null;
  const ownLink = Boolean(patreon.patreon_user_id || patreon.access_token || patreon.tier);
  if (ownLink && ['migration_required', 'reconnect_required'].includes(patreon.connection_status ?? '')) return 'self';
  if (['migration_required', 'reconnect_required'].includes(patreon.game_master?.virtual_tier?.access_status ?? ''))
    return 'game_master';
  return null;
}

/** Cached UI gates never substitute for the server's live v2 entitlement verification. */
export function hasPatreonAccess(user: PublicUser | null, accessLevel: 0 | 1 | 2 | 3 | 4): boolean {
  if (!user) return false;
  if (accessLevel === 0) return true;
  if (accessLevel <= 2 && (user.is_community_paragon || user.is_developer)) return true;
  if (['connected', 'migration_required'].includes(user.patreon?.connection_status ?? '')) {
    const tiers = ['ADVOCATE', 'WANDERER', 'LEGEND', 'GAME-MASTER'];
    if (tiers.indexOf(user.patreon?.tier ?? '') >= accessLevel - 1) return true;
  }
  return (
    accessLevel <= 2 &&
    ['connected', 'migration_required'].includes(user.patreon?.game_master?.virtual_tier?.access_status ?? '')
  );
}
