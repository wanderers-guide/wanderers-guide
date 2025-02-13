import {
  Box,
  Drawer,
  Group,
  Title,
  Stack,
  useMantineTheme,
  ActionIcon,
  Badge,
  Text,
  Image,
  ScrollArea,
  Paper,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { tabletQuery, wideDesktopQuery } from '@utils/mobile-responsive';
import { IconHeartFilled } from '@tabler/icons-react';
import { Campaign, Character } from '@typing/content';
import { useQuery } from '@tanstack/react-query';
import { makeRequest } from '@requests/request-manager';
import { getDefaultCampaignBackgroundImage } from '@utils/background-images';
import { interpolateHealth } from '@utils/colors';
import { CharacterDetailedInfo } from '@common/CharacterInfo';

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

  const getCharacterStatusCard = (character: Character) => {
    return (
      <Group gap={10} px={5}>
        <Text>›</Text>
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
              <Badge size='sm' variant='light'>
                {(characters?.length || 0) + ' players'}
              </Badge>
            </Group>
          </Group>
        }
        size={'calc(min(100dvw, 400px))'}
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
        <Stack justify='space-between' h='100%'>
          <Box>
            <Image
              src={campaign?.meta_data?.image_url}
              alt={campaign?.name}
              height={70}
              fallbackSrc={getDefaultCampaignBackgroundImage().url}
              style={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
            />
            <Paper style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }} withBorder>
              <ScrollArea h={70} my={5} mx={10}>
                <Text fz='sm'>{campaign?.description || 'A new adventure begins...'}</Text>
              </ScrollArea>
            </Paper>

            {campaign?.meta_data?.settings?.show_party_member_status !== 'OFF' && (
              <ScrollArea mt={15} h={500}>
                {characters?.map((character, index) => (
                  <Box key={index}>
                    {campaign?.meta_data?.settings?.show_party_member_status === 'STATUS'
                      ? getCharacterStatusCard(character)
                      : getCharacterDetailedCard(character)}
                  </Box>
                ))}
              </ScrollArea>
            )}
          </Box>
        </Stack>
      </Drawer>
    </>
  );
}
