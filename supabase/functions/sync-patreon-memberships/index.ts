// @ts-ignore
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { syncCreatorMemberships } from '../_shared/patreon-creator.ts';

/** Narrow scheduler authentication; creator and service credentials never enter Actions. */
export async function handlePatreonSync(req: Request): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  if (req.method !== 'POST') return json(405, { status: 'fail', data: { method: 'POST required' } });
  const secret = req.headers.get('X-WG-Patreon-Sync') ?? '';
  const expected = Deno.env.get('PATREON_SYNC_SECRET_SHA256') ?? '';
  if (secret.length < 32 || secret.length > 256 || !/^[a-f0-9]{64}$/.test(expected))
    return json(403, { status: 'fail', data: { authorization: 'Denied' } });
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= digest.charCodeAt(i) ^ expected.charCodeAt(i);
  if (difference) return json(403, { status: 'fail', data: { authorization: 'Denied' } });
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const result = await syncCreatorMemberships(client);
    return json(200, { status: 'success', data: result });
  } catch {
    console.warn('Patreon campaign reconciliation failed; existing connections preserved.');
    return json(503, {
      status: 'error',
      code: 'PATREON_SYNC_UNAVAILABLE',
      message: 'Patreon reconciliation unavailable; existing connections preserved.',
    });
  }
}
serve(handlePatreonSync);
