import { sessionState } from '@atoms/supabaseAtoms';
import { getCachedPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CAMPAIGN_SLOT_CAP } from '@constants/data';
import classes from '@css/UserInfoIcons.module.css';
import {
  ActionIcon,
  Box,
  Image,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  LoadingOverlay,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
  HoverCard,
  ScrollArea,
} from '@mantine/core';
import { useHover, useMediaQuery } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { IconFlagPlus, IconUserPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Campaign } from '@typing/content';
import { getDefaultCampaignBackgroundImage } from '@utils/background-images';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery } from '@utils/mobile-responsive';
import { hasPatreonAccess } from '@utils/patreon';
import { truncate } from 'lodash-es';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

export function Component() {
  setPageTitle(`Campaigns`);
  const session = useRecoilValue(sessionState);
  const navigate = useNavigate();

  const {
    data: campaigns,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [`find-campaigns`],
    queryFn: async () => {
      return await makeRequest<Campaign[]>('find-campaign', {
        user_id: session?.user.id,
      });
    },
    enabled: !!session,
  });

  const [loadingCreateCampaign, setLoadingCreateCampaign] = useState(false);
  const [loadingCreateZeroCampaign, setLoadingCreateZeroCampaign] = useState(false);

  const handleCreateCampaign = async () => {
    const campaign = await createCampaign();
    if (campaign) {
      navigate(`/campaign/${campaign.id}`);
    }
    setLoadingCreateCampaign(false);
  };

  const reachedCampaignLimit =
    (campaigns?.length ?? 0) >= CAMPAIGN_SLOT_CAP && !hasPatreonAccess(getCachedPublicUser(), 2);

  return (
    <Center>
      <Box maw={875} w='100%'>
        <Box>
          <Group px='sm' justify='space-between' wrap='nowrap'>
            <Box>
              <Title order={1} c='gray.0'>
                Campaigns
                <Text pl={10} fz='xl' fw={500} c='gray.2' span>
                  {campaigns && reachedCampaignLimit ? `(${campaigns.length}/${CAMPAIGN_SLOT_CAP})` : ''}
                </Text>
              </Title>
            </Box>
            <Group gap={5} wrap='nowrap'>
              <Tooltip label='Create Campaign' openDelay={750}>
                <ActionIcon
                  disabled={reachedCampaignLimit}
                  style={{ backgroundColor: reachedCampaignLimit ? 'rgba(0, 0, 0, 0.05)' : undefined }}
                  loading={loadingCreateCampaign}
                  variant='subtle'
                  color='gray.0'
                  size='xl'
                  radius='xl'
                  aria-label='Create Character'
                  onClick={() => {
                    setLoadingCreateCampaign(true);
                    handleCreateCampaign();
                  }}
                >
                  <IconFlagPlus size='1.3rem' stroke={2.5} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Divider color='gray.2' />
        </Box>
        <Group pt='sm'>
          {isLoading && (
            <Loader
              size='lg'
              type='bars'
              style={{
                position: 'absolute',
                top: '30%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
          {(campaigns ?? []).map((campaign, index) => (
            <CampaignCard key={index} campaign={campaign} />
          ))}
          {!isLoading && (campaigns ?? []).length === 0 && (
            <BlurBox w={'100%'} h={200}>
              <Stack mt={50} gap={10}>
                <Text ta='center' c='gray.5' fs='italic'>
                  No campaigns found, want to create one?
                </Text>
                <Center>
                  <Box>
                    <BlurButton
                      loading={loadingCreateZeroCampaign}
                      onClick={() => {
                        setLoadingCreateZeroCampaign(true);
                        handleCreateCampaign();
                      }}
                    >
                      Create Campaign
                    </BlurButton>
                  </Box>
                </Center>
              </Stack>
            </BlurBox>
          )}
        </Group>
      </Box>
    </Center>
  );
}

function CampaignCard(props: { campaign: Campaign }) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const isPhone = useMediaQuery(phoneQuery());
  const queryClient = useQueryClient();

  const { hovered: hoveredMain, ref: refMain } = useHover();

  return (
    <BlurBox blur={10} w={isPhone ? '100%' : 240}>
      <Box
        w='100%'
        ref={refMain}
        style={{
          cursor: 'pointer',
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          backgroundColor: hoveredMain ? 'rgba(0, 0, 0, 0.15)' : undefined,
          position: 'relative',
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          navigate(`/campaign/${props.campaign.id}`);
        }}
      >
        <Box
          component='a'
          href={`/campaign/${props.campaign.id}`}
          style={{
            zIndex: 1,
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
          }}
        ></Box>
        <Card radius='md' style={{ backgroundColor: 'transparent' }}>
          <Card.Section>
            <Image
              src={props.campaign?.meta_data?.image_url}
              alt={props.campaign?.name}
              height={70}
              fallbackSrc={getDefaultCampaignBackgroundImage().url}
            />
          </Card.Section>

          <Card.Section className={classes.section} mt='xs' px='md'>
            <Group justify='apart'>
              <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
                <HoverCard.Target>
                  <Title c='gray.3' order={4} className={classes.name}>
                    {truncate(props.campaign?.name || 'My Campaign', {
                      length: 30,
                    })}
                  </Title>
                </HoverCard.Target>
                <HoverCard.Dropdown py={5} px={10}>
                  <Text c='gray.3' size='sm'>
                    {props.campaign?.name || 'My Campaign'}
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
            </Group>
            <ScrollArea h={60} my={5}>
              <Text fz='sm'>{props.campaign?.description || 'A new adventure begins...'}</Text>
            </ScrollArea>
          </Card.Section>
        </Card>
      </Box>
    </BlurBox>
  );
}

async function createCampaign() {
  const result = await makeRequest<Campaign>('create-campaign', {
    name: 'My Campaign',
    description: 'A new adventure begins...',
    meta_data: {
      settings: {
        show_party_member_status: 'STATUS',
      },
    },
  });
  return result;
}
