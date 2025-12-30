import BlurBox from '@common/BlurBox';
import { CharacterDetailedInfo } from '@common/CharacterInfo';
import DiceRoller from '@common/dice/DiceRoller';
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Grid,
  Group,
  HoverCard,
  SimpleGrid,
  Stack,
  Title,
  Text,
  useMantineTheme,
  rem,
  Button,
  Popover,
  Tabs,
  ScrollArea,
  Card,
  Image,
} from '@mantine/core';
import { useDebouncedValue, useElementSize, useHover, useInterval, useMediaQuery } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import {
  IconBuildingStore,
  IconLayoutGrid,
  IconNotebook,
  IconSettings,
  IconSparkles,
  IconSwords,
  IconX,
  IconRefreshDot,
  IconCopy,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Campaign, Character, Encounter } from '@typing/content';
import { setPageTitle } from '@utils/document-change';
import { isPhoneSized, tabletQuery } from '@utils/mobile-responsive';
import { cloneDeep, truncate } from 'lodash-es';
import { Suspense, useEffect, useState } from 'react';
import { GiRollingDices } from 'react-icons/gi';
import { useLoaderData } from 'react-router-dom';
import classes from '@css/UserInfoIcons.module.css';
import { getDefaultCampaignBackgroundImage } from '@utils/background-images';
import NotesPanel from './panels/NotesPanel';
import InspirationPanel from './panels/InspirationPanel';
import SettingsPanel from './panels/SettingsPanel';
import { showNotification } from '@mantine/notifications';
import EncountersPanel from './panels/EncountersPanel';
import ShopsPanel from './panels/ShopsPanel';
import { sessionState } from '@atoms/supabaseAtoms';
import { useRecoilValue } from 'recoil';
import D20Loader from '@assets/images/D20Loader';
import BlurButton from '@common/BlurButton';
import BlurActionIcon from '@common/BlurActionIcon';
import { getAnchorStyles } from '@utils/anchor';

export function Component() {
  const theme = useMantineTheme();
  const [doneLoading, setDoneLoading] = useState(false);

  const { campaignId } = useLoaderData() as {
    campaignId: string;
  };

  // Just load progress manually
  const [percentage, setPercentage] = useState(0);
  const interval = useInterval(() => setPercentage((p) => p + 2), 15);
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

  return (
    <>
      <div style={{ display: doneLoading ? 'none' : undefined }}>{loader}</div>
      <div style={{ display: doneLoading ? undefined : 'none' }}>
        <CampaignInner
          campaignId={parseInt(campaignId)}
          onFinishLoading={() => {
            interval.stop();
            setDoneLoading(true);
          }}
        />
      </div>
    </>
  );
}

