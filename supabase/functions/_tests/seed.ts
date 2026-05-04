// Shared test setup helpers for the Edge Function test harness.
// All tests in this directory assume the local Supabase stack is up
// (`npm run docker:start` from repo root). The dockerized stack already
// runs `data/seed-test-user.sh`, so the test@wanderersguide.app user
// exists with public_user backing.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const TEST_EMAIL = Deno.env.get('TEST_EMAIL') ?? 'test@wanderersguide.app';
const TEST_PASSWORD = Deno.env.get('TEST_PASSWORD') ?? 'test1234';

const SUPABASE_URL =
  Deno.env.get('PUBLIC_SUPABASE_URL') ??
  Deno.env.get('SUPABASE_URL') ??
  'http://127.0.0.1:54321';

const SERVICE_ROLE_KEY =
  Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ANON_KEY =
  Deno.env.get('PUBLIC_ANON_KEY') ??
  Deno.env.get('ANON_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY') ??
  '';

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Disable session persistence + token auto-refresh — those start an interval
// the Deno test sanitizer flags as a resource leak.
const NO_BG_REFRESH = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, NO_BG_REFRESH);

export interface SeedResult {
  userId: string;
  publicUserId: number;
  apiKey: string;
  clientId: string;
  jwt: string;
}

/** Returns true when env keys aren't set — tests should `Deno.test.ignore` instead of fail. */
export function stackUnavailable(): boolean {
  return !SERVICE_ROLE_KEY || !ANON_KEY;
}

/** Sign in (or create + sign in) the canonical test user. Returns the auth JWT. */
export async function ensureTestUser(): Promise<{ userId: string; jwt: string }> {
  const anon = createClient(SUPABASE_URL, ANON_KEY, NO_BG_REFRESH);

  // Try sign-in first; if the user doesn't exist we'll create then sign in.
  let { data, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error || !data?.session) {
    const { error: createError } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    // 422 / "already exists" is fine — the seed script may have run first.
    if (createError && !/already|exists|registered/i.test(createError.message)) {
      throw createError;
    }
    ({ data, error } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }));
    if (error || !data?.session) throw error ?? new Error('Test user sign-in failed');
  }

  return { userId: data.user!.id, jwt: data.session!.access_token };
}

/**
 * Register (or reuse) an API key client for the given user. Idempotent —
 * calling twice returns the same key. Tests use this key to exercise the
 * direct-API auth path in helpers.ts.
 */
export async function ensureApiKey(
  userId: string
): Promise<{ apiKey: string; clientId: string; publicUserId: number }> {
  const { data: pu, error } = await admin
    .from('public_user')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !pu) throw error ?? new Error(`public_user row missing for ${userId}`);

  const api = pu.api ?? {};
  api.clients = api.clients ?? [];

  let client = api.clients.find((c: { name: string }) => c.name === 'test-harness');
  if (!client) {
    client = {
      id: crypto.randomUUID(),
      name: 'test-harness',
      description: 'Created by the API test harness. Safe to delete.',
      api_key: crypto.randomUUID(), // 36 chars including hyphens — triggers the API-key branch in connect()
    };
    api.clients.push(client);
    const { error: updateError } = await admin
      .from('public_user')
      .update({ api })
      .eq('id', pu.id);
    if (updateError) throw updateError;
  }

  return { apiKey: client.api_key, clientId: client.id, publicUserId: pu.id };
}

/** Combined setup. Most tests want all three. */
export async function seed(): Promise<SeedResult> {
  const { userId, jwt } = await ensureTestUser();
  const { apiKey, clientId, publicUserId } = await ensureApiKey(userId);
  return { userId, publicUserId, apiKey, clientId, jwt };
}

/** Thin POST wrapper for hitting Edge Functions. */
export async function callFunction(
  name: string,
  body: unknown,
  opts?: { token?: string; headers?: Record<string, string> }
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers ?? {}),
  };
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

/**
 * Owns and tears down a content_source row so tests that create content
 * (spells, items, etc.) don't pollute production-style content sources.
 */
export async function withContentSource<T>(
  ownerUserId: string,
  fn: (sourceId: number) => Promise<T>
): Promise<T> {
  const { data: source, error } = await admin
    .from('content_source')
    .insert({
      name: `test-source-${crypto.randomUUID().slice(0, 8)}`,
      foundry_id: `test-${crypto.randomUUID().slice(0, 8)}`,
      url: 'https://example.com',
      description: 'Created by the API test harness.',
      operations: [],
      contact_info: '',
      group: 'core',
      meta_data: {},
      is_published: true,
      user_id: ownerUserId,
      keys: {},
      required_content_sources: [],
    })
    .select()
    .single();
  if (error || !source) {
    console.error('content_source insert failed:', error);
    throw new Error(`Failed to create test content_source: ${error?.message ?? 'no row returned'}`);
  }

  try {
    return await fn(source.id);
  } finally {
    await admin.from('content_source').delete().eq('id', source.id);
  }
}

/**
 * Content tables (spell, creature, item, ...) have a NOT NULL `uuid` (bigint)
 * column normally populated by `insertData()` in helpers.ts. Direct admin
 * inserts in tests bypass that, so generate a per-row unique bigint here.
 */
let _testUuidCounter = Date.now() * 1000;
export function testUuid(): number {
  return ++_testUuidCounter;
}

/** Convenience: assert JSend success and return the data payload. */
export function assertSuccess<T = unknown>(
  result: { status: number; body: any },
  message?: string
): T {
  if (result.status !== 200 || result.body?.status !== 'success') {
    throw new Error(
      `${message ?? 'expected JSend success'} — got HTTP ${result.status} body=${JSON.stringify(
        result.body
      )}`
    );
  }
  return result.body.data as T;
}
