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
  Card,
  Image,
} from '@mantine/core';
import { useDebouncedState, useDebouncedValue, useElementSize, useHover, useMediaQuery } from '@mantine/hooks';
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
  IconHeart,
  IconRefreshDot,
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
import SkillsActionsPanel from '@pages/character_sheet/panels/SkillsActionsPanel';
import SpellsPanel from '@pages/character_sheet/panels/SpellsPanel';
import { toLabel } from '@utils/strings';
import { getBackgroundImageFromName, getDefaultCampaignBackgroundImage } from '@utils/background-images';
import NotesPanel from './panels/NotesPanel';
import InspirationPanel from './panels/InspirationPanel';

export function Component() {
  setPageTitle(`Campaign`);
  const session = useRecoilValue(sessionState);

  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());

  const { campaignId } = useLoaderData() as {
    campaignId: number;
  };

  const { data, isFetching } = useQuery({
    queryKey: [`find-campaign-${campaignId}`],
    queryFn: async () => {
      const campaigns = await makeRequest<Campaign[]>('find-campaigns', {
        id: campaignId,
      });
      const camp = campaigns?.length ? campaigns[0] : null;
      updateCampaign(camp);
      return camp;
    },
    refetchOnWindowFocus: false,
  });

  const [_campaign, _setCampaign] = useState<Campaign | null>(null);
  const [debouncedCampaign] = useDebouncedValue(_campaign, 200);
  const campaign = _campaign ?? data ?? null;

  const updateCampaign = async (campaign: Campaign | null) => {
    if (!campaign) return;
    _setCampaign(campaign);
  };

  useEffect(() => {
    (async () => {
      await makeRequest('create-campaign', {
        ...debouncedCampaign,
      });
    })();
  }, [debouncedCampaign]);

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

  //console.log(characters);

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
                    <Card radius='md' p='md' style={{ backgroundColor: 'transparent' }}>
                      <Card.Section>
                        <Image
                          src={campaign?.meta_data?.image_url}
                          alt={campaign?.name}
                          height={70}
                          fallbackSrc={getDefaultCampaignBackgroundImage().url}
                        />
                      </Card.Section>

                      <Card.Section className={classes.section} mt='md' px='md'>
                        <Group justify='apart'>
                          <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
                            <HoverCard.Target>
                              <Title c='gray.3' order={4} className={classes.name}>
                                {truncate(campaign?.name, {
                                  length: 30,
                                })}
                              </Title>
                            </HoverCard.Target>
                            <HoverCard.Dropdown py={5} px={10}>
                              <Text c='gray.3' size='sm'>
                                {campaign?.name}
                              </Text>
                            </HoverCard.Dropdown>
                          </HoverCard>

                          <Badge size='sm' variant='light'>
                            {(characters?.length || 0) + ' players'}
                          </Badge>
                        </Group>
                        <ScrollArea h={80} mt='xs'>
                          <Text fz='sm'>{campaign?.description}</Text>
                        </ScrollArea>
                      </Card.Section>

                      <Group mt='xs'>
                        <Button radius='md' size='xs' variant='light' color='gray' style={{ flex: 1 }}>
                          Reveal Join Key
                        </Button>
                        <ActionIcon variant='light' color='gray' radius='md' size={30}>
                          <IconRefreshDot size='1.1rem' stroke={1.5} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  </BlurBox>
                </Grid.Col>
                <Grid.Col span={isTablet ? 12 : 8}>
                  <BlurBox blur={10} p='sm'>
                    <ScrollArea h={230} scrollbars='y'>
                      <Group>
                        {characters?.map((character) => (
                          <BlurBox blur={10} maw={280} py={5} px='sm'>
                            <CharacterDetailedInfo
                              character={character}
                              onClick={() => {
                                window.open(`/sheet/${character.id}`, '_blank');
                              }}
                            />
                          </BlurBox>
                        ))}
                      </Group>
                    </ScrollArea>
                  </BlurBox>
                </Grid.Col>
              </Grid>
            </Box>

            <SectionPanels
              players={characters ?? []}
              campaign={campaign}
              setCampaign={updateCampaign}
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
  players: Character[];
  campaign: Campaign | null;
  setCampaign: (campaign: Campaign) => void;

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

  if (!props.campaign) return <></>;

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
              <NotesPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                campaign={props.campaign}
                setCampaign={props.setCampaign}
              />
            </Tabs.Panel>

            <Tabs.Panel value='encounters'>
              <></>
            </Tabs.Panel>

            <Tabs.Panel value='shops'>
              <></>
            </Tabs.Panel>

            <Tabs.Panel value='inspiration'>
              <InspirationPanel
                players={props.players}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                campaign={props.campaign}
                setCampaign={props.setCampaign}
              />
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
