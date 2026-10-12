import { exchangePatreonCode, fetchPatreonIdentity, PatreonApiError, refreshPatreonToken } from './patreon-api.ts';
import type { PublicUser } from './content.d.ts';
import _ from 'lodash';
import { fetchData, logEvent, updateData } from './helpers.ts';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

const GM_GROUP_SIZE_CAP = 99;

async function checkAccessLevel(client: SupabaseClient<any, 'public', any>, user: PublicUser, accessLevel: 0 | 1 | 2 | 3 | 4) {
	if (accessLevel === 0) return true;
	if (accessLevel === 4) return user.patreon?.tier === 'GAME-MASTER';
	if (accessLevel === 3) return user.patreon?.tier === 'LEGEND' || user.patreon?.tier === 'GAME-MASTER';

	if (user.patreon?.game_master?.virtual_tier?.game_master_user_id && user.patreon?.tier !== 'GAME-MASTER') {
		// If in Game Master group (and it's implied that accessLevel is now a tier that we have access to)
		const gmUsers = await fetchData<PublicUser>(client, 'public_user', [{ column: 'user_id', value: user.patreon.game_master.virtual_tier.game_master_user_id }]);
		if (gmUsers.length > 0) {
			const gmUser = gmUsers[0];

			if (gmUser.user_id === user.user_id) {
				// A self-referencing group cannot grant access.
				return false;
			}

			// Confirm the GM has updated access
			const access = await hasPatreonAccess(gmUser, accessLevel);
			// A failed provider check must not erase a player's group or own paid link.
			return access;
		}
	}

	// If they're a great member of the community, they have access
	if (user.is_community_paragon || user.is_developer) {
		return true;
	}

	if (accessLevel === 2) return user.patreon?.tier === 'WANDERER' || user.patreon?.tier === 'LEGEND' || user.patreon?.tier === 'GAME-MASTER';
	if (accessLevel === 1) return user.patreon?.tier === 'ADVOCATE' || user.patreon?.tier === 'WANDERER' || user.patreon?.tier === 'LEGEND' || user.patreon?.tier === 'GAME-MASTER';

	return false;
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
	},
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
		oauth_client_id: data.oauth_client_id,
	};
	// Create a new GM's code atomically with their membership; preserve existing groups.
	if (data.tier === 'GAME-MASTER' && !user.patreon.game_master?.access_code) {
		user.patreon.game_master = { ...user.patreon.game_master, access_code: crypto.randomUUID().replaceAll('-', '') };
	}
	const { status, data: rows } = await updateData(client, 'public_user', user.id, {
		patreon: user.patreon,
	}, true);
	return {
		status: status === 'SUCCESS' && rows?.some((row: { id: number }) => row.id === user.id) ? 'SUCCESS' : 'ERROR_UNKNOWN',
		user,
	};
}

/** Verify v2 entitlements without erasing linked data during provider failures. */
export async function hasPatreonAccess(user: PublicUser, accessLevel: 0 | 1 | 2 | 3 | 4): Promise<boolean> {
	if (accessLevel === 0) return true;
	const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
	user = _.cloneDeep(user);
	const stored = user.patreon;
	if (!stored?.access_token) {
		user.patreon = { ...stored, tier: undefined };
		return await checkAccessLevel(client, user, accessLevel);
	}
	try {
		let identity;
		try {
			identity = await fetchPatreonIdentity(stored.access_token);
		} catch (error) {
			if (!(error instanceof PatreonApiError) || error.status !== 401 || !stored.refresh_token) throw error;
			const tokens = await refreshPatreonToken(stored.refresh_token, stored.oauth_client_id ?? '');
			user.patreon = { ...stored, ...tokens };
			// Rotated refresh tokens must be saved before another provider request.
			const { status, data: rows } = await updateData(client, 'public_user', user.id, { patreon: user.patreon }, true);
			if (status !== 'SUCCESS' || !rows?.some((row: { id: number }) => row.id === user.id)) return false;
			identity = await fetchPatreonIdentity(tokens.access_token);
		}
		if (identity.tier !== user.patreon?.tier) {
			const result = await addPatreonData(client, user, { ...user.patreon, ...identity, access_token: user.patreon?.access_token ?? '' });
			if (result.status !== 'SUCCESS') return false;
			user = result.user;
		}
		return await checkAccessLevel(client, user, accessLevel);
	} catch (error) {
		// Fail closed for this paid operation while retaining data for reconnection.
		logEvent('warn', 'patreon', 'patreon_check_failed', {
			stage: error instanceof PatreonApiError ? error.stage : 'persistence',
			status: error instanceof PatreonApiError ? error.status : undefined,
		});
		return false;
	}
}

export async function addToGameMasterGroup(client: SupabaseClient<any, 'public', any>, user: PublicUser, gmUserID: string, accessCode: string) {
	user = _.cloneDeep(user);
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

	// Have we met the group size cap
	const usersInGroup = await getAllUsersInGameMasterGroup(gmUser);
	if (usersInGroup.length >= GM_GROUP_SIZE_CAP) {
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
	const { status } = await updateData(client, 'public_user', user.id, {
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
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
	);

	const users = await fetchData<PublicUser>(client, 'public_user', [{ column: 'user_id', value: userId }]);
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
	const { status } = await updateData(client, 'public_user', user.id, {
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
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
	);

	const { data, error } = await client.from('public_user').select('*').eq('patreon->game_master->virtual_tier->>game_master_user_id', user.user_id);

	if (error) {
		return [];
	}

	return (data as PublicUser[]) ?? [];
}

export async function regenerateGameMasterAccessCode(client: SupabaseClient<any, 'public', any>, user: PublicUser) {
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
			access_code: Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8),
			virtual_tier: user.patreon?.game_master?.virtual_tier,
		},
	};
	const { status } = await updateData(client, 'public_user', user.id, {
		patreon: user.patreon,
	});
	return {
		status,
		user,
	};
}

/** Persist the authorized v2 identity only after all provider responses validate. */
export async function handlePatreonRedirect(client: SupabaseClient<any, 'public', any>, user: PublicUser, code: string, redirectURL: string): Promise<boolean> {
	const tokens = await exchangePatreonCode(code, redirectURL);
	const identity = await fetchPatreonIdentity(tokens.access_token);
	const result = await addPatreonData(client, user, { ...identity, ...tokens });
	return result.status === 'SUCCESS';
}
