import { reportClientFailure } from './client-errors';
import { characterState } from '@atoms/characterAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { Button, Group, Text } from '@mantine/core';
import {
  SAVED_CHARACTER_FIELDS,
  characterSaveValuesEqual,
  acknowledgeBufferedCharacterSave,
  bufferCharacterSave,
  getBufferedCharacterSave,
  loadBufferedCharacterSaves,
  reconcileBufferedCharacterSave,
  acknowledgeBufferedCharacterRecovery,
  journalCharacterSaveSubmission,
  type BufferedCharacterSaveRecord,
} from './character-save-buffer';
import { mergeCharacterSave } from './character-merge';
import { getCachedPublicUser } from '@auth/user-manager';
import { applyConditions } from '@conditions/condition-handler';
import { defineDefaultSources } from '@content/content-store';
import { COMMON_CORE_ID } from '@constants/data';
import { compareCharacterVersions } from './character-version';
import { saveCustomization } from '@content/customization-cache';
import { applyEquipmentPenalties } from '@items/inv-utils';
import { useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { hideNotification, showNotification } from '@mantine/notifications';
import { executeOperations, isOperationCancelled } from '@operations/operations.main';
import { confirmHealth } from '@pages/character_sheet/entity-handler';
import { hasSessionExpiredNotice, makeRequest } from '@requests/request-manager';
import { RequestRejectedError } from '@requests/request-rejection';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Character, CharacterSchema, ContentPackage, OperationCharacterResultPackage } from '@schemas/content';
import { saveCalculatedStats } from '@variables/calculated-stats';
import { setVariable } from '@variables/variable-manager';
import { isEqual, isArray, cloneDeep } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { SetterOrUpdater } from '@utils/type-fixing';
import { convertToSetEntity } from './type-fixing';
import { hashData } from './numbers';
import { getDeepDiff } from './objects';
import { addExtraItems, checkBulkLimit } from '@items/inv-handlers';
import { getFinalHealthValue, getHealthValueParts } from '@variables/variable-helpers';

interface CharStateOptionsGeneric {
  type: string;
  data?: Record<string, any>;
}

interface CharStateOptionsExecuteOps extends CharStateOptionsGeneric {
  type: 'EXECUTE_OPS';
  data: {
    content: ContentPackage;
    context: 'CHARACTER-SHEET' | 'CHARACTER-BUILDER';
    onFinishLoading: () => void;
    onSourcesChange: (sources: number[]) => void;
  };
}

interface CharStateOptionsSimple extends CharStateOptionsGeneric {
  type: 'SIMPLE';
  data?: {};
}

type CharStateOptions = CharStateOptionsExecuteOps | CharStateOptionsSimple;

type QueuedCharacterSave = { character: Character; actorId: string; scope: number };

// Validate the concurrency envelope while retaining the complete authoritative row.
const remoteCharacterVersionSchema = CharacterSchema.pick({ id: true, updated_at: true });
const REMOTE_CHARACTER_INTERVAL = 5000;

/** Internal save state, independent of the sheet layout. */
type CharacterSaveState = 'saved' | 'pending' | 'saving' | 'failed' | 'offline' | 'conflict' | 'read-only';

/**
 * Custom hook to manage character state, including fetching from the database, executing operations, and auto-saving.
 * @param characterId - The ID of the character to manage
 * @param options - Options to control the behavior of the hook, such as whether to execute operations and what content/context to use for those operations
 * @returns - An object containing the character state, a setter for the character, a loading state, and any results from executed operations
 */
