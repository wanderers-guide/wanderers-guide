import { generateNames } from '@ai/fantasygen-dev/name-controller';
import { characterState } from '@atoms/characterAtoms';
import { LinkSwitch, LinksGroup } from '@common/LinksGroup';
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
import { useElementSize, useMediaQuery } from '@mantine/hooks';
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
  IconArchive,
  IconNorthStar,
  IconMoonStars,
  IconRocket,
  IconSword,
  IconServer,
  IconFlagPlus,
  IconKey,
} from '@tabler/icons-react';
import { Character, ContentSource } from '@typing/content';
import { uploadImage } from '@upload/image-upload';
import { getAllBackgroundImages } from '@utils/background-images';
import { getAllPortraitImages } from '@utils/portrait-images';
import useRefresh from '@utils/use-refresh';
import * as _ from 'lodash-es';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import FantasyGen_dev from '@assets/images/fantasygen_dev.png';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { defineDefaultSources, fetchContentSources, resetContentStore } from '@content/content-store';
import { displayComingSoon, displayPatronOnly } from '@utils/notifications';
import { getCachedPublicUser } from '@auth/user-manager';
import BlurButton from '@common/BlurButton';
import CustomOperationsModal from '@modals/CustomOperationsModal';
import { hasPatreonAccess } from '@utils/patreon';
import { phoneQuery } from '@utils/mobile-responsive';

