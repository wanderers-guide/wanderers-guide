import { makeRequest } from '@requests/request-manager';
import { PublicUser } from '@typing/content';

export async function getPublicUser(id?: string) {
  const user = await makeRequest<PublicUser>('get-user', {
    id,
  });

  localStorage.setItem('user-data', JSON.stringify(user ?? {}));
  return user;
}

export function getCachedPublicUser(): PublicUser | null {
  const data = localStorage.getItem('user-data');
  return data ? JSON.parse(data) : null;
}

export function hasPatronPermission(user: PublicUser | null) {
  if (!user) {
    return false;
  }

  if (user.is_mod || user.is_admin) {
    return true;
  }

  if (user.patreon_tier === 'WANDERER' || user.patreon_tier === 'LEGEND' || user.patreon_tier === 'GAME-MASTER') {
    return true;
  }

  return false;
}
