import { characterState } from '@atoms/characterAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterInfo } from '@common/CharacterInfo';
import Paginator from '@common/Paginator';
import { CHARACTER_SLOT_CAP, IMPRINT_BG_COLOR, IMPRINT_BG_COLOR_2, IMPRINT_BORDER_COLOR } from '@constants/data';
import { resetContentStore } from '@content/content-store';
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
  Kbd,
  Loader,
  LoadingOverlay,
  Menu,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  VisuallyHidden,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useForceUpdate, useHover, useMediaQuery } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { hideNotification, showNotification } from '@mantine/notifications';
import { makeRequest } from '@requests/request-manager';
import {
  IconAlignBoxLeftMiddle,
  IconArchive,
  IconArrowsShuffle,
  IconBrandTidal,
  IconCodeDots,
  IconCopy,
  IconDots,
  IconFileTypePdf,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Character } from '@schemas/content';
import { isPlayable } from '@utils/character';
import { getAllBackgroundImages } from '@utils/background-images';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery } from '@utils/mobile-responsive';
import { hasPatreonAccess } from '@utils/patreon';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useAtomValue } from 'jotai';

export function Component() {
  setPageTitle(`Characters`);
  const session = useAtomValue(sessionState);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [`find-character`],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        user_id: session?.user.id,
      });
    },
    enabled: !!session,
  });

  const [_character, setCharacter] = useAtom(characterState);
  const navigate = useNavigate();

  const isPhone = useMediaQuery(phoneQuery());
  const [searchQuery, setSearchQuery] = useState('');

  const [loadingCreateCharacter, setLoadingCreateCharacter] = useState(false);
  const [loadingImportCharacter, setLoadingImportCharacter] = useState(false);
  const [loadingCreateZeroCharacter, setLoadingCreateZeroCharacter] = useState(false);
  const [loadingCreateRandomCharacter, setLoadingCreateRandomCharacter] = useState(false);

  const jsonImportRef = useRef<HTMLButtonElement>(null);
  const guidecharImportRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [openedPathbuilderModal, setOpenedPathbuilderModal] = useState(false);

  const forceUpdate = useForceUpdate();

  // Press '/' anywhere on the page to jump focus to the character search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  useEffect(() => {
    setCharacter(null);
    resetContentStore();
    getPublicUser().then((user) => {
      if (user) {
        // Update the user cache
        forceUpdate();
      }
    });
  }, []);

  const handleCreateCharacter = async () => {
    const character = await createCharacter();
    if (character) {
      navigate(`/builder/${character.id}`);
    }
    setLoadingCreateCharacter(false);
    setLoadingCreateZeroCharacter(false);
  };

  const reachedCharacterLimit =
    (data?.length ?? 0) >= CHARACTER_SLOT_CAP && !hasPatreonAccess(getCachedPublicUser(), 2);

  const getSearchStr = (character: Character) => {
    return JSON.stringify({
      _: character.name,
      ___: character.details?.ancestry?.name,
      ____: character.details?.class?.name,
      _____: character.details?.background?.name,
      _______: character.details?.info,
    }).toLowerCase();
  };

  const characters =
    data
      ?.filter((c) => getSearchStr(c).includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  return (
    <Center>
      <Box maw={875} w='100%'>
        <BlurBox>
          {/* Header row — title, inline search (desktop only), and action buttons */}
          <Group px='md' py='sm' justify='space-between' wrap='nowrap'>
            <Group gap={10} wrap='nowrap' style={{ flexShrink: 0 }}>
              {!isPhone && <IconUsers size='1.8rem' stroke={1.5} />}
              <Title size={28}>
                Characters
                <Text pl={10} fz='xl' fw={500} c='dimmed' span>
                  {data && reachedCharacterLimit ? `(${data.length}/${CHARACTER_SLOT_CAP})` : ''}
                </Text>
              </Title>
            </Group>

            {/* Inline search — only shown on desktop; mobile gets its own row below */}
            {!isPhone && (
              <TextInput
                ref={searchRef}
                style={{ flex: 1, maxWidth: 340 }}
                leftSection={<IconSearch size='0.9rem' />}
                placeholder='Search characters…'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    searchRef.current?.blur();
                  }
                }}
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
                  ) : (
                    <Kbd size='xs' style={{ opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
                      /
                    </Kbd>
                  )
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
                  input: {
                    '--input-placeholder-color': theme.colors.gray[5],
                  },
                })}
              />
            )}

            <Group gap={15} wrap='nowrap' style={{ flexShrink: 0 }}>
              <Tooltip label='Create Character' openDelay={500}>
                <ActionIcon
                  disabled={reachedCharacterLimit}
                  loading={loadingCreateCharacter}
                  variant='light'
                  color='gray'
                  size='lg'
                  radius='lg'
                  aria-label='Create Character'
                  onClick={() => {
                    setLoadingCreateCharacter(true);
                    handleCreateCharacter();
                  }}
                >
                  <IconPlus size='1.65rem' stroke={2.5} />
                </ActionIcon>
              </Tooltip>
              <Menu shadow='md' width={240} withArrow withinPortal>
                <Menu.Target>
                  <Tooltip label='Import Character' openDelay={500}>
                    <ActionIcon
                      disabled={reachedCharacterLimit}
                      loading={loadingImportCharacter}
                      variant='light'
                      color='gray'
                      size='lg'
                      radius='lg'
                      aria-label='Import Character'
                    >
                      <IconUpload size='1.3rem' stroke={2.5} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconCodeDots style={{ width: rem(14), height: rem(14) }} />}
                    onClick={() => {
                      jsonImportRef.current?.click();
                    }}
                  >
                    Import from JSON
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconBrandTidal style={{ width: rem(14), height: rem(14) }} />}
                    onClick={() => {
                      setOpenedPathbuilderModal(true);
                    }}
                  >
                    Import from Pathbuilder
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconArchive style={{ width: rem(14), height: rem(14) }} />}
                    onClick={() => {
                      guidecharImportRef.current?.click();
                    }}
                  >
                    Import from GUIDECHAR
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Tooltip label='Random Character' openDelay={500}>
                <ActionIcon
                  disabled={reachedCharacterLimit}
                  loading={loadingCreateRandomCharacter}
                  variant='light'
                  color='gray'
                  size='lg'
                  radius='lg'
                  aria-label='Create Random Character'
                  onClick={async () => {
                    setLoadingCreateRandomCharacter(true);
                    showNotification({
                      id: `create-random-character`,
                      title: `Creating random character`,
                      message: `This may take a minute…`,
                      autoClose: false,
                      withCloseButton: false,
                      loading: true,
                    });
                    const character = await importFromFTC({
                      version: '1.0',
                      data: {
                        name: 'RANDOM',
                        class: 'RANDOM',
                        background: 'RANDOM',
                        ancestry: 'RANDOM',
                        level: Math.floor(Math.random() * 20) + 1,
                        content_sources: 'ALL',
                        selections: 'RANDOM',
                        items: [],
                        spells: [],
                        conditions: [],
                      },
                    });
                    hideNotification(`create-random-character`);
                    if (character) {
                      navigate(`/sheet/${character.id}`);
                    }
                    setLoadingCreateRandomCharacter(false);
                  }}
                >
                  <IconArrowsShuffle size='1.3rem' stroke={2.5} />
                </ActionIcon>
              </Tooltip>
            </Group>

            <VisuallyHidden>
              {/* Hidden file inputs that get triggered by the import menu items */}
              <FileButton
                onChange={async (file) => {
                  if (!file) return;
                  setLoadingImportCharacter(true);
                  const character = await importFromJSON(file);
                  refetch();
                  setLoadingImportCharacter(false);
                }}
                accept='application/JSON'
              >
                {(props) => (
                  <Button ref={jsonImportRef} {...props}>
                    Import from JSON
                  </Button>
                )}
              </FileButton>
              <FileButton
                onChange={async (file) => {
                  if (!file) return;
                  setLoadingImportCharacter(true);
                  const character = await importFromGUIDECHAR(file);
                  refetch();
                  setLoadingImportCharacter(false);
                }}
                accept='.guidechar'
              >
                {(props) => (
                  <Button ref={guidecharImportRef} {...props}>
                    Import from GUIDECHAR
                  </Button>
                )}
              </FileButton>
            </VisuallyHidden>
            <PathbuilderInputModal
              open={openedPathbuilderModal}
              onConfirm={async (pathbuilderId) => {
                setOpenedPathbuilderModal(false);
                setLoadingImportCharacter(true);
                const character = await importFromPathbuilder(pathbuilderId);
                refetch();
                setLoadingImportCharacter(false);
              }}
              onClose={() => setOpenedPathbuilderModal(false)}
            />
          </Group>

          {/* Mobile-only: search on its own row below the header */}
          {isPhone && (
            <Box px='md' pb='sm'>
              <TextInput
                ref={searchRef}
                style={{ flex: 1 }}
                leftSection={<IconSearch size='0.9rem' />}
                placeholder='Search characters…'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    searchRef.current?.blur();
                  }
                }}
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
                  ) : (
                    <Kbd size='xs' style={{ opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
                      /
                    </Kbd>
                  )
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
                  input: {
                    '--input-placeholder-color': theme.colors.gray[5],
                  },
                })}
              />
            </Box>
          )}
          <Divider />
          {/* Card grid — unified inside the same glass panel as the header so the
              background shows around the panel, not through a gap between two panels. */}
          <Box p='md'>
            {isLoading && (
              <Center h={200}>
                <Loader size='lg' type='bars' />
              </Center>
            )}

            {characters.length > 0 && (
              <Paginator
                h={520}
                records={characters.map((c) => (
                  // Use character id (not index) as key to avoid reconciliation bugs on sort changes
                  <CharacterCard key={c.id} character={c} reachedCharacterLimit={reachedCharacterLimit} />
                ))}
                numPerPage={isPhone ? 3 : 9}
                numInRow={isPhone ? 1 : 3}
                gap='sm'
                pagSize='md'
              />
            )}

            {/* Empty state when search yields no results */}
            {!isLoading && characters.length === 0 && searchQuery.trim() && (
              <Stack py={50} gap={5}>
                <Text ta='center' c='dimmed' fs='italic'>
                  No characters match "{searchQuery.trim()}"
                </Text>
              </Stack>
            )}

            {!isLoading && (data ?? []).length === 0 && (
              <Stack py={50} gap={10}>
                <Text ta='center' c='dimmed' fs='italic'>
                  No characters found, want to create one?
                </Text>
                <Center>
                  <Group>
                    <BlurButton
                      loading={loadingCreateZeroCharacter}
                      onClick={() => {
                        setLoadingCreateZeroCharacter(true);
                        handleCreateCharacter();
                      }}
                    >
                      Create Character
                    </BlurButton>
                  </Group>
                </Center>
              </Stack>
            )}
          </Box>
        </BlurBox>
      </Box>
    </Center>
  );
}

