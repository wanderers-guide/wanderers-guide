import D20Loader from '@assets/images/D20Loader';
import { characterState } from '@atoms/characterAtoms';
import { getCachedPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import { applyConditions } from '@conditions/condition-handler';
import { defineDefaultSources, fetchContentPackage, fetchContentSources } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';

import { addExtraItems, checkBulkLimit } from '@items/inv-utils';
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Grid,
  Group,
  Indicator,
  Menu,
  Popover,
  SimpleGrid,
  Stack,
  Tabs,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useDebouncedValue, useDidUpdate, useElementSize, useHover, useInterval, useMediaQuery } from '@mantine/hooks';
import { executeCharacterOperations } from '@operations/operation-controller';
import { makeRequest } from '@requests/request-manager';
import {
  IconBackpack,
  IconBadgesFilled,
  IconCaretLeftRight,
  IconDots,
  IconFlag,
  IconFlare,
  IconLayoutGrid,
  IconLayoutList,
  IconListDetails,
  IconNotebook,
  IconNotes,
  IconPaw,
  IconShadow,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Character, ContentPackage, Inventory } from '@typing/content';
import { OperationCharacterResultPackage } from '@typing/operations';
import { JSendResponse } from '@typing/requests';
import { VariableListStr } from '@typing/variables';
import { setPageTitle } from '@utils/document-change';
import { isPhoneSized, phoneQuery, tabletQuery } from '@utils/mobile-responsive';
import { toLabel } from '@utils/strings';
import { getFinalHealthValue } from '@variables/variable-display';
import { getVariable, setVariable } from '@variables/variable-manager';
import * as _ from 'lodash-es';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { confirmHealth } from './living-entity-utils';
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
import CharacterInfoSection from './sections/EntityInfoSection';
import ConditionSection from './sections/ConditionSection';
import HealthSection from './sections/HealthSection';
import SpeedSection from './sections/SpeedSection';
import { GiRollingDices } from 'react-icons/gi';
import { displayComingSoon } from '@utils/notifications';
import { saveCalculatedStats } from '@variables/calculated-stats';
import { convertToSetEntity } from '@utils/type-fixing';
import ModeDrawer from '@common/modes/ModesDrawer';
import ModesDrawer from '@common/modes/ModesDrawer';
import CampaignDrawer from '@pages/campaign/CampaignDrawer';

