import type { Character } from '@schemas/content';
import { cloneDeep } from 'lodash-es';
import { z } from 'zod';
import { mergeCharacterSave } from './character-merge';
import { compareCharacterVersions } from './character-version';
import { EncounterCharacterSchema } from './encounter-character-schema';
import { RequestRejectedError } from '@requests/request-rejection';
import {
  bufferCharacterSave,
  characterSaveValuesEqual,
  journalCharacterSaveSubmission,
  reconcileBufferedCharacterSave,
  SAVED_CHARACTER_FIELDS,
} from './character-save-buffer';

export type EncounterCharacterSave = {
  character: Character;
  phase: 'saving' | 'saved' | 'failed' | 'conflict' | 'forbidden' | 'rejected';
  stored: boolean;
  conflicts: string[];
};
type Entry = EncounterCharacterSave & {
  base: Character;
  running: boolean;
  uncertain?: Character;
  rejected?: Character;
  retries: number;
  timer?: ReturnType<typeof setTimeout>;
};
type Request = (type: 'find-character' | 'update-character', body: Record<string, unknown>) => Promise<unknown>;
const conflictSchema = z.object({ __conflict: z.literal(true), character: EncounterCharacterSchema });
const forbiddenSchema = z.object({ __forbidden: z.literal(true) });

/**
 * Serialize encounter edits per character using the editor's existing merge and durable
 * recovery format. Reads never write back unchanged rows; every write has a server token.
 */
