import { reportClientFailure } from './client-errors';
import { characterState } from '@atoms/characterAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { Button, Group, Text } from '@mantine/core';
import { downloadObjectAsJson } from '@export/export-to-json';
import {
  SAVED_CHARACTER_FIELDS,
  acknowledgeBufferedCharacterSave,
  bufferCharacterSave,
  getBufferedCharacterSave,
  replayBufferedCharacterSave,
} from './character-save-buffer';
import { mergeCharacterOnConflict } from './character-merge';
import { getCachedPublicUser } from '@auth/user-manager';
import { applyConditions } from '@conditions/condition-handler';
import { defineDefaultSources } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';
import { applyEquipmentPenalties } from '@items/inv-utils';
import { useDebouncedCallback, useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { hideNotification, showNotification } from '@mantine/notifications';
import { executeOperations, isOperationCancelled } from '@operations/operations.main';
import { confirmHealth } from '@pages/character_sheet/entity-handler';
import { hasSessionExpiredNotice, makeRequest } from '@requests/request-manager';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Character, ContentPackage, OperationCharacterResultPackage } from '@schemas/content';
import { saveCalculatedStats } from '@variables/calculated-stats';
import { setVariable } from '@variables/variable-manager';
import { isEqual, isArray, cloneDeep } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { SetterOrUpdater } from '@utils/type-fixing';
import { convertToSetEntity } from './type-fixing';
import { IconRefresh, IconAlertCircle } from '@tabler/icons-react';
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
  };
}

interface CharStateOptionsSimple extends CharStateOptionsGeneric {
  type: 'SIMPLE';
  data?: {};
}

type CharStateOptions = CharStateOptionsExecuteOps | CharStateOptionsSimple;

type QueuedCharacterSave = { character: Character; actorId: string; scope: number };

