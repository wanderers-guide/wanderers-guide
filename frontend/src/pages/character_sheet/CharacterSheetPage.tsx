import D20Loader from '@assets/images/D20Loader';
import { characterState } from '@atoms/characterAtoms';
import BlurBox from '@common/BlurBox';
import { defineDefaultSources, fetchContentPackage, fetchContentSources } from '@content/content-store';

import {
  ActionIcon,
  Box,
  Button,
  Center,
  Indicator,
  Menu,
  Popover,
  SimpleGrid,
  Stack,
  Tabs,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useElementSize, useHover, useInterval, useMediaQuery } from '@mantine/hooks';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Character, ContentPackage, Inventory } from '@typing/content';
import { VariableListStr } from '@typing/variables';
import { setPageTitle } from '@utils/document-change';
import { isPhoneSized, phoneQuery, tabletQuery } from '@utils/mobile-responsive';
import { toLabel } from '@utils/strings';
import { getVariable } from '@variables/variable-manager';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useRecoilState } from 'recoil';
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
import EntityInfoSection from './sections/EntityInfoSection';
import ConditionSection from './sections/ConditionSection';
import HealthSection from './sections/HealthSection';
import SpeedSection from './sections/SpeedSection';
import { GiRollingDices } from 'react-icons/gi';
import { convertToSetEntity } from '@utils/type-fixing';
import ModesDrawer from '@common/modes/ModesDrawer';
import CampaignDrawer from '@pages/campaign/CampaignDrawer';
import useCharacter from '@utils/use-character';

// Use lazy imports here to prevent a huge amount of js on initial load (3d dice smh)
const DiceRoller = lazy(() => import('@common/dice/DiceRoller'));

export function Component(props: {}) {
  setPageTitle(`Sheet`);

  const { characterId } = useLoaderData() as {
    characterId: string;
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
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Just load progress manually
  const [_p, setPercentage] = useState(0);
  const percentage = content && !doneLoading ? Math.max(_p, 50) : _p;
  const interval = useInterval(() => setPercentage(percentage + 2), 50);
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
            characterId={parseInt(characterId)}
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

  const { character, setCharacter, inventory, setInventory, isLoaded } = useCharacter(
    props.characterId,
    props.content,
    props.onFinishLoading
  );

  setPageTitle(character && character.name.trim() ? character.name : 'Sheet');

  const activeModes = getVariable<VariableListStr>('CHARACTER', 'ACTIVE_MODES')?.value || [];

  const [openedDiceRoller, setOpenedDiceRoller] = useState(false);
  const [loadedDiceRoller, setLoadedDiceRoller] = useState(false);

  const [openedCampaign, setOpenedCampaign] = useState(false);
  const [openedModes, setOpenedModes] = useState(false);

  const modes = useMemo(() => {
    const givenModeIds = getVariable<VariableListStr>('CHARACTER', 'MODE_IDS')?.value || [];
    return props.content.abilityBlocks.filter((block) => block.type === 'mode' && givenModeIds.includes(block.id + ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, isLoaded, props.content]);

  return (
    <Center>
      <Box maw={1000} w='100%' pb='sm'>
        <Box ref={ref}>
          <Stack gap='xs' style={{ position: 'relative' }}>
            <SimpleGrid cols={isPhone ? 1 : isTablet ? 2 : 3} spacing='xs' verticalSpacing='xs'>
              <EntityInfoSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
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
              isLoaded={isLoaded}
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

  const [character, setCharacter] = useRecoilState(characterState);
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

  useEffect(() => {
    // Add back the sections when switching from phone to desktop
    if (!isPhone) {
      props.onHideSections(false);
      setOpenedPhonePanel(false);
    }
  }, [isPhone]);

  if (isPhone) {
    return (
      <Box>
        {props.hideSections && (
          <BlurBox blur={10} p='sm' mih={props.panelHeight}>
            {activeTab === 'skills-actions' && (
              <SkillsActionsPanel
                id='CHARACTER'
                entity={character}
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPanel
                id='CHARACTER'
                entity={character}
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            )}

            {activeTab === 'spells' && (
              <SpellsPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                id={'CHARACTER'}
                entity={character}
                setEntity={convertToSetEntity(setCharacter)}
              />
            )}

            {activeTab === 'feats-features' && (
              <FeatsFeaturesPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            )}

            {activeTab === 'companions' && (
              <CompanionsPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            )}

            {activeTab === 'details' && (
              <DetailsPanel content={props.content} panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
            )}

            {activeTab === 'notes' && (
              <NotesPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                entity={character}
                setEntity={convertToSetEntity(setCharacter)}
              />
            )}

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
                id='CHARACTER'
                entity={character}
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            </Tabs.Panel>

            <Tabs.Panel value='inventory'>
              <InventoryPanel
                id='CHARACTER'
                entity={character}
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                inventory={props.inventory}
                setInventory={props.setInventory}
              />
            </Tabs.Panel>

            <Tabs.Panel value='spells'>
              <SpellsPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                id={'CHARACTER'}
                entity={character}
                setEntity={convertToSetEntity(setCharacter)}
              />
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
              <NotesPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                entity={character}
                setEntity={convertToSetEntity(setCharacter)}
              />
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
