import { sessionState } from '@atoms/supabaseAtoms';
import BlurBox from '@common/BlurBox';
import { CharacterDetailedInfo, CharacterInfo } from '@common/CharacterInfo';
import DiceRoller from '@common/dice/DiceRoller';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Center,
  Grid,
  Group,
  HoverCard,
  RingProgress,
  SimpleGrid,
  Stack,
  Title,
  Text,
  useMantineTheme,
  rem,
  Button,
  Menu,
  Popover,
  Tabs,
  ScrollArea,
  TextInput,
} from '@mantine/core';
import { useElementSize, useHover, useMediaQuery } from '@mantine/hooks';
import ArmorSection from '@pages/character_sheet/sections/ArmorSection';
import AttributeSection from '@pages/character_sheet/sections/AttributeSection';
import ConditionSection from '@pages/character_sheet/sections/ConditionSection';
import HealthSection from '@pages/character_sheet/sections/HealthSection';
import SpeedSection from '@pages/character_sheet/sections/SpeedSection';
import { makeRequest } from '@requests/request-manager';
import {
  IconTree,
  IconWindow,
  IconVocabulary,
  IconBackpack,
  IconBadgesFilled,
  IconBuildingStore,
  IconCaretLeftRight,
  IconDots,
  IconFlare,
  IconLayoutGrid,
  IconLayoutList,
  IconListDetails,
  IconNotebook,
  IconNotes,
  IconPaw,
  IconSettings,
  IconSparkles,
  IconSwords,
  IconX,
  IconKey,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Campaign, Character } from '@typing/content';
import { interpolateHealth } from '@utils/colors';
import { setPageTitle } from '@utils/document-change';
import { isPhoneSized, phoneQuery, tabletQuery } from '@utils/mobile-responsive';
import { convertToSetEntity } from '@utils/type-fixing';
import { truncate } from 'lodash-es';
import { props } from 'node_modules/cypress/types/bluebird';
import { Suspense, useEffect, useState } from 'react';
import { GiRollingDices } from 'react-icons/gi';
import { useLoaderData } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import classes from '@css/UserInfoIcons.module.css';
import RichText from '@common/RichText';
import CompanionsPanel from '@pages/character_sheet/panels/CompanionsPanel';
import DetailsPanel from '@pages/character_sheet/panels/DetailsPanel';
import ExtrasPanel from '@pages/character_sheet/panels/ExtrasPanel';
import FeatsFeaturesPanel from '@pages/character_sheet/panels/FeatsFeaturesPanel';
import InventoryPanel from '@pages/character_sheet/panels/InventoryPanel';
import NotesPanel from '@pages/character_sheet/panels/NotesPanel';
import SkillsActionsPanel from '@pages/character_sheet/panels/SkillsActionsPanel';
import SpellsPanel from '@pages/character_sheet/panels/SpellsPanel';
import { toLabel } from '@utils/strings';

export function Component() {
  setPageTitle(`Campaign`);
  const session = useRecoilValue(sessionState);

  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());

  const { campaignId } = useLoaderData() as {
    campaignId: number;
  };

  const { data: campaign, isFetching } = useQuery({
    queryKey: [`find-campaign-${campaignId}`],
    queryFn: async () => {
      const campaigns = await makeRequest<Campaign[]>('find-campaigns', {
        id: campaignId,
      });
      return campaigns?.length ? campaigns[0] : null;
    },
    refetchOnWindowFocus: false,
  });

  const {
    data: characters,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [`find-character`],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        user_id: session?.user.id,
      });
    },
    enabled: !!session,
    refetchInterval: 400,
  });

  const isLoaded = !isLoading && !isFetching;

  const { ref, width, height } = useElementSize();

  const panelWidth = width ? width - 60 : 2000;
  const panelHeight = height > 800 ? 555 : 500;
  const [hideSections, setHideSections] = useState(false);

  console.log(characters);

  const [openedDiceRoller, setOpenedDiceRoller] = useState(false);
  const [loadedDiceRoller, setLoadedDiceRoller] = useState(false);

  return (
    <Center>
      <Box maw={1000} w='100%' pb='sm'>
        <Box ref={ref}>
          <Stack gap='xs' style={{ position: 'relative' }}>
            <Box>
              <Grid>
                <Grid.Col span={isTablet ? 12 : 4}>
                  <BlurBox blur={10} h={255}>
                    <Box
                      pt='xs'
                      pb={5}
                      px='xs'
                      style={{
                        borderTopLeftRadius: theme.radius.md,
                        borderTopRightRadius: theme.radius.md,
                        position: 'relative',
                      }}
                      h='100%'
                    >
                      <div>
                        <Group wrap='nowrap' align='flex-start' gap={5}>
                          <Stack gap={5}>
                            <Box style={{ position: 'relative' }} mt={0} mr={10}>
                              <Avatar
                                src={campaign?.meta_data?.image_url}
                                alt='Campaign Image'
                                size={75}
                                radius={75}
                                variant='transparent'
                                color='dark.3'
                                bg={theme.colors.dark[6]}
                              />
                            </Box>
                            <Stack gap={0} align='center'>
                              <Group gap={3}>
                                <IconKey size='0.6rem' />
                                <Text fz={12} ta='center' fw={600}>
                                  Join Key
                                </Text>
                              </Group>
                              <TextInput readOnly value='test-121-1' size='xs' w='75' />
                              <Button size='compact-xs' w='75' mt={5}>
                                Regen
                              </Button>
                            </Stack>
                          </Stack>

                          <div style={{ flex: 1 }}>
                            <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
                              <HoverCard.Target>
                                <Text
                                  c='gray.0'
                                  fz={campaign && campaign.name.length >= 16 ? '0.9rem' : 'xl'}
                                  fw={500}
                                  className={classes.name}
                                >
                                  {truncate(campaign?.name, {
                                    length: 18,
                                  })}
                                </Text>
                              </HoverCard.Target>
                              <HoverCard.Dropdown py={5} px={10}>
                                <Text c='gray.0' size='sm'>
                                  {campaign?.name}
                                </Text>
                              </HoverCard.Dropdown>
                            </HoverCard>

                            <Stack gap={3}>
                              <ScrollArea h={200} scrollbars='y' pr={14}>
                                <RichText ta='justify' fz='xs'>
                                  {campaign?.description}
                                </RichText>
                              </ScrollArea>
                            </Stack>
                          </div>
                        </Group>
                      </div>
                    </Box>
                  </BlurBox>
                </Grid.Col>
                <Grid.Col span={isTablet ? 12 : 8}>
                  <BlurBox blur={10} p='sm'>
                    <ScrollArea h={230} scrollbars='y'>
                      <Group>
                        {characters?.map((character) => (
                          <BlurBox blur={10} maw={280} py={5} px='sm'>
                            <CharacterDetailedInfo character={character} />
                          </BlurBox>
                        ))}
                      </Group>
                    </ScrollArea>
                  </BlurBox>
                </Grid.Col>
              </Grid>
            </Box>

            <SectionPanels
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
    </Center>
  );
}