export default function CharBuilderHome(props: { pageHeight: number }) {
  const theme = useMantineTheme();

  const { ref, height } = useElementSize();
  const topGap = 30;
  const isPhone = useMediaQuery(phoneQuery());

  const queryClient = useQueryClient();

  const [character, setCharacter] = useRecoilState(characterState);
  const [loadingGenerateName, setLoadingGenerateName] = useState(false);
  const [displayNameInput, refreshNameInput] = useRefresh();

  const [openedOperations, setOpenedOperations] = useState(false);

  const { data: fetchedBooks, refetch } = useQuery({
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
            meta_data: {
              ...prev.meta_data,
              reset_hp: true,
            },
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
    setTimeout(() => {
      // Refresh data to repopulate with new book content
      resetContentStore();
      defineDefaultSources(character?.content_sources?.enabled ?? []);
      refetch();
      queryClient.invalidateQueries([`find-character-${character?.id}`]);
      queryClient.invalidateQueries([`find-content-${character?.id}`]);
    }, 500);
  };

  const iconStyle = { width: rem(12), height: rem(12) };

  const getOptionsSection = () => (
    <Box h='100%'>
      <Paper
        shadow='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
        }}
      >
        <ScrollArea h='100%' scrollbars='y'>
          <Tabs defaultValue='books'>
            <Tabs.List grow>
              <Tabs.Tab value='books' leftSection={isPhone ? undefined : <IconBooks style={iconStyle} />}>
                <Text fz={isPhone ? 11 : 'sm'}>Books</Text>
              </Tabs.Tab>
              <Tabs.Tab value='homebrew' leftSection={isPhone ? undefined : <IconAsset style={iconStyle} />} disabled>
                <Text fz={isPhone ? 11 : 'sm'}>Homebrew</Text>
              </Tabs.Tab>
              <Tabs.Tab value='variants' leftSection={isPhone ? undefined : <IconVocabulary style={iconStyle} />}>
                <Text fz={isPhone ? 11 : 'sm'}>Variant Rules</Text>
              </Tabs.Tab>
              <Tabs.Tab value='options' leftSection={isPhone ? undefined : <IconSettings style={iconStyle} />}>
                <Text fz={isPhone ? 11 : 'sm'}>Options</Text>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value='books'>
              <Stack gap={0} pt='sm'>
                <LinksGroup
                  icon={IconBook2}
                  label={'Pathfinder Core'}
                  links={books
                    .filter((book) => book.group === 'pathfinder-core')
                    .map((book) => ({
                      label: book.name,
                      id: book.id,
                      url: book.url,
                      enabled: hasBookEnabled(book.id),
                    }))}
                  onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                  onEnableAll={() => {
                    books
                      .filter((book) => book.group === 'pathfinder-core')
                      .forEach((book) => {
                        setBookEnabled(book.id, true);
                      });
                  }}
                />
                <LinksGroup
                  icon={IconServer}
                  label={'Starfinder Core'}
                  links={books
                    .filter((book) => book.group === 'starfinder-core')
                    .map((book) => ({
                      label: book.name,
                      id: book.id,
                      url: book.url,
                      enabled: hasBookEnabled(book.id),
                    }))}
                  onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                  onEnableAll={() => {
                    books
                      .filter((book) => book.group === 'starfinder-core')
                      .forEach((book) => {
                        setBookEnabled(book.id, true);
                      });
                  }}
                />
                <Box py={8}></Box>
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
                {/* <LinksGroup
                      icon={IconArchive}
                      label={'Legacy Backports'}
                      links={books
                        .filter((book) => book.group === 'legacy')
                        .map((book) => ({
                          label: book.name,
                          id: book.id,
                          url: book.url,
                          enabled: hasBookEnabled(book.id),
                        }))}
                      onLinkChange={(bookId, enabled) => setBookEnabled(bookId, enabled)}
                      onEnableAll={() => {
                        books
                          .filter((book) => book.group === 'legacy')
                          .forEach((book) => {
                            setBookEnabled(book.id, true);
                          });
                      }}
                    /> */}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='variants'>
              <Stack gap={0} pt='sm'>
                <LinkSwitch
                  label='Ancestry Paragon'
                  info={`Most characters have some elements that connect them to their ancestry but identify more strongly with their class or unique personality. Sometimes, though, a character is the embodiment of their ancestry to the point that it’s of equal importance to their class. For a game where an ancestral background is a major theme and such characters are the norm, your group might consider using the ancestry paragon variant.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=1336'
                  enabled={character?.variants?.ancestry_paragon}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        variants: {
                          ...prev.variants,
                          ancestry_paragon: enabled,
                        },
                      };
                    });
                  }}
                />
                <LinkSwitch
                  label='Dual Class'
                  info={`Sometimes, especially when you have a particularly small play group or want to play incredibly versatile characters, you might want to allow dual-class characters that have the full benefits of two different classes.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=1328'
                  enabled={character?.variants?.dual_class}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        details: {
                          ...prev.details,
                          class_2: enabled ? prev.details?.class_2 : undefined,
                        },
                        variants: {
                          ...prev.variants,
                          dual_class: enabled,
                        },
                      };
                    });
                  }}
                />
                <LinkSwitch
                  label='Free Archetype'
                  info={`Sometimes the story of your game calls for a group where everyone is a pirate or an apprentice at a magic school. The free archetype variant introduces a shared aspect to every character without taking away any of that character’s existing choices.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=2751'
                  enabled={character?.variants?.free_archetype}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        variants: {
                          ...prev.variants,
                          free_archetype: enabled,
                        },
                      };
                    });
                  }}
                />
                <LinkSwitch
                  label='Proficiency without Level'
                  info={`This variant removes a character's level from their proficiency bonus, scaling it differently for a style of game that's outside the norm. This is a significant change to the system. The proficiency rank progression in Player Core is designed for heroic fantasy games where heroes rise from humble origins to world-shattering strength. For some games, this narrative arc doesn't fit. Such games are about hedging bets in an uncertain and gritty world, in which even the world's best fighter can't guarantee a win against a large group of moderately skilled brigands.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=2762'
                  enabled={character?.variants?.proficiency_without_level}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        variants: {
                          ...prev.variants,
                          proficiency_without_level: enabled,
                        },
                      };
                    });
                  }}
                />
                <LinkSwitch
                  label='Stamina'
                  info={`In some fantasy stories, the heroes are able to avoid any serious injury until the situation gets dire, getting by with a graze or a flesh wound and needing nothing more than a quick rest to get back on their feet. If your group wants to tell tales like those, you can use the stamina variant to help make that happen.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=1378'
                  enabled={character?.variants?.stamina}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        variants: {
                          ...prev.variants,
                          stamina: enabled,
                        },
                      };
                    });
                  }}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='options'>
              <Stack gap={0} pt='sm'>
                <LinkSwitch
                  label='Auto Detect Prerequisites'
                  info={`**[Beta]** Automatically determine if a feat or feature has its prerequisites met in order to be taken. This is a beta feature and may not always work correctly.`}
                  enabled={character?.options?.auto_detect_prerequisites}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          auto_detect_prerequisites: enabled,
                        },
                      };
                    });
                  }}
                />
                {/* <LinkSwitch
                      label='Auto Heighten Spells'
                      info={`**[Beta]** Automatically apply the heightened effects of a spell to its stat block. This is a beta feature and may not always work correctly.`}
                      enabled={character?.options?.auto_heighten_spells}
                      onLinkChange={(enabled) => {
                        setCharacter((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            options: {
                              ...prev.options,
                              auto_heighten_spells: enabled,
                            },
                          };
                        });
                      }}
                    /> */}
                {/* <LinkSwitch
                      label='Class Archetypes'
                      info={``}
                      enabled={character?.options?.class_archetypes}
                      onLinkChange={(enabled) => {
                        setCharacter((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            options: {
                              ...prev.options,
                              class_archetypes: enabled,
                            },
                          };
                        });
                      }}
                    /> */}
                <LinkSwitch
                  label='Dice Roller'
                  info={`Roll your dice directly from the character sheet! Integrated with all your character's stats and abilities.`}
                  enabled={character?.options?.dice_roller}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          dice_roller: enabled,
                        },
                      };
                    });
                  }}
                />
                <LinkSwitch
                  label='Ignore Bulk Limit'
                  info={`Disables the negative effects of carrying too much bulk, such as adding the encumbered condition.`}
                  enabled={character?.options?.ignore_bulk_limit}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          ignore_bulk_limit: enabled,
                        },
                      };
                    });
                  }}
                />
                <LinkSwitch
                  label='Public Character'
                  info={`Makes your character public and viewable by anyone with your sheet link: \n\n _https://wanderersguide.app/sheet/${character?.id}_`}
                  enabled={character?.options?.is_public}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          is_public: enabled,
                        },
                      };
                    });
                  }}
                />
                <LinkSwitch
                  label='Custom Operations'
                  info={`Enables an area to add custom operations to your character. These are executed before most other operations.`}
                  enabled={character?.options?.custom_operations}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          custom_operations: enabled,
                        },
                      };
                    });
                  }}
                />
                {character?.options?.custom_operations && (
                  <Box pl={15}>
                    <BlurButton
                      size='compact-xs'
                      fw={400}
                      w={180}
                      onClick={() => {
                        setOpenedOperations(true);
                      }}
                    >
                      Open Operations{' '}
                      {character.custom_operations && character.custom_operations.length > 0
                        ? `(${character.custom_operations.length})`
                        : ''}
                    </BlurButton>
                    <CustomOperationsModal
                      opened={openedOperations}
                      onClose={() => setOpenedOperations(false)}
                      operations={_.cloneDeep(character.custom_operations ?? [])}
                      onChange={(operations) => {
                        if (_.isEqual(character.custom_operations, operations)) return;

                        setCharacter((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            custom_operations: operations,
                          };
                        });
                      }}
                    />
                  </Box>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </ScrollArea>
      </Paper>
    </Box>
  );

  const getSidebarSection = () => (
    <Box h='100%'>
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
            leftSection={<IconKey style={{ width: rem(12), height: rem(12) }} stroke={1.5} />}
            rightSection={
              <ActionIcon
                size={22}
                radius='xl'
                color={theme.primaryColor}
                variant='light'
                onClick={() => {
                  //
                }}
              >
                <IconFlagPlus style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
              </ActionIcon>
            }
            onClick={() => {
              displayComingSoon();
            }}
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
              '#40c057',
              '#82c91e',
              '#fab005',
              '#fd7e14',
            ]}
            swatchesPerRow={7}
            onChange={(color) => {
              if (!hasPatreonAccess(getCachedPublicUser(), 2)) {
                displayPatronOnly();
                return;
              }
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
                      if (!hasPatreonAccess(getCachedPublicUser(), 2)) {
                        displayPatronOnly();
                        return;
                      }
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
  );

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
                        meta_data: {
                          ...prev.meta_data,
                          reset_hp: true,
                        },
                      };
                    });
                  }
                }}
              />
            </Group>
          </Box>
        </Stack>
      </Group>
      {isPhone ? (
        <Stack h='100%'>
          <Box h={390}>{getOptionsSection()}</Box>
          {getSidebarSection()}
        </Stack>
      ) : (
        <Group gap={10} align='flex-start' wrap='nowrap' h={props.pageHeight - height - topGap}>
          <Box style={{ flexBasis: '65%' }} h='100%'>
            {getOptionsSection()}
          </Box>
          <Box style={{ flexBasis: 'calc(35% - 10px)' }} h='100%'>
            {getSidebarSection()}
          </Box>
        </Group>
      )}
    </Stack>
  );
}
