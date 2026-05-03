import { sessionState } from '@atoms/supabaseAtoms';
import { getCachedPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import Paginator from '@common/Paginator';
import { CAMPAIGN_SLOT_CAP, IMPRINT_BG_COLOR, IMPRINT_BG_COLOR_2, IMPRINT_BORDER_COLOR } from '@constants/data';
import classes from '@css/UserInfoIcons.module.css';
import {
  ActionIcon,
  Box,
  Image,
  Center,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
  HoverCard,
  ScrollArea,
  Badge,
  TextInput,
} from '@mantine/core';
import { useHover, useMediaQuery } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { IconFlag, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Campaign, Character } from '@schemas/content';
import { getDefaultCampaignBackgroundImage } from '@utils/background-images';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery } from '@utils/mobile-responsive';
import { hasPatreonAccess } from '@utils/patreon';
import { truncate } from 'lodash-es';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';

export function Component() {
  setPageTitle(`Campaigns`);
  const session = useAtomValue(sessionState);
  const navigate = useNavigate();

  const isPhone = useMediaQuery(phoneQuery());
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
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

  const reachedCampaignLimit = (data?.length ?? 0) >= CAMPAIGN_SLOT_CAP && !hasPatreonAccess(getCachedPublicUser(), 2);

  const getSearchStr = (campaign: Campaign) => {
    return JSON.stringify({
      _: campaign.name,
      ___: campaign.description,
    }).toLowerCase();
  };

  const campaigns =
    data
      ?.filter((c) => getSearchStr(c).includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  return (
    <Center>
      <Box maw={875} w='100%'>
        <BlurBox>
          {/* Header row — title, inline search (desktop), create button */}
          <Group px='md' py='sm' justify='space-between' wrap='nowrap'>
            <Group gap={10} wrap='nowrap' style={{ flexShrink: 0 }}>
              {!isPhone && <IconFlag size='1.8rem' stroke={1.5} />}
              <Title size={28}>
                Campaigns
                <Text pl={10} fz='xl' fw={500} c='gray.2' span>
                  {data && reachedCampaignLimit ? `(${data.length}/${CAMPAIGN_SLOT_CAP})` : ''}
                </Text>
              </Title>
            </Group>

            {/* Inline search — desktop only */}
            {!isPhone && (
              <TextInput
                style={{ flex: 1, maxWidth: 280 }}
                leftSection={<IconSearch size='0.9rem' />}
                placeholder='Search campaigns'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant='unstyled'
                rightSection={
                  searchQuery.trim() ? (
                    <ActionIcon
                      variant='subtle'
                      size='md'
                      color='gray'
                      radius='xl'
                      aria-label='Clear search'
                      onClick={() => setSearchQuery('')}
                    >
                      <IconX size='1.2rem' stroke={2} />
                    </ActionIcon>
                  ) : undefined
                }
                styles={(theme) => ({
                  wrapper: {
                    backgroundColor: 'rgba(0, 0, 0, 0.18)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: theme.radius.md,
                    padding: '2px 4px',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                    '&:focus-within': {
                      borderColor: theme.colors[theme.primaryColor][8],
                      boxShadow: `0 0 0 2px color-mix(in srgb, ${theme.colors[theme.primaryColor][9]} 30%, transparent)`,
                    },
                  },
                  input: { '--input-placeholder-color': theme.colors.gray[5] },
                })}
              />
            )}

            <Group gap={5} wrap='nowrap'>
              <Tooltip label='Create Campaign' openDelay={500}>
                <ActionIcon
                  disabled={reachedCampaignLimit}
                  loading={loadingCreateCampaign}
                  variant='light'
                  color='gray'
                  size='lg'
                  radius='lg'
                  aria-label='Create Campaign'
                  onClick={() => {
                    setLoadingCreateCampaign(true);
                    handleCreateCampaign();
                  }}
                >
                  <IconPlus size='1.65rem' stroke={2.5} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Mobile-only: search on its own row */}
          {isPhone && (
            <Box px='md' pb='xs'>
              <TextInput
                style={{ flex: 1 }}
                leftSection={<IconSearch size='0.9rem' />}
                placeholder='Search campaigns'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant='unstyled'
                rightSection={
                  searchQuery.trim() ? (
                    <ActionIcon
                      variant='subtle'
                      size='md'
                      color='gray'
                      radius='xl'
                      aria-label='Clear search'
                      onClick={() => setSearchQuery('')}
                    >
                      <IconX size='1.2rem' stroke={2} />
                    </ActionIcon>
                  ) : undefined
                }
                styles={(theme) => ({
                  wrapper: {
                    backgroundColor: 'rgba(0, 0, 0, 0.18)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: theme.radius.md,
                    padding: '2px 4px',
                  },
                  input: { '--input-placeholder-color': theme.colors.gray[5] },
                })}
              />
            </Box>
          )}

          <Divider />

          {/* Content area — all inside the same glass panel */}
          <Box p='md'>
            {isLoading && (
              <Center w='100%' py='xl'>
                <Loader size='sm' type='dots' />
              </Center>
            )}

            {campaigns.length > 0 && (
              <Paginator
                h={500}
                records={campaigns.map((c, i) => (
                  <CampaignCard key={i} campaign={c} />
                ))}
                numPerPage={isPhone ? 3 : 9}
                numInRow={isPhone ? 1 : 3}
                gap='sm'
                pagSize='md'
              />
            )}

            {/* Empty state when search yields no results */}
            {!isLoading && campaigns.length === 0 && searchQuery.trim() && (
              <Stack py={50} gap={5}>
                <Text ta='center' c='dimmed' fs='italic'>
                  No campaigns match "{searchQuery.trim()}"
                </Text>
              </Stack>
            )}

            {!isLoading && (data ?? []).length === 0 && (
              <Stack py={50} gap={10}>
                <Text ta='center' c='dimmed' fs='italic'>
                  No campaigns found, want to create one?
                </Text>
                <Center>
                  <BlurButton
                    loading={loadingCreateZeroCampaign}
                    onClick={() => {
                      setLoadingCreateZeroCampaign(true);
                      handleCreateCampaign();
                    }}
                  >
                    Create Campaign
                  </BlurButton>
                </Center>
              </Stack>
            )}
          </Box>
        </BlurBox>
      </Box>
    </Center>
  );
}

