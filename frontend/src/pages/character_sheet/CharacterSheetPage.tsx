import D20Loader from '@assets/images/D20Loader';
import { characterState } from '@atoms/characterAtoms';
import { getCachedPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import { applyConditions } from '@conditions/condition-handler';
import { defineDefaultSources, fetchContentPackage } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';

import { addExtraItems, checkBulkLimit } from '@items/inv-utils';
import { ActionIcon, Box, Center, Menu, SimpleGrid, Stack, Tabs, rem, useMantineTheme } from '@mantine/core';
import { useDebouncedValue, useDidUpdate, useElementSize, useHover, useInterval, useMediaQuery } from '@mantine/hooks';
import { executeCharacterOperations } from '@operations/operation-controller';
import { makeRequest } from '@requests/request-manager';
import {
  IconBackpack,
  IconBadgesFilled,
  IconCaretLeftRight,
  IconDots,
  IconFlare,
  IconListDetails,
  IconNotebook,
  IconNotes,
  IconPaw,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Character, ContentPackage, Inventory } from '@typing/content';
import { OperationResultPackage } from '@typing/operations';
import { JSendResponse } from '@typing/requests';
import { VariableListStr } from '@typing/variables';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery, tabletQuery } from '@utils/mobile-responsive';
import { toLabel } from '@utils/strings';
import { getFinalHealthValue } from '@variables/variable-display';
import { getVariable } from '@variables/variable-manager';
import * as _ from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { confirmHealth } from './character-utils';
import CompanionsPanel from './panels/CompanionsPanel';
import DetailsPanel from './panels/DetailsPanel';
import ExtrasPanel from './panels/ExtrasPanel';
import FeatsFeaturesPanel from './panels/FeatsFeaturesPanel';
import InventoryPanel from './panels/InventoryPanel';
import NotesPanel from './panels/NotesPanel';
import SkillsActionsPanel from './panels/SkillsActionsPanel';
import SpellsPanel from './panels/SpellsPanel';
import ArmorSection from './sections/ArmorSection';
import AttributeSection from './sections/AttributeSection';
import CharacterInfoSection from './sections/CharacterInfoSection';
import ConditionSection from './sections/ConditionSection';
import HealthSection from './sections/HealthSection';
import SpeedSection from './sections/SpeedSection';

