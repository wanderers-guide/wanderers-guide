import { PublicUser } from '@typing/content';

export function hasPatreonAccess(user: PublicUser | null, accessLevel: 0 | 1 | 2 | 3 | 4): boolean {
  if (!user) return false;
  if (accessLevel === 0) return true;
  if (accessLevel === 4) return user.patreon?.tier === 'GAME-MASTER';
  if (accessLevel === 3) return user.patreon?.tier === 'LEGEND' || user.patreon?.tier === 'GAME-MASTER';

  if (user.patreon?.game_master?.virtual_tier?.game_master_user_id && user.patreon?.tier !== 'GAME-MASTER') {
    // If in Game Master group (and it's implied that accessLevel is now a tier that we have access to)
    return true;
  }

  // If they're a great member of the community, they have access
  if (user.is_community_paragon || user.is_developer) {
    return true;
  }

  if (accessLevel === 2)
    return user.patreon?.tier === 'WANDERER' || user.patreon?.tier === 'LEGEND' || user.patreon?.tier === 'GAME-MASTER';
  if (accessLevel === 1)
    return (
      user.patreon?.tier === 'ADVOCATE' ||
      user.patreon?.tier === 'WANDERER' ||
      user.patreon?.tier === 'LEGEND' ||
      user.patreon?.tier === 'GAME-MASTER'
    );

  return false;
}
