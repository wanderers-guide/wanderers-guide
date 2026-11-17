import {
  exchangePatreonCode,
  fetchPatreonIdentity,
  PatreonApiError,
  refreshPatreonToken,
  patreonClient,
} from './patreon-api.ts';
import type { PublicUser } from './content.d.ts';
import { HttpError } from './http-errors.ts';
import { getPatreonConnectionStatus } from './patreon-connection.ts';
import { savePatreonConnection, saveRefreshedPatreonConnection } from './patreon-store.ts';
import { applyCreatorMembership } from './patreon-creator.ts';
import _ from 'lodash';
import { fetchData, logEvent } from './helpers.ts';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

type PatreonAccessOptions = { throwOnFailure?: boolean };

const GM_GROUP_SIZE_CAP = 99;

/** Compare a live membership with the requested benefit level. Sponsorship is checked separately. */
function checkAccessLevel(user: PublicUser, accessLevel: 0 | 1 | 2 | 3 | 4): boolean {
  if (accessLevel === 0) return true;
  const tiers = ['ADVOCATE', 'WANDERER', 'LEGEND', 'GAME-MASTER'];
  return tiers.indexOf(user.patreon?.tier ?? '') >= accessLevel - 1;
}

async function addPatreonData(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  data: {
    patreon_user_id: string;
    patreon_name?: string;
    patreon_email?: string;
    tier?: 'ADVOCATE' | 'WANDERER' | 'LEGEND' | 'GAME-MASTER';
    access_token: string;
    refresh_token?: string;
    oauth_client_id?: string;
    oauth_scopes?: string[];
  }
) {
  const previousPatreon = user.patreon;
  user = _.cloneDeep(user);
  user.patreon = {
    ...user.patreon,
    patreon_user_id: data.patreon_user_id,
    patreon_name: data.patreon_name,
    patreon_email: data.patreon_email,
    tier: data.tier,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    oauth_client_id: data.oauth_client_id,
    oauth_scopes: data.oauth_scopes,
    identity_verified_at: new Date().toISOString(),
  };
  // Create a new GM's code atomically with their membership; preserve existing groups.
  if (data.tier === 'GAME-MASTER' && !user.patreon.game_master?.access_code) {
    user.patreon.game_master = {
      ...user.patreon.game_master,
      access_code: crypto.randomUUID().replaceAll('-', ''),
    };
  }
  const saved = await savePatreonConnection(client, user, previousPatreon, user.patreon);
  if (saved) user.patreon = saved;
  return { status: saved ? 'SUCCESS' : 'CONFLICT', user };
}

/** Map safe provider failures without exposing credentials or treating migration as a lost membership. */
function verificationFailure(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  logEvent('warn', 'patreon', 'patreon_check_failed', {
    stage: error instanceof PatreonApiError ? error.stage : 'persistence',
    status: error instanceof PatreonApiError ? error.status : undefined,
  });
  const reconnect =
    error instanceof PatreonApiError &&
    (['scope', 'migration', 'identity_mismatch'].includes(error.stage) ||
      (error.stage === 'identity' && [401, 403].includes(error.status ?? 0)) ||
      (error.stage === 'token' && [400, 401, 403].includes(error.status ?? 0)));
  return new HttpError(
    503,
    reconnect
      ? 'Reconnect Patreon in Account to verify your membership.'
      : 'Patreon verification is temporarily unavailable. Please try again shortly.',
    reconnect ? 'PATREON_RECONNECT_REQUIRED' : 'PATREON_UNAVAILABLE'
  );
}

/** Surface group-verification outages as recoverable errors, preserving group data. */
async function creatorGroupTier(client: SupabaseClient<any, 'public', any>, user: PublicUser): Promise<boolean> {
  try {
    return await applyCreatorMembership(client, user);
  } catch (error) {
    throw verificationFailure(error);
  }
}

