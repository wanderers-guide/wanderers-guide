import { drawerState } from '@atoms/navAtoms';
import { userState } from '@atoms/userAtoms';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import { glassStyle } from '@utils/colors';
import { ContentSourceInfo } from '@common/ContentSourceInfo';
import Paginator from '@common/Paginator';
import { IMPRINT_BG_COLOR, IMPRINT_BG_COLOR_2, IMPRINT_BORDER_COLOR } from '@constants/data';
import { deleteContent, upsertContentSource } from '@content/content-creation';
import { fetchContentSources, resetContentStore } from '@content/content-store';
import { updateSubscriptions } from '@content/homebrew';
import { importFromCustomPack } from '@homebrew/import/pathbuilder-custom-packs';
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Divider,
  FileButton,
  Group,
  Loader,
  Text,
  Menu,
  Stack,
  Tabs,
  Title,
  VisuallyHidden,
  rem,
  useMantineTheme,
  TextInput,
} from '@mantine/core';
import { useMediaQuery, useHover } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { CreateContentSourceModal } from '@modals/CreateContentSourceModal';
import { makeRequest } from '@requests/request-manager';
import { IconUpload, IconSearch, IconDots, IconTrash, IconChevronDown, IconX, IconAsset } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ContentSource } from '@schemas/content';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery } from '@utils/mobile-responsive';
import { displayPatronOnly } from '@utils/notifications';
import { hasPatreonAccess } from '@utils/patreon';
import { useRef, useState } from 'react';
import { useAtom } from 'jotai';

