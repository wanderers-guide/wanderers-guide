import { makeRequest } from '@requests/request-manager';
import { PublicUser } from '@typing/content';

export async function getPublicUser(id?: string) {
  try {
    const user = await makeRequest<PublicUser>(
      'get-user',
      {
        id,
      },
      false
    );

    if (!id) {
      // Only store if we're fetching the current user
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('user-data', JSON.stringify(user ?? {}));
      }
    }
    return user;
  } catch (e) {
    console.error('Error fetching public user:', e);
    return null;
  }
}

export function getCachedPublicUser(): PublicUser | null {
  if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem('user-data');
    return data ? JSON.parse(data) : null;
  } else {
    return null;
  }
}

export function clearUserData() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('user-data');
  }
}