export function Component(props: {}) {
  setPageTitle(`Sheet`);

  const { characterId } = useLoaderData() as {
    characterId: number;
  };

  const theme = useMantineTheme();
  const [doneLoading, setDoneLoading] = useState(false);

  const { data: content, isFetching } = useQuery({
    queryKey: [`find-content-${characterId}`],
    queryFn: async () => {
      // Set default sources
      // const character = await makeRequest<Character>('find-character', {
      //   id: characterId,
      // });
      // defineDefaultSources(character?.content_sources?.enabled);

      // Fetch content
      const content = await fetchContentPackage(undefined, true);
      interval.stop();
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Just load progress manually
  const [percentage, setPercentage] = useState(0);
  const interval = useInterval(() => setPercentage((p) => p + 2), 50);
  useEffect(() => {
    interval.start();
    return interval.stop;
  }, []);

  const loader = (
    <Box
      style={{
        width: '100%',
        height: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <D20Loader size={100} color={theme.colors[theme.primaryColor][5]} percentage={percentage} status='Loading...' />
    </Box>
  );

  if (isFetching || !content) {
    return loader;
  } else {
    return (
      <>
        <div style={{ display: doneLoading ? 'none' : undefined }}>{loader}</div>
        <div style={{ display: doneLoading ? undefined : 'none' }}>
          <CharacterSheetInner
            content={content}
            characterId={characterId}
            onFinishLoading={() => {
              interval.stop();
              setDoneLoading(true);
            }}
          />
        </div>
      </>
    );
  }
}

function CharacterSheetInner(props: { content: ContentPackage; characterId: number; onFinishLoading: () => void }) {
  const queryClient = useQueryClient();

  const isTablet = useMediaQuery(tabletQuery());
  const isPhone = useMediaQuery(phoneQuery());

  const [character, setCharacter] = useRecoilState(characterState);
  setPageTitle(character && character.name.trim() ? character.name : 'Sheet');

  // Fetch character from db
  const {
    data: resultCharacter,
    isLoading,
    isInitialLoading,
  } = useQuery({
    queryKey: [`find-character-${props.characterId}`],
    queryFn: async () => {
      const resultCharacter = await makeRequest<Character>('find-character', {
        id: props.characterId,
      });

      if (resultCharacter) {
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

      return resultCharacter;
    },
    refetchOnWindowFocus: false,
  });

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationResultPackage>();
  const executingOperations = useRef(false);
  useEffect(() => {
    if (!character || executingOperations.current) return;
    executingOperations.current = true;
    executeCharacterOperations(character, props.content, 'CHARACTER-SHEET').then((results) => {
      // Add the extra items to the inventory from variables
      addExtraItems(props.content.items, character, setCharacter);

      // Check bulk limits
      if (character.options?.ignore_bulk_limit !== true) {
        checkBulkLimit(character, setCharacter);
      }

      // Apply conditions after everything else
      applyConditions('CHARACTER', character.details?.conditions ?? []);
      if (character.meta_data?.reset_hp !== false) {
        // To reset hp, we need to confirm health
        confirmHealth(`${getFinalHealthValue('CHARACTER')}`, character, setCharacter);
      } else {
        // Because of the drained condition, let's confirm health
        confirmHealth(`${character.hp_current}`, character, setCharacter);
      }

      setOperationResults(results);
      executingOperations.current = false;

      setTimeout(() => {
        props.onFinishLoading?.();
      }, 100);
    });
  }, [character]);

  //

  useEffect(() => {
    if (!resultCharacter) return;
    // Update character nav state
    setCharacter(resultCharacter);
    setInventory(getInventory(resultCharacter));
  }, [resultCharacter]);

  // Update character in db when state changed
  const [debouncedCharacter] = useDebouncedValue(character, 500);
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

  // Update character stats
  const { mutate: mutateCharacter } = useMutation(
    async (data: Record<string, any>) => {
      const response = await makeRequest<JSendResponse>('update-character', {
        id: props.characterId,
        ...data,
      });
      return response ? response.status === 'success' : false;
    },
    {
      onSuccess: () => {
        //queryClient.invalidateQueries([`find-character-${props.characterId}`]);
      },
    }
  );

  // Inventory saving & management
  const getInventory = (character: Character | null) => {
    // Default inventory
    return _.cloneDeep(
      character?.inventory ?? {
        coins: {
          cp: 0,
          sp: 0,
          gp: 0,
          pp: 0,
        },
        unarmed_attacks: [],
        items: [],
      }
    );
  };
  const [inventory, setInventory] = useState(getInventory(character));
  const [debouncedInventory] = useDebouncedValue(inventory, 500);
  useDidUpdate(() => {
    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inventory: debouncedInventory,
      };
    });
  }, [debouncedInventory]);

  return (
    <Center>
      <Box maw={1000} w='100%'>
        <Stack gap='xs' style={{ position: 'relative' }}>
          <SimpleGrid cols={isPhone ? 1 : isTablet ? 2 : 3} spacing='xs' verticalSpacing='xs'>
            <CharacterInfoSection />
            <HealthSection />
            <ConditionSection />
            <AttributeSection />
            <ArmorSection inventory={inventory} setInventory={setInventory} />
            <SpeedSection />
          </SimpleGrid>
          <SectionPanels
            content={props.content}
            inventory={inventory}
            setInventory={setInventory}
            isLoaded={!!operationResults}
          />
        </Stack>
      </Box>
    </Center>
  );
}

function SectionPanels(props: {
  content: ContentPackage;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  isLoaded: boolean;
}) {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { hovered: hoveredTabOptions, ref: tabOptionsRef } = useHover<HTMLButtonElement>();
  const { ref, width, height } = useElementSize();

  const panelWidth = width - 60;
  const panelHeight = height > 1000 ? 550 : 500;

  const iconStyle = { width: rem(12), height: rem(12) };
  const allSheetTabs = [
    'skills-actions',
    'inventory',
    'spells',
    'feats-features',
    'companions',
    'details',
    'notes',
    'extras',
  ];
  const primarySheetTabs = getVariable<VariableListStr>('CHARACTER', 'PRIMARY_SHEET_TABS')?.value ?? [];
  const tabOptions = allSheetTabs.filter((tab) => !primarySheetTabs.includes(tab));
  const openedTabOption = tabOptions.find((tab) => tab === activeTab);
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'skills-actions':
        return <IconBadgesFilled style={iconStyle} />;
      case 'inventory':
        return <IconBackpack style={iconStyle} />;
      case 'spells':
        return <IconFlare style={iconStyle} />;
      case 'feats-features':
        return <IconCaretLeftRight style={iconStyle} />;
      case 'companions':
        return <IconPaw style={iconStyle} />;
      case 'details':
        return <IconListDetails style={iconStyle} />;
      case 'notes':
        return <IconNotebook style={iconStyle} />;
      case 'extras':
        return <IconNotes style={iconStyle} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    // Open first tab when finished loading
    if (props.isLoaded && activeTab === null) {
      setActiveTab('skills-actions');
    }
  }, [props.isLoaded, activeTab]);

  return (
    <Box ref={ref}>
      <BlurBox blur={10} p='sm'>
        <Tabs
          color='dark.6'
          variant='pills'
          radius='xl'
          keepMounted={false}
          value={activeTab}
          onChange={setActiveTab}
          activateTabWithKeyboard={false}
        >
          <Tabs.List pb={10} grow>
            {primarySheetTabs.includes('skills-actions') && (
              <Tabs.Tab
                value='skills-actions'
                style={{
                  border:
                    activeTab === 'skills-actions' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                }}
                leftSection={getTabIcon('skills-actions')}
              >
                Skills & Actions
              </Tabs.Tab>
            )}
            {primarySheetTabs.includes('inventory') && (
              <Tabs.Tab
                value='inventory'
                style={{
                  border: activeTab === 'inventory' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                }}
                leftSection={getTabIcon('inventory')}
              >
                Inventory
              </Tabs.Tab>
            )}
            {primarySheetTabs.includes('spells') && (
              <Tabs.Tab
                value='spells'
                style={{
                  border: activeTab === 'spells' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                }}
                leftSection={getTabIcon('spells')}
              >
                Spells
              </Tabs.Tab>
            )}
            {primarySheetTabs.includes('feats-features') && (
              <Tabs.Tab
                value='feats-features'
                style={{
                  border:
                    activeTab === 'feats-features' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                }}
                leftSection={getTabIcon('feats-features')}
              >
                Feats & Features
              </Tabs.Tab>
            )}
            {primarySheetTabs.includes('companions') && (
              <Tabs.Tab
                value='companions'
                style={{
                  border: activeTab === 'companions' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                }}
                leftSection={getTabIcon('companions')}
              >
                Companions
              </Tabs.Tab>
            )}
            {primarySheetTabs.includes('details') && (
              <Tabs.Tab
                value='details'
                style={{
                  border: activeTab === 'details' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                }}
                leftSection={getTabIcon('details')}
              >
                Details
              </Tabs.Tab>
            )}
            {primarySheetTabs.includes('notes') && (
              <Tabs.Tab
                value='notes'
                style={{
                  border: activeTab === 'notes' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                }}
                leftSection={getTabIcon('notes')}
              >
                Notes
              </Tabs.Tab>
            )}
            <Menu shadow='md' width={160} trigger='hover' openDelay={100} closeDelay={100}>
              <Menu.Target>
                <ActionIcon
                  variant='subtle'
                  color='gray.4'
                  size='lg'
                  radius='xl'
                  aria-label='Tab Options'
                  ref={tabOptionsRef}
                  style={{
                    backgroundColor: hoveredTabOptions || openedTabOption ? theme.colors.dark[6] : 'transparent',
                    color: openedTabOption ? theme.colors.gray[0] : undefined,
                    border: openedTabOption ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                  }}
                >
                  <IconDots style={{ width: '70%', height: '70%' }} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Other sections</Menu.Label>
                {tabOptions.map((tab, index) => (
                  <Menu.Item
                    key={index}
                    leftSection={getTabIcon(tab)}
                    onClick={() => {
                      setActiveTab(tab);
                    }}
                    style={{
                      backgroundColor: activeTab === tab ? theme.colors.dark[4] : undefined,
                      color: activeTab === tab ? theme.colors.gray[0] : undefined,
                    }}
                  >
                    {toLabel(tab)}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Tabs.List>

          <Tabs.Panel value='skills-actions'>
            <SkillsActionsPanel
              content={props.content}
              panelHeight={panelHeight}
              inventory={props.inventory}
              setInventory={props.setInventory}
            />
          </Tabs.Panel>

          <Tabs.Panel value='inventory'>
            <InventoryPanel
              content={props.content}
              panelHeight={panelHeight}
              inventory={props.inventory}
              setInventory={props.setInventory}
            />
          </Tabs.Panel>

          <Tabs.Panel value='spells'>
            <SpellsPanel panelHeight={panelHeight} />
          </Tabs.Panel>

          <Tabs.Panel value='feats-features'>
            <FeatsFeaturesPanel panelHeight={panelHeight} />
          </Tabs.Panel>

          <Tabs.Panel value='companions'>
            <CompanionsPanel panelHeight={panelHeight} />
          </Tabs.Panel>

          <Tabs.Panel value='details'>
            <DetailsPanel content={props.content} panelHeight={panelHeight} panelWidth={panelWidth} />
          </Tabs.Panel>

          <Tabs.Panel value='notes'>
            <NotesPanel panelHeight={panelHeight} panelWidth={panelWidth} />
          </Tabs.Panel>

          <Tabs.Panel value='extras'>
            <ExtrasPanel panelHeight={panelHeight} />
          </Tabs.Panel>
        </Tabs>
      </BlurBox>
    </Box>
  );
}