function SectionPanels(props: {
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
  const allCampaignTabs = ['notes', 'encounters', 'shops', 'inspiration', 'settings'];
  const openedTabOption = allCampaignTabs.find((tab) => tab === activeTab);
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'notes':
        return <IconNotebook style={iconStyle} />;
      case 'encounters':
        return <IconSwords style={iconStyle} />;
      case 'shops':
        return <IconBuildingStore style={iconStyle} />;
      case 'inspiration':
        return <IconSparkles style={iconStyle} />;
      case 'settings':
        return <IconSettings style={iconStyle} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    // Open first tab when finished loading
    if (props.isLoaded && activeTab === null) {
      setActiveTab('notes');
    }
  }, [props.isLoaded, activeTab]);

  if (isPhone) {
    return (
      <Box>
        {props.hideSections && (
          <BlurBox blur={10} p='sm' mih={props.panelHeight}>
            {activeTab === 'notes' && <></>}

            {activeTab === 'encounters' && <></>}

            {activeTab === 'shops' && <></>}

            {activeTab === 'inspiration' && <></>}

            {activeTab === 'settings' && <></>}
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
                    leftSection={<IconNotebook size='1.2rem' stroke={2} />}
                    variant={!props.hideSections ? 'filled' : 'outline'}
                    onClick={() => {
                      props.onHideSections(false);
                      setOpenedPhonePanel(false);
                    }}
                  >
                    Notes
                  </Button>
                  <SimpleGrid cols={2}>
                    <Button
                      leftSection={<IconSwords size='1.2rem' stroke={2} />}
                      variant={activeTab === 'encounters' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('encounters');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Encounters
                    </Button>
                    <Button
                      leftSection={<IconBuildingStore size='1.2rem' stroke={2} />}
                      variant={activeTab === 'shops' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('shops');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Shops
                    </Button>
                  </SimpleGrid>
                  <SimpleGrid cols={2}>
                    <Button
                      leftSection={<IconSparkles size='1.2rem' stroke={2} />}
                      variant={activeTab === 'inspiration' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('inspiration');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Inspiration
                    </Button>
                    <Button
                      leftSection={<IconSettings size='1.2rem' stroke={2} />}
                      variant={activeTab === 'settings' && props.hideSections ? 'filled' : 'outline'}
                      onClick={() => {
                        setActiveTab('settings');
                        props.onHideSections(true);
                        setOpenedPhonePanel(false);
                      }}
                    >
                      Settings
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
              {allCampaignTabs.includes('notes') && (
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
              {allCampaignTabs.includes('encounters') && (
                <Tabs.Tab
                  value='encounters'
                  style={{
                    border: activeTab === 'encounters' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                  }}
                  leftSection={getTabIcon('encounters')}
                >
                  Encounters
                </Tabs.Tab>
              )}
              {allCampaignTabs.includes('shops') && (
                <Tabs.Tab
                  value='shops'
                  style={{
                    border: activeTab === 'shops' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                  }}
                  leftSection={getTabIcon('shops')}
                >
                  Shops
                </Tabs.Tab>
              )}
              {allCampaignTabs.includes('inspiration') && (
                <Tabs.Tab
                  value='inspiration'
                  style={{
                    border: activeTab === 'inspiration' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                  }}
                  leftSection={getTabIcon('inspiration')}
                >
                  Inspiration
                </Tabs.Tab>
              )}
              {allCampaignTabs.includes('settings') && (
                <Tabs.Tab
                  value='settings'
                  style={{
                    border: activeTab === 'settings' ? `1px solid ` + theme.colors.dark[4] : `1px solid transparent`,
                  }}
                  leftSection={getTabIcon('settings')}
                >
                  Settings
                </Tabs.Tab>
              )}
            </Tabs.List>

            <Tabs.Panel value='notes'>
              <></>
            </Tabs.Panel>

            <Tabs.Panel value='encounters'>
              <></>
            </Tabs.Panel>

            <Tabs.Panel value='shops'>
              <></>
            </Tabs.Panel>

            <Tabs.Panel value='inspiration'>
              <></>
            </Tabs.Panel>

            <Tabs.Panel value='notes'>
              <></>
            </Tabs.Panel>
          </Tabs>
        </BlurBox>
      </Box>
    );
  }
}
