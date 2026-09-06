import type { Character } from '@schemas/content';
import { z } from 'zod';
import { isEqual } from 'lodash-es';

/** The fields persisted by update-character, shared by saving and durable recovery. */
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

/** Compare persisted JSON, ignoring undefined object properties that never reach the API. */
export function characterSaveValuesEqual(left: unknown, right: unknown): boolean {
  if (isEqual(left, right)) return true;
  // Optional empty columns may be absent locally and null in a database row.
  if (left == null || right == null) return left == null && right == null;
  try {
    return isEqual(JSON.parse(JSON.stringify(left)), JSON.parse(JSON.stringify(right)));
  } catch {
    return false;
  }
}

const bodySchema = z.object({ id: z.number(), expected_updated_at: z.string().optional() }).catchall(z.unknown());
const baseSchema = bodySchema.extend({ name: z.string(), level: z.number() });
const draftSchema = z.object({
  version: z.literal(2),
  actorId: z.string().min(1),
  writerId: z.string().min(1),
  body: bodySchema,
  requiresCalculation: z.boolean().optional(),
  base: baseSchema.optional(),
  submission: z.object({ body: bodySchema, expectedUpdatedAt: z.string().min(1) }).optional(),
});
const oldDraftSchema = draftSchema.omit({ version: true, writerId: true, submission: true }).extend({
  version: z.literal(1),
});
const legacySchema = z.object({ token: z.string(), body: bodySchema });

/** A page owns its writes across navigation; another tab or reload gets a new owner. */
export const CHARACTER_SAVE_WRITER_ID: string = crypto.randomUUID();
export type CharacterSaveDraft = z.infer<typeof draftSchema>;
export type BufferedCharacterSaveRecord = { key: string; raw: string; draft: CharacterSaveDraft };
export type BufferedCharacterRecoveryRecord = {
  key: string;
  raw: string;
  reason: 'invalid' | 'unversioned' | 'missing-base' | 'recovery';
  body?: Record<string, unknown>;
};
type StorageUnavailable = { status: 'unavailable' };
export type BufferedCharacterReadResult =
  | BufferedCharacterSaveRecord
  | { status: 'none' }
  | ({ status: 'invalid' } & BufferedCharacterRecoveryRecord)
  | StorageUnavailable;
export type BufferedCharacterWriteResult =
  | { status: 'stored'; record: BufferedCharacterSaveRecord }
  | StorageUnavailable;
export type BufferedCharacterAcknowledgement = { status: 'removed' | 'updated' | 'unchanged' } | StorageUnavailable;
export type BufferedCharacterLoadResult =
  | { status: 'loaded'; records: BufferedCharacterSaveRecord[]; retained: BufferedCharacterRecoveryRecord[] }
  | StorageUnavailable;

/** Account-scoped prefixes include drafts made with campaign editing permission. */
function accountPrefix(characterId: number, actorId: string): string {
  return `autosave-character-${characterId}-${actorId}`;
}

/** Each writer has a separate durable slot so offline tabs cannot replace each other. */
function bufferKey(characterId: number, actorId: string, writerId: string): string {
  return `${accountPrefix(characterId, actorId)}:writer:${encodeURIComponent(writerId)}`;
}

/** Storage may be denied or full; callers must not present an unsuccessful write as durable. */
function storageUnavailable(action: string, error: unknown): StorageUnavailable {
  console.error(`Could not ${action} character changes:`, error);
  return { status: 'unavailable' };
}

/** Read a recoverable body only when its declared account and character match. */
function recoverableBody(value: unknown, characterId: number, actorId: string): Record<string, unknown> | undefined {
  const parsed = z.object({ actorId: z.literal(actorId), body: bodySchema }).safeParse(value);
  return parsed.success && parsed.data.body.id === characterId ? parsed.data.body : undefined;
}