// Use lazy imports here to prevent a huge amount of js on initial load (3d dice smh)
const DiceRoller = lazy(() => import('@common/dice/DiceRoller'));

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
      const character = await makeRequest<Character>('find-character', {
        id: characterId,
      });
      defineDefaultSources(character?.content_sources?.enabled);

      // Prefetch content sources (to avoid multiple requests)
      await fetchContentSources();

      // Fetch content
      const content = await fetchContentPackage(undefined, { fetchSources: true });
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
  const { ref, width, height } = useElementSize();

  const panelWidth = width ? width - 60 : 2000;
  const panelHeight = height > 800 ? 555 : 500;
  const [hideSections, setHideSections] = useState(false);

  const [character, setCharacter] = useRecoilState(characterState);
  setPageTitle(character && character.name.trim() ? character.name : 'Sheet');

  const activeModes = getVariable<VariableListStr>('CHARACTER', 'ACTIVE_MODES')?.value || [];

  const handleFetchedCharacter = (resultCharacter: Character | null) => {
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

    if (!_.isEqual(character, resultCharacter)) {
      setCharacter(resultCharacter);
    }
    if (!_.isEqual(inventory, getInventory(resultCharacter))) {
      setInventory(getInventory(resultCharacter));
    }
  };

  // Fetch character from db
  const { isLoading, isInitialLoading } = useQuery({
    queryKey: [`find-character-${props.characterId}`],
    queryFn: async () => {
      const resultCharacter = await makeRequest<Character>('find-character', {
        id: props.characterId,
      });
      handleFetchedCharacter(resultCharacter);
      return true;
    },
    refetchOnWindowFocus: false,
  });

  // Execute operations
  const [operationResults, setOperationResults] = useState<OperationCharacterResultPackage>();
  const executingOperations = useRef(false);
  useEffect(() => {
    if (!character || executingOperations.current) return;
    setTimeout(() => {
      if (!character || executingOperations.current) return;
      executingOperations.current = true;
      executeCharacterOperations(character, props.content, 'CHARACTER-SHEET').then((results) => {
        if (character.variants?.proficiency_without_level) {
          setVariable('CHARACTER', 'PROF_WITHOUT_LEVEL', true);
        }

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
          confirmHealth(
            `${getFinalHealthValue('CHARACTER')}`,
            'CHARACTER',
            character,
            convertToSetEntity(setCharacter)
          );
        } else {
          // Because of the drained condition, let's confirm health
          confirmHealth(`${character.hp_current}`, 'CHARACTER', character, convertToSetEntity(setCharacter));
        }

        // Save calculated stats
        saveCalculatedStats(character, setCharacter);

        setOperationResults(results);
        executingOperations.current = false;

        setTimeout(() => {
          props.onFinishLoading?.();
        }, 100);
      });
    }, 1);
  }, [character]);

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
      const resData = await makeRequest('update-character', {
        id: props.characterId,
        ...data,
      });
      if (_.isArray(resData) && resData.length > 0) {
        handleFetchedCharacter(resData[0]);
      }
      return true;
    },
    {
      onSuccess: () => {},
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

  const [openedDiceRoller, setOpenedDiceRoller] = useState(false);
  const [loadedDiceRoller, setLoadedDiceRoller] = useState(false);

  const [openedCampaign, setOpenedCampaign] = useState(false);
  const [openedModes, setOpenedModes] = useState(false);

  const modes = useMemo(() => {
    const givenModeIds = getVariable<VariableListStr>('CHARACTER', 'MODE_IDS')?.value || [];
    return props.content.abilityBlocks.filter((block) => block.type === 'mode' && givenModeIds.includes(block.id + ''));
  }, [character, operationResults, props.content]);

  return (
    <Center>
      <Box maw={1000} w='100%' pb='sm'>
        <Box ref={ref}>
          <Stack gap='xs' style={{ position: 'relative' }}>
            <SimpleGrid cols={isPhone ? 1 : isTablet ? 2 : 3} spacing='xs' verticalSpacing='xs'>
              <CharacterInfoSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
              {!hideSections && (
                <>
                  <HealthSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                  <ConditionSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                  <AttributeSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                  <ArmorSection id='CHARACTER' inventory={inventory} setInventory={setInventory} />
                  <SpeedSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                </>
              )}
            </SimpleGrid>
            <SectionPanels
              content={props.content}
              inventory={inventory}
              setInventory={setInventory}
              isLoaded={!!operationResults}
              panelHeight={panelHeight}
              panelWidth={panelWidth}
              hideSections={hideSections}
              onHideSections={(hide) => setHideSections(hide)}
            />
          </Stack>
        </Box>
      </Box>
      <Box
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
        }}
      >
        <Stack>
          {modes.length > 0 && (
            <Indicator disabled={activeModes.length === 0} label={activeModes.length} size={14} offset={4}>
              <ActionIcon
                size={40}
                variant='light'
                style={{
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                radius={100}
                aria-label='Modes'
                onClick={() => {
                  setOpenedModes((prev) => !prev);
                }}
              >
                <IconShadow size='1.7rem' stroke={1.5} />
              </ActionIcon>
            </Indicator>
          )}
          {character?.campaign_id && (
            <ActionIcon
              size={40}
              variant='light'
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              radius={100}
              aria-label='Campaigns View'
              onClick={() => {
                setOpenedCampaign((prev) => !prev);
              }}
            >
              <IconFlag size='1.7rem' stroke={1.5} />
            </ActionIcon>
          )}
          {character?.options?.dice_roller && (
            <ActionIcon
              size={40}
              variant='light'
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              radius={100}
              aria-label='Dice Roller'
              onClick={() => {
                if (!loadedDiceRoller) {
                  setLoadedDiceRoller(true);
                }
                setOpenedDiceRoller(true);
              }}
            >
              <GiRollingDices size='1.8rem' stroke={'1.5px'} />
            </ActionIcon>
          )}
        </Stack>
      </Box>
      {loadedDiceRoller && (
        <Suspense fallback={<></>}>
          <DiceRoller
            opened={openedDiceRoller}
            onClose={() => {
              setOpenedDiceRoller(false);
            }}
          />
        </Suspense>
      )}
      {openedModes && <ModesDrawer content={props.content} opened={true} onClose={() => setOpenedModes(false)} />}
      {openedCampaign && character?.campaign_id && (
        <CampaignDrawer campaignId={character?.campaign_id} opened={true} onClose={() => setOpenedCampaign(false)} />
      )}
    </Center>
  );
}

