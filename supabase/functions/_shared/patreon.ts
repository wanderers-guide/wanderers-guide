import * as patreon from 'patreon';
import type { PublicUser } from './content';
import _ from 'lodash';
import { fetchData, updateData } from './helpers.ts';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

const patreonAPI = patreon.patreon;
const patreonOAuth = patreon.oauth;

async function checkAccessLevel(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  accessLevel: 0 | 1 | 2 | 3 | 4
) {
  if (accessLevel === 0) return true;
  if (accessLevel === 4) return user.patreon?.tier === 'GAME-MASTER';
  if (accessLevel === 3)
    return user.patreon?.tier === 'LEGEND' || user.patreon?.tier === 'GAME-MASTER';

  if (
    user.patreon?.game_master?.virtual_tier?.game_master_user_id &&
    user.patreon?.tier !== 'GAME-MASTER'
  ) {
    // If in Game Master group (and it's implied that accessLevel is now a tier that we have access to)
    const gmUsers = await fetchData<PublicUser>(client, 'public_user', [
      { column: 'user_id', value: user.patreon.game_master.virtual_tier.game_master_user_id },
    ]);
    if (gmUsers.length > 0) {
      const gmUser = gmUsers[0];

      if (gmUser.user_id === user.user_id) {
        // If someone is their own GM, corrupted, clear their data
        await removePatreonData(client, user, true);
        return false;
      }

      // Confirm the GM has updated access
      return await hasPatreonAccess(gmUser, accessLevel);
    }
  }

  if (accessLevel === 2)
    return (
      user.patreon?.tier === 'WANDERER' ||
      user.patreon?.tier === 'LEGEND' ||
      user.patreon?.tier === 'GAME-MASTER'
    );
  if (accessLevel === 1)
    return (
      user.patreon?.tier === 'ADVOCATE' ||
      user.patreon?.tier === 'WANDERER' ||
      user.patreon?.tier === 'LEGEND' ||
      user.patreon?.tier === 'GAME-MASTER'
    );

  return false;
}

async function removePatreonData(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  removeVirtualTier = false
) {
  user = _.cloneDeep(user);
  user.patreon = {
    ...user.patreon,
    patreon_user_id: undefined,
    patreon_name: undefined,
    patreon_email: undefined,
    tier: undefined,
    access_token: undefined,
    refresh_token: undefined,
    game_master: removeVirtualTier ? undefined : user.patreon?.game_master,
  };
  const status = await updateData(client, 'public_user', user.id, {
    patreon: user.patreon,
  });
  return {
    status,
    user,
  };
}

async function addPatreonData(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  data: {
    patreon_user_id: string;
    patreon_name: string;
    patreon_email: string;
    tier?: 'ADVOCATE' | 'WANDERER' | 'LEGEND' | 'GAME-MASTER';
    access_token: string;
    refresh_token: string;
  }
) {
  user = _.cloneDeep(user);
  user.patreon = {
    ...user.patreon,
    patreon_user_id: data.patreon_user_id,
    patreon_name: data.patreon_name,
    patreon_email: data.patreon_email,
    tier: data.tier,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
  const status = await updateData(client, 'public_user', user.id, {
    patreon: user.patreon,
  });
  return {
    status,
    user,
  };
}

export async function hasPatreonAccess(
  user: PublicUser,
  accessLevel: 0 | 1 | 2 | 3 | 4
): Promise<boolean> {
  // Use unrestricted client access because we're only updating Patreon data under strict conditions
  const client = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  user = _.cloneDeep(user);
  if (user.patreon?.access_token) {
    const apiClient = patreonAPI(user.patreon?.access_token);
    try {
      await apiClient('/current_user');
      // console.log('Patreon - Valid Access Token - OK');
    } catch (error) {
      if (user.patreon?.refresh_token) {
        // console.log('Patreon - Invalid Access Token - ISSUE - Attempting to Refresh');

        const result = await attemptAccessTokenRefresh(client, user, user.patreon.refresh_token);
        user = result.user;
      } else {
        // console.log('Patreon - Invalid Access Token - ISSUE - No RefreshToken, Ending');
        const result = await removePatreonData(client, user);
        user = result.user;
      }
    }
    return await checkAccessLevel(client, user, accessLevel);
  } else {
    // Update user to not have a tier
    const result = await removePatreonData(client, user);
    return await checkAccessLevel(client, result.user, accessLevel);
  }
}

export async function addToGameMasterGroup(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  gmUserID: string,
  accessCode: string
) {
  user = _.cloneDeep(user);
  if (user.patreon?.tier === 'GAME-MASTER') {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  const gmUsers = await fetchData<PublicUser>(client, 'public_user', [
    { column: 'user_id', value: gmUserID },
  ]);
  const gmUser = gmUsers.length > 0 ? gmUsers[0] : null;
  if (!gmUser) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }
  if (gmUser.patreon?.game_master?.access_code !== accessCode) {
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
        game_master_name: gmUser.display_name,
        added_at: new Date().toISOString(),
      },
    },
  };
  const status = await updateData(client, 'public_user', user.id, {
    patreon: user.patreon,
  });
  return {
    status,
    user,
  };
}

