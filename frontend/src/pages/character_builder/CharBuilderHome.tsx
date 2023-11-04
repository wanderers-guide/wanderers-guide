import { LinksGroup } from '@common/LinksGroup';
import {
  Stack,
  Group,
  Box,
  Avatar,
  Title,
  Text,
  TextInput,
  ActionIcon,
  rem,
  Select,
  Tabs,
  useMantineTheme,
  FileButton,
  Button,
  UnstyledButton,
} from '@mantine/core';
import { modals, openContextModal } from '@mantine/modals';
import { makeRequest } from '@requests/request-manager';
import {
  IconUserCircle,
  IconRefreshDot,
  IconBooks,
  IconAsset,
  IconVocabulary,
  IconSettings,
  IconBook2,
  IconWorld,
  IconMap,
  IconBrandSafari,
  IconDots,
} from '@tabler/icons-react';
import { Character, ContentSource } from '@typing/content';
import { uploadImage } from '@upload/image-upload';

export default function CharBuilderHome(props: {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character | undefined>>;
  books: ContentSource[];
}) {
  const theme = useMantineTheme();

  const openConfirmLevelChangeModal = (oldLevel: number, newLevel: number) =>
    modals.openConfirmModal({
      title: (
        <Title order={4}>
          Decrease Level from {oldLevel} → {newLevel}
        </Title>
      ),
      children: (
        <Text size='sm'>
          Are you sure you want to decrease your character's level? Any selections you've made at
          levels higher than the new level will be erased.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => {
        props.setCharacter((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            level: newLevel,
          };
        });
      },
    });

  const hasBookEnabled = (bookId: number) => {
    return props.character.content_sources?.enabled?.includes(bookId);
  };

  const setBookEnabled = (bookId: number, enabled: boolean) => {
    props.setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content_sources: {
          ...prev.content_sources,
          enabled: enabled
            ? [...(prev.content_sources?.enabled ?? []), bookId]
            : prev.content_sources?.enabled?.filter((id: number) => id !== bookId),
        },
      };
    });
  };

  const iconStyle = { width: rem(12), height: rem(12) };

  return (
    <Stack>
      <Group justify='center'>
        <Stack>
          <Box>
            <Group align='flex-end'>
              <FileButton
                onChange={async (file) => {
                  // Upload file to server
                  let path = '';
                  if (file) {
                    path = await uploadImage(file, 'portraits');
                  }

                  // Update character portrait to image URL
                  props.setCharacter((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      details: {
                        ...prev.details,
                        image_url: path,
                      },
                    };
                  });
                }}
                accept='image/png,image/jpeg,image/jpg,image/webp'
              >
                {(subProps) => (
                  <UnstyledButton {...subProps}>
                    <Avatar
                      src={props.character.details?.image_url}
                      alt='Character Portrait'
                      size='35'
                      radius='xl'
                      variant='transparent'
                      color='dark.3'
                      bg={theme.colors.dark[6]}
                      onClick={() => {
                        // openContextModal({
                        //   modal: 'updateCharacterPortrait',
                        //   title: <Title order={4}>Update Character Portrait</Title>,
                        //   innerProps: {
                        //     character: props.character,
                        //     updatePortrait: (imageURL: string) => {
                        //       props.setCharacter((prev) => {
                        //         if (!prev) return prev;
                        //         return {
                        //           ...prev,
                        //           details: {
                        //             ...prev.details,
                        //             image_url: imageURL,
                        //           },
                        //         };
                        //       });
                        //     },
                        //   },
                        // });
                      }}
                    >
                      <IconUserCircle size='1.5rem' stroke={1.5} />
                    </Avatar>
                  </UnstyledButton>
                )}
              </FileButton>
              <TextInput
                label='Name'
                placeholder='Unknown Wanderer'
                defaultValue={props.character.name}
                onChange={(e) => {
                  props.setCharacter((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      name: e.target.value,
                    };
                  });
                }}
                w={220}
                rightSection={
                  <ActionIcon size={22} radius='xl' color='dark' variant='subtle'>
                    <IconRefreshDot style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
                  </ActionIcon>
                }
              />
              <Select
                label='Level'
                data={Array.from({ length: 20 }, (_, i) => (i + 1).toString())}
                w={70}
                value={props.character.level.toString()}
                onChange={(value) => {
                  const oldLevel = props.character.level;
                  const newLevel = parseInt(value ?? '1');

                  if (oldLevel > newLevel) {
                    openConfirmLevelChangeModal(oldLevel, newLevel);
                  } else {
                    props.setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        level: newLevel,
                      };
                    });
                  }
                }}
              />
            </Group>
          </Box>
          {/* <Box>
                          <Group justify='center'>
                            <PasswordInput
                              radius='xl'
                              disabled
                              size='xs'
                              w={200}
                              placeholder='Campaign Join Key'
                              rightSectionWidth={28}
                              leftSection={
                                <IconUsers
                                  style={{ width: rem(12), height: rem(12) }}
                                  stroke={1.5}
                                />
                              }
                              rightSection={
                                <ActionIcon
                                  disabled
                                  size={22}
                                  radius='xl'
                                  color={theme.primaryColor}
                                  variant='light'
                                >
                                  <IconArrowRight
                                    style={{ width: rem(18), height: rem(18) }}
                                    stroke={1.5}
                                  />
                                </ActionIcon>
                              }
                            />
                          </Group>
                        </Box> */}
        </Stack>
      </Group>
      <Tabs defaultValue='books'>
        <Tabs.List>
          <Tabs.Tab value='books' leftSection={<IconBooks style={iconStyle} />}>
            Books
          </Tabs.Tab>
          <Tabs.Tab value='homebrew' leftSection={<IconAsset style={iconStyle} />}>
            Homebrew
          </Tabs.Tab>
          <Tabs.Tab value='variants' leftSection={<IconVocabulary style={iconStyle} />}>
            Variant Rules
          </Tabs.Tab>
          <Tabs.Tab value='options' leftSection={<IconSettings style={iconStyle} />}>
            Misc Options
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='books'>
          <Stack gap={0} pt='sm'>
            <LinksGroup
              icon={IconBook2}
              label={'Core'}
              links={props.books
                .filter((book) => book.group === 'core')
                .map((book) => ({
                  label: book.name,
                  id: book.id,
                  url: book.url,
                  enabled: hasBookEnabled(book.id),
                }))}
              onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
              onEnableAll={() => {
                props.books
                  .filter((book) => book.group === 'core')
                  .forEach((book) => {
                    setBookEnabled(book.id, true);
                  });
              }}
            />
            <LinksGroup
              icon={IconWorld}
              label={'Lost Omens'}
              links={props.books
                .filter((book) => book.group === 'lost-omens')
                .map((book) => ({
                  label: book.name,
                  id: book.id,
                  url: book.url,
                  enabled: hasBookEnabled(book.id),
                }))}
              onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
              onEnableAll={() => {
                props.books
                  .filter((book) => book.group === 'lost-omens')
                  .forEach((book) => {
                    setBookEnabled(book.id, true);
                  });
              }}
            />
            <LinksGroup
              icon={IconMap}
              label={'Adventure Paths'}
              links={props.books
                .filter((book) => book.group === 'adventure-path')
                .map((book) => ({
                  label: book.name,
                  id: book.id,
                  url: book.url,
                  enabled: hasBookEnabled(book.id),
                }))}
              onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
              onEnableAll={() => {
                props.books
                  .filter((book) => book.group === 'adventure-path')
                  .forEach((book) => {
                    setBookEnabled(book.id, true);
                  });
              }}
            />
            <LinksGroup
              icon={IconBrandSafari}
              label={'Standalone Adventures'}
              links={props.books
                .filter((book) => book.group === 'standalone-adventure')
                .map((book) => ({
                  label: book.name,
                  id: book.id,
                  url: book.url,
                  enabled: hasBookEnabled(book.id),
                }))}
              onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
              onEnableAll={() => {
                props.books
                  .filter((book) => book.group === 'standalone-adventure')
                  .forEach((book) => {
                    setBookEnabled(book.id, true);
                  });
              }}
            />
            <LinksGroup
              icon={IconDots}
              label={'Miscellaneous'}
              links={props.books
                .filter((book) => book.group === 'misc')
                .map((book) => ({
                  label: book.name,
                  id: book.id,
                  url: book.url,
                  enabled: hasBookEnabled(book.id),
                }))}
              onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
              onEnableAll={() => {
                props.books
                  .filter((book) => book.group === 'misc')
                  .forEach((book) => {
                    setBookEnabled(book.id, true);
                  });
              }}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value='messages'>Messages tab content</Tabs.Panel>

        <Tabs.Panel value='settings'>Settings tab content</Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
