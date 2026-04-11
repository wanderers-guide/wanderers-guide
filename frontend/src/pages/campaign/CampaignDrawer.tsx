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
  ScrollArea,
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
      <Paper withBorder p={10}>
        {<CharacterDetailedInfo character={character} />}
      </Paper>
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
          },
        }}
        transitionProps={{ duration: 200 }}
      >
        <Box
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchEnd={swipeHandlers.onTouchEnd}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <Stack
            m={0}
            p={0}
            gap={0}
            justify='space-between'
            style={{ position: 'relative', height: 160, flexShrink: 0 }}
          >
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
                borderRadius: 10,
              }}
            />
            <Box></Box>
            {campaign?.description?.trim() && (
              <BlurBox px='xs' py={5} m={10}>
                <ScrollArea h={55} my={5}>
                  <Text fz='xs'>{campaign.description.trim()}</Text>
                </ScrollArea>
              </BlurBox>
            )}
          </Stack>

          <Tabs
            defaultValue='party'
            variant='outline'
            style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', marginTop: 10 }}
          >
            <Tabs.List justify='center' mb='xs' style={{ flexShrink: 0 }}>
              <Tabs.Tab value='party'>Party</Tabs.Tab>
              <Tabs.Tab value='notes'>Notes</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value='party' style={{ flex: 1, overflow: 'auto' }}>
              {campaign?.meta_data?.settings?.show_party_member_status &&
                campaign.meta_data.settings.show_party_member_status !== 'OFF' && (
                  <Box>
                    {characters?.map((character, index) => (
                      <Box key={index}>
                        {campaign?.meta_data?.settings?.show_party_member_status === 'STATUS'
                          ? getCharacterStatusCard(character)
                          : getCharacterDetailedCard(character)}
                      </Box>
                    ))}
                  </Box>
                )}
            </Tabs.Panel>

            <Tabs.Panel value='notes' style={{ flex: 1, overflow: 'auto' }}>
              {campaignSharedPages.length === 0 && characterSharedSources.length === 0 ? (
                <Text fz='sm' c='dimmed' ta='center' mt='xl'>
                  No shared notes yet.
                </Text>
              ) : (
                <Accordion chevronPosition='right' variant='contained'>
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
            </Tabs.Panel>
          </Tabs>
        </Box>
      </Drawer>
    </>
  );
}
