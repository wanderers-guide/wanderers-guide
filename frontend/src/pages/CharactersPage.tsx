import { characterState } from '@atoms/characterAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterInfo } from '@common/CharacterInfo';
import { ICON_BG_COLOR_HOVER } from '@constants/data';
import exportToJSON from '@export/export-to-json';
import exportToPDF from '@export/export-to-pdf';
import importFromGUIDECHAR from '@import/guidechar/import-from-guidechar';
import importFromJSON from '@import/json/import-from-json';
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
import { useHover } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { hideNotification, showNotification } from '@mantine/notifications';
import { makeRequest } from '@requests/request-manager';
import {
  IconArchive,
  IconCodeDots,
  IconCopy,
  IconDots,
  IconFileTypePdf,
  IconTrash,
  IconUpload,
  IconUserPlus,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Character } from '@typing/content';
import { isPlayable } from '@utils/character';
import { setPageTitle } from '@utils/document-change';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';

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

  const jsonImportRef = useRef<HTMLButtonElement>(null);
  const guidecharImportRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCharacter(null);
  }, []);

  const CHARACTER_LIMIT = 3;

  const [loadingCreateCharacter, setLoadingCreateCharacter] = useState(false);
  const handleCreateCharacter = async () => {
    setLoadingCreateCharacter(true);
    const character = await createCharacter();
    if (character) {
      navigate(`/builder/${character.id}`);
    }
    setLoadingCreateCharacter(false);
  };

  return (
    <Center>
      <Box maw={875} w='100%'>
        <Box>
          <Group px='sm' justify='space-between' wrap='nowrap'>
            <Box>
              <Title order={1} c='gray.0'>
                Characters
                <Text pl={10} fz='xl' fw={500} c='gray.2' span>
                  {characters && CHARACTER_LIMIT ? `(${characters.length}/${CHARACTER_LIMIT})` : ''}
                </Text>
              </Title>
            </Box>
            <Group gap={5} wrap='nowrap'>
              <Tooltip label='Create Character' openDelay={750}>
                <ActionIcon
                  variant='subtle'
                  color='gray.0'
                  size='xl'
                  radius='xl'
                  aria-label='Create Character'
                  onClick={handleCreateCharacter}
                >
                  <IconUserPlus style={{ width: '70%', height: '70%' }} stroke={2.5} />
                </ActionIcon>
              </Tooltip>
              <Menu shadow='md' width={220} withArrow withinPortal>
                <Menu.Target>
                  <Tooltip label='Import Character' openDelay={750}>
                    <ActionIcon variant='subtle' color='gray.0' size='xl' radius='xl' aria-label='Import Character'>
                      <IconUpload style={{ width: '70%', height: '70%' }} stroke={2.5} />
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
                    leftSection={<IconArchive style={{ width: rem(14), height: rem(14) }} />}
                    onClick={() => {
                      guidecharImportRef.current?.click();
                    }}
                  >
                    Import from GUIDECHAR
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

            <VisuallyHidden>
              {/* This is a hack to get the FileButton to work with the Menu component */}
              <FileButton
                onChange={async (file) => {
                  if (!file) return;
                  const character = await importFromJSON(file);
                  refetch();
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
                  const character = await importFromGUIDECHAR(file);
                  refetch();
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
          {(characters ?? []).map((character, index) => (
            <CharacterCard key={index} character={character} />
          ))}
          {!isLoading && (characters ?? []).length === 0 && (
            <BlurBox w={'100%'} h={200}>
              <Stack mt={50} gap={10}>
                <Text ta='center' c='gray.5' fs='italic'>
                  No characters found, want to create one?
                </Text>
                <Center>
                  <Box>
                    <BlurButton loading={loadingCreateCharacter} onClick={handleCreateCharacter}>
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

function CharacterCard(props: { character: Character }) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
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
        queryClient.refetchQueries(['find-character']);
      },
    });

  return (
    <BlurBox blur={10}>
      <LoadingOverlay visible={loading} />
      <Box
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
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={async () => {
                const newCharacter = await createCharacterCopy(props.character);
                queryClient.refetchQueries(['find-character']);
              }}
            >
              Create Copy
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
