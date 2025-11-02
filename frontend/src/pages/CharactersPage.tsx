import { characterState } from '@atoms/characterAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterInfo } from '@common/CharacterInfo';
import { CHARACTER_SLOT_CAP, ICON_BG_COLOR_HOVER } from '@constants/data';
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
  Loader,
  LoadingOverlay,
  Menu,
  Stack,
  Text,
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
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Character } from '@typing/content';
import { isPlayable } from '@utils/character';
import { setPageTitle } from '@utils/document-change';
import { phoneQuery } from '@utils/mobile-responsive';
import { hasPatreonAccess } from '@utils/patreon';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';

const BOX_SHADOW = '0 0 5px 2px rgb(255 255 255 / 30%)';

export function Component() {
  setPageTitle(`Characters`);
  const session = useRecoilValue(sessionState);

  const {
    data: characters,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [`find-character`],
    queryFn: async () => {
      return await makeRequest<Character[]>('find-character', {
        user_id: session?.user.id,
      });
    },
    enabled: !!session,
  });

  const [_character, setCharacter] = useRecoilState(characterState);
  const navigate = useNavigate();
  const [loadingCreateCharacter, setLoadingCreateCharacter] = useState(false);
  const [loadingImportCharacter, setLoadingImportCharacter] = useState(false);
  const [loadingCreateZeroCharacter, setLoadingCreateZeroCharacter] = useState(false);
  const [loadingCreateRandomCharacter, setLoadingCreateRandomCharacter] = useState(false);

  const jsonImportRef = useRef<HTMLButtonElement>(null);
  const guidecharImportRef = useRef<HTMLButtonElement>(null);
  const [openedPathbuilderModal, setOpenedPathbuilderModal] = useState(false);

  const forceUpdate = useForceUpdate();
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
    (characters?.length ?? 0) >= CHARACTER_SLOT_CAP && !hasPatreonAccess(getCachedPublicUser(), 2);

  return (
    <Center>
      <Box maw={875} w='100%'>
        <Box>
          <Group px='sm' justify='space-between' wrap='nowrap'>
            <Box>
              <Title order={1} c='gray.0'>
                Characters
                <Text pl={10} fz='xl' fw={500} c='gray.2' span>
                  {characters && reachedCharacterLimit ? `(${characters.length}/${CHARACTER_SLOT_CAP})` : ''}
                </Text>
              </Title>
            </Box>
            <Group gap={15} wrap='nowrap'>
              <Tooltip label='Create Character' openDelay={750}>
                <ActionIcon
                  disabled={reachedCharacterLimit}
                  style={{
                    backgroundColor: reachedCharacterLimit ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(6px)',
                    boxShadow: BOX_SHADOW,
                  }}
                  loading={loadingCreateCharacter}
                  variant='outline'
                  color='gray.0'
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
                  <Tooltip label='Import Character' openDelay={750}>
                    <ActionIcon
                      disabled={reachedCharacterLimit}
                      style={{
                        backgroundColor: reachedCharacterLimit ? 'rgba(0, 0, 0, 0.05)' : undefined,
                        backdropFilter: 'blur(6px)',
                        boxShadow: BOX_SHADOW,
                      }}
                      loading={loadingImportCharacter}
                      variant='outline'
                      color='gray.0'
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
              <Tooltip label='Random Character' openDelay={750}>
                <ActionIcon
                  disabled={reachedCharacterLimit}
                  style={{
                    backgroundColor: reachedCharacterLimit ? 'rgba(0, 0, 0, 0.05)' : undefined,
                    backdropFilter: 'blur(6px)',
                    boxShadow: BOX_SHADOW,
                  }}
                  loading={loadingCreateRandomCharacter}
                  variant='outline'
                  color='gray.0'
                  size='lg'
                  radius='lg'
                  aria-label='Create Character'
                  onClick={async () => {
                    setLoadingCreateRandomCharacter(true);
                    showNotification({
                      id: `create-random-character`,
                      title: `Creating random character`,
                      message: `This may take a minute...`,
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
              {/* This is a hack to get the FileButton to work with the Menu component */}
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
          {(characters ?? [])
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((character, index) => (
              <CharacterCard key={index} character={character} reachedCharacterLimit={reachedCharacterLimit} />
            ))}
          {!isLoading && (characters ?? []).length === 0 && (
            <BlurBox w={'100%'} h={200}>
              <Stack mt={50} gap={10}>
                <Text ta='center' c='gray.5' fs='italic'>
                  No characters found, want to create one?
                </Text>
                <Center>
                  <Box>
                    <BlurButton
                      loading={loadingCreateZeroCharacter}
                      onClick={() => {
                        setLoadingCreateZeroCharacter(true);
                        handleCreateCharacter();
                      }}
                    >
                      Create Character
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

function CharacterCard(props: { character: Character; reachedCharacterLimit: boolean }) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const isPhone = useMediaQuery(phoneQuery());
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);

  const { hovered: hoveredMain, ref: refMain } = useHover();
  const { hovered: hoveredEdit, ref: refEdit } = useHover<HTMLAnchorElement>();
  const { hovered: hoveredOptions, ref: refOptions } = useHover<HTMLButtonElement>();

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
    <BlurBox blur={10} w={isPhone ? '90dvw' : undefined}>
      <LoadingOverlay visible={loading} />
      <Box
        w='100%'
        pt='xs'
        pb={5}
        px='xs'
        ref={refMain}
        style={{
          cursor: isPlayable(props.character) ? 'pointer' : undefined,
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          backgroundColor: hoveredMain && isPlayable(props.character) ? 'rgba(0, 0, 0, 0.15)' : undefined,
          position: 'relative',
        }}
        onClick={(e) => {
          if (!isPlayable(props.character)) return;
          e.stopPropagation();
          e.preventDefault();
          navigate(`/sheet/${props.character.id}`);
        }}
      >
        <Box
          component='a'
          href={isPlayable(props.character) ? `/sheet/${props.character.id}` : undefined}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
          }}
        ></Box>
        <CharacterInfo character={props.character} />
      </Box>
      <Group gap='xs' pb='xs' px='xs'>
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
                  # {props.character.id}
                </Text>
              </Group>
            </Menu.Label>
            <Menu.Item
              disabled={props.reachedCharacterLimit}
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={async () => {
                const newCharacter = await createCharacterCopy(props.character);
                queryClient.refetchQueries({ queryKey: ['find-character'] });
              }}
            >
              Create Copy
            </Menu.Item>
            <Menu.Item
              leftSection={<IconAlignBoxLeftMiddle style={{ width: rem(14), height: rem(14) }} />}
              onClick={async () => {
                window.open(`/stat-block/character/${props.character.id}`, '_blank');
              }}
            >
              Open Stat Block
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCodeDots style={{ width: rem(14), height: rem(14) }} />}
              onClick={async () => {
                setLoading(true);
                await exportToJSON(props.character);
                setLoading(false);
              }}
            >
              Export to JSON
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileTypePdf style={{ width: rem(14), height: rem(14) }} />}
              onClick={async () => {
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
              onClick={() => openConfirmDeleteModal(props.character)}
            >
              Delete Character
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </BlurBox>
  );
}

async function createCharacter() {
  const result = await makeRequest<Character>('create-character', {});
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
