import type { Character } from '@schemas/content';
import { makeRequest } from '@requests/request-manager';
import { supabase } from '../supabase-client';
import { z } from 'zod';
import { isEqual } from 'lodash-es';

/** The fields persisted by update-character, shared by regular and buffered saves. */
export const SAVED_CHARACTER_FIELDS = [
  'name',
  'level',
  'experience',
  'hp_current',
  'hp_temp',
  'hero_points',
  'stamina_current',
  'resolve_current',
  'inventory',
  'notes',
  'details',
  'roll_history',
  'custom_operations',
  'meta_data',
  'options',
  'variants',
  'content_sources',
  'operation_data',
  'spells',
  'companions',
  'campaign_id',
] as const;

const bodySchema = z
  .object({
    id: z.number(),
    expected_updated_at: z.string().optional(),
  })
  .catchall(z.unknown());
const draftSchema = z.object({
  version: z.literal(1),
  actorId: z.string().min(1),
  body: bodySchema,
  requiresCalculation: z.boolean().optional(),
  base: bodySchema.extend({ name: z.string(), level: z.number() }).optional(),
});
const legacySchema = z.object({ token: z.string(), body: bodySchema });
const savedRowsSchema = z.array(z.object({ id: z.number() }).passthrough()).min(1);
type CharacterSaveDraft = z.infer<typeof draftSchema>;
export type BufferedSaveResult = (
  | { status: 'none' | 'saved' }
  | { status: 'needs-calculation'; body: Record<string, unknown>; base: Record<string, unknown> }
  | {
      status: 'retained';
      reason: 'signed-out' | 'different-account' | 'unversioned' | 'rejected' | 'invalid';
      body?: Record<string, unknown>;
      key?: string;
    }
) & { recovery?: Record<string, unknown> };
const replays = new Map<string, Promise<BufferedSaveResult>>();

/** Each account keeps its own drafts, including edits made with campaign permissions. */
function bufferKey(characterId: number, actorId: string): string {
  return `autosave-character-${characterId}-${actorId}`;
}

/** Preserve the first rejected snapshot separately from the editable current draft. */
function preserveRecovery(draft: CharacterSaveDraft): void {
  const key = `autosave-character-recovery-${draft.body.id}-${draft.actorId}`;
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(draft));
}

/** Find an account's retained snapshot for an explicit download/recovery action. */
export function getBufferedCharacterRecovery(characterId: number, actorId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(`autosave-character-recovery-${characterId}-${actorId}`);
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.actorId === actorId && parsed.data.body.id === characterId
      ? parsed.data.body
      : null;
  } catch (error) {
    console.error('Could not read the retained character copy:', error);
    return null;
  }
}

/** Store a draft synchronously for pagehide; authentication tokens never belong in it. */
export function bufferCharacterSave(
  character: Character,
  actorId: string,
  expectedUpdatedAt?: string,
  options?: { requiresCalculation: boolean; base: Character }
): void {
  const body: Record<string, unknown> = { id: character.id };
  for (const field of SAVED_CHARACTER_FIELDS) body[field] = character[field];
  if (expectedUpdatedAt) body.expected_updated_at = expectedUpdatedAt;
  try {
    const previous = getBufferedCharacterSave(character.id, actorId);
    if ('draft' in previous && !previous.draft.body.expected_updated_at) preserveRecovery(previous.draft);
    const base = options
      ? {
          id: options.base.id,
          ...Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, options.base[field]])),
        }
      : undefined;
    localStorage.setItem(
      bufferKey(character.id, actorId),
      JSON.stringify({
        version: 1,
        actorId,
        body,
        ...(options ? { requiresCalculation: options.requiresCalculation, base } : {}),
      })
    );
  } catch (error) {
    console.error('Could not buffer character changes:', error);
  }
}

/** Acknowledge only the submitted snapshot, keeping and rebasing any newer queued edit. */
export function acknowledgeBufferedCharacterSave(
  characterId: number,
  actorId: string,
  submitted: Record<string, unknown>,
  expectedUpdatedAt: string | undefined,
  updatedAt: string | undefined,
  calculationComplete = false
): void {
  const stored = getBufferedCharacterSave(characterId, actorId);
  if (!('draft' in stored)) return;
  if (
    (!stored.draft.requiresCalculation || calculationComplete) &&
    SAVED_CHARACTER_FIELDS.every((field) => isEqual(stored.draft.body[field], submitted[field]))
  ) {
    if (localStorage.getItem(stored.key) === stored.raw) localStorage.removeItem(stored.key);
  } else if (updatedAt && stored.draft.body.expected_updated_at === expectedUpdatedAt) {
    stored.draft.body.expected_updated_at = updatedAt;
    if (stored.draft.base) {
      // This accepted snapshot is the new common ancestor for any later merge.
      const base = bodySchema
        .extend({ name: z.string(), level: z.number() })
        .safeParse({ id: characterId, ...submitted });
      if (base.success) stored.draft.base = base.data;
    }
    if (localStorage.getItem(stored.key) === stored.raw) localStorage.setItem(stored.key, JSON.stringify(stored.draft));
  }
}