/** Parsing never erases an invalid entry; it remains available for explicit recovery. */
function readRecord(
  key: string,
  raw: string,
  characterId: number,
  actorId: string
): BufferedCharacterSaveRecord | ({ status: 'invalid' } & BufferedCharacterRecoveryRecord) {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: 'invalid', reason: 'invalid', key, raw };
  }
  const parsed = draftSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.actorId !== actorId ||
    parsed.data.body.id !== characterId ||
    (parsed.data.submission && parsed.data.submission.body.id !== characterId) ||
    key !== bufferKey(characterId, actorId, parsed.data.writerId)
  ) {
    return { status: 'invalid', reason: 'invalid', key, raw, body: recoverableBody(value, characterId, actorId) };
  }
  return { key, raw, draft: parsed.data };
}

/** Read only this page's own draft; loading other writers requires explicit restoration. */
export function getBufferedCharacterSave(
  characterId: number,
  actorId: string,
  writerId = CHARACTER_SAVE_WRITER_ID
): BufferedCharacterReadResult {
  try {
    const key = bufferKey(characterId, actorId, writerId);
    const raw = localStorage.getItem(key);
    return raw === null ? { status: 'none' } : readRecord(key, raw, characterId, actorId);
  } catch (error) {
    return storageUnavailable('read buffered', error);
  }
}

/** Persist inputs synchronously, retaining an uncertain submission through later edits. */
export function bufferCharacterSave(
  character: Character,
  actorId: string,
  expectedUpdatedAt?: string,
  options?: { requiresCalculation: boolean; base: Character; writerId?: string }
): BufferedCharacterWriteResult {
  return writeCharacterSave(character, actorId, expectedUpdatedAt, options, false);
}

/** Share owned storage and historical-copy retention between buffering and reconciliation. */
function writeCharacterSave(
  character: Character,
  actorId: string,
  expectedUpdatedAt: string | undefined,
  options: { requiresCalculation: boolean; base: Character; writerId?: string } | undefined,
  reconciled: boolean
): BufferedCharacterWriteResult {
  try {
    const writerId = options?.writerId ?? CHARACTER_SAVE_WRITER_ID;
    const previous = getBufferedCharacterSave(character.id, actorId, writerId);
    if ('status' in previous && previous.status === 'unavailable') return previous;
    const key = bufferKey(character.id, actorId, writerId);
    const body = {
      id: character.id,
      ...Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, character[field]])),
      ...(expectedUpdatedAt ? { expected_updated_at: expectedUpdatedAt } : {}),
    };
    const draft = draftSchema.parse({
      version: 2,
      actorId,
      writerId,
      body,
      ...(options
        ? {
            requiresCalculation: options.requiresCalculation,
            base: {
              id: options.base.id,
              ...Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, options.base[field]])),
              updated_at: options.base.updated_at,
            },
          }
        : {}),
      ...(!reconciled && 'draft' in previous && previous.draft.submission
        ? { submission: previous.draft.submission }
        : {}),
    });
    const raw = JSON.stringify(draft);
    if ('raw' in previous && previous.raw === raw) return { status: 'stored', record: { key, raw, draft } };
    // Keep the first rejected copy separately from this writer's latest editable
    // draft. Repeated renders or edits cannot fill storage with duplicate backups.
    if (
      ('status' in previous && previous.status === 'invalid') ||
      ('draft' in previous && !previous.draft.body.expected_updated_at)
    ) {
      const retainedKey = `${accountPrefix(character.id, actorId)}:retained:${encodeURIComponent(writerId)}`;
      if (localStorage.getItem(retainedKey) === null) localStorage.setItem(retainedKey, previous.raw);
    }
    localStorage.setItem(key, raw);
    return { status: 'stored', record: { key, raw, draft } };
  } catch (error) {
    return storageUnavailable('buffer', error);
  }
}