export function CampaignInner(props: { campaignId: number; onFinishLoading: () => void }) {
  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());
  const session = useRecoilValue(sessionState);

  const { data, isFetching, refetch } = useQuery({
    queryKey: [`find-campaign-${props.campaignId}`],
    queryFn: async () => {
      const campaigns = await makeRequest<Campaign[]>('find-campaign', {
        user_id: session?.user.id,
        id: props.campaignId,
      });
      const camp = campaigns?.length ? campaigns[0] : null;

      if (!camp || camp?.user_id !== session?.user.id) {
        window.location.href = '/campaigns';
        return null;
      }

      updateCampaign(camp);
      return camp;
    },
    refetchOnWindowFocus: false,
  });
  setPageTitle(data?.name ?? `Campaign`);

  const [_campaign, _setCampaign] = useState<Campaign | null>(null);
  const [debouncedCampaign] = useDebouncedValue(_campaign, 200);
  const campaign = _campaign ?? data ?? null;

  const updateCampaign = async (campaign: Campaign | null) => {
    if (!campaign) return;
    _setCampaign(campaign);
  };

  useEffect(() => {
    (async () => {
      if (!debouncedCampaign) return;
      // Update the campaign
      await makeRequest('create-campaign', {
        ...debouncedCampaign,
      });
    })();
  }, [debouncedCampaign]);

  const { data: characters, isLoading } = useQuery({
    queryKey: [`find-campaign-characters`, { campaign_id: props.campaignId }],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        campaign_id: props.campaignId,
      });
    },
    refetchInterval: 400,
  });

  const isLoaded = !isLoading && !isFetching;

  if (isLoaded) {
    // Running this multiple times should be fine
    props.onFinishLoading();
  }

  const { ref, width, height } = useElementSize();

  const panelWidth = width ? width - 60 : 2000;
  const panelHeight = height > 800 ? 555 : 500;
  const [hideSections, setHideSections] = useState(false);

  const [revealedKey, setRevealedKey] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);

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
                  <Box>
                    <Card radius='md' p='md' style={{ backgroundColor: 'transparent' }} h={235}>
                      <Image
                        src={campaign?.meta_data?.image_url}
                        alt={campaign?.name}
                        fallbackSrc={getDefaultCampaignBackgroundImage().url}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: '100%',
                        }}
                      />
                      <Badge
                        size='xs'
                        variant='light'
                        style={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: theme.colors.gray[4],
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        {(characters?.length || 0) + ' players'}
                      </Badge>

                      <Card.Section className={classes.section} mb={0} px='md'>
                        <Group justify='apart'>
                          <BlurBox bgColor='rgba(0, 0, 0, 0.5)' px='xs' py={5}>
                            <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
                              <HoverCard.Target>
                                <Title c='gray.3' order={4} className={classes.name}>
                                  {truncate(campaign?.name || 'My Campaign', {
                                    length: 30,
                                  })}
                                </Title>
                              </HoverCard.Target>
                              <HoverCard.Dropdown py={5} px={10}>
                                <Text c='gray.3' size='md'>
                                  {campaign?.name || 'My Campaign'}
                                </Text>
                              </HoverCard.Dropdown>
                            </HoverCard>
                          </BlurBox>
                        </Group>
                        {campaign?.description?.trim() ? (
                          <BlurBox bgColor='rgba(0, 0, 0, 0.5)' px='xs' py={5} mt={10}>
                            <ScrollArea h={100} my={5}>
                              <Text fz='xs'>{campaign.description.trim()}</Text>
                            </ScrollArea>
                          </BlurBox>
                        ) : (
                          <Box h={130}></Box>
                        )}
                      </Card.Section>

                      <Group mt='xs'>
                        <BlurButton
                          radius='md'
                          size='xs'
                          variant='light'
                          bgColor='rgba(0, 0, 0, 0.5)'
                          bgColorHover='rgba(0, 0, 0, 0.7)'
                          color='gray.4'
                          onClick={() => {
                            setTimeout(() => setRevealedKey(false), 5000);
                            if (!revealedKey) {
                              setRevealedKey(true);
                            } else {
                              // Copy key to clipboard
                              navigator.clipboard.writeText(campaign?.join_key || '');
                              showNotification({
                                title: 'Copied Join Key',
                                message: `Join key copied to clipboard!`,
                                icon: <IconCopy size='1.1rem' />,
                                autoClose: 3000,
                              });
                            }
                          }}
                          rightSection={revealedKey ? <IconCopy size='0.9rem' /> : <></>}
                        >
                          {revealedKey ? campaign?.join_key : 'Reveal Join Key'}
                        </BlurButton>
                        <BlurActionIcon
                          variant='light'
                          color='gray.4'
                          radius='md'
                          size={30}
                          bgColor='rgba(0, 0, 0, 0.5)'
                          bgColorHover='rgba(0, 0, 0, 0.7)'
                          onClick={async () => {
                            if (!campaign) return;

                            setLoadingKey(true);
                            const result = await makeRequest('reset-campaign-key', {
                              id: campaign.id,
                            });
                            refetch();

                            // Reveal key
                            setTimeout(() => {
                              setLoadingKey(false);
                              setRevealedKey(true);
                              setTimeout(() => setRevealedKey(false), 10000);
                            }, 2000);
                          }}
                          loading={loadingKey}
                        >
                          <IconRefreshDot size='1.1rem' stroke={1.5} />
                        </BlurActionIcon>
                      </Group>
                    </Card>
                  </Box>
                </Grid.Col>
                <Grid.Col span={isTablet ? 12 : 8}>
                  <BlurBox blur={10} p='sm'>
                    <ScrollArea h={210} scrollbars='y'>
                      <Group>
                        {characters?.map((character) => (
                          <BlurBox blur={10} maw={280} py={3} px='sm'>
                            <CharacterDetailedInfo character={character} />
                          </BlurBox>
                        ))}
                        {characters?.length === 0 && (
                          <Center h={150} w='100%'>
                            <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                              No players found, invite some using your join key!
                            </Text>
                          </Center>
                        )}
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
      <Box style={getAnchorStyles({ l: 20, b: 20 })}>
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
            injectedRolls={(
              characters?.map((c) => {
                return cloneDeep(c.roll_history?.rolls ?? []).map((r) => ({
                  ...r,
                  label: `${c.name}${r.label ? `: ${r.label}` : ''}`,
                }));
              }) ?? []
            ).flat()}
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
        {props.hideSections ? (
          <BlurBox blur={10} p='sm' mih={props.panelHeight}>
            {activeTab === 'notes' && (
              <NotesPanel
                campaign={props.campaign}
                setCampaign={props.setCampaign}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
              />
            )}

            {activeTab === 'encounters' && (
              <EncountersPanel
                campaign={{
                  data: props.campaign,
                  players: props.players,
                }}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
              />
            )}

            {activeTab === 'shops' && (
              <ShopsPanel
                campaign={props.campaign}
                setCampaign={props.setCampaign}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
              />
            )}

            {activeTab === 'inspiration' && (
              <InspirationPanel
                players={props.players}
                campaign={props.campaign}
                setCampaign={props.setCampaign}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPanel
                players={props.players}
                campaign={props.campaign}
                setCampaign={props.setCampaign}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
              />
            )}
          </BlurBox>
        ) : (
          <Box pb={35}>
            <NotesPanel
              campaign={props.campaign}
              setCampaign={props.setCampaign}
              panelHeight={props.panelHeight}
              panelWidth={props.panelWidth}
            />
          </Box>
        )}

        <Box style={getAnchorStyles({ r: 20, b: 20 })}>
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
              <EncountersPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                campaign={{
                  data: props.campaign,
                  players: props.players,
                }}
              />
            </Tabs.Panel>

            <Tabs.Panel value='shops'>
              <ShopsPanel
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                campaign={props.campaign}
                setCampaign={props.setCampaign}
              />
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

            <Tabs.Panel value='settings'>
              <SettingsPanel
                players={props.players}
                panelHeight={props.panelHeight}
                panelWidth={props.panelWidth}
                campaign={props.campaign}
                setCampaign={props.setCampaign}
              />
            </Tabs.Panel>
          </Tabs>
        </BlurBox>
      </Box>
    );
  }
}