export function createEncounterCharacterWriter(options: { actorId: string; request: Request; changed: () => void }) {
  const entries = new Map<number, Entry>();
  const writerId = `encounter:${crypto.randomUUID()}`;
  let disposed = false;

  const same = (left: Character, right: Character): boolean =>
    SAVED_CHARACTER_FIELDS.every((field) => characterSaveValuesEqual(left[field], right[field]));
  const publish = (): void => {
    if (!disposed) options.changed();
  };
  const retain = (entry: Entry): void => {
    entry.stored =
      bufferCharacterSave(entry.character, options.actorId, entry.base.updated_at, {
        requiresCalculation: true,
        base: entry.base,
        writerId,
      }).status !== 'unavailable';
  };
  const reconcile = (entry: Entry, remote: Character): void => {
    entry.base = cloneDeep(remote);
    entry.uncertain = undefined;
    entry.stored =
      reconcileBufferedCharacterSave(entry.character, options.actorId, remote, {
        requiresCalculation: !same(entry.character, remote),
        writerId,
      }).status !== 'unavailable';
  };
  const parseRow = (value: unknown, id: number): Character => {
    const result = EncounterCharacterSchema.safeParse(value);
    if (!result.success || result.data.id !== id || !result.data.updated_at)
      throw new Error('Encounter update did not return a versioned character');
    // Validate known fields without stripping newer/extension JSON properties: those
    // siblings must survive when the API replaces a details or meta_data column.
    return value as Character;
  };

  /** Re-read before retries, including an ambiguous write whose response was lost. */
  const run = async (entry: Entry): Promise<void> => {
    if (disposed || entry.running || entry.phase === 'conflict' || entry.phase === 'forbidden') return;
    if (entry.phase === 'rejected' && (!entry.rejected || same(entry.character, entry.rejected))) return;
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = undefined;
    entry.running = true;
    entry.phase = 'saving';
    entry.rejected = undefined;
    publish();
    try {
      let remote = parseRow(await options.request('find-character', { id: entry.character.id }), entry.character.id);
      let conflicts = 0;
      while (!disposed) {
        const merge = mergeCharacterSave(entry.base, entry.character, remote, entry.uncertain);
        if (merge.conflicts.length || conflicts >= 3) {
          entry.phase = 'conflict';
          entry.conflicts = merge.conflicts.length ? merge.conflicts : ['Repeated remote changes'];
          retain(entry);
          break;
        }
        entry.character = merge.character;
        reconcile(entry, remote);
        if (same(entry.character, remote)) {
          entry.phase = 'saved';
          entry.retries = 0;
          break;
        }
        const submitted = cloneDeep(entry.character);
        // JSON columns are replaced by the API. Their unchanged children were preserved
        // by the three-way merge above, and the guard catches changes after our read.
        const changes = Object.fromEntries(
          SAVED_CHARACTER_FIELDS.filter((field) => !characterSaveValuesEqual(submitted[field], remote[field])).map(
            (field) => [field, submitted[field]]
          )
        );
        entry.uncertain = submitted;
        if (
          journalCharacterSaveSubmission(submitted.id, options.actorId, submitted, remote.updated_at!, writerId)
            .status === 'unavailable'
        )
          entry.stored = false;
        const result = await options.request('update-character', {
          id: submitted.id,
          expected_updated_at: remote.updated_at,
          ...changes,
        });
        if (disposed) return;
        if (forbiddenSchema.safeParse(result).success) {
          entry.phase = 'forbidden';
          break;
        }
        const raced = conflictSchema.safeParse(result);
        if (raced.success) {
          remote = parseRow((result as { character: unknown }).character, submitted.id);
          conflicts += 1;
          continue;
        }
        remote = parseRow(Array.isArray(result) && result.length === 1 ? result[0] : null, submitted.id);
        // Later local edits have the submitted body as their ancestor, not the old
        // database row. A deliberate return to the original HP must survive this ACK.
        const latest = mergeCharacterSave(submitted, entry.character, remote);
        entry.character = latest.character;
        reconcile(entry, remote);
        entry.retries = 0;
        if (latest.conflicts.length) {
          entry.phase = 'conflict';
          entry.conflicts = latest.conflicts;
          retain(entry);
          break;
        }
      }
    } catch (error) {
      if (disposed) return;
      console.error('Encounter character save failed:', error);
      if (error instanceof RequestRejectedError) {
        entry.phase = 'rejected';
        entry.rejected = entry.uncertain;
        reconcile(entry, entry.base);
        return;
      }
      entry.phase = 'failed';
      retain(entry);
      entry.timer = setTimeout(() => void run(entry), Math.min(30000, 2000 * 2 ** Math.min(entry.retries++, 4)));
    } finally {
      entry.running = false;
      publish();
      // A newer edit queued while the rejected request was in flight still saves.
      if (entry.phase === 'rejected' && entry.rejected && !same(entry.character, entry.rejected)) void run(entry);
    }
  };

  return {
    /** React development mode reattaches effects once to verify cleanup. */
    activate(): void {
      disposed = false;
      for (const entry of entries.values())
        if (!entry.running && (entry.phase === 'saving' || entry.phase === 'failed')) void run(entry);
    },
    /** Accept only the HP/condition fields edited by the encounter controls. */
    update(base: Character, edited: Character): void {
      if (disposed) return;
      const desired: Character = {
        ...cloneDeep(base),
        hp_current: edited.hp_current,
      };
      if (!characterSaveValuesEqual(base.details?.conditions, edited.details?.conditions))
        desired.details = { ...cloneDeep(base.details), conditions: cloneDeep(edited.details?.conditions) };
      if (!characterSaveValuesEqual(base.meta_data?.reset_hp, edited.meta_data?.reset_hp))
        desired.meta_data = { ...cloneDeep(base.meta_data), reset_hp: edited.meta_data?.reset_hp };
      if (same(base, desired)) return;
      let entry = entries.get(base.id);
      if (!entry || entry.phase === 'saved') {
        entry = {
          character: desired,
          base: cloneDeep(base),
          phase: 'saving',
          stored: true,
          conflicts: [],
          running: false,
          retries: 0,
        };
        entries.set(base.id, entry);
      } else {
        // The view includes queued edits. Apply only this new user action if a poll
        // or acknowledgement arrived between rendering the control and submitting it.
        entry.character = mergeCharacterSave(base, desired, entry.character).character;
      }
      retain(entry);
      publish();
      void run(entry);
    },
    /** Retain the acknowledged row until polling catches up, avoiding a visible revert. */
    display(remote: Character): Character {
      const entry = entries.get(remote.id);
      if (!entry) return remote;
      if (
        entry.phase === 'saved' &&
        (remote.updated_at === entry.base.updated_at ||
          compareCharacterVersions(remote.updated_at, entry.base.updated_at) === 1)
      )
        return remote;
      if (entry.phase !== 'saved' && compareCharacterVersions(remote.updated_at, entry.base.updated_at) !== -1)
        return mergeCharacterSave(entry.base, entry.character, remote, entry.uncertain).character;
      return entry.character;
    },
    status(id: number): EncounterCharacterSave | undefined {
      return entries.get(id);
    },
    retry(id?: number): void {
      for (const [characterId, entry] of entries) {
        if ((id === undefined || id === characterId) && entry.phase === 'failed') void run(entry);
      }
    },
    /** Unmount/account switches stop retries; versioned drafts remain for sheet recovery. */
    dispose(): void {
      disposed = true;
      for (const entry of entries.values()) if (entry.timer) clearTimeout(entry.timer);
    },
  };
}