function SectionPanels(props: {
  content: ContentPackage;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  isLoaded: boolean;
  hideSections: boolean;
  onHideSections: (hide: boolean) => void;
  panelHeight: number;
  panelWidth: number;
}) {
  const theme = useMantineTheme();
  const isPhone = isPhoneSized(props.panelWidth);

  const [openedPhonePanel, setOpenedPhonePanel] = useState(false);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { hovered: hoveredTabOptions, ref: tabOptionsRef } = useHover<HTMLButtonElement>();

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

  if (isPhone) {
    return (
      <Box>
        {props.hideSections && (
          <BlurBox blur={10} p='sm' mih={props.panelHeight}>
            {activeTab === 'skills-actions' && (
              <SkillsActionsPanel
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPanel
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            )}

            {activeTab === 'spells' && <SpellsPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />}

            {activeTab === 'feats-features' && (
              <FeatsFeaturesPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            )}

            {activeTab === 'companions' && (
              <CompanionsPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            )}

            {activeTab === 'details' && (
              <DetailsPanel content={props.content} panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            )}

            {activeTab === 'notes' && <NotesPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />}

            {activeTab === 'extras' && <ExtrasPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />}
          </BlurBox>
        )}

        <Box
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
          }}
        >
          <Popover position='top' shadow='md' withArrow opened={openedPhonePanel} onChange={setOpenedPhonePanel}>
            <Popover.Target>
              <ActionIcon
                size={55}
                variant='filled'
                radius={100}
                aria-label='Panel Grid'
                onClick={() => setOpenedPhonePanel((o) => !o)}
              >
                {openedPhonePanel ? <IconX size='2rem' stroke={2} /> : <IconLayoutGrid size='2rem' stroke={1.5} />}
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown w={'100dvw'}>
              <Box>
                <Stack>
                  <Button
                    leftSection={<IconLayoutList size='1.2rem' stroke={2} />}
                    variant={!props.hideSections ? 'filled' : 'outline'}
                    onClick={() => {
                      props.onHideSections(false);
                      setOpenedPhonePanel(false);
                    }}
                  >
                    Health, Attributes, Saves
                  </Button>
                  <SimpleGrid cols={2}>
                    <Button
                      leftSection={<IconBadgesFilled size='1.2rem' stroke={2} />}
                      variant={activeTab === 'skills-actions' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('skills-actions');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Skills & Actions
                    </Button>
                    <Button
                      leftSection={<IconCaretLeftRight size='1.2rem' stroke={2} />}
                      variant={activeTab === 'feats-features' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('feats-features');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Feats & Features
                    </Button>
                  </SimpleGrid>
                  <SimpleGrid cols={2}>
                    <Button
                      leftSection={<IconBackpack size='1.2rem' stroke={2} />}
                      variant={activeTab === 'inventory' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('inventory');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Inventory
                    </Button>
                    <Button
                      leftSection={<IconFlare size='1.2rem' stroke={2} />}
                      variant={activeTab === 'spells' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('spells');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Spells
                    </Button>
                  </SimpleGrid>
                  <SimpleGrid cols={2}>
                    <Button
                      leftSection={<IconNotebook size='1.2rem' stroke={2} />}
                      variant={activeTab === 'notes' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('notes');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Notes
                    </Button>
                    <Button
                      leftSection={<IconListDetails size='1.2rem' stroke={2} />}
                      variant={activeTab === 'details' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('details');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Details
                    </Button>
                  </SimpleGrid>
                  <SimpleGrid cols={2}>
                    <Button
                      leftSection={<IconPaw size='1.2rem' stroke={2} />}
                      variant={activeTab === 'companions' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('companions');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Companions
                    </Button>
                    <Button
                      leftSection={<IconNotes size='1.2rem' stroke={2} />}
                      variant={activeTab === 'extras' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('extras');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Extras
                    </Button>
                  </SimpleGrid>
                </Stack>
              </Box>
            </Popover.Dropdown>
          </Popover>
        </Box>
      </Box>
    );
  } else {
    return (
      <Box>
        <BlurBox blur={10} p='sm' mih={props.panelHeight}>
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
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            </Tabs.Panel>

            <Tabs.Panel value='inventory'>
              <InventoryPanel
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            </Tabs.Panel>

            <Tabs.Panel value='spells'>
              <SpellsPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            </Tabs.Panel>

            <Tabs.Panel value='feats-features'>
              <FeatsFeaturesPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            </Tabs.Panel>

            <Tabs.Panel value='companions'>
              <CompanionsPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            </Tabs.Panel>

            <Tabs.Panel value='details'>
              <DetailsPanel content={props.content} panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            </Tabs.Panel>

            <Tabs.Panel value='notes'>
              <NotesPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            </Tabs.Panel>

            <Tabs.Panel value='extras'>
              <ExtrasPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            </Tabs.Panel>
          </Tabs>
        </BlurBox>
      </Box>
    );
  }
}