function CharacterCard(props: { character: Character; reachedCharacterLimit: boolean }) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const isPhone = useMediaQuery(phoneQuery());
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);

  const { hovered: hoveredCard, ref: refCard } = useHover();
  const { ref: refEdit } = useHover<HTMLAnchorElement>();

  const openConfirmDeleteModal = (character: Character) =>
    modals.openConfirmModal({
      title: <Title order={4}>Delete Character</Title>,
      children: (
        <>
          <Text size='sm'>
            Are you sure you want to delete <em>{character.name}</em>?
          </Text>
          <Text size='sm'>They'll be gone for a very, very long time.</Text>
        </>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: async () => {
        await deleteCharacter(character);
        queryClient.refetchQueries({ queryKey: ['find-character'] });
      },
    });

  return (
    <Box
      ref={refCard}
      style={{
        // Imprint styling — lighter semi-transparent panel inside the outer BlurBox,
        // matching the character sheet's inner panel design
        position: 'relative',
        backgroundColor: hoveredCard ? IMPRINT_BG_COLOR_2 : IMPRINT_BG_COLOR,
        border: `1px solid ${IMPRINT_BORDER_COLOR}`,
        borderRadius: theme.radius.md,
        // Subtle base shadow gives the card a "lifted" feel even at rest;
        // hover then escalates to a bigger lift + shadow for clear feedback.
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.18)',
        cursor: isPlayable(props.character) ? 'pointer' : undefined,
        transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
        ...(hoveredCard
          ? {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)',
            }
          : {}),
      }}
      onClick={(e) => {
        if (!isPlayable(props.character)) return;
        e.stopPropagation();
        e.preventDefault();
        navigate(`/sheet/${props.character.id}`);
      }}
    >
      <LoadingOverlay visible={loading} />
      {/* Hidden anchor for accessibility — lets search engines and screen readers
          discover the sheet link without affecting visual layout */}
      {/* Hidden anchor for SEO / screen readers — pointer events disabled so it
          doesn't intercept hover or click on the card itself */}
      <Box
        component='a'
        href={isPlayable(props.character) ? `/sheet/${props.character.id}` : undefined}
        style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', pointerEvents: 'none' }}
      ></Box>
      <Box w='100%' pt='sm' pb='xs' px='sm' style={{ position: 'relative' }}>
        <CharacterInfo character={props.character} nameCutOff={22} />
      </Box>
      {/* Action row — Edit navigates to builder, menu holds secondary actions */}
      <Group gap={5} pb='xs' px='sm'>
        <Button
          size='xs'
          variant='light'
          color={isPlayable(props.character) ? 'gray' : 'yellow'}
          radius='xl'
          ref={refEdit}
          style={{ flex: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(`/builder/${props.character.id}`);
          }}
          component='a'
          href={`/builder/${props.character.id}`}
        >
          {isPlayable(props.character) ? 'Edit' : 'Continue Building'}
        </Button>
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
            <Menu.Label>
              <Group justify='space-between'>
                <Box>Options</Box>
                <Text fz={10} c='dimmed'>
                  # {props.character.id}
                </Text>
              </Group>
            </Menu.Label>
            <Menu.Item
              disabled={props.reachedCharacterLimit}
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={async (e) => {
                e.stopPropagation();
                const newCharacter = await createCharacterCopy(props.character);
                queryClient.refetchQueries({ queryKey: ['find-character'] });
              }}
            >
              Create Copy
            </Menu.Item>
            <Menu.Item
              leftSection={<IconAlignBoxLeftMiddle style={{ width: rem(14), height: rem(14) }} />}
              onClick={async (e) => {
                e.stopPropagation();
                window.open(`/stat-block/character/${props.character.id}`, '_blank');
              }}
            >
              Open Stat Block
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCodeDots style={{ width: rem(14), height: rem(14) }} />}
              onClick={async (e) => {
                e.stopPropagation();
                setLoading(true);
                await exportToJSON(props.character);
                setLoading(false);
              }}
            >
              Export to JSON
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileTypePdf style={{ width: rem(14), height: rem(14) }} />}
              onClick={async (e) => {
                e.stopPropagation();
                setLoading(true);
                await exportToPDF(props.character);
                setLoading(false);
              }}
            >
              Export to PDF
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                openConfirmDeleteModal(props.character);
              }}
            >
              Delete Character
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Box>
  );
}

