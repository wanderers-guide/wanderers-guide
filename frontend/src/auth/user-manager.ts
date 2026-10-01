import { makeRequest } from '@requests/request-manager';
import { PublicUser } from '@schemas/content';
import { supabase } from '../supabase-client';

type SharedProfileRequest = {
  scope: number;
  promise: Promise<PublicUser | null>;
};
const currentUserRequests = new Map<string, SharedProfileRequest>();

/** Clearing account data invalidates pending profile publications, including same-account sign-ins. */
let userDataGeneration = 0;

/** A slower older response must not overwrite a newer, independently refreshed profile. */
let latestProfileRequest = 0;

/** Load a current profile under the captured actor and publish only its latest valid response. */
async function fetchCurrentUser(actorId: string, generation: number): Promise<PublicUser | null> {
  const requestNumber = ++latestProfileRequest;
  const user = await makeRequest<PublicUser>('get-user', { id: undefined }, false, {
    expectedActorId: actorId,
    throwOnFailure: true,
  });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (generation !== userDataGeneration || session?.user.id !== actorId) {
    throw new Error('Current account changed while loading the profile.');
  }
  if (typeof localStorage !== 'undefined' && user && requestNumber === latestProfileRequest) {
    localStorage.setItem('user-data', JSON.stringify(user));
  }
  return user;
}

/** Read a profile, optionally sharing only concurrent current-account content lookups. */
export async function getPublicUser(
  id?: string,
  options?: { throwOnFailure?: boolean; sharedReadScope?: number }
): Promise<PublicUser | null> {
  try {
    if (!id) {
      const generation = userDataGeneration;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;
      if (generation !== userDataGeneration) throw new Error('Current account changed while loading the profile.');

      // Ordinary reads remain independent, especially refreshes immediately after a profile write.
      const scope = options?.sharedReadScope;
      if (scope === undefined) {
        currentUserRequests.delete(session.user.id);
        return await fetchCurrentUser(session.user.id, generation);
      }

      const actorId = session.user.id;
      let request = currentUserRequests.get(actorId);
      if (!request || request.scope !== scope) {
        const pending = fetchCurrentUser(actorId, generation).finally(() => {
          // Clearing and signing back in may have installed a newer request for this actor.
          if (currentUserRequests.get(actorId)?.promise === pending) currentUserRequests.delete(actorId);
        });
        request = { scope, promise: pending };
        currentUserRequests.set(actorId, request);
      }
      return await request.promise;
    }
    return await makeRequest<PublicUser>(
      'get-user',
      {
        id,
      },
      false,
      options
    );
  } catch (e) {
    console.error('Error fetching public user:', e);
    if (options?.throwOnFailure) throw e;
    return null;
  }
}

export function getCachedPublicUser(): PublicUser | null {
  if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem('user-data');
    if (!data) return null;
    const user = JSON.parse(data) as PublicUser | Record<string, never>;
    // Self-heal caches poisoned by the old '{}' write: an entry without an id is not
    // a real user and must read as logged-out.
    if (!user || !('id' in user)) {
      localStorage.removeItem('user-data');
      return null;
    }
    return user as PublicUser;
  } else {
    return null;
  }
}

/** Clear the display profile and invalidate pending current-account reads. */
export function clearUserData(): void {
  userDataGeneration += 1;
  currentUserRequests.clear();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('user-data');
  }
}
