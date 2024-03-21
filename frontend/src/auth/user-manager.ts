import { makeRequest } from '@requests/request-manager';
import { PublicUser } from '@typing/content';

export async function getPublicUser(id?: string) {
  return await makeRequest<PublicUser>('get-user', {
    id,
  });
}