/** Campaign card — uses imprint styling inside the outer BlurBox */
function CampaignCard(props: { campaign: Campaign }) {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  const { hovered: hoveredCard, ref: refCard } = useHover();

  const { data: characters } = useQuery({
    queryKey: [`find-campaign-characters`, { campaign_id: props.campaign.id }],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        campaign_id: props.campaign.id,
      });
    },
  });

  return (
    <Box
      ref={refCard}
      style={{
        position: 'relative',
        backgroundColor: hoveredCard ? IMPRINT_BG_COLOR_2 : IMPRINT_BG_COLOR,
        border: `1px solid ${IMPRINT_BORDER_COLOR}`,
        borderRadius: theme.radius.md,
        // Subtle base shadow gives the card a "lifted" feel even at rest;
        // hover then escalates to a bigger lift + shadow for clear feedback.
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.18)',
        cursor: 'pointer',
        transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
        overflow: 'hidden',
        ...(hoveredCard
          ? {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)',
            }
          : {}),
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(`/campaign/${props.campaign.id}`);
      }}
    >
      {/* Hidden anchor for SEO / screen readers */}
      <Box
        component='a'
        href={`/campaign/${props.campaign.id}`}
        style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', pointerEvents: 'none' }}
      ></Box>

      {/* Background image */}
      <Image
        src={props.campaign?.meta_data?.image_url}
        alt={props.campaign?.name}
        fallbackSrc={getDefaultCampaignBackgroundImage().url}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          objectFit: 'cover',
          opacity: 0.35,
        }}
      />

      {/* Player count badge */}
      <Badge
        size='xs'
        variant='light'
        color='gray'
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
        }}
      >
        {(characters?.length || 0) + ' players'}
      </Badge>

      {/* Card content */}
      <Box p='sm' style={{ position: 'relative', zIndex: 1 }}>
        <HoverCard shadow='md' openDelay={1000} position='top' withinPortal>
          <HoverCard.Target>
            <Title order={4} c='gray.2' className={classes.name}>
              {truncate(props.campaign?.name || 'My Campaign', { length: 30 })}
            </Title>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <Text size='sm'>{props.campaign?.name || 'My Campaign'}</Text>
          </HoverCard.Dropdown>
        </HoverCard>

        {props.campaign?.description?.trim() ? (
          <ScrollArea h={60} mt={8}>
            <Text fz='xs' c='dimmed'>
              {props.campaign.description.trim()}
            </Text>
          </ScrollArea>
        ) : (
          <Box h={68}></Box>
        )}
      </Box>
    </Box>
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
