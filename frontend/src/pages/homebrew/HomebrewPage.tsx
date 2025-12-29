import { drawerState } from '@atoms/navAtoms';
import { userState } from '@atoms/userAtoms';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import { ContentSourceInfo } from '@common/ContentSourceInfo';
import Paginator from '@common/Paginator';
import { ICON_BG_COLOR_HOVER } from '@constants/data';
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
  Title,
  VisuallyHidden,
  rem,
  useMantineTheme,
  TextInput,
  Select,
} from '@mantine/core';
import { useMediaQuery, useHover } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { CreateContentSourceModal } from '@modals/CreateContentSourceModal';
import { makeRequest } from '@requests/request-manager';
import {
  IconUpload,
  IconBookmarks,
  IconListDetails,
  IconHammer,
  IconSearch,
  IconDots,
  IconTrash,
  IconChevronDown,
  IconX,
  IconAsset,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ContentSource } from '@typing/content';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery } from '@utils/mobile-responsive';
import { displayPatronOnly } from '@utils/notifications';
import { hasPatreonAccess } from '@utils/patreon';
import { useRef, useState } from 'react';
import { useRecoilState } from 'recoil';

export function Component() {
  setPageTitle(`Homebrew`);
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());
  const [searchQuery, setSearchQuery] = useState('');

  const [tab, setTab] = useState(0);

  return (
    <Center>
      <Box maw={875} w='100%'>
        <BlurBox bgColor='rgba(20, 21, 23, 0.827)'>
          <Group px='sm' justify='space-between' wrap='nowrap'>
            <Group gap={10} py={5}>
              {!isPhone && <IconAsset size='1.8rem' stroke={1.5} />}
              <Title size={28} c='gray.0'>
                Homebrew
              </Title>
            </Group>
            {isPhone ? (
              <Select
                value={`${tab}`}
                onChange={(v) => {
                  if (v) {
                    setTab(parseInt(v));
                  }
                }}
                variant='default'
                data={[
                  {
                    value: '0',
                    label: 'Browse',
                  },
                  {
                    value: '1',
                    label: 'Subscriptions',
                  },
                  {
                    value: '2',
                    label: 'My Creations',
                  },
                ]}
              />
            ) : (
              <Group gap={5} wrap='nowrap'>
                <Button
                  w={140}
                  leftSection={<IconListDetails size='1rem' />}
                  variant='outline'
                  size='xs'
                  radius='xl'
                  style={
                    tab === 0
                      ? { backgroundColor: '#fff', color: theme.colors.gray[7], borderColor: '#fff' }
                      : { color: theme.colors.gray[0], backgroundColor: 'transparent', borderColor: '#fff' }
                  }
                  onClick={() => setTab(0)}
                >
                  Browse
                </Button>
                <Button
                  w={140}
                  leftSection={<IconBookmarks size='1rem' />}
                  variant='outline'
                  size='xs'
                  radius='xl'
                  style={
                    tab === 1
                      ? { backgroundColor: '#fff', color: theme.colors.gray[7], borderColor: '#fff' }
                      : { color: theme.colors.gray[0], backgroundColor: 'transparent', borderColor: '#fff' }
                  }
                  onClick={() => setTab(1)}
                >
                  Subscriptions
                </Button>
                <Button
                  w={140}
                  leftSection={<IconHammer size='1rem' />}
                  variant='outline'
                  size='xs'
                  radius='xl'
                  style={
                    tab === 2
                      ? { backgroundColor: '#fff', color: theme.colors.gray[7], borderColor: '#fff' }
                      : {
                          backgroundColor: 'transparent',
                          color: theme.colors.gray[0],
                          borderColor: '#fff',
                        }
                  }
                  onClick={() => {
                    if (!hasPatreonAccess(getCachedPublicUser(), 2)) {
                      displayPatronOnly('This feature is only available to Wanderer-tier patrons!');
                      return;
                    }

                    setTab(2);
                  }}
                >
                  My Creations
                </Button>
              </Group>
            )}
          </Group>
          <Divider color='gray.2' />
          <Box py={5}>
            <TextInput
              style={{ flex: 1 }}
              leftSection={<IconSearch size='0.9rem' />}
              placeholder={`Search bundles`}
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
                    onClick={() => {
                      setSearchQuery('');
                    }}
                  >
                    <IconX size='1.2rem' stroke={2} />
                  </ActionIcon>
                ) : undefined
              }
              styles={(theme) => ({
                input: {
                  '--input-placeholder-color': theme.colors.gray[5],
                },
              })}
            />
          </Box>
        </BlurBox>
        <Box pt='sm'>
          <Group>{tab === 0 && <BrowseSection searchQuery={searchQuery.trim()} />}</Group>
          <Group>{tab === 1 && <SubscriptionsSection searchQuery={searchQuery.trim()} />}</Group>
          <Group>{tab === 2 && <CreationsSection searchQuery={searchQuery.trim()} />}</Group>
        </Box>
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
                gap='xs'
                pagSize='md'
              />
            </Stack>
          </Center>
        )}

        {!isFetching && bundles.length === 0 && (
          <BlurBox w={'100%'} h={200}>
            <Stack mt={50} gap={10}>
              <Text ta='center' c='gray.5' fs='italic'>
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
  const [user, setUser] = useRecoilState(userState);
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
      resetContentStore(true);
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
                gap='xs'
                pagSize='md'
              />
            </Stack>
          </Center>
        )}

        {!isLoading && bundles.length === 0 && (
          <BlurBox w={'100%'} h={200}>
            <Stack mt={50} gap={10}>
              <Text ta='center' c='gray.5' fs='italic'>
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

  const [user, setUser] = useRecoilState(userState);
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
      resetContentStore(true);
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
          backgroundColor: 'rgba(20, 21, 23, 0.827)',
          backdropFilter: 'blur(6px)',
          borderRadius: theme.radius.xl,
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
                foundry_id: undefined,
                url: '',
                description: '',
                operations: [],
                contact_info: '',
                group: '',
                require_key: false,
                keys: undefined,
                is_published: false,
                artwork_url: '',
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
          <Center h={100}>
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
              <Text ta='center' c='gray.5' fs='italic'>
                No bundles in progress.
              </Text>
            </Stack>
          </BlurBox>
        )}
      </Group>

      <Box
        p='xs'
        style={{
          backgroundColor: 'rgba(20, 21, 23, 0.827)',
          backdropFilter: 'blur(6px)',
          borderRadius: theme.radius.xl,
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
              <Text ta='center' c='gray.5' fs='italic'>
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

function ContentSourceCard(props: {
  source: ContentSource;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteTitle?: string;
  deleteMessage?: string;
}) {
  const theme = useMantineTheme();
  const isPhone = useMediaQuery(phoneQuery());
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { hovered: hoveredMain, ref: refMain } = useHover();
  const { hovered: hoveredEdit, ref: refEdit } = useHover<HTMLButtonElement>();
  const { hovered: hoveredOptions, ref: refOptions } = useHover<HTMLButtonElement>();

  return (
    <BlurBox blur={10} miw={isPhone ? '100%' : 280}>
      <Box
        w='100%'
        h='100%'
        px='xs'
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
          openDrawer({
            type: 'content-source',
            data: {
              id: props.source.id,
              showOperations: true,
            },
          });
        }}
      >
        <ContentSourceInfo source={props.source} />
      </Box>
      {(props.onEdit || props.onDelete) && (
        <Group gap='xs' pb='xs' px='xs'>
          {props.onEdit ? (
            <Button
              size='xs'
              variant='light'
              color='gray'
              radius='xl'
              ref={refEdit}
              style={{
                flex: 1,
                backgroundColor: hoveredEdit ? ICON_BG_COLOR_HOVER : undefined,
              }}
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
                  size='lg'
                  variant='light'
                  color='gray'
                  radius='xl'
                  aria-label='Options'
                  ref={refOptions}
                  style={{
                    backgroundColor: hoveredOptions ? ICON_BG_COLOR_HOVER : undefined,
                  }}
                >
                  <IconDots style={{ width: '60%', height: '60%' }} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  <Group justify='space-between'>
                    <Box>Options</Box>
                    <Text fz={10} c='dimmed'>
                      # {55}
                    </Text>
                  </Group>
                </Menu.Label>

                <Menu.Divider />

                <Menu.Item
                  color='red'
                  leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                  onClick={() => {
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
    </BlurBox>
  );
}