/** Verify only v2 entitlements. Virtual benefits require the sponsor's live Game Master tier. */
export async function hasPatreonAccess(
  user: PublicUser,
  accessLevel: 0 | 1 | 2 | 3 | 4,
  options?: PatreonAccessOptions
): Promise<boolean> {
  if (accessLevel === 0) return true;
  if (accessLevel <= 2 && (user.is_community_paragon || user.is_developer)) return true;
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  user = _.cloneDeep(user);
  let failure: HttpError | undefined;
  try {
    const creatorVerified = await applyCreatorMembership(client, user);
    if (creatorVerified && checkAccessLevel(user, accessLevel)) return true;
    if (!creatorVerified) {
      if (user.patreon?.patreon_user_id || user.patreon?.access_token || user.patreon?.tier) patreonClient();
      const state = getPatreonConnectionStatus(user.patreon);
      if (state === 'reconnect_required') throw new PatreonApiError('migration');
      if ((state === 'connected' || state === 'migration_required') && user.patreon) {
        const stored = user.patreon;
        let identity;
        try {
          identity = await fetchPatreonIdentity(stored.access_token ?? '');
        } catch (error) {
          if (!(error instanceof PatreonApiError) || error.status !== 401) throw error;
          if (state === 'migration_required') throw new PatreonApiError('migration');
          if (!stored.refresh_token) throw error;
          const tokens = await refreshPatreonToken(stored.refresh_token, stored.oauth_client_id ?? '');
          user.patreon = { ...stored, ...tokens };
          // Persist every valid rotated pair before rejecting permissions or making another provider request.
          const saved = await saveRefreshedPatreonConnection(client, user, stored, tokens);
          if (!saved) throw new Error('Patreon token persistence conflicted.');
          user.patreon = saved;
          if (tokens.oauth_scopes && !tokens.oauth_scopes.includes('identity')) throw new PatreonApiError('scope');
          identity = await fetchPatreonIdentity(tokens.access_token);
        }
        if (stored.patreon_user_id && identity.patreon_user_id !== stored.patreon_user_id)
          throw new PatreonApiError('identity_mismatch');
        if (identity.tier !== user.patreon.tier) {
          const result = await addPatreonData(client, user, {
            ...user.patreon,
            ...identity,
            access_token: user.patreon.access_token ?? '',
          });
          if (result.status !== 'SUCCESS') throw new Error('Patreon membership persistence failed.');
          user = result.user;
        }
        if (checkAccessLevel(user, accessLevel)) return true;
      }
    }
  } catch (error) {
    failure = verificationFailure(error);
  }

  const sponsorId = user.patreon?.game_master?.virtual_tier?.game_master_user_id;
  if (accessLevel <= 2 && sponsorId && sponsorId !== user.user_id) {
    try {
      const sponsors = await fetchData<PublicUser>(client, 'public_user', [{ column: 'user_id', value: sponsorId }]);
      if (sponsors[0] && (await hasPatreonAccess(sponsors[0], 4, { throwOnFailure: true }))) return true;
    } catch (error) {
      const sponsorFailure = verificationFailure(error);
      failure ??=
        sponsorFailure.code === 'PATREON_RECONNECT_REQUIRED'
          ? new HttpError(503, 'Your Game Master needs to reconnect Patreon.', 'PATREON_SPONSOR_RECONNECT_REQUIRED')
          : sponsorFailure;
    }
  }
  if (failure && options?.throwOnFailure) throw failure;
  return false;
}

export async function addToGameMasterGroup(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  gmUserID: string,
  accessCode: string
) {
  const previousPatreon = user.patreon;
  user = _.cloneDeep(user);
  // A player's unavailable personal link must not prevent joining a verified sponsor.
  try {
    await applyCreatorMembership(client, user);
  } catch {
    /* Sponsor verification below remains authoritative. */
  }
  if (user.patreon?.tier === 'GAME-MASTER') {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  const gmUsers = await fetchData<PublicUser>(client, 'public_user', [{ column: 'user_id', value: gmUserID }]);
  const gmUser = gmUsers.length > 0 ? gmUsers[0] : null;
  if (!gmUser) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }
  // Need to confirm the access code matches
  if (gmUser.patreon?.game_master?.access_code !== accessCode) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  if (!(await hasPatreonAccess(gmUser, 4, { throwOnFailure: true }))) return { status: 'ERROR_UNKNOWN', user };
  // Verification can outlive a code regeneration or sponsor change. Recheck before joining.
  const latestSponsors = await fetchData<PublicUser>(client, 'public_user', [{ column: 'user_id', value: gmUserID }]);
  const latestSponsor = latestSponsors[0];
  const creatorSponsor = latestSponsor ? await creatorGroupTier(client, latestSponsor) : false;
  if (
    !latestSponsor ||
    latestSponsor.deactivated ||
    latestSponsor.patreon?.tier !== 'GAME-MASTER' ||
    latestSponsor.patreon.game_master?.access_code !== accessCode ||
    (!creatorSponsor &&
      ['not_connected', 'reconnect_required'].includes(getPatreonConnectionStatus(latestSponsor.patreon)))
  )
    return { status: 'ERROR_UNKNOWN', user };
  // Count members without loading their private account records.
  const { count, error: countError } = await client
    .from('public_user')
    .select('user_id', { count: 'exact', head: true })
    .eq('patreon->game_master->virtual_tier->>game_master_user_id', gmUser.user_id);
  if (countError || count === null || count >= GM_GROUP_SIZE_CAP) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  user.patreon = {
    ...user.patreon,
    game_master: {
      virtual_tier: {
        game_master_user_id: gmUserID,
        game_master_name: latestSponsor.display_name,
        added_at: new Date().toISOString(),
      },
    },
  };
  const saved = await savePatreonConnection(client, user, previousPatreon, user.patreon);
  if (saved) user.patreon = saved;
  return { status: saved ? 'SUCCESS' : 'CONFLICT', user };
}

