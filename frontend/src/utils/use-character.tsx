import { characterState } from '@atoms/characterAtoms';
import { getCachedPublicUser } from '@auth/user-manager';
import { applyConditions } from '@conditions/condition-handler';
import { defineDefaultSources, isContentPackageEmpty } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';
import { applyEquipmentPenalties } from '@items/inv-utils';
import { useDebouncedCallback, useDebouncedValue, useDidUpdate, usePrevious } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { executeOperations } from '@operations/operations.main';
import { confirmHealth } from '@pages/character_sheet/entity-handler';
import { makeRequest } from '@requests/request-manager';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Character, ContentPackage, OperationCharacterResultPackage } from '@schemas/content';
import { saveCalculatedStats } from '@variables/calculated-stats';
import { setVariable } from '@variables/variable-manager';
import { isEqual, isArray, cloneDeep } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { SetterOrUpdater } from '@utils/type-fixing';
import { convertToSetEntity } from './type-fixing';
import { IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { hashData } from './numbers';
import { getDeepDiff } from './objects';
import { addExtraItems, checkBulkLimit } from '@items/inv-handlers';
import { getFinalHealthValue, getHealthValueParts } from '@variables/variable-helpers';
import { supabase } from '../main';

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

// Fields that update-character persists. Used to merge on an optimistic-concurrency conflict.
const SAVED_CHARACTER_FIELDS = [
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

/**
 * Three-way merge for a save conflict: start from the authoritative remote row, then
 * re-apply only the top-level fields the user actually changed since `base` (their last
 * synced state). This preserves a concurrent writer's changes to OTHER fields instead of
 * clobbering them, while never silently dropping the user's own edits.
 *
 * Granularity is per top-level field: if two writers edited the SAME field (e.g. both
 * touched `details`) the local edit wins for that whole field. That's still strictly
 * better than the previous unconditional last-write-wins, and the user is notified.
 */
function mergeCharacterOnConflict(
  base: Character | null,
  local: Character | null,
  remote: Character
): Character {
  const merged = cloneDeep(remote);
  if (!base || !local) return merged;
  for (const field of SAVED_CHARACTER_FIELDS) {
    if (!isEqual((local as any)[field], (base as any)[field])) {
      (merged as any)[field] = cloneDeep((local as any)[field]);
    }
  }
  return merged;
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
} {
  const [character, setCharacter] = useAtom(characterState);
  useAutoSave(character, characterId);

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

  const handleFetchedCharacter = (resultCharacter: Character | null | undefined) => {
    if (resultCharacter) {
      // This is authoritative server state — record it as the concurrency base even
      // when the local atom already matches (so update-character keeps a fresh token).
      lastSyncedRef.current = resultCharacter;

      // Don't update if they're the same
      if (isEqual(character, resultCharacter)) {
        return;
      }

      if (character && resultCharacter) {
        const diff = getDeepDiff(character, resultCharacter);
        // If we can't detect a diff, don't update
        if (Object.keys(diff).length === 0) {
          return;
        }

        console.log('Doing extra update bc of discrepancies', diff);
      }

      // Update character
      setCharacter(resultCharacter);

      // Make sure we sync the enabled content sources
      defineDefaultSources('PAGE', resultCharacter.content_sources?.enabled ?? []);

      // Cache character customization for fast loading
      saveCustomization({
        background_image_url:
          (resultCharacter.details?.background_image_url || getCachedPublicUser()?.background_image_url) ?? undefined,
        sheet_theme: (resultCharacter.details?.sheet_theme || getCachedPublicUser()?.site_theme) ?? undefined,
      });
    } else {
      // Character not found, probably due to unauthorized access
      window.location.href = '/sheet-unauthorized';
    }
  };

  // Fetch character from db
  useEffect(() => {
    (async () => {
      // Before fetching the character, check if there's an autosaved version in localStorage and save it to the database if it exists
      const key = `autosave-character-${characterId}`;
      const pending = localStorage.getItem(key);
      if (pending) {
        const { token, body } = JSON.parse(pending);
        const replayRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-character`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        // Only drop the buffered edit once the server has actually accepted it. If the
        // replay fails (expired token -> 401, offline, 5xx) keep it so it retries on the
        // next mount instead of silently discarding the user's only unsynced copy.
        if (replayRes.ok) {
          localStorage.removeItem(key);
        }
      }

      // Now fetch the character from the database to ensure we have the latest version
      const dbCharacter = await makeRequest<Character>('find-character', { id: characterId });
      handleFetchedCharacter(dbCharacter);
    })();
  }, []);

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationCharacterResultPackage>();
  const executingOperations = useRef<number | null>(null);

  const [debouncedCharacter] = useDebouncedValue(character, 800);
  const prevDebouncedCharacter = usePrevious(debouncedCharacter);
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

  useEffect(() => {
    if (options.type !== 'EXECUTE_OPS') return;
    if (!debouncedCharacter) return;

    const prevOpsHash = getUpdateHash(prevDebouncedCharacter);
    const opsHash = getUpdateHash(debouncedCharacter);
    if (prevOpsHash === opsHash || executingOperations.current === opsHash) return;

    console.log('> Executing ops #', opsHash);
    executingOperations.current = opsHash;
    executeOperations<OperationCharacterResultPackage>({
      type: 'CHARACTER',
      data: {
        character: debouncedCharacter,
        content: options.data.content,
        context: options.data.context,
      },
    }).then((results) => handleOperationResults(results));
  }, [debouncedCharacter]);

  const handleOperationResults = (results: OperationCharacterResultPackage) => {
    if (options.type !== 'EXECUTE_OPS') return;
    if (!debouncedCharacter) return;
    if (executingOperations.current !== getUpdateHash(debouncedCharacter)) {
      // Old execution, ignore
      console.log('... Ignoring outdated ops #', getUpdateHash(debouncedCharacter));
      return;
    }

    // Final execution pipeline:
    console.log('... Finished executing ops #', getUpdateHash(debouncedCharacter));

    if (debouncedCharacter.variants?.proficiency_without_level) {
      setVariable('CHARACTER', 'PROF_WITHOUT_LEVEL', true);
    }

    // Add the extra items to the inventory from variables
    addExtraItems(
      'CHARACTER',
      options.data.content.items,
      debouncedCharacter,
      convertToSetEntity(setCharacterDebounced)
    );

    // Check bulk limits
    checkBulkLimit(
      'CHARACTER',
      debouncedCharacter,
      convertToSetEntity(setCharacterDebounced),
      debouncedCharacter.options?.ignore_bulk_limit !== true
    );

    // Apply armor/shield penalties
    applyEquipmentPenalties('CHARACTER', debouncedCharacter);

    // Apply conditions after everything else
    applyConditions('CHARACTER', debouncedCharacter.details?.conditions ?? []);

    if (debouncedCharacter.meta_data?.reset_hp !== false) {
      // To reset hp, we need to confirm health

      const handleRestHP = () => {
        const { classHp } = getHealthValueParts('CHARACTER');
        const maxHealth = getFinalHealthValue('CHARACTER');
        // Don't clear reset_hp until the character has class HP - otherwise ancestry-only HP
        // gets locked in before the class is selected, resulting in a too-low starting HP.
        confirmHealth(`${maxHealth}`, maxHealth, debouncedCharacter, convertToSetEntity(setCharacterDebounced), classHp === 0);
      };

      // We run it twice for it to break out of the debouncing lock (not a perfect solution, but works)
      handleRestHP();
      setTimeout(() => {
        handleRestHP();
      }, 1000);
    } else {
      // Because of the drained condition, let's confirm health
      const maxHealth = getFinalHealthValue('CHARACTER');
      confirmHealth(
        `${debouncedCharacter.hp_current}`,
        maxHealth,
        debouncedCharacter,
        convertToSetEntity(setCharacterDebounced)
      );
    }

    // Save calculated stats
    saveCalculatedStats('CHARACTER', debouncedCharacter, convertToSetEntity(setCharacterDebounced));

    setOperationResults(results);
    executingOperations.current = null;

    setTimeout(() => {
      options.data.onFinishLoading?.();
    }, 100);
  };

  // Serialized, latest-wins auto-save.
  //
  // Saves must NOT overlap: update-character does a full-column replace of inventory,
  // spells, etc. with no version guard, so if an older snapshot's write commits after
  // a newer one, the newer inventory/spell edits are silently clobbered. We therefore
  // keep at most ONE update-character in flight at a time and, while one is running,
  // remember only the most recent pending snapshot to send next. This guarantees
  // writes are strictly ordered and the final write always reflects the latest state.
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<Record<string, any> | null>(null);

  // Update character in db when state changed
  useDidUpdate(() => {
    if (!debouncedCharacter) return;
    // View-only session — the server told us our writes are RLS-denied.
    if (readOnlyRef.current) return;
    // Defense-in-depth against the empty-corpus wipe (#235): if content failed to load,
    // operations ran against nothing (HP/boosts/choices degrade to empty) — never persist
    // that. The page-level guard should prevent mounting here at all, but the save site is
    // where the damage happens, so we refuse the write directly too.
    if (options.type === 'EXECUTE_OPS' && isContentPackageEmpty(options.data.content)) return;
    mutateCharacter({
      name: debouncedCharacter.name,
      level: debouncedCharacter.level,
      experience: debouncedCharacter.experience,
      hp_current: debouncedCharacter.hp_current,
      hp_temp: debouncedCharacter.hp_temp,
      hero_points: debouncedCharacter.hero_points,
      stamina_current: debouncedCharacter.stamina_current,
      resolve_current: debouncedCharacter.resolve_current,
      inventory: debouncedCharacter.inventory,
      notes: debouncedCharacter.notes,
      details: debouncedCharacter.details,
      roll_history: debouncedCharacter.roll_history,
      custom_operations: debouncedCharacter.custom_operations,
      meta_data: debouncedCharacter.meta_data,
      options: debouncedCharacter.options,
      variants: debouncedCharacter.variants,
      content_sources: debouncedCharacter.content_sources,
      operation_data: debouncedCharacter.operation_data,
      spells: debouncedCharacter.spells,
      companions: debouncedCharacter.companions,
      campaign_id: debouncedCharacter.campaign_id,
    });
  }, [debouncedCharacter]);
  const { mutate: mutateCharacterRaw } = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      // Send our last-known server token so the write is rejected (not silently
      // applied) if the row changed since. Omitted when unknown (e.g. before the
      // updated_at migration ships), which keeps the previous unconditional behavior.
      const expected_updated_at = lastSyncedRef.current?.updated_at;
      const resData = await makeRequest('update-character', {
        id: characterId,
        ...data,
        ...(expected_updated_at ? { expected_updated_at } : {}),
      });
      // Forbidden: RLS lets this session read the character but not write it.
      if (resData && !isArray(resData) && (resData as any).__forbidden) {
        return { forbidden: true, conflict: false, server: null as Character | null };
      }
      // Conflict: the server returned the current row instead of overwriting.
      if (resData && !isArray(resData) && (resData as any).__conflict) {
        return {
          forbidden: false,
          conflict: true,
          server: ((resData as any).character ?? null) as Character | null,
        };
      }
      const row = isArray(resData) && resData.length > 0 ? (resData[0] as Character) : null;
      return { forbidden: false, conflict: false, server: row };
    },
    onSuccess: (result) => {
      if (!result) return;
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
        if (conflictStreakRef.current >= MAX_CONFLICT_STREAK) {
          // Merging again would only re-trigger another save → conflict round.
          console.warn('Repeated save conflicts; pausing merge-and-retry until a save succeeds.');
          return;
        }
        const merged = mergeCharacterOnConflict(base, characterRef.current, remote);
        // Only apply + notify when the merge actually changes local data. Equal on
        // every saved field means the server row already matches what we have
        // (pure token skew) — updating state anyway would fire a pointless save.
        const changed =
          !characterRef.current ||
          SAVED_CHARACTER_FIELDS.some(
            (field) => !isEqual((merged as any)[field], (characterRef.current as any)[field])
          );
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
        console.log('> Fetched updated character: #', getUpdateHash(character), 'vs.', getUpdateHash(result.server));
      }
    },
    onError: () => {
      showNotification({
        icon: <IconAlertCircle />,
        title: 'Failed to save character',
        message: 'Your changes could not be saved. Please check your connection and try again.',
        color: 'red',
        autoClose: 5000,
      });
    },
    onSettled: () => {
      // Once the in-flight save resolves, flush the latest pending snapshot (if any).
      const next = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (next) {
        mutateCharacterRaw(next);
      } else {
        savingRef.current = false;
      }
    },
  });

  const mutateCharacter = (data: Record<string, any>) => {
    if (readOnlyRef.current) return;
    if (savingRef.current) {
      // A save is already in flight — keep only the newest snapshot to send next.
      pendingSaveRef.current = data;
      return;
    }
    savingRef.current = true;
    mutateCharacterRaw(data);
  };

  // Poll remote character updates - only if the character hasn't been updated recently
  const [lDebouncedCharacter] = useDebouncedValue(character, 5000);
  const notRecentlyUpdated = !!(
    !executingOperations &&
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
    // There must be a character
    !!character &&
    // It must be the requested one
    character.id === characterId &&
    // There must be some operation results if ops were executed
    (options.type === 'EXECUTE_OPS' ? !!operationResults : true);

  return {
    character,
    setCharacter,
    isLoading: !isFinished,
    results: operationResults ?? null,
  };
}

/**
 * Custom hook to auto-save character data to localStorage when the page is closed or hidden, and to sync the auth token with Supabase session
 * @param character - The character data to auto-save
 * @param characterId - The ID of the character, used for namespacing the localStorage key
 * @returns void
 */
function useAutoSave(character: Character | null, characterId: number) {
  const characterRef = useRef(character);
  const tokenRef = useRef<string>(import.meta.env.VITE_SUPABASE_KEY);

  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) tokenRef.current = session.access_token;
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) tokenRef.current = session.access_token;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const saveImmediately = () => {
      const c = characterRef.current;
      if (!c) return;
      // localStorage.setItem is synchronous — guaranteed to complete even on tab close
      localStorage.setItem(
        `autosave-character-${characterId}`,
        JSON.stringify({
          token: tokenRef.current,
          body: {
            id: characterId,
            name: c.name,
            level: c.level,
            experience: c.experience,
            hp_current: c.hp_current,
            hp_temp: c.hp_temp,
            hero_points: c.hero_points,
            stamina_current: c.stamina_current,
            resolve_current: c.resolve_current,
            inventory: c.inventory,
            notes: c.notes,
            details: c.details,
            roll_history: c.roll_history,
            custom_operations: c.custom_operations,
            meta_data: c.meta_data,
            options: c.options,
            variants: c.variants,
            content_sources: c.content_sources,
            operation_data: c.operation_data,
            spells: c.spells,
            companions: c.companions,
            campaign_id: c.campaign_id,
          },
        })
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveImmediately();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', saveImmediately);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', saveImmediately);
      // Also save on SPA navigation (unmount), since pagehide won't fire for in-app routing
      saveImmediately();
    };
  }, []);
}
