import { generateNames } from '@ai/fantasygen-dev/name-controller';
import { characterState } from '@atoms/characterAtoms';
import { LinksGroup } from '@common/LinksGroup';
import { GUIDE_BLUE } from '@constants/data';
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
  PasswordInput,
  Image,
  Divider,
  Paper,
  ScrollArea,
  ColorInput,
  HoverCard,
} from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { modals, openContextModal } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
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
  IconArrowRight,
  IconUsers,
  IconLogin2,
  IconUserPlus,
  IconUsersPlus,
  IconPhoto,
} from '@tabler/icons-react';
import { Character, ContentSource } from '@typing/content';
import { uploadImage } from '@upload/image-upload';
import { getAllBackgroundImages } from '@utils/background-images';
import { getAllPortraitImages } from '@utils/portrait-images';
import useRefresh from '@utils/use-refresh';
import * as _ from 'lodash-es';
import { useState } from 'react';
import { useRecoilState } from 'recoil';
import FantasyGen_dev from '@assets/images/fantasygen_dev.png';
import { useQuery } from '@tanstack/react-query';
import { fetchContentSources } from '@content/content-store';

export default function CharBuilderHome(props: { pageHeight: number }) {
  const theme = useMantineTheme();

  const { ref, height } = useElementSize();
  const topGap = 30;

  const [character, setCharacter] = useRecoilState(characterState);
  const [loadingGenerateName, setLoadingGenerateName] = useState(false);
  const [displayNameInput, refreshNameInput] = useRefresh();

  const { data: fetchedBooks } = useQuery({
    queryKey: [`get-content-sources`],
    queryFn: async () => {
      return await fetchContentSources({ ids: 'all' });
    },
  });
  const books = fetchedBooks ?? [];

  const openConfirmLevelChangeModal = (oldLevel: number, newLevel: number) =>
    modals.openConfirmModal({
      title: (
        <Title order={4}>
          Decrease Level from {oldLevel} → {newLevel}
        </Title>
      ),
      children: (
        <Text size='sm'>
          Are you sure you want to decrease your character's level? Any selections you've made at levels higher than the
          new level will be erased.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => {
        setCharacter((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            level: newLevel,
          };
        });
      },
    });

  const hasBookEnabled = (bookId: number) => {
    return character?.content_sources?.enabled?.includes(bookId);
  };

  const setBookEnabled = (bookId: number, enabled: boolean) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content_sources: {
          ...prev.content_sources,
          enabled: enabled
            ? _.uniq([...(prev.content_sources?.enabled ?? []), bookId])
            : prev.content_sources?.enabled?.filter((id: number) => id !== bookId),
        },
      };
    });
  };

  const iconStyle = { width: rem(12), height: rem(12) };

  return (
    <Stack gap={topGap}>
      <Group justify='center' ref={ref} wrap='nowrap'>
        <Stack>
          <Box>
            <Group align='flex-end' wrap='nowrap'>
              <UnstyledButton
                onClick={() => {
                  openContextModal({
                    modal: 'selectImage',
                    title: <Title order={3}>Select Portrait</Title>,
                    innerProps: {
                      options: getAllPortraitImages(),
                      onSelect: (option) => {
                        setCharacter((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            details: {
                              ...prev.details,
                              image_url: prev.details?.image_url === option.url ? undefined : option.url,
                            },
                          };
                        });
                      },
                      category: 'portraits',
                    },
                  });
                }}
              >
                <Avatar
                  src={character?.details?.image_url}
                  alt='Character Portrait'
                  size='40'
                  radius='xl'
                  variant='transparent'
                  color='dark.3'
                  bg={theme.colors.dark[6]}
                >
                  <IconUserCircle size='1.5rem' stroke={1.5} />
                </Avatar>
              </UnstyledButton>
              {displayNameInput && (
                <TextInput
                  label='Name'
                  placeholder='Unknown Wanderer'
                  defaultValue={character?.name === 'Unknown Wanderer' ? '' : character?.name}
                  onChange={(e) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        name: e.target.value,
                      };
                    });
                  }}
                  w={220}
                  rightSection={
                    <HoverCard width={280} shadow='md' openDelay={750}>
                      <HoverCard.Target>
                        <ActionIcon
                          size={22}
                          loading={loadingGenerateName}
                          radius='xl'
                          color='dark'
                          variant='subtle'
                          onClick={async () => {
                            if (!character) return;
                            setLoadingGenerateName(true);
                            const names = await generateNames(character, 1);
                            setLoadingGenerateName(false);
                            if (names.length > 0) {
                              const name = names[0].replace(/\*/g, '');
                              setCharacter((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  name: name,
                                };
                              });
                              refreshNameInput();
                            } else {
                              showNotification({
                                title: 'Failed to Generate Name',
                                message: 'Please try again.',
                                color: 'red',
                                icon: null,
                                autoClose: 3000,
                              });
                            }
                          }}
                        >
                          <IconRefreshDot style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
                        </ActionIcon>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Group gap={5} wrap='nowrap' align='center'>
                          <IconRefreshDot size='1rem' stroke={1.5} />
                          <Title order={5}>Random Name Generator</Title>
                        </Group>
                        <Text size='sm'>
                          Produces a random name and title based on your character stats.
                          {character?.details?.ancestry?.name && (
                            <Text>
                              <Text fw='bold' span>
                                Ancestry:
                              </Text>{' '}
                              {character?.details?.ancestry?.name}
                            </Text>
                          )}
                          {character?.details?.background?.name && (
                            <Text>
                              <Text fw='bold' span>
                                Background:
                              </Text>{' '}
                              {character?.details?.background?.name}
                            </Text>
                          )}
                          {character?.details?.class?.name && (
                            <Text>
                              <Text fw='bold' span>
                                Class:
                              </Text>{' '}
                              {character?.details?.class?.name}
                            </Text>
                          )}
                          {!character?.details?.class?.name &&
                            !character?.details?.background?.name &&
                            !character?.details?.ancestry?.name && (
                              <Text>
                                <Text fw='bold' span>
                                  None Set:
                                </Text>{' '}
                                Will be a random name
                              </Text>
                            )}
                        </Text>
                        <Divider mt={10} mb={5} />
                        <Group align='flex-end' justify='flex-end' gap={5} wrap='nowrap'>
                          <Text fz='xs' fw={600}>
                            Powered by
                          </Text>
                          <Image
                            onClick={() => window.open('https://fantasygen.dev/')}
                            style={{ cursor: 'pointer' }}
                            radius='md'
                            w={160}
                            src={FantasyGen_dev}
                          />
                        </Group>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  }
                />
              )}
              <Select
                label='Level'
                data={Array.from({ length: 20 }, (_, i) => (i + 1).toString())}
                w={70}
                value={`${character?.level}`}
                onChange={(value) => {
                  const oldLevel = character?.level ?? 0;
                  const newLevel = parseInt(value ?? '1');

                  if (oldLevel > newLevel) {
                    openConfirmLevelChangeModal(oldLevel, newLevel);
                  } else {
                    setCharacter((prev) => {
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
        </Stack>
      </Group>
      <Group gap={10} align='flex-start' wrap='nowrap' h={props.pageHeight - height - topGap}>
        <Box style={{ flexBasis: '65%' }} h='100%'>
          <Paper
            shadow='sm'
            h='100%'
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.13)',
            }}
          >
            <ScrollArea h='100%' scrollbars='y'>
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
                    Options
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value='books'>
                  <Stack gap={0} pt='sm'>
                    <LinksGroup
                      icon={IconBook2}
                      label={'Core'}
                      links={books
                        .filter((book) => book.group === 'core')
                        .map((book) => ({
                          label: book.name,
                          id: book.id,
                          url: book.url,
                          enabled: hasBookEnabled(book.id),
                        }))}
                      onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                      onEnableAll={() => {
                        books
                          .filter((book) => book.group === 'core')
                          .forEach((book) => {
                            setBookEnabled(book.id, true);
                          });
                      }}
                    />
                    <LinksGroup
                      icon={IconWorld}
                      label={'Lost Omens'}
                      links={books
                        .filter((book) => book.group === 'lost-omens')
                        .map((book) => ({
                          label: book.name,
                          id: book.id,
                          url: book.url,
                          enabled: hasBookEnabled(book.id),
                        }))}
                      onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                      onEnableAll={() => {
                        books
                          .filter((book) => book.group === 'lost-omens')
                          .forEach((book) => {
                            setBookEnabled(book.id, true);
                          });
                      }}
                    />
                    <LinksGroup
                      icon={IconMap}
                      label={'Adventure Paths'}
                      links={books
                        .filter((book) => book.group === 'adventure-path')
                        .map((book) => ({
                          label: book.name,
                          id: book.id,
                          url: book.url,
                          enabled: hasBookEnabled(book.id),
                        }))}
                      onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                      onEnableAll={() => {
                        books
                          .filter((book) => book.group === 'adventure-path')
                          .forEach((book) => {
                            setBookEnabled(book.id, true);
                          });
                      }}
                    />
                    <LinksGroup
                      icon={IconBrandSafari}
                      label={'Standalone Adventures'}
                      links={books
                        .filter((book) => book.group === 'standalone-adventure')
                        .map((book) => ({
                          label: book.name,
                          id: book.id,
                          url: book.url,
                          enabled: hasBookEnabled(book.id),
                        }))}
                      onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                      onEnableAll={() => {
                        books
                          .filter((book) => book.group === 'standalone-adventure')
                          .forEach((book) => {
                            setBookEnabled(book.id, true);
                          });
                      }}
                    />
                    <LinksGroup
                      icon={IconDots}
                      label={'Miscellaneous'}
                      links={books
                        .filter((book) => book.group === 'misc')
                        .map((book) => ({
                          label: book.name,
                          id: book.id,
                          url: book.url,
                          enabled: hasBookEnabled(book.id),
                        }))}
                      onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                      onEnableAll={() => {
                        books
                          .filter((book) => book.group === 'misc')
                          .forEach((book) => {
                            setBookEnabled(book.id, true);
                          });
                      }}
                    />
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </ScrollArea>
          </Paper>
        </Box>
        <Box style={{ flexBasis: 'calc(35% - 10px)' }} h='100%'>
          <Paper
            shadow='sm'
            p='sm'
            h='100%'
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.13)',
            }}
          >
            <Stack>
              <PasswordInput
                radius='xl'
                size='xs'
                label={<Text fz='sm'>Campaign</Text>}
                placeholder='Enter Join Key'
                rightSectionWidth={28}
                leftSection={<IconUsers style={{ width: rem(12), height: rem(12) }} stroke={1.5} />}
                rightSection={
                  <ActionIcon size={22} radius='xl' color={theme.primaryColor} variant='light'>
                    <IconUsersPlus style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
                  </ActionIcon>
                }
              />
              <ColorInput
                radius='xl'
                size='xs'
                label={<Text fz='sm'>Color Theme</Text>}
                placeholder='Character Color Theme'
                defaultValue={character?.details?.sheet_theme?.color || GUIDE_BLUE}
                swatches={[
                  '#25262b',
                  '#868e96',
                  '#fa5252',
                  '#e64980',
                  '#be4bdb',
                  '#8d69f5',
                  '#577deb',
                  GUIDE_BLUE,
                  '#15aabf',
                  '#12b886',
                ]}
                onChange={(color) => {
                  setCharacter((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      details: {
                        ...prev.details,
                        sheet_theme: {
                          ...prev.details?.sheet_theme,
                          color: color,
                        },
                      },
                    };
                  });
                }}
              />
              <Box>
                <Text fz='sm'>Background Artwork</Text>
                <UnstyledButton
                  w={'50%'}
                  onClick={() => {
                    openContextModal({
                      modal: 'selectImage',
                      title: <Title order={3}>Select Background</Title>,
                      innerProps: {
                        options: getAllBackgroundImages(),
                        onSelect: (option) => {
                          setCharacter((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              details: {
                                ...prev.details,
                                background_image_url: option.url,
                              },
                            };
                          });
                        },
                        category: 'backgrounds',
                      },
                    });
                  }}
                >
                  <Image
                    radius='md'
                    h='auto'
                    fit='contain'
                    src={character?.details?.background_image_url}
                    fallbackSrc='/src/assets/images/backgrounds/placeholder.jpeg'
                  />
                </UnstyledButton>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Group>
    </Stack>
  );
}
