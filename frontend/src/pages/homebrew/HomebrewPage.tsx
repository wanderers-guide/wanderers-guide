import { drawerState } from '@atoms/navAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { userState } from '@atoms/userAtoms';
import { getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterDetailedInfo, CharacterInfo } from '@common/CharacterInfo';
import { ContentSourceInfo } from '@common/ContentSourceInfo';
import { CHARACTER_SLOT_CAP, ICON_BG_COLOR_HOVER } from '@constants/data';
import { fetchContentSources } from '@content/content-store';
import exportToJSON from '@export/export-to-json';
import exportToPDF from '@export/export-to-pdf';
import { importFromFTC } from '@import/ftc/import-from-ftc';
import importFromGUIDECHAR from '@import/guidechar/import-from-guidechar';
import importFromJSON from '@import/json/import-from-json';
import PathbuilderInputModal from '@import/pathbuilder/PathbuilderInputModal';
import { importFromPathbuilder } from '@import/pathbuilder/import-from-pathbuilder';
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
  SimpleGrid,
  Stack,
  Title,
  Tooltip,
  VisuallyHidden,
  rem,
  useMantineTheme,
  Tabs,
  MantineProvider,
  TextInput,
  Badge,
} from '@mantine/core';
import { useMediaQuery, useHover } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { showNotification, hideNotification } from '@mantine/notifications';
import { CreateContentSourceModal } from '@modals/CreateContentSourceModal';
import { makeRequest } from '@requests/request-manager';
import {
  IconUserPlus,
  IconUpload,
  IconCodeDots,
  IconBrandTidal,
  IconArchive,
  IconArrowsShuffle,
  IconBookmarks,
  IconListDetails,
  IconHammer,
  IconSearch,
  IconCopy,
  IconDots,
  IconFileTypePdf,
  IconTrash,
  IconChevronDown,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Character, ContentSource } from '@typing/content';
import { isPlayable } from '@utils/character';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery } from '@utils/mobile-responsive';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';

export function Component() {
  setPageTitle(`Homebrew`);
  const theme = useMantineTheme();
  const session = useRecoilValue(sessionState);

  const [tab, setTab] = useState(0);

  return (
    <Center>
      <Box maw={875} w='100%'>
        <Box>
          <Group px='sm' justify='space-between' wrap='nowrap'>
            <Box>
              <Title order={1} c='gray.0'>
                Homebrew
              </Title>
            </Box>
            <Group gap={5} wrap='nowrap'>
              <BlurButton
                w={160}
                leftSection={<IconListDetails size='1rem' />}
                style={
                  tab === 0 ? { backgroundColor: '#fff', color: theme.colors.gray[7] } : { color: theme.colors.gray[0] }
                }
                onClick={() => setTab(0)}
              >
                Browse
              </BlurButton>
              <BlurButton
                w={160}
                leftSection={<IconBookmarks size='1rem' />}
                style={
                  tab === 1 ? { backgroundColor: '#fff', color: theme.colors.gray[7] } : { color: theme.colors.gray[0] }
                }
                onClick={() => setTab(1)}
              >
                Subscriptions
              </BlurButton>
              <BlurButton
                w={160}
                leftSection={<IconHammer size='1rem' />}
                style={
                  tab === 2 ? { backgroundColor: '#fff', color: theme.colors.gray[7] } : { color: theme.colors.gray[0] }
                }
                onClick={() => setTab(2)}
              >
                My Creations
              </BlurButton>
            </Group>
          </Group>
          <Divider color='gray.2' />
        </Box>
        <Box pt='sm'>
          <Group>{tab === 0 && <BrowseSection />}</Group>
          <Group>{tab === 1 && <SubscriptionsSection />}</Group>
          <Group>{tab === 2 && <CreationsSection />}</Group>
        </Box>
      </Box>
    </Center>
  );
}