export async function removeFromGameMasterGroup(currentUser: PublicUser, userId: string) {
  const client = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const users = await fetchData<PublicUser>(client, 'public_user', [
    { column: 'user_id', value: userId },
  ]);
  const user = users.length > 0 ? users[0] : null;
  if (!user || !currentUser) {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

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
  const status = await updateData(client, 'public_user', user.id, {
    patreon: user.patreon,
  });
  return {
    status,
    user,
  };
}

export async function getAllUsersInGameMasterGroup(user: PublicUser) {
  if (user.patreon?.tier !== 'GAME-MASTER') {
    return [];
  }

  const client = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await client
    .from('public_user')
    .select('*')
    .eq('patreon->game_master->virtual_tier->>game_master_user_id', user.user_id);

  if (error) {
    return [];
  }

  return (data as PublicUser[]) ?? [];
}

export async function regenerateGameMasterAccessCode(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser
) {
  if (user.patreon?.tier !== 'GAME-MASTER') {
    return {
      status: 'ERROR_UNKNOWN',
      user,
    };
  }

  user = _.cloneDeep(user);
  user.patreon = {
    ...user.patreon,
    game_master: {
      access_code:
        Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8),
      virtual_tier: user.patreon?.game_master?.virtual_tier,
    },
  };
  const status = await updateData(client, 'public_user', user.id, {
    patreon: user.patreon,
  });
  return {
    status,
    user,
  };
}

export async function handlePatreonRedirect(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  code: string,
  redirectURL: string
) {
  // Setup client
  const patreonOAuthClient = patreonOAuth(
    // @ts-ignore
    Deno.env.get('PATREON_CLIENT_ID') ?? '',
    // @ts-ignore
    Deno.env.get('PATREON_CLIENT_SECRET') ?? ''
  );

  // Get data store
  const tokenResult = await patreonOAuthClient.getTokens(code, redirectURL);
  const apiClient = patreonAPI(tokenResult.access_token);

  // Get campaign data
  // const campaignID = '4805226';
  // const campaignResult = await apiClient(`/campaigns/${campaignID}/pledges`);
  // console.log(campaignResult, campaignResult.rawJson);

  const result = await apiClient('/current_user');
  const store = result.store;

  // Get user data
  const userData = store.findAll('user').map((user: any) => user.serialize());

  const uData = findPatronData(userData);
  if (uData == null) {
    console.error('Failed to find user data!');
    console.error(userData);
    return false;
  }

  // Get pledge data
  const patreonUserID = uData.id;
  const patreonName = uData.attributes.full_name;
  const patreonEmail = uData.attributes.email;

  // Pledge Data //
  const pledgeData = store.findAll('pledge').map((pledge: any) => pledge.serialize());
  //console.log(pledgeData[0].data.relationships.reward);

  const tier = findPatronTier(pledgeData);
  await addPatreonData(client, user, {
    patreon_user_id: patreonUserID,
    patreon_name: patreonName,
    patreon_email: patreonEmail,
    tier: tier,
    access_token: tokenResult.access_token,
    refresh_token: tokenResult.refresh_token,
  });

  if (tier === 'GAME-MASTER') {
    await regenerateGameMasterAccessCode(client, user);
  }

  return true;
}

function findPatronData(userData: any) {
  const myUserID = '32932027';

  for (let uData of userData) {
    if (uData.data.type == 'user' && uData.data.id != myUserID) {
      return uData.data;
    }
  }
  return null;
}

function findPatronTier(
  pledgeData: any
): 'ADVOCATE' | 'WANDERER' | 'LEGEND' | 'GAME-MASTER' | undefined {
  const supporterTierID = '5612688';
  const memberTierID = '5628112';
  const legendTierID = '6299276';
  const gmTierID = '22622808';

  for (let pData of pledgeData) {
    if (
      pData.data.type == 'pledge' &&
      pData.data.relationships != null &&
      pData.data.relationships.reward != null
    ) {
      if (pData.data.relationships.reward.data.id == supporterTierID) {
        return 'ADVOCATE';
      } else if (pData.data.relationships.reward.data.id == memberTierID) {
        return 'WANDERER';
      } else if (pData.data.relationships.reward.data.id == legendTierID) {
        return 'LEGEND';
      } else if (pData.data.relationships.reward.data.id == gmTierID) {
        return 'GAME-MASTER';
      }
    }
  }
  return undefined;
}

// Patreon Refresh Token //
async function attemptAccessTokenRefresh(
  client: SupabaseClient<any, 'public', any>,
  user: PublicUser,
  refreshToken: string
) {
  // Setup client
  const patreonOAuthClient = patreonOAuth(
    // @ts-ignore
    Deno.env.get('PATREON_CLIENT_ID') ?? '',
    // @ts-ignore
    Deno.env.get('PATREON_CLIENT_SECRET') ?? ''
  );

  try {
    const tokenResult = await patreonOAuthClient.refreshToken(refreshToken);

    // console.log('Patreon - Invalid Access Token - ISSUE - Refreshed Token');
    user = _.cloneDeep(user);
    user.patreon = {
      ...user.patreon,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
    };
    const status = await updateData(client, 'public_user', user.id, {
      patreon: user.patreon,
    });
    return {
      status,
      user,
    };
  } catch (e) {
    // console.log('Patreon - Invalid Access Token - ISSUE - Failed to Refresh, Ending');
    return await removePatreonData(client, user);
  }
}
