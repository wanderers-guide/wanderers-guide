import D20Loader from '@assets/images/D20Loader';
import { glassStyle } from '@utils/colors';
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
import { useQuery } from '@tanstack/react-query';
import { Character, ContentPackage, LivingEntity } from '@schemas/content';
import { VariableListStr } from '@schemas/variables';
import { setPageTitle } from '@utils/document-change';
import { isPhoneSized, phoneQuery, tabletQuery } from '@utils/mobile-responsive';
import { toLabel } from '@utils/strings';
import { getVariable } from '@variables/variable-manager';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { SetterOrUpdater } from '@utils/type-fixing';
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
import { getAnchorStyles } from '@utils/anchor';
import { AnimatePresence, motion } from 'framer-motion';
import { IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';

// Use lazy imports here to prevent a huge amount of js on initial load (3d dice smh)
const DiceRoller = lazy(() => import('@common/dice/DiceRoller'));

/**
 * Top-level route component for the character sheet page.
 * Handles fetching the content package and showing a loading screen
 * until the data is ready. Once loaded, renders CharacterSheetInner
 * while keeping the loader visible until the inner component signals
 * that it has finished its own initialization (EXECUTE_OPS).
 */
export function Component(props: {}) {
  useEffect(() => {
    setPageTitle(`Sheet`);
  }, []);

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
      const sv = defineDefaultSources('PAGE', character?.content_sources?.enabled ?? []);

      // Prefetch content sources (to avoid multiple requests)
      await fetchContentSources(sv);

      // Fetch content
      const content = await fetchContentPackage(sv, { fetchSources: true });
      return content;
    },
    refetchOnWindowFocus: false,
  });

  // Manually animate the loader progress bar so it feels responsive even
  // while waiting for the server. Once content arrives the bar jumps to
  // at least 50%, then CharacterSheetInner drives it to 100 via onFinishLoading.
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
      <D20Loader
        size={100}
        color={theme.colors[theme.primaryColor][5]}
        percentage={percentage}
        status='Loading...'
        hasStatusBg
      />
    </Box>
  );

  if (isFetching || !content) {
    return loader;
  } else {
    // Render both elements simultaneously so CharacterSheetInner can run
    // EXECUTE_OPS in the background while the loader is still visible.
    // CSS display toggling avoids unmounting/remounting the heavy inner tree.
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

/**
 * Main character sheet layout. Renders the top info/stat sections and the
 * tabbed panel area. Also owns the floating action buttons anchored to the
 * bottom-left corner (modes, campaign, dice roller).
 */
function CharacterSheetInner(props: { content: ContentPackage; characterId: number; onFinishLoading: () => void }) {
  const isTablet = useMediaQuery(tabletQuery());
  const isPhone = useMediaQuery(phoneQuery());
  const { ref, width, height } = useElementSize();

  // Reserve 60px for the tab bar; clamp panel height based on screen height
  const panelWidth = width ? width - 60 : 2000;
  const panelHeight = height > 800 ? 555 : 500;
  const [hideSections, setHideSections] = useState(false);

  // EXECUTE_OPS triggers the character's operation pipeline and calls
  // onFinishLoading when it completes, which dismisses the loading screen.
  const { character, setCharacter, isLoading } = useCharacter(props.characterId, {
    type: 'EXECUTE_OPS',
    data: {
      content: props.content,
      context: 'CHARACTER-SHEET',
      onFinishLoading: props.onFinishLoading,
    },
  });

  setPageTitle(character && character.name.trim() ? character.name : 'Sheet');

  const activeModes = getVariable<VariableListStr>('CHARACTER', 'ACTIVE_MODES')?.value || [];

  // Dice roller is lazy-loaded; loadedDiceRoller tracks whether to keep it
  // mounted after the first open (so it doesn't remount on subsequent opens).
  const [openedDiceRoller, setOpenedDiceRoller] = useState(false);
  const [loadedDiceRoller, setLoadedDiceRoller] = useState(false);

  const [openedCampaign, setOpenedCampaign] = useState(false);
  const [openedModes, setOpenedModes] = useState(false);

  // Filter ability blocks to only those of type 'mode' that are listed in MODE_IDS.
  // Recalculates whenever character state or loading status changes.
  const modes = useMemo(() => {
    const givenModeIds = getVariable<VariableListStr>('CHARACTER', 'MODE_IDS')?.value || [];
    return props.content.abilityBlocks.filter((block) => block.type === 'mode' && givenModeIds.includes(block.id + ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, isLoading, props.content]);

  return (
    <Center>
      <Box maw={1000} w='100%' pb={isPhone ? 100 : 'sm'}>
        <Box ref={ref}>
          <Stack gap='xs' style={{ position: 'relative' }}>
            {/* Top stat sections: layout collapses from 3 → 2 → 1 columns on smaller screens */}
            <SimpleGrid cols={isPhone ? 1 : isTablet ? 2 : 3} spacing='xs' verticalSpacing='xs'>
              <EntityInfoSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
              {/* On phone, these sections are hidden when a full-screen panel is active */}
              {!hideSections && (
                <>
                  <HealthSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                  <ConditionSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                  <AttributeSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                  <ArmorSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                  <SpeedSection id='CHARACTER' entity={character} setEntity={convertToSetEntity(setCharacter)} />
                </>
              )}
            </SimpleGrid>
            <SectionPanels
              content={props.content}
              entity={character}
              setEntity={convertToSetEntity(setCharacter)}
              isLoaded={!isLoading}
              panelHeight={panelHeight}
              panelWidth={panelWidth}
              hideSections={hideSections}
              onHideSections={(hide) => setHideSections(hide)}
            />
          </Stack>
        </Box>
      </Box>

      {/* Floating action buttons anchored to the bottom-left corner */}
      <Box style={getAnchorStyles({ l: 20, b: 20 })}>
        <Stack>
          {/* Modes button – only shown when the character has at least one mode */}
          {modes.length > 0 && (
            <Indicator disabled={activeModes.length === 0} label={activeModes.length} size={14} offset={4}>
              <ActionIcon
                size={40}
                variant='light'
                style={{
                  ...glassStyle(),
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
          {/* Campaign button – only shown when the character belongs to a campaign */}
          {character?.campaign_id && (
            <ActionIcon
              size={40}
              variant='light'
              style={{
                ...glassStyle(),
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
          {/* Dice roller button – only shown when the option is enabled in character settings */}
          {character?.options?.dice_roller && (
            <ActionIcon
              size={40}
              variant='light'
              style={{
                ...glassStyle(),
              }}
              radius={100}
              aria-label='Dice Roller'
              onClick={() => {
                // Trigger the lazy load on first open, then just toggle visibility
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

      {/* Keep DiceRoller mounted once loaded so it doesn't lose its state between opens */}
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

/**
 * Renders the tabbed panel area of the character sheet.
 *
 * On phone: shows a single full-screen panel at a time, with a floating
 * grid button (bottom-right) that opens a popover to switch panels.
 * The top stat sections are hidden while a panel is active to maximise
 * vertical space.
 *
 * On desktop/tablet: renders a standard Mantine Tabs bar. Tabs that the
 * user has marked as "primary" appear directly in the bar; the rest are
 * accessible via the "..." overflow menu.
 */
function SectionPanels(props: {
  content: ContentPackage;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  isLoaded: boolean;
  hideSections: boolean;
  onHideSections: (hide: boolean) => void;
  panelHeight: number;
  panelWidth: number;
}) {
  const theme = useMantineTheme();
  const isPhone = isPhoneSized(props.panelWidth);

  // Controls visibility of the mobile panel-picker popover
  const [openedPhonePanel, setOpenedPhonePanel] = useState(false);

  // null until the character finishes loading, then defaults to 'skills-actions'
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { hovered: hoveredTabOptions, ref: tabOptionsRef } = useHover<HTMLButtonElement>();

  const iconStyle = { width: rem(12), height: rem(12) };

  // Full ordered list of all available sheet tabs
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

  // PRIMARY_SHEET_TABS is a character-level variable that determines which tabs
  // are shown directly in the tab bar vs hidden behind the "..." overflow menu.
  const primarySheetTabs = getVariable<VariableListStr>('CHARACTER', 'PRIMARY_SHEET_TABS')?.value ?? [];
  const tabOptions = allSheetTabs.filter((tab) => !primarySheetTabs.includes(tab));

  // True when the currently active tab is one of the overflow (non-primary) tabs,
  // used to highlight the "..." button to indicate a hidden tab is selected.
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

  // ── Phone layout ────────────────────────────────────────────────────────────
  if (isPhone) {
    return (
      <Box>
        {/* Only render the active panel when sections are hidden (i.e. a panel is selected) */}
        {props.hideSections && (
          <BlurBox p='sm' mih={props.panelHeight}>
            {activeTab === 'skills-actions' && (
              <SkillsActionsPanel
                id='CHARACTER'
                entity={props.entity}
                setEntity={props.setEntity}
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPanel
                id='CHARACTER'
                entity={props.entity}
                setEntity={props.setEntity}
                content={props.content}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
              />
            )}

            {activeTab === 'spells' && (
              <SpellsPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                id={'CHARACTER'}
                entity={props.entity}
                setEntity={props.setEntity}
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
                entity={props.entity}
                setEntity={props.setEntity}
              />
            )}

            {activeTab === 'extras' && <ExtrasPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />}
          </BlurBox>
        )}

        {/* Floating grid button anchored bottom-right that opens the panel picker */}
        <Box style={getAnchorStyles({ r: 20, b: 20 })}>
          <Popover
            position='top'
            withArrow
            opened={openedPhonePanel}
            onChange={setOpenedPhonePanel}
            styles={(t) => ({
              dropdown: {
                // Force the dropdown to span the full viewport width.
                // `left: 0 !important` overrides Mantine's floating-ui positioning
                // which would otherwise anchor it relative to the target button.
                ...glassStyle(),
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: `1px solid ` + IMPRINT_BORDER_COLOR,
                width: '100dvw',
                left: '0 !important',
                borderRadius: t.radius.lg,
                padding: t.spacing.sm,
              },
            })}
          >
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
            <Popover.Dropdown>
              <Box>
                <Stack>
                  {/* "Health, Attributes, Saves" restores the top stat sections */}
                  <Button
                    leftSection={<IconLayoutList size='1.2rem' stroke={2} />}
                    variant={!props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'skills-actions' && props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'feats-features' && props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'inventory' && props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'spells' && props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'notes' && props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'details' && props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'companions' && props.hideSections ? 'filled' : 'light'}
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
                      variant={activeTab === 'extras' && props.hideSections ? 'filled' : 'light'}
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
    // ── Desktop / tablet layout ────────────────────────────────────────────────

    // Shared fade-in animation applied to each panel on mount
    const panelMotion = {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: {
        duration: 0.12,
        ease: 'easeOut',
      },
    };

    return (
      <Box>
        <BlurBox
          p='sm'
          style={{
            height: props.panelHeight + 65,
          }}
        >
          {/* keepMounted={false} ensures inactive panels are unmounted to save memory */}
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
              {/* Only render tabs that are in the character's PRIMARY_SHEET_TABS variable */}
              {primarySheetTabs.includes('skills-actions') && (
                <Tabs.Tab
                  value='skills-actions'
                  style={{
                    border:
                      activeTab === 'skills-actions' ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
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
                    border: activeTab === 'inventory' ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
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
                    border: activeTab === 'spells' ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
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
                      activeTab === 'feats-features' ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
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
                    border: activeTab === 'companions' ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
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
                    border: activeTab === 'details' ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
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
                    border: activeTab === 'notes' ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
                  }}
                  leftSection={getTabIcon('notes')}
                >
                  Notes
                </Tabs.Tab>
              )}

              {/* Overflow "..." menu for non-primary tabs; highlighted when an overflow tab is active */}
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
                      backgroundColor: hoveredTabOptions || openedTabOption ? IMPRINT_BG_COLOR : 'transparent',
                      color: openedTabOption ? theme.colors.gray[0] : undefined,
                      border: openedTabOption ? `1px solid ` + IMPRINT_BORDER_COLOR : `1px solid transparent`,
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
                        backgroundColor: activeTab === tab ? IMPRINT_BG_COLOR : undefined,
                        color: activeTab === tab ? theme.colors.gray[0] : undefined,
                      }}
                    >
                      {toLabel(tab)}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </Tabs.List>

            {/* Each panel is wrapped in AnimatePresence + motion.div for the fade-in transition */}
            <Tabs.Panel value='skills-actions'>
              <AnimatePresence mode='wait'>
                <motion.div key='skills-actions' {...panelMotion}>
                  <SkillsActionsPanel
                    id='CHARACTER'
                    entity={props.entity}
                    setEntity={props.setEntity}
                    content={props.content}
                    panelHeight={props.panelHeight}
                    panelWidth={props.panelWidth}
                  />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>

            <Tabs.Panel value='inventory'>
              <AnimatePresence mode='wait'>
                <motion.div key='inventory' {...panelMotion}>
                  <InventoryPanel
                    id='CHARACTER'
                    entity={props.entity}
                    setEntity={props.setEntity}
                    content={props.content}
                    panelHeight={props.panelHeight}
                    panelWidth={props.panelWidth}
                  />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>

            <Tabs.Panel value='spells'>
              <AnimatePresence mode='wait'>
                <motion.div key='spells' {...panelMotion}>
                  <SpellsPanel
                    panelHeight={props.panelHeight}
                    panelWidth={props.panelWidth}
                    id={'CHARACTER'}
                    entity={props.entity}
                    setEntity={props.setEntity}
                  />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>

            <Tabs.Panel value='feats-features'>
              <AnimatePresence mode='wait'>
                <motion.div key='feats-features' {...panelMotion}>
                  <FeatsFeaturesPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>

            <Tabs.Panel value='companions'>
              <AnimatePresence mode='wait'>
                <motion.div key='companions' {...panelMotion}>
                  <CompanionsPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>

            <Tabs.Panel value='details'>
              <AnimatePresence mode='wait'>
                <motion.div key='details' {...panelMotion}>
                  <DetailsPanel content={props.content} panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>

            <Tabs.Panel value='notes'>
              <AnimatePresence mode='wait'>
                <motion.div key='notes' {...panelMotion}>
                  <NotesPanel
                    panelHeight={props.panelHeight}
                    panelWidth={props.panelWidth}
                    entity={props.entity}
                    setEntity={props.setEntity}
                  />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>

            <Tabs.Panel value='extras'>
              <AnimatePresence mode='wait'>
                <motion.div key='extras' {...panelMotion}>
                  <ExtrasPanel panelHeight={props.panelHeight} panelWidth={props.panelWidth} />
                </motion.div>
              </AnimatePresence>
            </Tabs.Panel>
          </Tabs>
        </BlurBox>
      </Box>
    );
  }
}
