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
