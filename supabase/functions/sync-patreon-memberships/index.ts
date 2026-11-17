// @ts-ignore
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { syncCreatorMemberships } from '../_shared/patreon-creator.ts';

/** Verify a short-lived fixed-operation signature. Queue readers cannot recover the key. */
async function signedSchedule(req: Request): Promise<boolean> {
  const key: string = Deno.env.get('PATREON_SCHEDULER_KEY') ?? '';
  const timestamp: string = req.headers.get('X-WG-Patreon-Timestamp') ?? '';
  const signature: string = req.headers.get('X-WG-Patreon-Signature') ?? '';
  if (!/^[a-f0-9]{64}$/.test(key) || !/^[1-9][0-9]{9}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature))
    return false;
  const age: number = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (age < -30 || age > 300) return false;
  const bytes = (hex: string): ArrayBuffer => {
    const buffer: ArrayBuffer = new ArrayBuffer(32);
    const view: Uint8Array = new Uint8Array(buffer);
    for (let i: number = 0; i < 32; i++) view[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return buffer;
  };
  try {
    const signingKey: CryptoKey = await crypto.subtle.importKey(
      'raw',
      bytes(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    // This endpoint has no body-controlled actions or account identifiers.
    return await crypto.subtle.verify(
      'HMAC',
      signingKey,
      bytes(signature),
      new TextEncoder().encode(`POST\nsync-patreon-memberships\n${timestamp}`)
    );
  } catch {
    return false;
  }
}

/** Keep the existing narrow capability for explicit operator recovery through Actions. */
async function manualCapability(req: Request): Promise<boolean> {
  const secret: string = req.headers.get('X-WG-Patreon-Sync') ?? '';
  const expected: string = Deno.env.get('PATREON_SYNC_SECRET_SHA256') ?? '';
  if (secret.length < 32 || secret.length > 256 || !/^[a-f0-9]{64}$/.test(expected)) return false;
  const digest: string = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)))
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
  let difference: number = 0;
  for (let i = 0; i < 64; i++) difference |= digest.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

/** Both callers reach the same fenced verifier; customer connections are never replaced. */
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
  const signed: boolean = req.headers.has('X-WG-Patreon-Signature') || req.headers.has('X-WG-Patreon-Timestamp');
  if (!(await (signed ? signedSchedule(req) : manualCapability(req))))
    return json(403, { status: 'fail', data: { authorization: 'Denied' } });
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
