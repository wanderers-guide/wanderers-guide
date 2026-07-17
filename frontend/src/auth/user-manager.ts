import { makeRequest } from '@requests/request-manager';
import { PublicUser } from '@schemas/content';
import { supabase } from '../supabase-client';

export async function getPublicUser(id?: string) {
  try {
    if (!id) {
      // Fetching "the current user" without a session always resolves to null, but it
      // still cost a full get-user round-trip — and hot paths (e.g. fetchContentSources
      // during spotlight search) call this on every invocation, so signed-out visitors
      // paid it repeatedly. getSession() is a local storage read when signed out, so
      // this short-circuit is free; signed-in behavior is unchanged.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;
    }
    const user = await makeRequest<PublicUser>(
      'get-user',
      {
        id,
      },
      false
    );

    if (!id) {
      // Only store if we're fetching the current user. A FAILED fetch (user = null,
      // e.g. because the session expired mid-visit) must not overwrite the cache: it
      // used to store '{}', and since an empty object is truthy, getCachedPublicUser()
      // then reported a logged-in user forever — the UI acted signed-in while every
      // request silently failed.
      if (typeof localStorage !== 'undefined' && user) {
        localStorage.setItem('user-data', JSON.stringify(user));
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

export function clearUserData() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('user-data');
  }
}