export function Component() {
  setPageTitle(`Homebrew`);
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());
  const [searchQuery, setSearchQuery] = useState('');

  const [tab, setTab] = useState('browse');

  return (
    <Center>
      <Box maw={875} w='100%'>
        <BlurBox>
          {/* Header row — title + inline search (desktop only) */}
          <Group px='md' py='sm' justify='space-between' wrap='nowrap'>
            <Group gap='sm' wrap='nowrap' style={{ flexShrink: 0 }}>
              {!isPhone && <IconAsset size='1.8rem' stroke={1.5} />}
              <Title size={28}>Homebrew</Title>
            </Group>

            {/* Inline search — desktop only; mobile gets its own row below */}
            {!isPhone && (
              <TextInput
                style={{ flex: 1, maxWidth: 280 }}
                leftSection={<IconSearch size='0.9rem' />}
                placeholder='Search bundles'
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

            {/* Pill tabs — desktop: inline in header row */}
            {!isPhone && (
              <Tabs
                variant='pills'
                radius='xl'
                value={tab}
                onChange={(value) => {
                  if (value === 'creations' && !hasPatreonAccess(getCachedPublicUser(), 2)) {
                    displayPatronOnly('This feature is only available to Wanderer-tier patrons!');
                    return;
                  }
                  setTab(value ?? 'browse');
                }}
                styles={{
                  list: { flexWrap: 'nowrap', gap: 4 },
                }}
              >
                <Tabs.List>
                  <Tabs.Tab value='browse' size='xs'>
                    Browse
                  </Tabs.Tab>
                  <Tabs.Tab value='subscriptions' size='xs'>
                    Subscriptions
                  </Tabs.Tab>
                  <Tabs.Tab value='creations' size='xs'>
                    My Creations
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs>
            )}
          </Group>

          {/* Mobile: search + pill tabs on their own rows */}
          {isPhone && (
            <Stack px='sm' pb='xs' gap='xs'>
              <TextInput
                style={{ flex: 1 }}
                leftSection={<IconSearch size='0.9rem' />}
                placeholder='Search bundles'
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
              <Tabs
                variant='pills'
                radius='xl'
                value={tab}
                onChange={(value) => {
                  if (value === 'creations' && !hasPatreonAccess(getCachedPublicUser(), 2)) {
                    displayPatronOnly('This feature is only available to Wanderer-tier patrons!');
                    return;
                  }
                  setTab(value ?? 'browse');
                }}
                styles={{
                  list: { gap: 4 },
                }}
              >
                <Tabs.List>
                  <Tabs.Tab value='browse'>Browse</Tabs.Tab>
                  <Tabs.Tab value='subscriptions'>Subscriptions</Tabs.Tab>
                  <Tabs.Tab value='creations'>My Creations</Tabs.Tab>
                </Tabs.List>
              </Tabs>
            </Stack>
          )}

          <Divider />

          {/* Tab content — all inside the same glass panel */}
          <Box p='md'>
            <Group>{tab === 'browse' && <BrowseSection searchQuery={searchQuery.trim()} />}</Group>
            <Group>{tab === 'subscriptions' && <SubscriptionsSection searchQuery={searchQuery.trim()} />}</Group>
            <Group>{tab === 'creations' && <CreationsSection searchQuery={searchQuery.trim()} />}</Group>
          </Box>
        </BlurBox>
      </Box>
    </Center>
  );
}

const getSearchStr = (source: ContentSource) => {
  return JSON.stringify({
    _: source.name,
    ___: source.contact_info,
    ____: source.description,
    _____: source.url,
    ______: source.meta_data,
  }).toLowerCase();
};

function BrowseSection(props: { searchQuery: string }) {
  const isPhone = useMediaQuery(phoneQuery());
  const { data, isFetching } = useQuery({
    queryKey: [`get-homebrew-content-sources-public`],
    queryFn: async () => {
      return (await fetchContentSources('ALL-HOMEBREW-PUBLIC'))
        .filter((c) => c.user_id)
        .sort((a, b) => {
          if (a.require_key && !b.require_key) return 1;
          if (!a.require_key && b.require_key) return -1;
          return a.name.localeCompare(b.name);
        });
    },
    refetchOnWindowFocus: false,
  });

  const bundles = data?.filter((source) => getSearchStr(source).includes(props.searchQuery.toLowerCase())) ?? [];

  return (
    <Stack w='100%' gap={15}>
      <Group>
        {isFetching && (
          <Center w='100%' py='xl'>
            <Loader size='sm' type='dots' />
          </Center>
        )}

        {bundles.length > 0 && (
          <Center w='100%'>
            <Stack w='100%'>
              <Paginator
                h={500}
                records={(bundles ?? []).map((source, index) => (
                  <ContentSourceCard key={index} source={source} />
                ))}
                numPerPage={isPhone ? 4 : 12}
                numInRow={isPhone ? 1 : 3}
                gap='sm'
                pagSize='md'
              />
            </Stack>
          </Center>
        )}

        {!isFetching && bundles.length === 0 && (
          <BlurBox w={'100%'} h={200}>
            <Stack mt={50} gap={10}>
              <Text ta='center' c='gray.2' fs='italic'>
                No homebrew bundles found.
              </Text>
            </Stack>
          </BlurBox>
        )}
      </Group>
    </Stack>
  );
}

function SubscriptionsSection(props: { searchQuery: string }) {
  const isPhone = useMediaQuery(phoneQuery());
  const [user, setUser] = useAtom(userState);
  const { refetch } = useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      const user = await getPublicUser();
      setUser(user);
      return user;
    },
    refetchOnWindowFocus: false,
  });

  const {
    data,
    isFetching,
    refetch: refetchSources,
  } = useQuery({
    queryKey: [`get-homebrew-content-sources-subscribed`, user?.user_id],
    queryFn: async () => {
      resetContentStore(false);
      return (await fetchContentSources('ALL-HOMEBREW-ACCESSIBLE')).filter(
        (c) => c.user_id && user?.subscribed_content_sources?.find((src) => src.source_id === c.id)
      );
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const isLoading = isFetching || !user || !data;
  const bundles = data?.filter((source) => getSearchStr(source).includes(props.searchQuery.toLowerCase())) ?? [];

  return (
    <Stack w='100%' gap={15}>
      <Group>
        {isLoading && (
          <Center w='100%' py='xl'>
            <Loader size='sm' type='dots' />
          </Center>
        )}

        {bundles.length > 0 && (
          <Center w='100%'>
            <Stack w='100%'>
              <Paginator
                h={500}
                records={bundles.map((source, index) => (
                  <ContentSourceCard
                    key={index}
                    source={source}
                    onDelete={async () => {
                      const subscriptions = await updateSubscriptions(user, source, false);
                      await makeRequest('update-user', {
                        subscribed_content_sources: subscriptions ?? [],
                      });
                      await refetch();
                      await refetchSources();
                    }}
                    deleteTitle='Unsubscribe'
                    deleteMessage='Are you sure you want to unsubscribe from this bundle? All characters using this bundle will lose their abilities from this source.'
                  />
                ))}
                numPerPage={isPhone ? 3 : 12}
                numInRow={isPhone ? 1 : 3}
                gap='sm'
                pagSize='md'
              />
            </Stack>
          </Center>
        )}

        {!isLoading && bundles.length === 0 && (
          <BlurBox w={'100%'} h={200}>
            <Stack mt={50} gap={10}>
              <Text ta='center' c='gray.2' fs='italic'>
                No subscribed bundles found. Go add some!
              </Text>
            </Stack>
          </BlurBox>
        )}
      </Group>
    </Stack>
  );
}

function CreationsSection(props: { searchQuery: string }) {
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const jsonImportRef = useRef<HTMLButtonElement>(null);

  const [user, setUser] = useAtom(userState);
  useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      const user = await getPublicUser();
      setUser(user);
      return user;
    },
    refetchOnWindowFocus: false,
  });

  const {
    data,
    isFetching: isFetchingBundles,
    refetch: refetchBundles,
  } = useQuery({
    queryKey: [`get-homebrew-content-sources-creations`],
    queryFn: async () => {
      resetContentStore(false);
      return (await fetchContentSources('ALL-HOMEBREW-ACCESSIBLE')).filter(
        (c) => c.user_id && c.user_id === user?.user_id
      );
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
  const isFetching = isFetchingBundles || !user;

  const bundles =
    data?.filter((source) => getSearchStr(source).toLowerCase().includes(props.searchQuery.toLowerCase())) ?? [];

  return (
    <Stack w='100%' gap={15}>
      <Box
        p='xs'
        style={{
          ...glassStyle({ bg: true }),
          position: 'relative',
        }}
      >
        <Stack gap={10}>
          <Title ta='center' c='gray.0' order={3}>
            In Progress
          </Title>
          <Center>
            <Divider w={50} color='gray.3' size='sm' />
          </Center>
        </Stack>
        <Button.Group
          style={{
            position: 'absolute',
            top: 15,
            right: 15,
            display: isPhone ? 'none' : undefined,
          }}
        >
          <Button
            loading={loadingCreate}
            variant='outline'
            color='gray.0'
            radius='xl'
            size='xs'
            onClick={async () => {
              setLoadingCreate(true);
              const source = await upsertContentSource({
                id: -1,
                created_at: '',
                user_id: '',
                name: 'New Bundle',
                foundry_id: null,
                url: '',
                description: '',
                operations: [],
                contact_info: '',
                group: '',
                require_key: false,
                keys: null,
                is_published: false,
                artwork_url: '',
                deprecated: false,
                required_content_sources: [],
                meta_data: {},
              });
              if (source && user) {
                // Open the new source
                setSourceId(source.id);
              }
              refetchBundles();
              setLoadingCreate(false);
            }}
          >
            Create Bundle
          </Button>
          <Menu shadow='md' width={160} position='bottom-end'>
            <Menu.Target>
              <Button variant='outline' color='gray.0' px={5} size='xs'>
                <IconChevronDown size='1.2rem' />
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconUpload size='1rem' />}
                onClick={() => {
                  jsonImportRef.current?.click();
                }}
              >
                Import from Custom Pack
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Button.Group>

        <VisuallyHidden>
          {/* This is a hack to get the FileButton to work with the Menu component */}
          <FileButton
            onChange={async (file) => {
              if (!file) return;
              setLoadingCreate(true);
              const source = await importFromCustomPack(file);
              if (source && user) {
                // Open the new source
                setSourceId(source.id);
              }
              refetchBundles();
              setLoadingCreate(false);
            }}
            accept='application/JSON'
          >
            {(props) => (
              <Button ref={jsonImportRef} {...props}>
                Import from Custom Pack
              </Button>
            )}
          </FileButton>
        </VisuallyHidden>
      </Box>

      <Group>
        {isFetching && (
          <Center w='100%' py='xl'>
            <Loader size='sm' type='dots' />
          </Center>
        )}
        {!isFetching &&
          bundles
            .filter((c) => !c.is_published)
            .map((source, index) => (
              <ContentSourceCard
                key={index}
                source={source}
                onEdit={() => {
                  setSourceId(source.id);
                }}
                onDelete={async () => {
                  await deleteContent('content-source', source.id);
                  refetchBundles();
                }}
                deleteTitle='Delete Bundle'
                deleteMessage='Are you sure you want to delete this bundle? All characters using this bundle will lose their abilities from this source.'
              />
            ))}
        {!isFetching && bundles.filter((c) => !c.is_published).length === 0 && (
          <BlurBox w={'100%'} h={100}>
            <Stack mt={30} gap={10}>
              <Text ta='center' c='gray.2' fs='italic'>
                No bundles in progress.
              </Text>
            </Stack>
          </BlurBox>
        )}
      </Group>

      <Box
        p='xs'
        style={{
          ...glassStyle({ bg: true }),
        }}
      >
        <Stack gap={10}>
          <Title ta='center' c='gray.0' order={3}>
            Published
          </Title>
          <Center>
            <Divider w={50} color='gray.3' size='sm' />
          </Center>
        </Stack>
      </Box>

      <Group>
        {isFetching && (
          <Center w='100%' py='xl'>
            <Loader size='sm' type='dots' />
          </Center>
        )}
        {!isFetching &&
          bundles
            .filter((c) => c.is_published)
            .map((source, index) => (
              <ContentSourceCard
                key={index}
                source={source}
                onEdit={() => {
                  setSourceId(source.id);
                }}
                onDelete={async () => {
                  await deleteContent('content-source', source.id);
                  refetchBundles();
                }}
                deleteTitle='Delete Bundle'
                deleteMessage='Are you sure you want to delete this bundle? All characters using this bundle will lose their abilities from this source.'
              />
            ))}
        {!isFetching && bundles.filter((c) => c.is_published).length === 0 && (
          <BlurBox w={'100%'} h={100}>
            <Stack mt={30} gap={10}>
              <Text ta='center' c='gray.2' fs='italic'>
                No published bundles.
              </Text>
            </Stack>
          </BlurBox>
        )}
      </Group>

      {sourceId && (
        <CreateContentSourceModal
          opened={true}
          sourceId={sourceId}
          onClose={() => setSourceId(undefined)}
          onUpdate={async () => {
            // Make direct request to circumvent the cache
            const source = await makeRequest<ContentSource>('find-content-source', { id: sourceId });
            if (user && source) {
              // Auto subscribe to the source
              const subscriptions = await updateSubscriptions(user, source, true);
              setUser({ ...user, subscribed_content_sources: subscriptions });
              await makeRequest('update-user', {
                subscribed_content_sources: subscriptions ?? [],
              });
            }

            refetchBundles();
          }}
        />
      )}
    </Stack>
  );
}

/** Homebrew bundle card — uses imprint styling (lighter panel) inside the outer BlurBox */
function ContentSourceCard(props: {
  source: ContentSource;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteTitle?: string;
  deleteMessage?: string;
}) {
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());
  const [_drawer, openDrawer] = useAtom(drawerState);

  const { hovered: hoveredCard, ref: refCard } = useHover();

  return (
    <Box
      ref={refCard}
      w='100%'
      style={{
        // Imprint styling — lighter semi-transparent panel inside the outer BlurBox
        backgroundColor: hoveredCard ? IMPRINT_BG_COLOR_2 : IMPRINT_BG_COLOR,
        border: `1px solid ${IMPRINT_BORDER_COLOR}`,
        borderRadius: theme.radius.md,
        // Subtle base shadow gives the card a "lifted" feel even at rest;
        // hover then escalates to a bigger lift + shadow for clear feedback.
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.18)',
        cursor: 'pointer',
        transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
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
        openDrawer({
          type: 'content-source',
          data: {
            id: props.source.id,
            showOperations: true,
          },
        });
      }}
    >
      <Box w='100%' h='100%' px='sm' style={{ position: 'relative' }}>
        <ContentSourceInfo source={props.source} />
      </Box>
      {(props.onEdit || props.onDelete) && (
        <Group gap={5} pb='xs' px='sm'>
          {props.onEdit ? (
            <Button
              size='xs'
              variant='default'
              radius='xl'
              style={{ flex: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onEdit?.();
              }}
            >
              Edit Bundle
            </Button>
          ) : (
            <Box style={{ flex: 1 }}></Box>
          )}
          {props.onDelete && (
            <Menu shadow='md' width={200} withArrow withinPortal>
              <Menu.Target>
                <ActionIcon
                  size={30}
                  variant='subtle'
                  color='gray'
                  radius='xl'
                  aria-label='Options'
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots style={{ width: '60%', height: '60%' }} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  color='red'
                  leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    modals.openConfirmModal({
                      id: 'delete-source',
                      title: <Title order={4}>{props.deleteTitle ?? 'Delete'}</Title>,
                      children: <Text size='sm'>{props.deleteMessage ?? 'Are you sure?'}</Text>,
                      labels: { confirm: 'Confirm', cancel: 'Cancel' },
                      onCancel: () => {},
                      onConfirm: () => {
                        props.onDelete?.();
                      },
                    });
                  }}
                >
                  {props.deleteTitle ?? 'Delete'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      )}
    </Box>
  );
}