/** Atomically retain a fully reconciled body and server base without replaying its former submission. */
export function reconcileBufferedCharacterSave(
  character: Character,
  actorId: string,
  remote: Character,
  options: { requiresCalculation: boolean; writerId?: string }
): BufferedCharacterWriteResult | { status: 'removed' } {
  if (character.id !== remote.id || !remote.updated_at)
    return storageUnavailable('reconcile', new Error('A matching server version is required'));
  const stored = writeCharacterSave(character, actorId, remote.updated_at, { ...options, base: remote }, true);
  if (stored.status === 'unavailable') return stored;
  if (
    !options.requiresCalculation &&
    SAVED_CHARACTER_FIELDS.every((field) => characterSaveValuesEqual(character[field], remote[field]))
  ) {
    const acknowledged = acknowledgeBufferedCharacterRecovery(stored.record);
    if (acknowledged.status === 'unavailable') return acknowledged;
    if (acknowledged.status === 'removed') return { status: 'removed' };
  }
  return stored;
}

/** Journal the exact attempt before sending it so a lost acknowledgement remains reconcilable. */
export function journalCharacterSaveSubmission(
  characterId: number,
  actorId: string,
  submitted: Record<string, unknown>,
  expectedUpdatedAt: string,
  writerId = CHARACTER_SAVE_WRITER_ID
): BufferedCharacterWriteResult | { status: 'unchanged' } {
  try {
    const stored = getBufferedCharacterSave(characterId, actorId, writerId);
    if (!('draft' in stored)) return stored.status === 'unavailable' ? stored : { status: 'unchanged' };
    const draft = draftSchema.parse({
      ...stored.draft,
      submission: { body: { ...submitted, id: characterId }, expectedUpdatedAt },
    });
    const raw = JSON.stringify(draft);
    if (localStorage.getItem(stored.key) !== stored.raw) return { status: 'unchanged' };
    localStorage.setItem(stored.key, raw);
    return { status: 'stored', record: { key: stored.key, raw, draft } };
  } catch (error) {
    return storageUnavailable('journal', error);
  }
}

/** Acknowledge only this writer, rebasing its newer intent without touching another tab. */
export function acknowledgeBufferedCharacterSave(
  characterId: number,
  actorId: string,
  submitted: Record<string, unknown>,
  expectedUpdatedAt: string | undefined,
  updatedAt: string | undefined,
  calculationComplete = false,
  writerId = CHARACTER_SAVE_WRITER_ID
): BufferedCharacterAcknowledgement {
  try {
    const stored = getBufferedCharacterSave(characterId, actorId, writerId);
    if (!('draft' in stored)) return stored.status === 'unavailable' ? stored : { status: 'unchanged' };
    if (
      stored.draft.submission &&
      (stored.draft.submission.expectedUpdatedAt !== expectedUpdatedAt ||
        SAVED_CHARACTER_FIELDS.some(
          (field) => !characterSaveValuesEqual(stored.draft.submission?.body[field], submitted[field])
        ))
    )
      return { status: 'unchanged' };
    if (
      (!stored.draft.requiresCalculation || calculationComplete) &&
      SAVED_CHARACTER_FIELDS.every((field) => characterSaveValuesEqual(stored.draft.body[field], submitted[field]))
    ) {
      return acknowledgeBufferedCharacterRecovery(stored);
    }
    if (!updatedAt || stored.draft.body.expected_updated_at !== expectedUpdatedAt) return { status: 'unchanged' };
    stored.draft.body.expected_updated_at = updatedAt;
    const base = baseSchema.safeParse({ ...submitted, id: characterId, updated_at: updatedAt });
    if (base.success) stored.draft.base = base.data;
    if (stored.draft.submission?.expectedUpdatedAt === expectedUpdatedAt) delete stored.draft.submission;
    if (localStorage.getItem(stored.key) !== stored.raw) return { status: 'unchanged' };
    localStorage.setItem(stored.key, JSON.stringify(stored.draft));
    return { status: 'updated' };
  } catch (error) {
    return storageUnavailable('acknowledge buffered', error);
  }
}

/** Remove a recovered snapshot only after saving it or explicitly choosing to discard it. */
export function acknowledgeBufferedCharacterRecovery(
  record: Pick<BufferedCharacterSaveRecord, 'key' | 'raw'>
): BufferedCharacterAcknowledgement {
  try {
    if (!record.key.startsWith('autosave-character-') || localStorage.getItem(record.key) !== record.raw)
      return { status: 'unchanged' };
    localStorage.removeItem(record.key);
    return { status: 'removed' };
  } catch (error) {
    return storageUnavailable('acknowledge recovered', error);
  }
}