export async function removeFromGameMasterGroup(currentUser: PublicUser, userId: string) {
  const client = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const users = await fetchData<PublicUser>(client, 'public_user', [{ column: 'user_id', value: userId }]);
  const user = users.length > 0 ? users[0] : null;
  if (!user || !currentUser) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  const previousPatreon = user.patreon;
  // Only way the virtual_tier can be removed is if the person triggering this is the GM
  if (user.patreon?.game_master?.virtual_tier?.game_master_user_id !== currentUser.user_id) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  user.patreon = {
    ...user.patreon,
    game_master: {
      access_code: user.patreon?.game_master?.access_code,
      virtual_tier: undefined,
    },
  };
  const saved = await savePatreonConnection(client, user, previousPatreon, user.patreon);
  if (saved) user.patreon = saved;
  return { status: saved ? 'SUCCESS' : 'CONFLICT', user };
}

export async function getAllUsersInGameMasterGroup(
  user: PublicUser
): Promise<{ user_id: string; display_name: string }[]> {
  if (user.patreon?.tier !== 'GAME-MASTER') {
    return [];
  }

  const client = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Listing existing members remains available for cleanup during migration.
  const { data, error } = await client
    .from('public_user')
    .select('user_id,display_name')
    .eq('patreon->game_master->virtual_tier->>game_master_user_id', user.user_id);

  if (error) {
    return [];
  }

  return (data ?? []).map((member: { user_id: string; display_name: string }) => ({
    user_id: member.user_id,
    display_name: member.display_name,
  }));
}

export async function regenerateGameMasterAccessCode(client: SupabaseClient<any, 'public', any>, user: PublicUser) {
  user = _.cloneDeep(user);
  await creatorGroupTier(client, user);
  if (user.patreon?.tier !== 'GAME-MASTER' || !(await hasPatreonAccess(user, 4, { throwOnFailure: true }))) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  // Live verification may have rotated the grant. Re-read it before changing group metadata.
  const latest = await fetchData<PublicUser>(client, 'public_user', [{ column: 'user_id', value: user.user_id }]);
  const creatorVerified = latest[0] ? await creatorGroupTier(client, latest[0]) : false;
  if (
    !latest[0] ||
    latest[0].patreon?.tier !== 'GAME-MASTER' ||
    (!creatorVerified && getPatreonConnectionStatus(latest[0].patreon) === 'reconnect_required')
  )
    return { status: 'ERROR_UNKNOWN', user };
  user = _.cloneDeep(latest[0]);
  const previousPatreon = user.patreon;
  user.patreon = {
    ...user.patreon,
    game_master: {
      access_code: Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8),
      virtual_tier: user.patreon?.game_master?.virtual_tier,
    },
  };
  const saved = await savePatreonConnection(client, user, previousPatreon, user.patreon);
  if (saved) user.patreon = saved;
  return { status: saved ? 'SUCCESS' : 'CONFLICT', user };
}

/** Persist the authorized v2 identity only after all provider responses validate. */
export async function handlePatreonRedirect(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  code: string,
  redirectURL: string
): Promise<boolean> {
  const tokens = await exchangePatreonCode(code, redirectURL);
  const identity = await fetchPatreonIdentity(tokens.access_token);
  const result = await addPatreonData(client, user, { ...identity, ...tokens });
  return result.status === 'SUCCESS';
}