export default function useCharacter(
  characterId: number,
  options: CharStateOptions
): {
  character: Character | null;
  setCharacter: SetterOrUpdater<Character | null>;
  //
  isLoading: boolean;
  results: OperationCharacterResultPackage | null;
  operationError: string | null;
  isCalculating: boolean;
  retryOperations: () => void;
  saveState: CharacterSaveState;
  draftStored: boolean;
  retrySave: () => void;
  loadError: boolean;
  retryLoad: () => void;
} {
  const [character, setCharacter] = useAtom(characterState);
  const session = useAtomValue(sessionState);
  const sessionActorId = session?.user.id ?? null;
  const [loadedIdentity, setLoadedIdentity] = useState<{ id: number; actor: string | null } | null>(null);
  const hasLoadedCharacter = loadedIdentity?.id === characterId && loadedIdentity.actor === sessionActorId;
  const loadedActorRef = useRef<string | null>(null);
  const saveScopeRef = useRef(0);
  const needsCalculationRef = useRef(false);
  const recoveredDraftsRef = useRef<BufferedCharacterSaveRecord[]>([]);
  const uncertainSaveRef = useRef<{ submitted: Record<string, unknown>; expectedUpdatedAt: string } | null>(null);
  const [savePhase, setSavePhase] = useState<'idle' | 'saving' | 'failed'>('idle');
  const [draftStored, setDraftStored] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const retrySaveRef = useRef<() => void>(() => {});
  const hasSavedRef = useRef(false);
  const storageNoticeRef = useRef(false);
  const rejectedSaveRef = useRef<Character | null>(null);

  /** Only retire recovered snapshots after their merged values are accepted. */
  const acknowledgeRecoveredDrafts = () => {
    for (const record of recoveredDraftsRef.current) acknowledgeBufferedCharacterRecovery(record);
    recoveredDraftsRef.current = [];
  };
  const clearSaveRetry = () => {
    if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  };

  // Always-current view of the atom (the `character` closure goes stale inside async
  // mutation callbacks), and the last character state we know the server holds — the
  // common ancestor used to merge on an optimistic-concurrency conflict.
  const characterRef = useRef(character);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  const lastSyncedRef = useRef<Character | null>(null);
  const writeRevisionRef = useRef(0);

  // Latched when the server reports this session can read but not write the
  // character (RLS: e.g. anyone viewing a public sheet, incl. logged-out users).
  // Disables the auto-save pipeline — such a viewer's "saves" were previously
  // misreported as concurrency conflicts, and the conflict handler's own state
  // update re-triggered the save, producing an infinite merge-notification loop.
  const readOnlyRef = useRef(false);
  // Consecutive conflicts with no successful save in between. A genuine
  // concurrent-edit conflict resolves in one round (merge → save with the fresh
  // token → success), so a streak means the server keeps rejecting us — e.g. an
  // older deployment that can't distinguish an RLS-denied write from a real
  // conflict. Stop the merge-and-retry cycle instead of looping forever.
  const conflictStreakRef = useRef(0);
  const MAX_CONFLICT_STREAK = 3;

  const handleFetchedCharacter = useCallback(
    (resultCharacter: Character | null | undefined, restoredCharacter?: Character) => {
      const currentCharacter = characterRef.current;
      if (resultCharacter) {
        const displayedCharacter = restoredCharacter ?? resultCharacter;
        // This is authoritative server state — record it as the concurrency base even
        // when the local atom already matches (so update-character keeps a fresh token).
        lastSyncedRef.current = resultCharacter;

        // Don't update if they're the same
        if (isEqual(currentCharacter, displayedCharacter)) {
          return;
        }

        if (currentCharacter && resultCharacter) {
          const diff = getDeepDiff(currentCharacter, displayedCharacter);
          // If we can't detect a diff, don't update
          if (Object.keys(diff).length === 0) {
            return;
          }

          console.log('Doing extra update bc of discrepancies', diff);
        }

        // Update character
        setCharacter(displayedCharacter);

        // Make sure we sync the enabled content sources
        defineDefaultSources('PAGE', displayedCharacter.content_sources?.enabled ?? []);

        // Cache character customization for fast loading
        saveCustomization({
          background_image_url:
            (displayedCharacter.details?.background_image_url || getCachedPublicUser()?.background_image_url) ??
            undefined,
          sheet_theme: (displayedCharacter.details?.sheet_theme || getCachedPublicUser()?.site_theme) ?? undefined,
        });
      } else {
        // Character not found, probably due to unauthorized access
        window.location.href = '/sheet-unauthorized';
      }
    },
    [setCharacter]
  );

  const saveConflictRef = useRef(false);

  /** Keep conflicting input recoverable until the same account chooses which copy to save. */
  const offerConflictResolution = useCallback(
    (remote: Character) => {
      saveConflictRef.current = true;
      hideNotification(`character-save-rejected-${characterId}`);
      clearSaveRetry();
      setSavePhase('idle');
      const scope = saveScopeRef.current;
      const actor = loadedActorRef.current;
      const noticeId = `character-conflict-${characterId}`;
      const resolve = (useLocal: boolean) => {
        if (scope !== saveScopeRef.current || !actor || actor !== loadedActorRef.current) return;
        const chosen = useLocal ? characterRef.current : remote;
        if (!chosen) return;
        if (!useLocal) {
          const owned = getBufferedCharacterSave(characterId, actor);
          if ('draft' in owned) acknowledgeBufferedCharacterRecovery(owned);
          acknowledgeRecoveredDrafts();
        } else {
          const reconciled = reconcileBufferedCharacterSave(chosen, actor, remote, {
            requiresCalculation: needsCalculationRef.current || options.type === 'EXECUTE_OPS',
          });
          setDraftStored(reconciled.status !== 'unavailable');
        }
        uncertainSaveRef.current = null;
        lastSyncedRef.current = remote;
        conflictStreakRef.current = 0;
        saveConflictRef.current = false;
        if (!useLocal) needsCalculationRef.current = false;
        hideNotification(noticeId);
        characterRef.current = cloneDeep(chosen);
        setCharacter(characterRef.current);
        setSavePhase('idle');
      };
      showNotification({
        id: noticeId,
        title: 'Conflicting character edits',
        message: (
          <>
            <Text size='sm'>Choose which changes to keep.</Text>
            <Group gap='xs' mt='xs'>
              <Button size='xs' onClick={() => resolve(true)}>
                Keep my edits
              </Button>
              <Button size='xs' variant='light' onClick={() => resolve(false)}>
                Use saved version
              </Button>
            </Group>
          </>
        ),
        color: 'yellow',
        autoClose: false,
        withCloseButton: false,
      });
    },
    [characterId, options.type, setCharacter]
  );

  // Restore drafts into the editor. This path never writes around its save queue.
  useEffect(() => {
    let active = true;
    const scope = ++saveScopeRef.current;
    clearSaveRetry();
    loadedActorRef.current = null;
    setLoadedIdentity(null);
    setLoadError(false);
    setSavePhase('idle');
    setDraftStored(true);
    hasSavedRef.current = false;
    rejectedSaveRef.current = null;
    retryCountRef.current = 0;
    uncertainSaveRef.current = null;
    recoveredDraftsRef.current = [];
    needsCalculationRef.current = false;
    lastSyncedRef.current = null;
    readOnlyRef.current = false;
    saveConflictRef.current = false;
    hideNotification(`character-conflict-${characterId}`);
    conflictStreakRef.current = 0;
    savingRef.current = false;
    pendingSaveRef.current = null;
    void (async () => {
      // A failed request is not an authorization decision. Keep the route and offer retry.
      const dbCharacter = await makeRequest<Character>('find-character', { id: characterId }, false, {
        throwOnFailure: true,
      });
      if (!active) return;
      if (!dbCharacter) {
        handleFetchedCharacter(dbCharacter);
        return;
      }
      loadedActorRef.current = sessionActorId;
      const restored = sessionActorId ? loadBufferedCharacterSaves(characterId, sessionActorId) : null;
      let displayed = dbCharacter;
      const conflicts: string[] = [];
      if (restored?.status === 'loaded') {
        for (const record of restored.records) {
          const draft = record.draft;
          if (!draft.base || !draft.body.expected_updated_at) {
            // Retain drafts without a common ancestor; replaying them could overwrite newer saves.
            continue;
          }
          const merged = mergeCharacterSave(draft.base, draft.body, displayed, draft.submission?.body);
          displayed = merged.character;
          conflicts.push(...merged.conflicts);
          needsCalculationRef.current ||= !!draft.requiresCalculation;
          recoveredDraftsRef.current.push(record);
        }
      } else if (restored?.status === 'unavailable') setDraftStored(false);
      handleFetchedCharacter(dbCharacter, displayed);
      if (conflicts.length) {
        // Original records remain available until the user resolves the conflict.
        const firstBase = recoveredDraftsRef.current[0]?.draft.base;
        if (firstBase) lastSyncedRef.current = { ...dbCharacter, ...firstBase };
        offerConflictResolution(dbCharacter);
      } else if (sessionActorId) {
        if (recoveredDraftsRef.current.length) {
          const reconciled = reconcileBufferedCharacterSave(displayed, sessionActorId, dbCharacter, {
            requiresCalculation: needsCalculationRef.current,
          });
          setDraftStored(reconciled.status !== 'unavailable');
        }
        if (SAVED_CHARACTER_FIELDS.every((field) => characterSaveValuesEqual(displayed[field], dbCharacter[field])))
          acknowledgeRecoveredDrafts();
      }
      setLoadedIdentity({ id: characterId, actor: sessionActorId });
    })().catch((error: unknown) => {
      if (!active) return;
      console.error('Could not load character:', error);
      setLoadError(true);
      if (options.type === 'EXECUTE_OPS') options.data.onFinishLoading();
    });
    const retryLoadOnReconnect = () => {
      if (active && !loadedActorRef.current) setLoadAttempt((attempt) => attempt + 1);
    };
    window.addEventListener('online', retryLoadOnReconnect);
    return () => {
      active = false;
      saveScopeRef.current = scope + 1;
      clearSaveRetry();
      window.removeEventListener('online', retryLoadOnReconnect);
      hideNotification(`character-conflict-${characterId}`);
      hideNotification(`character-save-permission-${characterId}`);
      hideNotification(`character-save-storage-${characterId}`);
      hideNotification(`character-save-rejected-${characterId}`);
      storageNoticeRef.current = false;
    };
  }, [characterId, sessionActorId, loadAttempt, handleFetchedCharacter, offerConflictResolution]);

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationCharacterResultPackage>();
  const executingOperations = useRef<number | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [operationAttempt, setOperationAttempt] = useState(0);

  const [debouncedCharacter] = useDebouncedValue(character, 800);

  const getUpdateHash = (c: Character | null | undefined) => {
    return hashData(
      c
        ? cloneDeep({
            id: c.id,
            campaign_id: c.campaign_id,
            user_id: c.user_id,
            level: c.level,
            inventory: c.inventory,
            spells: c.spells,
            operation_data: c.operation_data,
            details: {
              conditions: c.details?.conditions,
              ancestry: c.details?.ancestry,
              background: c.details?.background,
              class: c.details?.class,
              class_2: c.details?.class_2,
            },
            custom_operations: c.custom_operations,
            options: c.options,
            variants: c.variants,
            content_sources: c.content_sources,
            companions: c.companions, // Might not be needed
            meta_data: {
              active_modes: c.meta_data?.active_modes,
              given_item_ids: c.meta_data?.given_item_ids,
              reset_hp: c.meta_data?.reset_hp,
            },
          })
        : {}
    );
  };

  const currentOperationsHash = useMemo(() => getUpdateHash(character), [character]);
  const debouncedOperationsHash = useMemo(() => getUpdateHash(debouncedCharacter), [debouncedCharacter]);
  const operationContent = options.type === 'EXECUTE_OPS' ? options.data.content : undefined;
  const operationContext = options.type === 'EXECUTE_OPS' ? options.data.context : undefined;
  const onSourcesChangeRef = useRef<((sources: number[]) => void) | undefined>(undefined);
  onSourcesChangeRef.current = options.type === 'EXECUTE_OPS' ? options.data.onSourcesChange : undefined;
  const sourceKey = (ids: number[]) => [...new Set([COMMON_CORE_ID, ...ids])].sort((a, b) => a - b).join(',');
  const characterSourcesKey = sourceKey(character?.content_sources?.enabled ?? []);
  const loadedSources = operationContent?.defaultSources?.PAGE;
  const contentSourcesMatch = !Array.isArray(loadedSources) || sourceKey(loadedSources) === characterSourcesKey;

  useEffect(() => {
    if (!hasLoadedCharacter || !operationContext || contentSourcesMatch) return;
    // Reload the page's package for the reconciled inputs, including unsynced local
    // source choices. Re-reading server sources here could create a reload loop.
    onSourcesChangeRef.current?.(characterRef.current?.content_sources?.enabled ?? []);
  }, [hasLoadedCharacter, contentSourcesMatch, characterSourcesKey, characterId, operationContext]);

  useEffect(() => {
    if (
      !hasLoadedCharacter ||
      !contentSourcesMatch ||
      options.type !== 'EXECUTE_OPS' ||
      !debouncedCharacter ||
      debouncedCharacter.id !== characterId
    )
      return;
    // Invalidate as soon as an edit arrives, then wait for its debounced input.
    if (currentOperationsHash !== debouncedOperationsHash) return;
    const controller = new AbortController();
    executingOperations.current = debouncedOperationsHash;
    setIsCalculating(true);
    executeOperations<OperationCharacterResultPackage>(
      {
        type: 'CHARACTER',
        data: { character: debouncedCharacter, content: options.data.content, context: options.data.context },
      },
      { signal: controller.signal }
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        handleOperationResults(results, controller.signal);
        setOperationError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isOperationCancelled(error)) return;
        console.error('Character calculation failed:', error);
        setOperationError('Your last successful calculation is preserved.');
        options.data.onFinishLoading();
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        executingOperations.current = null;
        setIsCalculating(false);
      });
    return () => controller.abort();
  }, [
    characterId,
    currentOperationsHash,
    debouncedOperationsHash,
    operationContent,
    operationContext,
    operationAttempt,
    hasLoadedCharacter,
    contentSourcesMatch,
  ]);

  const handleOperationResults = (results: OperationCharacterResultPackage, signal: AbortSignal) => {
    if (options.type !== 'EXECUTE_OPS') return;
    if (!debouncedCharacter) return;
    if (signal.aborted) return;
    // React batches functional updates without discarding earlier completion steps.
    const commitCharacter: SetterOrUpdater<Character | null> = (update) => {
      setCharacter((previous) => {
        if (signal.aborted || previous?.id !== debouncedCharacter.id) return previous;
        return typeof update === 'function' ? update(previous) : update;
      });
    };

    // Final execution pipeline:
    console.log('... Finished executing ops #', getUpdateHash(debouncedCharacter));

    if (debouncedCharacter.variants?.proficiency_without_level) {
      setVariable('CHARACTER', 'PROF_WITHOUT_LEVEL', true);
    }
    if (debouncedCharacter.variants?.stamina) {
      // Stamina variant (GM Core): must be set before any getFinalHealthValue /
      // getFinalStaminaValue calls below so max HP is computed with halved class HP.
      setVariable('CHARACTER', 'STAMINA_VARIANT', true);
    }

    // Add the extra items to the inventory from variables
    addExtraItems('CHARACTER', options.data.content.items, debouncedCharacter, convertToSetEntity(commitCharacter));

    // Check bulk limits
    checkBulkLimit(
      'CHARACTER',
      debouncedCharacter,
      convertToSetEntity(commitCharacter),
      debouncedCharacter.options?.ignore_bulk_limit !== true
    );

    // Apply armor/shield penalties
    applyEquipmentPenalties('CHARACTER', debouncedCharacter);

    // Apply conditions after everything else
    applyConditions('CHARACTER', debouncedCharacter.details?.conditions ?? []);

    // Normalize the latest HP inside the functional update. A slow calculation
    // must not overwrite damage/healing entered after its original snapshot.
    commitCharacter((previous) => {
      if (!previous) return previous;
      const { classHp } = getHealthValueParts('CHARACTER');
      const maxHealth = getFinalHealthValue('CHARACTER');
      const resetHealth = previous.meta_data?.reset_hp !== false;
      let normalized: Character | null = previous;
      const retainHealth: SetterOrUpdater<Character | null> = (update) => {
        normalized = typeof update === 'function' ? update(previous) : update;
      };
      confirmHealth(
        `${resetHealth ? maxHealth : previous.hp_current}`,
        maxHealth,
        previous,
        convertToSetEntity(retainHealth),
        resetHealth && classHp === 0,
        'normalize'
      );
      return normalized;
    });

    // Save calculated stats
    saveCalculatedStats('CHARACTER', debouncedCharacter, convertToSetEntity(commitCharacter));

    setOperationResults(results);

    options.data.onFinishLoading();
  };

  // Serialized, latest-wins auto-save.
  //
  // Each full-column write owns the current server version. Serialize writes and
  // retain only the latest queued snapshot, then advance its version after success.
  // The server guard handles concurrent writers on other devices.
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<QueuedCharacterSave | null>(null);
  const canPersist = () =>
    hasLoadedCharacter &&
    !readOnlyRef.current &&
    !saveConflictRef.current &&
    characterRef.current?.id === characterId &&
    lastSyncedRef.current?.id === characterId &&
    !!loadedActorRef.current &&
    loadedActorRef.current === sessionActorId &&
    (options.type !== 'EXECUTE_OPS'
      ? !needsCalculationRef.current
      : !isCalculating &&
        contentSourcesMatch &&
        executingOperations.current === null &&
        !operationError &&
        !!operationResults &&
        getUpdateHash(characterRef.current) === debouncedOperationsHash &&
        !!options.data.content);

  const canPersistRef = useRef(canPersist);
  canPersistRef.current = canPersist;

  useAutoSave(
    characterId,
    () => ({
      character: characterRef.current,
      base: lastSyncedRef.current,
      actorId: loadedActorRef.current,
      // Retain raw inputs locally through navigation even while their derived state
      // is waiting or failed. The flag prevents automatic server replay.
      canBuffer: !readOnlyRef.current && loadedActorRef.current === sessionActorId,
      forceBuffer: savingRef.current || !!uncertainSaveRef.current,
      requiresCalculation:
        saveConflictRef.current || (!canPersist() && (needsCalculationRef.current || options.type === 'EXECUTE_OPS')),
    }),
    setDraftStored
  );

  useEffect(() => {
    if (!operationError || !loadedActorRef.current) return;
    reportClientFailure('calculation_failed');
  }, [operationError, characterId]);

  const isCurrentSave = (save: QueuedCharacterSave) =>
    save.scope === saveScopeRef.current &&
    save.character.id === characterId &&
    loadedActorRef.current === save.actorId &&
    sessionActorId === save.actorId;

  /** Incoming reads and rejected saves share one merge, draft and conflict-resolution path. */
  const receiveRemoteCharacter = (remote: Character, submitted?: Record<string, unknown>, repeatedConflict = false) => {
    const base = lastSyncedRef.current;
    const merge =
      readOnlyRef.current || !loadedActorRef.current
        ? { character: cloneDeep(remote), conflicts: [] }
        : mergeCharacterSave(base, characterRef.current, remote, submitted);
    const merged = merge.character;
    pendingSaveRef.current = null;
    if (merge.conflicts.length || repeatedConflict) {
      characterRef.current = merged;
      setCharacter(merged);
      offerConflictResolution(remote);
      return null;
    }
    const changed = SAVED_CHARACTER_FIELDS.some(
      (field) => !characterSaveValuesEqual(merged[field], characterRef.current?.[field])
    );
    const needsSave = SAVED_CHARACTER_FIELDS.some((field) => !characterSaveValuesEqual(merged[field], remote[field]));
    // Advance the authoritative baseline BEFORE publishing incoming state. A clean
    // remote edit is already saved; autosave must not echo it back to the server.
    lastSyncedRef.current = remote;
    const actor = loadedActorRef.current;
    if (actor && !readOnlyRef.current) {
      const reconciled = reconcileBufferedCharacterSave(merged, actor, remote, {
        requiresCalculation:
          needsCalculationRef.current ||
          (options.type === 'EXECUTE_OPS' &&
            (!canPersistRef.current() || getUpdateHash(merged) !== debouncedOperationsHash)),
      });
      setDraftStored(reconciled.status !== 'unavailable');
    }
    characterRef.current = merged;
    if (!needsSave) {
      retryCountRef.current = 0;
      rejectedSaveRef.current = null;
      hideNotification(`character-save-rejected-${characterId}`);
      acknowledgeRecoveredDrafts();
    }
    if (changed) setCharacter(merged);
    return { needsSave };
  };
  const receiveRemoteRef = useRef(receiveRemoteCharacter);
  receiveRemoteRef.current = receiveRemoteCharacter;

  // A successful calculation can release an edit that was waiting for derived values.
  useDidUpdate(() => {
    if (!debouncedCharacter || !canPersist()) return;
    if (
      !savingRef.current &&
      !uncertainSaveRef.current &&
      SAVED_CHARACTER_FIELDS.every((field) =>
        characterSaveValuesEqual(characterRef.current?.[field], lastSyncedRef.current?.[field])
      )
    )
      return;
    if (characterRef.current) mutateCharacter(characterRef.current);
  }, [debouncedCharacter, isCalculating, operationError, operationResults, sessionActorId]);
  const { mutate: mutateCharacterRaw } = useMutation({
    mutationFn: async (save: QueuedCharacterSave) => {
      if (!isCurrentSave(save)) throw new Error('Character save scope changed');
      const uncertain = uncertainSaveRef.current;
      if (uncertain) {
        // A timeout can follow a committed write. Read and reconcile before another POST.
        const remote = await makeRequest<Character>('find-character', { id: save.character.id }, false, {
          expectedActorId: save.actorId,
          throwOnFailure: true,
        });
        if (!remote) throw new Error('Could not recover character save');
        return {
          expected_updated_at: uncertain.expectedUpdatedAt,
          submitted: uncertain.submitted,
          forbidden: false,
          conflict: true,
          server: remote,
        };
      }
      const expected_updated_at = lastSyncedRef.current?.updated_at;
      if (!expected_updated_at) throw new Error('Reload the character to recover its save version');
      const data = Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, save.character[field]]));
      writeRevisionRef.current += 1;
      uncertainSaveRef.current = { submitted: data, expectedUpdatedAt: expected_updated_at };
      if (
        journalCharacterSaveSubmission(save.character.id, save.actorId, data, expected_updated_at).status ===
        'unavailable'
      )
        setDraftStored(false);
      const resData = await makeRequest(
        'update-character',
        {
          id: save.character.id,
          ...data,
          ...(expected_updated_at ? { expected_updated_at } : {}),
        },
        false,
        { expectedActorId: save.actorId, throwOnRejection: true }
      );
      const request = { expected_updated_at, submitted: data };
      // makeRequest returns null for every failure (HTTP error, timeout, JSend
      // error envelope). Throw so onError runs — otherwise a failed save was
      // indistinguishable from a successful one and users lost edits silently.
      if (resData === null) {
        throw new Error(`update-character failed for character ${characterId}`);
      }
      // Forbidden: RLS lets this session read the character but not write it.
      if (resData && !isArray(resData) && (resData as any).__forbidden) {
        return { ...request, forbidden: true, conflict: false, server: null as Character | null };
      }
      // Conflict: the server returned the current row instead of overwriting.
      if (resData && !isArray(resData) && (resData as any).__conflict) {
        return {
          ...request,
          forbidden: false,
          conflict: true,
          server: ((resData as any).character ?? null) as Character | null,
        };
      }
      const row = isArray(resData) && resData.length > 0 ? (resData[0] as Character) : null;
      if (!row || row.id !== save.character.id) throw new Error('Character save returned no saved row');
      return { ...request, forbidden: false, conflict: false, server: row };
    },
    onSuccess: (result, save) => {
      if (!result || !isCurrentSave(save)) return;
      uncertainSaveRef.current = null;
      clearSaveRetry();
      setSavePhase('idle');
      if (result.forbidden) {
        // Public viewers can calculate locally. Only a known editor losing access
        // needs a warning; neither case should continue sending rejected writes.
        readOnlyRef.current = true;
        pendingSaveRef.current = null;
        if (save.character.user_id === save.actorId || hasSavedRef.current)
          showNotification({
            id: `character-save-permission-${characterId}`,
            title: 'Changes not saved',
            message: 'You no longer have permission to edit this character.',
            color: 'yellow',
            autoClose: false,
          });
        console.warn('Character is view-only for this session; auto-save disabled.');
        return;
      }
      if (result.conflict) {
        const remote = result.server;
        if (!remote) return;
        if (remote.updated_at !== result.expected_updated_at) conflictStreakRef.current += 1;
        const received = receiveRemoteRef.current(
          remote,
          result.submitted,
          conflictStreakRef.current >= MAX_CONFLICT_STREAK
        );
        if (!received) return;
        if (received.needsSave && characterRef.current) {
          pendingSaveRef.current = { ...save, character: characterRef.current };
        }
      } else if (result.server) {
        // Record the authoritative post-write state (incl. the new updated_at token).
        conflictStreakRef.current = 0;
        retryCountRef.current = 0;
        hasSavedRef.current = true;
        rejectedSaveRef.current = null;
        hideNotification(`character-save-rejected-${characterId}`);
        lastSyncedRef.current = result.server;
        acknowledgeBufferedCharacterSave(
          save.character.id,
          save.actorId,
          result.submitted,
          result.expected_updated_at,
          result.server.updated_at
        );
        acknowledgeRecoveredDrafts();
        console.log('> Fetched updated character: #', getUpdateHash(character), 'vs.', getUpdateHash(result.server));
      }
    },
    onError: (error, save) => {
      if (!isCurrentSave(save)) return;
      console.error('Character save failed:', error);
      reportClientFailure('save_failed');
      setSavePhase('failed');
      clearSaveRetry();
      if (error instanceof RequestRejectedError) {
        // The server explicitly rejected this snapshot. Keep the edit, clear its
        // uncertain-write journal, and wait for a changed payload before retrying.
        rejectedSaveRef.current = cloneDeep(save.character);
        uncertainSaveRef.current = null;
        const current = characterRef.current;
        const base = lastSyncedRef.current;
        if (current && base)
          setDraftStored(
            reconcileBufferedCharacterSave(current, save.actorId, base, {
              requiresCalculation: !canPersistRef.current(),
            }).status !== 'unavailable'
          );
        if (
          current &&
          SAVED_CHARACTER_FIELDS.every((field) => characterSaveValuesEqual(current[field], save.character[field]))
        )
          showNotification({
            id: `character-save-rejected-${characterId}`,
            title: 'Changes not saved',
            message: 'These changes could not be saved.',
            color: 'yellow',
            autoClose: false,
          });
        return;
      }
      // A connection failure is recoverable while the local draft is safe. Retry
      // quietly, including when a flaky network never fires an `online` event.
      if (!hasSessionExpiredNotice()) {
        const delay = Math.min(30000, 2000 * 2 ** Math.min(retryCountRef.current++, 4));
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          retrySaveRef.current();
        }, delay);
      }
    },
    onSettled: (_result, _error, save) => {
      if (!isCurrentSave(save)) return;
      // Once the in-flight save resolves, flush the latest pending snapshot (if any).
      const next = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (_error instanceof RequestRejectedError && next) {
        savingRef.current = false;
        mutateCharacter(characterRef.current ?? next.character);
        return;
      }
      if (!_error && next && canPersistRef.current()) {
        setSavePhase('saving');
        mutateCharacterRaw({ ...next, character: characterRef.current ?? next.character });
      } else {
        savingRef.current = false;
      }
    },
  });

  const mutateCharacter = (snapshot: Character): void => {
    if (!canPersist() || !loadedActorRef.current) return;
    if (
      rejectedSaveRef.current &&
      SAVED_CHARACTER_FIELDS.every((field) =>
        characterSaveValuesEqual(snapshot[field], rejectedSaveRef.current?.[field])
      )
    )
      return;
    if (rejectedSaveRef.current) {
      rejectedSaveRef.current = null;
      hideNotification(`character-save-rejected-${characterId}`);
    }
    const save = { character: snapshot, actorId: loadedActorRef.current, scope: saveScopeRef.current };
    if (savingRef.current) {
      // Keep the freshest snapshot while the current write owns the server version.
      pendingSaveRef.current = save;
      return;
    }
    clearSaveRetry();
    savingRef.current = true;
    setSavePhase('saving');
    mutateCharacterRaw(save);
  };

  // React Query owns polling, visibility/reconnect behavior and request deduplication.
  // Read snapshots carry their starting version so delayed reads cannot undo newer saves.
  const { data: remoteSnapshot } = useQuery({
    queryKey: ['character-remote-updates', characterId, sessionActorId],
    queryFn: async () => {
      const context = {
        scope: saveScopeRef.current,
        actor: loadedActorRef.current,
        baseVersion: lastSyncedRef.current?.updated_at,
        writeRevision: writeRevisionRef.current,
      };
      const remote = await makeRequest<Character>('find-character', { id: characterId }, false, {
        ...(context.actor ? { expectedActorId: context.actor } : {}),
        throwOnFailure: true,
      });
      if (!remote) return { ...context, character: null };
      const version = remoteCharacterVersionSchema.safeParse(remote);
      if (!version.success || version.data.id !== characterId || !version.data.updated_at) {
        console.warn('Ignoring an invalid remote character version');
        throw new Error('Remote character version is unavailable');
      }
      return { ...context, character: remote };
    },
    enabled: hasLoadedCharacter && isOnline && !loadError && !saveConflictRef.current,
    refetchInterval: REMOTE_CHARACTER_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    retry: false,
  });

  useEffect(() => {
    if (
      !hasLoadedCharacter ||
      !remoteSnapshot?.character ||
      remoteSnapshot.scope !== saveScopeRef.current ||
      remoteSnapshot.actor !== loadedActorRef.current ||
      remoteSnapshot.actor !== sessionActorId ||
      remoteSnapshot.baseVersion !== lastSyncedRef.current?.updated_at ||
      remoteSnapshot.writeRevision !== writeRevisionRef.current ||
      savingRef.current ||
      uncertainSaveRef.current ||
      saveConflictRef.current
    )
      return;
    const remote = remoteSnapshot.character;
    const base = lastSyncedRef.current;
    if (remote.id !== characterId || !base?.updated_at || !remote.updated_at || remote.updated_at === base.updated_at)
      return;
    if (compareCharacterVersions(remote.updated_at, base.updated_at) === -1) return;
    receiveRemoteRef.current(remote);
  }, [remoteSnapshot, hasLoadedCharacter, characterId, sessionActorId]);

  retrySaveRef.current = () => {
    const current = characterRef.current;
    if (!current || savingRef.current || !canPersistRef.current() || hasSessionExpiredNotice()) return;
    if (
      !uncertainSaveRef.current &&
      SAVED_CHARACTER_FIELDS.every((field) => characterSaveValuesEqual(current[field], lastSyncedRef.current?.[field]))
    )
      return;
    mutateCharacter(current);
  };
  useEffect(() => {
    const wake = () => {
      setIsOnline(typeof navigator === 'undefined' || navigator.onLine !== false);
      retrySaveRef.current();
    };
    const offline = () => setIsOnline(false);
    const visible = () => {
      if (document.visibilityState === 'visible') wake();
    };
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearSaveRetry();
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [characterId, sessionActorId]);

  const hasPendingChanges =
    !!uncertainSaveRef.current ||
    !character ||
    SAVED_CHARACTER_FIELDS.some((field) => !characterSaveValuesEqual(character[field], lastSyncedRef.current?.[field]));
  /** Only warn when pending edits cannot be kept safely through closing the page. */
  useEffect(() => {
    const needsNotice =
      hasLoadedCharacter && !!sessionActorId && !draftStored && hasPendingChanges && !readOnlyRef.current;
    if (needsNotice === storageNoticeRef.current) return;
    storageNoticeRef.current = needsNotice;
    const id = `character-save-storage-${characterId}`;
    if (!needsNotice) {
      hideNotification(id);
      return;
    }
    showNotification({
      id,
      title: 'Changes not saved',
      message: 'Keep this page open until saving completes.',
      color: 'yellow',
      autoClose: false,
    });
  }, [characterId, sessionActorId, hasLoadedCharacter, draftStored, hasPendingChanges, savePhase]);
  const saveState: CharacterSaveState = readOnlyRef.current
    ? 'read-only'
    : saveConflictRef.current
      ? 'conflict'
      : !isOnline && hasPendingChanges
        ? 'offline'
        : savePhase === 'failed'
          ? 'failed'
          : savePhase === 'saving'
            ? 'saving'
            : hasPendingChanges
              ? 'pending'
              : 'saved';

  const isFinished =
    hasLoadedCharacter &&
    // There must be a character
    !!character &&
    // It must be the requested one
    character.id === characterId &&
    // There must be some operation results if ops were executed
    (options.type === 'EXECUTE_OPS' ? !!operationResults : true);

  return {
    character,
    setCharacter,
    isLoading: !isFinished && !operationError && !loadError,
    saveState,
    draftStored,
    retrySave: () => retrySaveRef.current(),
    loadError,
    retryLoad: () => setLoadAttempt((attempt) => attempt + 1),
    results: operationResults ?? null,
    operationError,
    isCalculating,
    retryOperations: () => setOperationAttempt((attempt) => attempt + 1),
  };
}