async function createCharacter() {
  // Select random background image
  const images = getAllBackgroundImages();
  const randomImageUrl = images[Math.floor(Math.random() * images.length)]?.url;

  // Create character
  const result = await makeRequest<Character>('create-character', {
    meta_data: {
      reset_hp: true,
    },
    details: { background_image_url: randomImageUrl },
  });
  return result;
}

async function deleteCharacter(character: Character) {
  showNotification({
    id: `delete-character-${character.id}`,
    title: `Deleting "${character.name}"`,
    message: 'Please wait...',
    autoClose: false,
    withCloseButton: false,
    loading: true,
  });

  const result = await makeRequest('delete-content', {
    id: character.id,
    type: 'character',
  });

  hideNotification(`delete-character-${character.id}`);

  return result;
}

async function createCharacterCopy(character: Character) {
  showNotification({
    id: `copy-character-${character.id}`,
    title: `Creating copy of "${character.name}"`,
    message: 'Please wait...',
    autoClose: false,
    withCloseButton: false,
    loading: true,
  });

  // Don't include the id, so that the backend will generate a new one
  const copy = {
    ...character,
    id: undefined,
    name: `(Copy) ${character.name}`,
    roll_history: undefined, // not needed
  };

  const result = await makeRequest<Character>('create-character', copy);

  hideNotification(`copy-character-${character.id}`);

  return result;
}
