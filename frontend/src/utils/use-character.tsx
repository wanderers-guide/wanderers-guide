import { characterState } from '@atoms/characterAtoms';
import { getCachedPublicUser } from '@auth/user-manager';
import { applyConditions } from '@conditions/condition-handler';
import { defineDefaultSources } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';
import { addExtraItems, checkBulkLimit, applyEquipmentPenalties } from '@items/inv-utils';
import { useDebouncedCallback, useDebouncedValue, useDidUpdate, usePrevious } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { executeCharacterOperations } from '@operations/operation-controller';
import { confirmHealth } from '@pages/character_sheet/living-entity-utils';
import { makeRequest } from '@requests/request-manager';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Character, ContentPackage, Inventory } from '@typing/content';
import { OperationCharacterResultPackage } from '@typing/operations';
import { saveCalculatedStats } from '@variables/calculated-stats';
import { getFinalHealthValue } from '@variables/variable-display';
import { setVariable } from '@variables/variable-manager';
import { display } from 'colorjs.io/fn';
import { isEqual, isArray, cloneDeep } from 'lodash-es';
import { props } from 'node_modules/cypress/types/bluebird';
import { useEffect, useRef, useState } from 'react';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { convertToSetEntity } from './type-fixing';
import { IconRefresh } from '@tabler/icons-react';
import { hashData } from './numbers';
import { getDeepDiff } from './objects';

export default function useCharacter(
  characterId: number,
  content: ContentPackage,
  onFinishLoading?: () => void
): {
  character: Character | null;
  setCharacter: SetterOrUpdater<Character | null>;
  //
  inventory: Inventory;
  setInventory: SetterOrUpdater<Inventory>;
  //
  isLoaded: boolean;
} {
  const [character, setCharacter] = useRecoilState(characterState);

  const handleFetchedCharacter = (resultCharacter: Character | null) => {
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
      defineDefaultSources(resultCharacter.content_sources?.enabled ?? []);

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
  const { data: dbCharacter } = useQuery({
    queryKey: [`find-character-${characterId}`],
    queryFn: async () => {
      return await makeRequest<Character>('find-character', {
        id: characterId,
      });
    },
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (dbCharacter) {
      handleFetchedCharacter(dbCharacter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbCharacter]);

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationCharacterResultPackage>();
  const [executingOperations, setExecutingOperations] = useState(false);

  const [debouncedCharacter] = useDebouncedValue(character, 200);
  const prevDebouncedCharacter = usePrevious(debouncedCharacter);
  const setCharacterDebounced = useDebouncedCallback(setCharacter, 200);

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
    if (
      !debouncedCharacter ||
      executingOperations ||
      getUpdateHash(prevDebouncedCharacter) === getUpdateHash(debouncedCharacter)
    )
      return;
    setTimeout(() => {
      if (
        !debouncedCharacter ||
        executingOperations ||
        getUpdateHash(prevDebouncedCharacter) === getUpdateHash(debouncedCharacter)
      )
        return;

      console.log('> Executing ops #', getUpdateHash(debouncedCharacter));

      setExecutingOperations(true);
      executeCharacterOperations(debouncedCharacter, content, 'CHARACTER-SHEET').then((results) => {
        // Final execution pipeline:

        if (debouncedCharacter.variants?.proficiency_without_level) {
          setVariable('CHARACTER', 'PROF_WITHOUT_LEVEL', true);
        }

        // Add the extra items to the inventory from variables
        addExtraItems('CHARACTER', content.items, debouncedCharacter, convertToSetEntity(setCharacterDebounced));

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
          const maxHealth = getFinalHealthValue('CHARACTER');
          confirmHealth(`${maxHealth}`, maxHealth, debouncedCharacter, convertToSetEntity(setCharacterDebounced));
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
        setExecutingOperations(false);

        setTimeout(() => {
          onFinishLoading?.();
        }, 100);
      });
    }, 1);
  }, [debouncedCharacter]);

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
        console.log('> Updated character #', getUpdateHash(debouncedCharacter));
        handleFetchedCharacter(c);
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
    enabled: notRecentlyUpdated,
  });

  // Inventory saving & management
  const getInventory = (character: Character | null) => {
    // Default inventory
    return cloneDeep(
      character?.inventory ?? {
        coins: {
          cp: 0,
          sp: 0,
          gp: 0,
          pp: 0,
        },
        items: [],
      }
    );
  };
  const setInventory: SetterOrUpdater<Inventory> = (u) => {
    setCharacter((c) => {
      if (!c) return null;
      return {
        ...c,
        inventory: c?.inventory ? (typeof u === 'function' ? u(c?.inventory) : u) : undefined,
      };
    });
  };

  return {
    character: character,
    setCharacter,
    inventory: getInventory(character),
    setInventory,
    isLoaded: !!operationResults,
  };
}