/** Offer the preserved input copy without automatically overwriting remote changes. */
function showCharacterRecovery(characterId: number, recovery: Record<string, unknown>): void {
  showNotification({
    id: `character-recovery-${characterId}`,
    title: 'Unsynced character copy kept',
    message: (
      <Button
        size='xs'
        variant='light'
        onClick={() => downloadObjectAsJson(recovery, `character-${characterId}-saved-copy`)}
      >
        Download saved copy
      </Button>
    ),
    color: 'yellow',
    autoClose: false,
  });
}

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
} {
  const [character, setCharacter] = useAtom(characterState);
  const session = useAtomValue(sessionState);
  const sessionActorId = session?.user.id ?? null;
  const [loadedIdentity, setLoadedIdentity] = useState<{ id: number; actor: string | null } | null>(null);
  const hasLoadedCharacter = loadedIdentity?.id === characterId && loadedIdentity.actor === sessionActorId;
  const loadedActorRef = useRef<string | null>(null);
  const saveScopeRef = useRef(0);
  const needsCalculationRef = useRef(false);

  // Always-current view of the atom (the `character` closure goes stale inside async
  // mutation callbacks), and the last character state we know the server holds — the
  // common ancestor used to merge on an optimistic-concurrency conflict.
  const characterRef = useRef(character);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  const lastSyncedRef = useRef<Character | null>(null);

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
    (local: Character, remote: Character, fields: string[]) => {
      saveConflictRef.current = true;
      const scope = saveScopeRef.current;
      const actor = loadedActorRef.current;
      const noticeId = `character-conflict-${characterId}`;
      const resolve = (useLocal: boolean) => {
        if (scope !== saveScopeRef.current || !actor || actor !== loadedActorRef.current) return;
        const chosen = useLocal ? characterRef.current : remote;
        if (!chosen) return;
        // An explicit remote choice also discards this matching local draft;
        // otherwise navigation would restore the very edit the user rejected.
        // The snapshot comparison preserves any newer draft from another tab.
        if (!useLocal && characterRef.current) {
          acknowledgeBufferedCharacterSave(
            characterId,
            actor,
            Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, characterRef.current?.[field]])),
            lastSyncedRef.current?.updated_at,
            remote.updated_at,
            true
          );
        }
        lastSyncedRef.current = remote;
        conflictStreakRef.current = 0;
        saveConflictRef.current = false;
        if (options.type === 'SIMPLE') needsCalculationRef.current = false;
        hideNotification(noticeId);
        characterRef.current = cloneDeep(chosen);
        setCharacter(characterRef.current);
      };
      showNotification({
        id: noticeId,
        title: 'Conflicting character edits',
        message: (
          <>
            <Text size='sm'>
              Saving paused: {fields.slice(0, 3).join(', ')}
              {fields.length > 3 ? ', …' : ''}
            </Text>
            <Group gap='xs' mt='xs'>
              <Button size='xs' onClick={() => resolve(true)}>
                Keep my edits
              </Button>
              <Button size='xs' variant='light' onClick={() => resolve(false)}>
                Use saved version
              </Button>
              <Button
                size='xs'
                variant='subtle'
                onClick={() => {
                  if (scope === saveScopeRef.current && actor === loadedActorRef.current)
                    downloadObjectAsJson(characterRef.current ?? local, `character-${characterId}-conflict-copy`);
                }}
              >
                Download my copy
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

  // Replay this account's guarded draft before fetching the authoritative row.
  useEffect(() => {
    let active = true;
    const scope = ++saveScopeRef.current;
    loadedActorRef.current = null;
    setLoadedIdentity(null);
    needsCalculationRef.current = false;
    lastSyncedRef.current = null;
    readOnlyRef.current = false;
    saveConflictRef.current = false;
    hideNotification(`character-conflict-${characterId}`);
    conflictStreakRef.current = 0;
    savingRef.current = false;
    pendingSaveRef.current = null;
    const recoveryNoticeId = `character-recovery-${characterId}`;
    void (async () => {
      const replay = await replayBufferedCharacterSave(characterId);
      if (!active) return;
      const recovery = replay.recovery ?? (replay.status === 'retained' ? replay.body : undefined);
      if (recovery) {
        showCharacterRecovery(characterId, recovery);
      }
      const dbCharacter = await makeRequest<Character>('find-character', { id: characterId });
      if (!active) return;
      loadedActorRef.current = sessionActorId;
      if (dbCharacter && replay.status === 'needs-calculation') {
        needsCalculationRef.current = true;
        const merged = mergeCharacterOnConflict(replay.base, replay.body, dbCharacter);
        handleFetchedCharacter(dbCharacter, merged.character);
        if (merged.conflicts.length > 0) {
          // Retain the common ancestor so navigation cannot silently approve the conflict.
          lastSyncedRef.current = { ...dbCharacter, ...replay.base };
          offerConflictResolution(merged.character, dbCharacter, merged.conflicts);
        }
      } else {
        handleFetchedCharacter(dbCharacter);
      }
      if (dbCharacter) setLoadedIdentity({ id: characterId, actor: sessionActorId });
    })().catch((error: unknown) => {
      if (!active) return;
      console.error('Could not load character:', error);
      showNotification({
        id: 'character-load-failed',
        title: 'Could not load character',
        message: 'Please reload to try again.',
        color: 'red',
      });
    });
    return () => {
      active = false;
      saveScopeRef.current = scope + 1;
      hideNotification(recoveryNoticeId);
    };
  }, [characterId, sessionActorId, handleFetchedCharacter, offerConflictResolution]);

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationCharacterResultPackage>();
  const executingOperations = useRef<number | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [operationAttempt, setOperationAttempt] = useState(0);

  const [debouncedCharacter] = useDebouncedValue(character, 800);
  const setCharacterDebounced = useDebouncedCallback(setCharacter, 800);

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

  useEffect(() => {
    if (
      !hasLoadedCharacter ||
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
  ]);

  const handleOperationResults = (results: OperationCharacterResultPackage, signal: AbortSignal) => {
    if (options.type !== 'EXECUTE_OPS') return;
    if (!debouncedCharacter) return;
    if (signal.aborted) return;
    // Debounced callbacks must check freshness again when the setter actually runs.
    const commitCharacter: SetterOrUpdater<Character | null> = (update) => {
      setCharacterDebounced((previous) => {
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

    if (debouncedCharacter.meta_data?.reset_hp !== false) {
      // To reset hp, we need to confirm health

      const handleRestHP = () => {
        if (signal.aborted) return;
        const { classHp } = getHealthValueParts('CHARACTER');
        const maxHealth = getFinalHealthValue('CHARACTER');
        // Don't clear reset_hp until the character has class HP - otherwise ancestry-only HP
        // gets locked in before the class is selected, resulting in a too-low starting HP.
        confirmHealth(
          `${maxHealth}`,
          maxHealth,
          debouncedCharacter,
          convertToSetEntity(commitCharacter),
          classHp === 0
        );
      };

      // We run it twice for it to break out of the debouncing lock (not a perfect solution, but works)
      handleRestHP();
      const hpTimer = setTimeout(handleRestHP, 1000);
      signal.addEventListener('abort', () => clearTimeout(hpTimer), { once: true });
    } else {
      // Because of the drained condition, let's confirm health
      const maxHealth = getFinalHealthValue('CHARACTER');
      confirmHealth(
        `${debouncedCharacter.hp_current}`,
        maxHealth,
        debouncedCharacter,
        convertToSetEntity(commitCharacter)
      );
    }

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
        executingOperations.current === null &&
        !operationError &&
        !!operationResults &&
        currentOperationsHash === debouncedOperationsHash &&
        !!options.data.content);

  const canPersistRef = useRef(canPersist);
  canPersistRef.current = canPersist;

  useAutoSave(characterId, () => ({
    character: characterRef.current,
    base: lastSyncedRef.current,
    actorId: loadedActorRef.current,
    // Retain raw inputs locally through navigation even while their derived state
    // is waiting or failed. The flag prevents automatic server replay.
    canBuffer: !readOnlyRef.current && loadedActorRef.current === sessionActorId,
    requiresCalculation:
      saveConflictRef.current || (!canPersist() && (needsCalculationRef.current || options.type === 'EXECUTE_OPS')),
  }));

  useEffect(() => {
    if (!operationError || !loadedActorRef.current) return;
    reportClientFailure('calculation_failed');
    const stored = getBufferedCharacterSave(characterId, loadedActorRef.current);
    if ('draft' in stored && stored.draft.requiresCalculation) showCharacterRecovery(characterId, stored.draft.body);
  }, [operationError, characterId]);

  const isCurrentSave = (save: QueuedCharacterSave) =>
    save.scope === saveScopeRef.current &&
    save.character.id === characterId &&
    loadedActorRef.current === save.actorId &&
    sessionActorId === save.actorId;

  // A successful calculation can release an edit that was waiting for derived values.
  useDidUpdate(() => {
    if (!debouncedCharacter || !canPersist()) return;
    if (SAVED_CHARACTER_FIELDS.every((field) => isEqual(debouncedCharacter[field], lastSyncedRef.current?.[field])))
      return;
    mutateCharacter(debouncedCharacter);
  }, [debouncedCharacter, isCalculating, operationError, operationResults, sessionActorId]);
  const { mutate: mutateCharacterRaw } = useMutation({
    mutationFn: async (save: QueuedCharacterSave) => {
      if (!isCurrentSave(save)) throw new Error('Character save scope changed');
      const expected_updated_at = lastSyncedRef.current?.updated_at;
      if (!expected_updated_at) throw new Error('Reload the character to recover its save version');
      const data = Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, save.character[field]]));
      const resData = await makeRequest(
        'update-character',
        {
          id: save.character.id,
          ...data,
          ...(expected_updated_at ? { expected_updated_at } : {}),
        },
        true,
        { expectedActorId: save.actorId }
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
      if (result.forbidden) {
        // View-only session (e.g. a public sheet). Stop auto-saving entirely —
        // nothing we send will ever be accepted, and retrying just spams the API.
        readOnlyRef.current = true;
        pendingSaveRef.current = null;
        console.warn('Character is view-only for this session; auto-save disabled.');
        return;
      }
      if (result.conflict) {
        const remote = result.server;
        if (!remote) return;
        // Drop any stale queued snapshot — the merge produces the correct next save.
        pendingSaveRef.current = null;
        // The three-way merge needs the PREVIOUS synced state as its base; adopt the
        // fresh concurrency token only after capturing it (and even when we skip
        // merging below, so the next save uses the current token).
        const base = lastSyncedRef.current;
        lastSyncedRef.current = remote;
        conflictStreakRef.current += 1;
        const merge = mergeCharacterOnConflict(base, characterRef.current, remote);
        const merged = merge.character;
        if (merge.conflicts.length > 0 || conflictStreakRef.current >= MAX_CONFLICT_STREAK) {
          lastSyncedRef.current = base;
          setCharacter(merged);
          offerConflictResolution(
            merged,
            remote,
            merge.conflicts.length ? merge.conflicts : ['Repeated changes from another session']
          );
          return;
        }
        // Only apply + notify when the merge actually changes local data. Equal on
        // every saved field means the server row already matches what we have
        // (pure token skew) — updating state anyway would fire a pointless save.
        const changed =
          !characterRef.current ||
          SAVED_CHARACTER_FIELDS.some(
            (field) => !isEqual((merged as any)[field], (characterRef.current as any)[field])
          );
        const needsSave = SAVED_CHARACTER_FIELDS.some((field) => !isEqual(merged[field], remote[field]));
        if (needsSave) {
          pendingSaveRef.current = { ...save, character: merged };
        } else {
          acknowledgeBufferedCharacterSave(
            save.character.id,
            save.actorId,
            Object.fromEntries(SAVED_CHARACTER_FIELDS.map((field) => [field, remote[field]])),
            result.expected_updated_at,
            remote.updated_at
          );
        }
        if (!changed) return;
        setCharacter(merged);
        showNotification({
          icon: <IconRefresh />,
          title: 'Merged a remote update',
          message: 'This character was changed elsewhere; your edits were merged in.',
          autoClose: 2500,
        });
      } else if (result.server) {
        // Record the authoritative post-write state (incl. the new updated_at token).
        conflictStreakRef.current = 0;
        lastSyncedRef.current = result.server;
        acknowledgeBufferedCharacterSave(
          save.character.id,
          save.actorId,
          result.submitted,
          result.expected_updated_at,
          result.server.updated_at
        );
        console.log('> Fetched updated character: #', getUpdateHash(character), 'vs.', getUpdateHash(result.server));
      }
    },
    onError: (error, save) => {
      if (!isCurrentSave(save)) return;
      console.error('Character save failed:', error);
      reportClientFailure('save_failed');
      // If the real cause is a dead session, that persistent notification already
      // explains it; a generic "check your connection" toast would just confuse.
      if (hasSessionExpiredNotice()) return;
      showNotification({
        id: 'character-save-failed',
        icon: <IconAlertCircle />,
        title: 'Failed to save character',
        message: 'Your changes could not be saved. Please check your connection and try again.',
        color: 'red',
        autoClose: 5000,
      });
    },
    onSettled: (_result, _error, save) => {
      if (!isCurrentSave(save)) return;
      // Once the in-flight save resolves, flush the latest pending snapshot (if any).
      const next = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (next && canPersistRef.current()) {
        mutateCharacterRaw(next);
      } else {
        savingRef.current = false;
      }
    },
  });

  const mutateCharacter = (snapshot: Character) => {
    if (!canPersist() || !loadedActorRef.current) return;
    const save = { character: snapshot, actorId: loadedActorRef.current, scope: saveScopeRef.current };
    if (savingRef.current) {
      // Keep the freshest snapshot while the current write owns the server version.
      pendingSaveRef.current = save;
      return;
    }
    savingRef.current = true;
    mutateCharacterRaw(save);
  };

  // Poll remote character updates - only if the character hasn't been updated recently
  const [lDebouncedCharacter] = useDebouncedValue(character, 5000);
  const notRecentlyUpdated = !!(
    executingOperations.current === null &&
    lDebouncedCharacter &&
    isEqual(lDebouncedCharacter, character) &&
    isEqual(debouncedCharacter, character)
  );
  useQuery({
    queryKey: [`find-character-polling-updates-${characterId}`],
    queryFn: async () => {
      const polledCharacter = await makeRequest<Character>('find-character', {
        id: characterId,
      });

      if (notRecentlyUpdated && Object.keys(getDeepDiff(character, polledCharacter)).length > 0) {
        showNotification({
          icon: <IconRefresh />,
          title: `Updating character...`,
          message: `Received a remote update`,
          autoClose: 1500,
        });
        setCharacter(polledCharacter);
      }
      return polledCharacter;
    },
    refetchInterval: 1000,
    enabled: false, // notRecentlyUpdated, Fix polling on char item update
  });

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
    isLoading: !isFinished && !operationError,
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
  requiresCalculation: boolean;
};

/** Buffer eligible changes during editing and synchronously on pagehide or navigation. */
function useAutoSave(characterId: number, getSnapshot: () => AutoSaveSnapshot): void {
  const snapshotRef = useRef(getSnapshot);
  snapshotRef.current = getSnapshot;

  const saveImmediately = useCallback(() => {
    const { character: current, base, actorId, canBuffer, requiresCalculation } = snapshotRef.current();
    if (!canBuffer || !actorId || !current || current.id !== characterId || base?.id !== characterId) return;
    // Loading the remote row must not replace a retained local recovery copy.
    if (SAVED_CHARACTER_FIELDS.every((field) => isEqual(current[field], base[field]))) {
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
    bufferCharacterSave(current, actorId, base.updated_at, { requiresCalculation, base });
  }, [characterId]);

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
