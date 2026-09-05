import { z } from 'https://esm.sh/zod@3.24.2';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, getPublicUser, logEvent } from './helpers.ts';
import { HttpError } from './http-errors.ts';

const contentType = z.enum([
  'trait',
  'item',
  'spell',
  'class',
  'archetype',
  'versatile-heritage',
  'class-archetype',
  'ability-block',
  'creature',
  'ancestry',
  'background',
  'language',
  'content-source',
]);
const collection = z.enum(['name', 'content']);
export const aiRequest = z
  .object({
    content: z.string().trim().min(1).max(64_000),
    model: z.enum(['gpt-4o-mini', 'gpt-4o']).default('gpt-4o'),
  })
  .strict();
export const populateRequest = z
  .object({
    collection,
    type: contentType,
    ids: z.array(z.number().int().positive().safe()).min(1).max(500),
  })
  .strict();
export const queryRequest = z
  .object({
    collection,
    query: z.string().trim().min(1).max(16_000),
    nResults: z.number().int().min(1).max(50).default(1),
    maxDistance: z.number().finite().min(0).max(10).default(1),
    where: z.object({ _type: contentType }).strict().optional(),
  })
  .strict();
export const vectorResponse = z
  .object({
    ids: z.array(z.array(z.string()).max(50)).max(1),
    metadatas: z
      .array(z.array(z.record(z.union([z.string(), z.number().finite(), z.boolean()])).nullable()).max(50))
      .max(1),
    distances: z.array(z.array(z.number().finite()).max(50)).max(1),
  })
  .refine(
    (value) =>
      value.ids.length === value.metadatas.length &&
      value.ids.length === value.distances.length &&
      value.ids.every((ids, i) => ids.length === value.metadatas[i].length && ids.length === value.distances[i].length)
  );

/** Validate the bounded wire input and return a safe, actionable client failure. */
export function parseRequest<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, `${issue.path.join('.') || 'body'}: ${issue.message}`, 'INVALID_REQUEST');
  }
  return result.data;
}

/** Public anon keys and anonymous Auth sessions never entitle a caller to paid work. */
export async function requireWorkUser(client: SupabaseClient, token: string, admin = false) {
  const user = await getPublicUser(client, token, { rejectAnonymous: true });
  if (!user || user.deactivated || (admin && !user.is_admin)) {
    throw new HttpError(
      403,
      admin ? 'Administrator access is required.' : 'A Wanderer’s Guide account is required.',
      'FORBIDDEN'
    );
  }
  return user;
}

/** Atomic per-account and global work quotas survive isolate restarts. Fail closed. */
export async function consumeWorkBudget(
  resource: 'ai' | 'vector-query' | 'vector-populate',
  actor: string,
  units: number
) {
  const { data, error } = await createServiceClient().rpc('consume_edge_work_budget', {
    p_resource: resource,
    p_actor: actor,
    p_units: units,
  });
  if (error || typeof data !== 'boolean') {
    logEvent('error', resource, 'work_budget_unavailable', {
      code: error?.code,
    });
    throw new HttpError(503, 'This service is temporarily unavailable. Please try again later.', 'BUDGET_UNAVAILABLE');
  }
  if (!data) {
    const now = new Date();
    const tomorrow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    throw new HttpError(
      429,
      'The daily work budget has been reached. Please try again tomorrow.',
      'WORK_BUDGET_EXCEEDED',
      {
        'Retry-After': String(Math.max(1, Math.ceil((tomorrow - now.getTime()) / 1000))),
      }
    );
  }
}

/** Bound the upstream request and body read together; never return upstream secrets. */
export async function fetchWorkText(url: string, init: RequestInit, timeoutMs = 25_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      await response.body?.cancel();
      throw new HttpError(502, 'The upstream service could not complete this request.', 'UPSTREAM_FAILURE');
    }
    // Provider output is not trusted to stay small even with bounded inputs.
    const reader = response.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let text = '';
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2 * 1024 * 1024)
          throw new HttpError(502, 'The upstream response was too large.', 'UPSTREAM_FAILURE');
        text += decoder.decode(value, { stream: true });
      }
      return text + decoder.decode();
    } finally {
      void reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      controller.signal.aborted ? 504 : 502,
      controller.signal.aborted
        ? 'The upstream service timed out.'
        : 'The upstream service could not complete this request.',
      controller.signal.aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE'
    );
  } finally {
    clearTimeout(timer);
  }
}