type AutoSaveSnapshot = {
  character: Character | null;
  base: Character | null;
  actorId: string | null;
  canBuffer: boolean;
  forceBuffer: boolean;
  requiresCalculation: boolean;
};

/** Buffer eligible changes during editing and synchronously on pagehide or navigation. */
function useAutoSave(
  characterId: number,
  getSnapshot: () => AutoSaveSnapshot,
  onStorage: (stored: boolean) => void
): void {
  const snapshotRef = useRef(getSnapshot);
  snapshotRef.current = getSnapshot;

  const saveImmediately = useCallback(() => {
    const { character: current, base, actorId, canBuffer, forceBuffer, requiresCalculation } = snapshotRef.current();
    if (!canBuffer || !actorId || !current || current.id !== characterId || base?.id !== characterId) return;
    // Loading the remote row must not replace a retained local recovery copy.
    if (
      !forceBuffer &&
      SAVED_CHARACTER_FIELDS.every((field) => characterSaveValuesEqual(current[field], base[field]))
    ) {
      if (!requiresCalculation) {
        acknowledgeBufferedCharacterSave(
          current.id,
          actorId,
          Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, current[field]])),
          base.updated_at,
          base.updated_at,
          true
        );
      }
      return;
    }
    const buffered = bufferCharacterSave(current, actorId, base.updated_at, { requiresCalculation, base });
    onStorage(buffered.status === 'stored');
  }, [characterId, onStorage]);

  // Preserve inputs before auth events or navigation can unmount the editor.
  // Pending derived values stay local until the next successful calculation.
  useEffect(() => {
    saveImmediately();
  });
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveImmediately();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', saveImmediately);
    window.addEventListener('wg:before-update', saveImmediately);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', saveImmediately);
      window.removeEventListener('wg:before-update', saveImmediately);
      saveImmediately();
    };
  }, [characterId, saveImmediately]);
}
