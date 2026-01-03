import { characterState } from '@atoms/characterAtoms';
import { getCachedPublicUser } from '@auth/user-manager';
import { applyConditions } from '@conditions/condition-handler';
import { defineDefaultSources } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';
import { applyEquipmentPenalties } from '@items/inv-utils';
import { useDebouncedCallback, useDebouncedValue, useDidUpdate, usePrevious } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { executeOperations } from '@operations/operations.main';
import { confirmHealth } from '@pages/character_sheet/entity-handler';
import { makeRequest } from '@requests/request-manager';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Character, ContentPackage } from '@typing/content';
import { OperationCharacterResultPackage } from '@typing/operations';
import { saveCalculatedStats } from '@variables/calculated-stats';
import { setVariable } from '@variables/variable-manager';
import { isEqual, isArray, cloneDeep } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { convertToSetEntity } from './type-fixing';
import { IconRefresh } from '@tabler/icons-react';
import { hashData } from './numbers';
import { getDeepDiff } from './objects';
import { addExtraItems, checkBulkLimit } from '@items/inv-handlers';
import { getFinalHealthValue } from '@variables/variable-helpers';

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
  const [character, setCharacter] = useRecoilState(characterState);

  const handleFetchedCharacter = (resultCharacter: Character | null | undefined) => {
    if (resultCharacter) {
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
          resultCharacter.details?.background_image_url || getCachedPublicUser()?.background_image_url,
        sheet_theme: resultCharacter.details?.sheet_theme || getCachedPublicUser()?.site_theme,
      });
    } else {
      // Character not found, probably due to unauthorized access
      window.location.href = '/sheet-unauthorized';
    }
  };

  // Fetch character from db
  useEffect(() => {
    (async () => {
      const dbCharacter = await makeRequest<Character>('find-character', {
        id: characterId,
      });
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
        const maxHealth = getFinalHealthValue('CHARACTER');
        confirmHealth(`${maxHealth}`, maxHealth, debouncedCharacter, convertToSetEntity(setCharacterDebounced));
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

  // Update character in db when state changed
  useDidUpdate(() => {
    if (!debouncedCharacter) return;
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
  const { mutate: mutateCharacter } = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const resData = await makeRequest('update-character', {
        id: characterId,
        ...data,
      });
      return isArray(resData) && resData.length > 0 ? (resData[0] as Character) : null;
    },
    onSuccess: (c) => {
      if (c) {
        console.log('> Fetched updated character: #', getUpdateHash(character), 'vs.', getUpdateHash(c));
      }
    },
  });

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
