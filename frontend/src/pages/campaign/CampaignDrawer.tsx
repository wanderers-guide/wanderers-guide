import {
  Box,
  Drawer,
  Group,
  Title,
  Stack,
  useMantineTheme,
  ActionIcon,
  Accordion,
  Badge,
  Text,
  Image,
  Paper,
  Tabs,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { tabletQuery, wideDesktopQuery } from '@utils/mobile-responsive';
import { glassStyle } from '@utils/colors';
import { IconHeartFilled } from '@tabler/icons-react';
import { Campaign, Character } from '@schemas/content';
import { useQuery } from '@tanstack/react-query';
import { makeRequest } from '@requests/request-manager';
import { getDefaultCampaignBackgroundImage } from '@utils/background-images';
import { interpolateHealth } from '@utils/colors';
import { CharacterDetailedInfo } from '@common/CharacterInfo';
import { Icon } from '@common/Icon';
import BlurBox from '@common/BlurBox';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { JSONContent } from '@tiptap/react';
import { useSwipeGesture } from '@utils/use-swipe-gesture';
import { IMPRINT_BG_COLOR } from '@constants/data';

export default function CampaignDrawer(props: { opened: boolean; onClose: () => void; campaignId: number }) {
  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());
  const isWideDesktop = useMediaQuery(wideDesktopQuery());

  const { data: campaign } = useQuery({
    queryKey: [`find-campaign-${props.campaignId}`],
    queryFn: async () => {
      const campaigns = await makeRequest<Campaign[]>('find-campaign', {
        id: props.campaignId,
      });
      const camp = campaigns?.length ? campaigns[0] : null;
      return camp;
    },
    refetchOnWindowFocus: false,
  });

  const { data: characters } = useQuery({
    queryKey: [`find-campaign-characters`],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        campaign_id: props.campaignId,
      });
    },
    refetchInterval: 400,
  });

  const swipeHandlers = useSwipeGesture({ onSwipeLeft: props.onClose });

  const campaignSharedPages = campaign?.notes?.pages?.filter((p) => p.shared) ?? [];
  const characterSharedSources = (characters ?? [])
    .map((c) => ({ character: c, pages: c.notes?.pages?.filter((p) => p.shared) ?? [] }))
    .filter((s) => s.pages.length > 0);

  const getCharacterStatusCard = (character: Character) => {
    return (
      <Group gap={10} px={5}>
        <Text>➵</Text>
        <Text>{character.name}</Text>
        <ActionIcon
          variant='transparent'
          aria-label='Health'
          size='lg'
          color={
            character.hp_current === 0
              ? 'black'
              : interpolateHealth(character.hp_current / (character.meta_data?.calculated_stats?.hp_max ?? 0))
          }
          style={{
            cursor: 'default',
          }}
        >
          <IconHeartFilled style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
        {character.details?.conditions?.length && (
          <Badge size='md' color='red.6' circle>
            {character.details?.conditions?.length}
          </Badge>
        )}
      </Group>
    );
  };

  const getCharacterDetailedCard = (character: Character) => {
    return (
      <Box p='xs' bg={'rgba(0,0,0,0.15)'} bdrs='md'>
        {<CharacterDetailedInfo character={character} />}
      </Box>
    );
  };

  return (
    <>
      <Drawer
        opened={props.opened}
        onClose={props.onClose}
        title={
          <Group wrap='nowrap' gap={10} justify='space-between'>
            <Group wrap='nowrap' gap={15}>
              <Title order={3}>{campaign?.name}</Title>
              <Badge
                size='sm'
                variant='light'
                style={{
                  color: theme.colors.gray[4],
                  ...glassStyle(),
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }}
              >
                {(characters?.length || 0) + ' players'}
              </Badge>
            </Group>
          </Group>
        }
        size={'calc(min(100dvw, 400px))'}
        lockScroll={!isWideDesktop}
        closeOnClickOutside={!isWideDesktop}
        withOverlay={!isWideDesktop}
        styles={{
          title: {
            width: '100%',
          },
          body: {
            height: 'calc(100% - 64px)',
            padding: 0,
          },
        }}
        transitionProps={{ duration: 200 }}
      >
        {/* Swipe-to-close wrapper; background image fills the entire drawer body */}
        <Box
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchEnd={swipeHandlers.onTouchEnd}
          style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
        >
          {/* Full-height campaign background image */}
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
              objectFit: 'cover',
            }}
          />

          {/* Tabs float above the background image via z-index */}
          <Tabs
            defaultValue='party'
            variant='outline'
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <BlurBox m='xs' p='xs' style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Tab list sits at the top, inside a BlurBox for readability over the image */}
              <Tabs.List justify='center'>
                <Tabs.Tab value='description'>Description</Tabs.Tab>
                <Tabs.Tab value='party'>Party</Tabs.Tab>
                <Tabs.Tab value='notes'>Notes</Tabs.Tab>
              </Tabs.List>

              {/* Description tab — campaign description in a blur panel */}
              <Tabs.Panel value='description' style={{ flex: 1, overflow: 'auto' }}>
                <Box p='xs' bg={IMPRINT_BG_COLOR} bdrs='md'>
                  {campaign?.description?.trim() ? (
                    <Text fz='sm'>{campaign.description.trim()}</Text>
                  ) : (
                    <Text fz='sm' c='dimmed' ta='center' py='sm'>
                      No description yet.
                    </Text>
                  )}
                </Box>
              </Tabs.Panel>

              {/* Party tab — character status/detail cards in a blur panel */}
              <Tabs.Panel value='party' style={{ flex: 1, overflow: 'auto' }}>
                <Box p='xs' bg={IMPRINT_BG_COLOR} bdrs='md'>
                  {campaign?.meta_data?.settings?.show_party_member_status &&
                  campaign.meta_data.settings.show_party_member_status !== 'OFF' ? (
                    <Stack gap={5}>
                      {characters?.map((character, index) => (
                        <Box key={index}>
                          {campaign?.meta_data?.settings?.show_party_member_status === 'STATUS'
                            ? getCharacterStatusCard(character)
                            : getCharacterDetailedCard(character)}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Text fz='sm' c='dimmed' ta='center' py='sm'>
                      Party info is not shared.
                    </Text>
                  )}
                </Box>
              </Tabs.Panel>

              {/* Notes tab — shared campaign and character notes in a blur panel */}
              <Tabs.Panel value='notes' style={{ flex: 1, overflow: 'auto' }}>
                <Box bg={IMPRINT_BG_COLOR} bdrs='md'>
                  {campaignSharedPages.length === 0 && characterSharedSources.length === 0 ? (
                    <Text fz='sm' c='dimmed' ta='center' py='sm'>
                      No shared notes yet.
                    </Text>
                  ) : (
                    <Accordion
                      chevronPosition='right'
                      variant='filled'
                      styles={{
                        content: {
                          padding: 0,
                        },
                      }}
                    >
                      {campaignSharedPages.map((page, i) => (
                        <Accordion.Item key={`campaign-${i}`} value={`campaign-${i}`}>
                          <Accordion.Control
                            icon={
                              <ActionIcon variant='transparent' color={page.color} size='xs'>
                                <Icon name={page.icon} size='1rem' />
                              </ActionIcon>
                            }
                          >
                            <Group gap={6} wrap='nowrap'>
                              <Text span>{page.name}</Text>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <RichTextInput value={page.contents} readOnly />
                          </Accordion.Panel>
                        </Accordion.Item>
                      ))}
                      {characterSharedSources.flatMap(({ character, pages }) =>
                        pages.map((page, i) => (
                          <Accordion.Item key={`char-${character.id}-${i}`} value={`char-${character.id}-${i}`}>
                            <Accordion.Control
                              icon={
                                <ActionIcon variant='transparent' color={page.color} size='xs'>
                                  <Icon name={page.icon} size='1rem' />
                                </ActionIcon>
                              }
                            >
                              <Group gap={6} wrap='nowrap'>
                                <Text span>{page.name}</Text>
                                <Text span fz='xs' c='dimmed' fs='italic'>
                                  ({character.name})
                                </Text>
                              </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                              <RichTextInput value={page.contents} readOnly />
                            </Accordion.Panel>
                          </Accordion.Item>
                        ))
                      )}
                    </Accordion>
                  )}
                </Box>
              </Tabs.Panel>
            </BlurBox>
          </Tabs>
        </Box>
      </Drawer>
    </>
  );
}