/** Read the actor claim only to migrate old local drafts; it never authenticates a request. */
function legacyActor(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const value = z
      .object({ sub: z.string().min(1) })
      .safeParse(JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))));
    return value.success ? value.data.sub : null;
  } catch {
    return null;
  }
}

/** Locate only this account's draft, safely migrating its obsolete saved bearer token. */
export function getBufferedCharacterSave(
  characterId: number,
  actorId: string
): { key: string; raw: string; draft: CharacterSaveDraft } | BufferedSaveResult {
  const key = bufferKey(characterId, actorId);
  const raw = localStorage.getItem(key);
  const legacyKey = `autosave-character-${characterId}`;
  const legacyRaw = raw ? null : localStorage.getItem(legacyKey);
  if (!raw && !legacyRaw) return { status: 'none' };
  try {
    if (raw) {
      const value: unknown = JSON.parse(raw);
      const parsed = draftSchema.safeParse(value);
      if (!parsed.success || parsed.data.body.id !== characterId) {
        const recoverable = z.object({ actorId: z.literal(actorId), body: bodySchema }).safeParse(value);
        if (recoverable.success && recoverable.data.body.id === characterId) {
          preserveRecovery({ version: 1, actorId, body: recoverable.data.body });
          return { status: 'retained', reason: 'invalid', key, body: recoverable.data.body };
        }
        return { status: 'retained', reason: 'invalid', key };
      }
      if (parsed.data.actorId !== actorId) return { status: 'retained', reason: 'different-account' };
      return { key, raw, draft: parsed.data };
    }
    const legacy = legacySchema.safeParse(JSON.parse(legacyRaw!));
    if (!legacy.success || legacy.data.body.id !== characterId)
      return { status: 'retained', reason: 'invalid', key: legacyKey };
    if (legacyActor(legacy.data.token) !== actorId) return { status: 'retained', reason: 'different-account' };
    const draft: CharacterSaveDraft = { version: 1, actorId, body: legacy.data.body };
    const migrated = JSON.stringify(draft);
    localStorage.setItem(key, migrated);
    if (localStorage.getItem(legacyKey) === legacyRaw) localStorage.removeItem(legacyKey);
    return { key, raw: migrated, draft };
  } catch (error) {
    console.error('Could not read buffered character changes:', error);
    return { status: 'retained', reason: 'invalid' };
  }
}

/** Replay with the current session and retain the draft unless the API returns its saved row. */
export async function replayBufferedCharacterSave(characterId: number): Promise<BufferedSaveResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { status: 'retained', reason: 'signed-out' };
    const key = bufferKey(characterId, session.user.id);
    const existing = replays.get(key);
    if (existing) return existing;
    const replay = (async (): Promise<BufferedSaveResult> => {
      const stored = getBufferedCharacterSave(characterId, session.user.id);
      if ('status' in stored) return stored;
      const retained = { status: 'retained' as const, body: stored.draft.body, key: stored.key };
      // Inputs captured during debouncing/calculation must be recalculated in the
      // next editor. They are never replayed directly as a full server update.
      if (stored.draft.requiresCalculation) {
        if (!stored.draft.body.expected_updated_at) {
          preserveRecovery(stored.draft);
          return { ...retained, reason: 'unversioned' };
        }
        if (stored.draft.base?.id === characterId)
          return { status: 'needs-calculation', body: stored.draft.body, base: stored.draft.base };
        preserveRecovery(stored.draft);
        return { ...retained, reason: 'invalid' };
      }
      // Older buffers omitted the server version. Applying them automatically would
      // overwrite any changes made on another device while this tab was closed.
      if (!stored.draft.body.expected_updated_at) {
        preserveRecovery(stored.draft);
        return { ...retained, reason: 'unversioned' };
      }
      const latest = await supabase.auth.getSession();
      if (latest.data.session?.user.id !== session.user.id) return { ...retained, reason: 'different-account' };
      const response = await makeRequest<unknown>('update-character', stored.draft.body, false, {
        expectedActorId: session.user.id,
      });
      const saved = savedRowsSchema.safeParse(response);
      if (!saved.success || !saved.data.some((row) => row.id === characterId)) {
        preserveRecovery(stored.draft);
        return { ...retained, reason: 'rejected' };
      }
      // A pagehide event may buffer a newer edit while the old draft is in flight.
      if (localStorage.getItem(stored.key) === stored.raw) localStorage.removeItem(stored.key);
      return { status: 'saved' };
    })().then((result) => {
      const recovery = getBufferedCharacterRecovery(characterId, session.user.id);
      return recovery ? { ...result, recovery } : result;
    });
    replays.set(key, replay);
    try {
      return await replay;
    } finally {
      replays.delete(key);
    }
  } catch (error) {
    console.error('Could not replay buffered character changes:', error);
    return { status: 'retained', reason: 'rejected' };
  }
}

/** Logout clears cached account data while retaining each account's unsynced work. */
export function clearSessionDataPreservingDrafts(): void {
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (key && !key.startsWith('autosave-character-')) localStorage.removeItem(key);
  }
}