/** An obsolete saved token is used only to identify its local owner, never to authenticate. */
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

/** Move a legacy snapshot into its own slot, removing old credentials only after durable storage. */
function migrateLegacyRecord(
  characterId: number,
  actorId: string,
  key: string,
  tokenFormat: boolean
): BufferedCharacterRecoveryRecord | undefined {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { key, raw, reason: 'invalid' };
  }
  let draft: CharacterSaveDraft;
  if (tokenFormat) {
    const parsed = legacySchema.safeParse(value);
    if (!parsed.success) return { key, raw, reason: 'invalid' };
    if (parsed.data.body.id !== characterId || legacyActor(parsed.data.token) !== actorId) return undefined;
    draft = { version: 2, actorId, writerId: 'legacy-token', body: parsed.data.body };
  } else {
    const parsed = oldDraftSchema.safeParse(value);
    if (!parsed.success) return { key, raw, reason: 'invalid', body: recoverableBody(value, characterId, actorId) };
    if (parsed.data.actorId !== actorId || parsed.data.body.id !== characterId) return undefined;
    draft = { ...parsed.data, version: 2, writerId: 'legacy-account' };
  }
  let destination = bufferKey(characterId, actorId, draft.writerId);
  const existing = localStorage.getItem(destination);
  if (existing !== null && existing !== JSON.stringify(draft)) {
    draft.writerId = `${draft.writerId}-${crypto.randomUUID()}`;
    destination = bufferKey(characterId, actorId, draft.writerId);
  }
  localStorage.setItem(destination, JSON.stringify(draft));
  if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
  return undefined;
}

/** Discover every account-owned copy without claiming it or sending any network request. */
export function loadBufferedCharacterSaves(characterId: number, actorId: string): BufferedCharacterLoadResult {
  try {
    const records: BufferedCharacterSaveRecord[] = [];
    const retained: BufferedCharacterRecoveryRecord[] = [];
    const prefix = accountPrefix(characterId, actorId);
    for (const [key, tokenFormat] of [
      [prefix, false],
      [`autosave-character-${characterId}`, true],
    ] as const) {
      const recovery = migrateLegacyRecord(characterId, actorId, key, tokenFormat);
      if (recovery) retained.push(recovery);
    }
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(`${prefix}:writer:`) || key?.startsWith(`${prefix}:retained:`)) keys.push(key);
    }
    keys.sort();
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      const result = readRecord(key, raw, characterId, actorId);
      if ('status' in result) {
        retained.push(result);
      } else if (!result.draft.body.expected_updated_at) {
        retained.push({ key, raw, body: result.draft.body, reason: 'unversioned' });
      } else if (result.draft.base?.id !== characterId) {
        retained.push({ key, raw, body: result.draft.body, reason: 'missing-base' });
      } else {
        records.push(result);
      }
    }
    const recoveryKey = `autosave-character-recovery-${characterId}-${actorId}`;
    const recoveryRaw = localStorage.getItem(recoveryKey);
    if (recoveryRaw !== null) {
      let body: Record<string, unknown> | undefined;
      try {
        body = recoverableBody(JSON.parse(recoveryRaw), characterId, actorId);
      } catch {
        /* Preserve invalid JSON. */
      }
      retained.push({ key: recoveryKey, raw: recoveryRaw, body, reason: 'recovery' });
    }
    return { status: 'loaded', records, retained };
  } catch (error) {
    return storageUnavailable('load buffered', error);
  }
}

/** Logout removes cached account data while preserving every writer's unsynced work. */
export function clearSessionDataPreservingDrafts(): { status: 'cleared' } | StorageUnavailable {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key && !key.startsWith('autosave-character-')) localStorage.removeItem(key);
    }
    return { status: 'cleared' };
  } catch (error) {
    return storageUnavailable('clear cached', error);
  }
}