function BrowseSection(props: {}) {
  const theme = useMantineTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: [`get-homebrew-content-sources`],
    queryFn: async () => {
      return (await fetchContentSources({ ids: 'all', homebrew: true, published: true })).filter((c) => c.user_id);
    },
  });

  console.log(data);

  return (
    <Stack w='100%' gap={5}>
      {/* <TextInput
        style={{ flex: 1 }}
        leftSection={<IconSearch size='0.9rem' />}
        placeholder={`Search bundles`}
        onChange={(event) => setSearchQuery(event.target.value)}
        styles={{
          input: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            color: theme.colors.gray[0],
            borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
          },
        }}
      /> */}

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
        {(data ?? []).map((source, index) => (
          <ContentSourceCard key={index} source={source} />
        ))}
        {!isFetching && (data ?? []).length === 0 && (
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

function SubscriptionsSection(props: {}) {
  const theme = useMantineTheme();

  const [user, setUser] = useRecoilState(userState);
  const { refetch } = useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      const user = await getPublicUser();
      setUser(user);
      return user;
    },
  });

  const {
    data,
    isFetching,
    refetch: refetchSources,
  } = useQuery({
    queryKey: [`get-homebrew-content-sources`],
    queryFn: async () => {
      return (await fetchContentSources({ ids: 'all', homebrew: true, published: true })).filter(
        (c) => c.user_id && user?.subscribed_content_sources?.find((src) => src.source_id === c.id)
      );
    },
  });

  return (
    <Stack w='100%' gap={5}>
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
        {(data ?? []).map((source, index) => (
          <ContentSourceCard
            key={index}
            source={source}
            onDelete={async () => {
              const subscriptions = user?.subscribed_content_sources?.filter((src) => src.source_id !== source?.id);
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
        {!isFetching && (data ?? []).length === 0 && (
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

function CreationsSection(props: {}) {
  const theme = useMantineTheme();
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);

  const [user, setUser] = useRecoilState(userState);
  const { refetch } = useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      const user = await getPublicUser();
      setUser(user);
      return user;
    },
  });

  const { data, isFetching } = useQuery({
    queryKey: [`get-homebrew-content-sources`],
    queryFn: async () => {
      return (await fetchContentSources({ ids: 'all', homebrew: true, published: true })).filter(
        (c) => c.user_id && c.user_id === user?.user_id
      );
    },
    enabled: !!user,
  });

  console.log(data);

  return (
    <Stack w='100%' gap={15}>
      <Box
        p='xs'
        style={{
          backgroundColor: 'rgba(233, 236, 239, 0.1)',
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
          }}
        >
          <Button variant='outline' color='gray.0' radius='xl' size='xs' onClick={() => {}}>
            Create Bundle
          </Button>
          <Menu shadow='md' width={160} position='bottom-end'>
            <Menu.Target>
              <Button variant='outline' color='gray.0' px={5} size='xs'>
                <IconChevronDown size='1.2rem' />
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUpload size='1rem' />} onClick={() => {}}>
                Import from Custom Pack
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Button.Group>
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
        {(data ?? [])
          .filter((c) => !c.is_published)
          .map((source, index) => (
            <ContentSourceCard
              key={index}
              source={source}
              onEdit={() => {
                setSourceId(source.id);
              }}
              onDelete={() => {}}
              deleteTitle='Delete Bundle'
              deleteMessage='Are you sure you want to delete this bundle? All characters using this bundle will lose their abilities from this source.'
            />
          ))}
        {!isFetching && (data ?? []).filter((c) => !c.is_published).length === 0 && (
          <BlurBox w={'100%'} h={100}>
            <Stack mt={30} gap={10}>
              <Text ta='center' c='gray.5' fs='italic'>
                No homebrew bundles found.
              </Text>
            </Stack>
          </BlurBox>
        )}
      </Group>

      <Box
        p='xs'
        style={{
          backgroundColor: 'rgba(233, 236, 239, 0.1)',
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
        {(data ?? [])
          .filter((c) => c.is_published)
          .map((source, index) => (
            <ContentSourceCard
              key={index}
              source={source}
              onEdit={() => {
                setSourceId(source.id);
              }}
              onDelete={() => {}}
              deleteTitle='Delete Bundle'
              deleteMessage='Are you sure you want to delete this bundle? All characters using this bundle will lose their abilities from this source.'
            />
          ))}
        {!isFetching && (data ?? []).filter((c) => c.is_published).length === 0 && (
          <BlurBox w={'100%'} h={100}>
            <Stack mt={30} gap={10}>
              <Text ta='center' c='gray.5' fs='italic'>
                No homebrew bundles found.
              </Text>
            </Stack>
          </BlurBox>
        )}
      </Group>

      {sourceId && (
        <CreateContentSourceModal opened={true} sourceId={sourceId} onClose={() => setSourceId(undefined)} />
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
    <BlurBox blur={10} w={isPhone ? '100%' : 280}>
      <Box
        w='100%'
        h='100%'
        px='xs'
        pb={10}
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
