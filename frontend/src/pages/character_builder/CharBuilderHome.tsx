import { generateNames } from '@ai/fantasygen-dev/name-controller';
import { characterState } from '@atoms/characterAtoms';
import { GroupLinkSwitch, LinkSwitch, LinksGroup } from '@common/LinksGroup';
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
  List,
  Anchor,
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
  IconServer,
  IconFlagPlus,
  IconKey,
  IconArchive,
  IconFlag,
  IconX,
  IconExternalLink,
} from '@tabler/icons-react';
import { getAllBackgroundImages } from '@utils/background-images';
import { getAllPortraitImages } from '@utils/portrait-images';
import useRefresh from '@utils/use-refresh';
import * as _ from 'lodash-es';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import FantasyGen_dev from '@assets/images/fantasygen_dev.png';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  defineDefaultSources,
  fetchContentSources,
  findRequiredContentSources,
  resetContentStore,
} from '@content/content-store';
import { displayComingSoon, displayPatronOnly } from '@utils/notifications';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import BlurButton from '@common/BlurButton';
import OperationsModal from '@modals/OperationsModal';
import { hasPatreonAccess } from '@utils/patreon';
import { phoneQuery } from '@utils/mobile-responsive';
import RichText from '@common/RichText';
import { drawerState } from '@atoms/navAtoms';
import { AbilityBlockType, Campaign, ContentType } from '@typing/content';
import ContentFeedbackModal from '@modals/ContentFeedbackModal';
import { userState } from '@atoms/userAtoms';
import { makeRequest } from '@requests/request-manager';
import { set } from 'node_modules/cypress/types/lodash';
import { updateSubscriptions } from '@content/homebrew';

export default function CharBuilderHome(props: { pageHeight: number }) {
  const theme = useMantineTheme();

  const { ref, height } = useElementSize();
  const topGap = 30;
  const isPhone = useMediaQuery(phoneQuery());

  const queryClient = useQueryClient();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [feedbackData, setFeedbackData] = useState<{
    type: ContentType | AbilityBlockType;
    data: { id?: number; contentSourceId?: number };
  } | null>(null);

  const [character, setCharacter] = useRecoilState(characterState);
  const [loadingGenerateName, setLoadingGenerateName] = useState(false);
  const [displayNameInput, refreshNameInput] = useRefresh();

  const [openedOperations, setOpenedOperations] = useState(false);

  const [user, setUser] = useRecoilState(userState);
  useQuery({
    queryKey: [`find-account-self`],
    queryFn: async () => {
      const user = await getPublicUser();
      setUser(user);
      return user;
    },
  });

  const { data: fetchedBooks, refetch } = useQuery({
    queryKey: [`get-content-sources`],
    queryFn: async () => {
      return (await fetchContentSources({ ids: 'all' })).filter((book) => book.deprecated !== true);
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

  const setBooksEnabled = async (inputIds: number[], enabled: boolean) => {
    // For the sake of a responsive UI, let's change the clicked book immediately
    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content_sources: {
          ...prev.content_sources,
          enabled: enabled
            ? _.uniq([...(prev.content_sources?.enabled ?? []), ...inputIds])
            : prev.content_sources?.enabled?.filter((id: number) => !inputIds.includes(id)),
        },
      };
    });
    //

    const changeBooks = (bookIds: number[]) => {
      // Update character content sources
      setCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          content_sources: {
            ...prev.content_sources,
            enabled: enabled
              ? _.uniq([...(prev.content_sources?.enabled ?? []), ...bookIds])
              : prev.content_sources?.enabled?.filter((id: number) => !bookIds.includes(id)),
          },
        };
      });
      setTimeout(() => {
        // Refresh data to repopulate with new book content
        resetContentStore();
        defineDefaultSources(character?.content_sources?.enabled ?? []);
        refetch();
        // queryClient.invalidateQueries([`find-character-${character?.id}`]);
        queryClient.invalidateQueries([`find-content-${character?.id}`]);
      }, 200);
    };

    if (enabled) {
      // Handle dependency logic
      const requiredBooks = await findRequiredContentSources(
        _.uniq([...(character?.content_sources?.enabled ?? []), ...inputIds])
      );
      if (requiredBooks.newSources.length > 0) {
        modals.openConfirmModal({
          title: <Title order={3}>Enable Dependencies</Title>,
          children: (
            <Stack gap='xs'>
              <Text fz='sm'>
                It's recommended to enable the following as well. Certain features may not work as intended without
                them.
              </Text>
              <List>
                {requiredBooks.newSources.map((source, index) => (
                  <List.Item key={index}>
                    <Anchor
                      onClick={() => {
                        openDrawer({
                          type: 'content-source',
                          data: {
                            id: source.id,
                            onFeedback: (type: ContentType | AbilityBlockType, id: number, contentSourceId: number) => {
                              setFeedbackData({ type, data: { id, contentSourceId } });
                            },
                          },
                        });
                      }}
                    >
                      {source.name}
                    </Anchor>
                  </List.Item>
                ))}
              </List>
            </Stack>
          ),
          labels: { confirm: 'Enable', cancel: 'Continue without' },
          onCancel: () => changeBooks(inputIds),
          onConfirm: () => changeBooks([...inputIds, ...requiredBooks.sourceIds]),
        });
      } else {
        changeBooks(inputIds);
      }
    } else {
      changeBooks(inputIds);
    }
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
              <Tabs.Tab value='homebrew' leftSection={isPhone ? undefined : <IconAsset style={iconStyle} />}>
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
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'pathfinder-core').map((book) => book.id),
                      true
                    );
                  }}
                  onFeedback={(type, id, contentSourceId) => {
                    setFeedbackData({ type, data: { id, contentSourceId } });
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
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'starfinder-core').map((book) => book.id),
                      true
                    );
                  }}
                  onFeedback={(type, id, contentSourceId) => {
                    setFeedbackData({ type, data: { id, contentSourceId } });
                  }}
                />
                <Box py={8}>
                  <Divider w={220} ml={15} />
                </Box>
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
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'adventure-path').map((book) => book.id),
                      true
                    );
                  }}
                  onFeedback={(type, id, contentSourceId) => {
                    setFeedbackData({ type, data: { id, contentSourceId } });
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
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'standalone-adventure').map((book) => book.id),
                      true
                    );
                  }}
                  onFeedback={(type, id, contentSourceId) => {
                    setFeedbackData({ type, data: { id, contentSourceId } });
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
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'lost-omens').map((book) => book.id),
                      true
                    );
                  }}
                  onFeedback={(type, id, contentSourceId) => {
                    setFeedbackData({ type, data: { id, contentSourceId } });
                  }}
                />
                <LinksGroup
                  icon={IconArchive}
                  label={'Core Backports'}
                  links={books
                    .filter((book) => book.group === 'legacy')
                    .map((book) => ({
                      label: book.name,
                      id: book.id,
                      url: book.url,
                      enabled: hasBookEnabled(book.id),
                    }))}
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'legacy').map((book) => book.id),
                      true
                    );
                  }}
                  onFeedback={(type, id, contentSourceId) => {
                    setFeedbackData({ type, data: { id, contentSourceId } });
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
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'misc').map((book) => book.id),
                      true
                    );
                  }}
                  onFeedback={(type, id, contentSourceId) => {
                    setFeedbackData({ type, data: { id, contentSourceId } });
                  }}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='homebrew'>
              <Stack gap={0} pt='sm'>
                {user?.subscribed_content_sources?.map((s, index) => (
                  <GroupLinkSwitch
                    key={index}
                    label={s.source_name}
                    id={s.source_id}
                    url={''}
                    enabled={character?.content_sources?.enabled?.includes(s.source_id)}
                    onLinkChange={(id, enabled) => setBooksEnabled([id], enabled)}
                  />
                ))}
                {user?.subscribed_content_sources?.length === 0 && (
                  <Text c='gray.5' fz='sm' ta='center' fs='italic' py={20}>
                    No subscribed bundles found.{' '}
                    <Anchor fz='sm' href='/homebrew'>
                      Go add some!
                    </Anchor>
                  </Text>
                )}
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
                  label='Gradual Attribute Boosts'
                  info={`In this variant, a character gains attribute boosts more gradually as they level up, rather than receiving four attribute boosts at 5th, 10th, 15th, and 20th levels. Each character gains one attribute boost when they reach each of 2nd, 3rd, 4th, and 5th levels. These are collectively a single set of attribute boosts, so a character can’t boost the same attribute more than once per set; players can put a dot next to each boosted attribute or otherwise mark it to keep track. PCs also receive an attribute boost at 7th, 8th, 9th, and 10th level (a second set); at 12th, 13th, 14th, and 15th level (a third set); and at 17th, 18th, 19th, and 20th level (the fourth and final set).\n\nThis spreads out the attribute boosts, and using them earlier means a character can increase their most important attribute modifiers at a lower level. This makes characters slightly more powerful on average, but it makes levels 5, 10, 15, and 20 less important since characters usually choose the least important attribute boost of the set at those levels.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=1300'
                  enabled={character?.variants?.gradual_attribute_boosts}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        variants: {
                          ...prev.variants,
                          gradual_attribute_boosts: enabled,
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
                {/* <LinkSwitch
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
                /> */}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='options'>
              <Stack gap={0} pt='sm'>
                <LinkSwitch
                  label='Alternate Ancestry Boosts'
                  info={`The attribute boosts and flaws listed in each ancestry represent general trends or help guide players to create the kinds of characters from that ancestry most likely to pursue the life of an adventurer. However, ancestries aren’t a monolith. You always have the option to replace your ancestry’s listed attribute boosts and attribute flaws entirely and instead select two free attribute boosts when creating your character.`}
                  enabled={character?.options?.alternate_ancestry_boosts}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          alternate_ancestry_boosts: enabled,
                        },
                      };
                    });
                  }}
                />
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
                  label='Organized Play'
                  info={`Paizo Organized Play is a worldwide roleplaying organization where players can take the same character and play in any game around the globe.  Scenarios and quests are designed to bring players together as they explore new worlds, investigate mysteries and fight the forces of evil in a shared setting that responds to their decisions.`}
                  enabled={character?.options?.organized_play}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          organized_play: enabled,
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
                  label='Voluntary Flaw'
                  info={`Sometimes, it’s fun to play a character with a major flaw regardless of your ancestry. You can elect to take an additional attribute flaw when applying the attribute boosts and attribute flaws from your ancestry.`}
                  enabled={character?.options?.voluntary_flaws}
                  onLinkChange={(enabled) => {
                    setCharacter((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        options: {
                          ...prev.options,
                          voluntary_flaws: enabled,
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
                    <OperationsModal
                      title='Custom Operations'
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
          {campaign ? (
            <TextInput
              radius='xl'
              size='xs'
              label={<Text fz='sm'>Campaign</Text>}
              placeholder='Campaign Name'
              value={campaign.name}
              readOnly
              rightSectionWidth={28}
              leftSection={<IconFlag style={{ width: rem(12), height: rem(12) }} stroke={1.5} />}
              rightSection={
                <ActionIcon
                  size={22}
                  radius='xl'
                  color='gray'
                  variant='subtle'
                  onClick={async () => {
                    await leaveCampaign();
                  }}
                >
                  <IconX style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
                </ActionIcon>
              }
            />
          ) : (
            <PasswordInput
              radius='xl'
              size='xs'
              label={<Text fz='sm'>Campaign</Text>}
              placeholder='Enter Join Key'
              value={campaignKey}
              onChange={(e) => {
                setCampaignKey(e.target.value);
              }}
              rightSectionWidth={28}
              leftSection={<IconKey style={{ width: rem(12), height: rem(12) }} stroke={1.5} />}
              rightSection={
                <ActionIcon
                  size={22}
                  radius='xl'
                  disabled={!campaignKey}
                  color={theme.primaryColor}
                  variant='light'
                  onClick={async () => {
                    await joinCampaign();
                  }}
                >
                  <IconFlagPlus style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
                </ActionIcon>
              }
            />
          )}
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
                fallbackSrc='/backgrounds/placeholder.jpeg'
              />
            </UnstyledButton>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );

  // Campaign Section
  const [campaignKey, setCampaignKey] = useState('');
  const { data: campaign, refetch: refetchCampaign } = useQuery({
    queryKey: [`find-campaign-${character?.campaign_id}`, { campaign_id: character?.campaign_id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { campaign_id }] = queryKey;

      const campaigns = await makeRequest<Campaign[]>('find-campaign', {
        id: campaign_id,
      });
      return campaigns?.length ? campaigns[0] : null;
    },
    enabled: !!character?.campaign_id,
    refetchOnWindowFocus: false,
  });

  const joinCampaign = async () => {
    // TODO: Secure this joining process
    const campaigns = await makeRequest<Campaign[]>('find-campaign', {
      join_key: campaignKey,
    });
    const campaign = campaigns?.length ? campaigns[0] : null;
    setCampaignKey('');
    if (campaign) {
      setCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          campaign_id: campaign.id,
        };
      });

      setTimeout(() => {
        refetchCampaign();
      }, 3000);

      // Check if the campaign has recommended settings for the character
      if (
        !_.isEqual(
          {
            sources: character?.content_sources,
            variants: character?.variants,
            options: character?.options,
            custom_operations: character?.custom_operations,
          },
          {
            sources: campaign?.recommended_content_sources,
            variants: campaign?.recommended_variants,
            options: campaign?.recommended_options,
            custom_operations: campaign?.custom_operations,
          }
        )
      ) {
        modals.openConfirmModal({
          id: 'campaign-recommended-settings',
          title: <Title order={4}>Campaign Default Settings</Title>,
          children: (
            <Text size='sm'>
              It’s recommended to use your campaign’s default settings but doing so will override your current settings.
              Are you sure you want to?
            </Text>
          ),
          labels: { confirm: 'Apply Settings', cancel: 'Skip' },
          onCancel: () => {},
          onConfirm: async () => {
            // Find the missing content sources that need to be subscribed to
            const homebrewSources = campaign?.recommended_content_sources?.enabled?.filter((id: number) => {
              return !books.find((book) => book.id === id);
            });
            const subscribedSources = user?.subscribed_content_sources?.map((src) => src.source_id) ?? [];

            const missingSourceIds = homebrewSources?.filter((id: number) => !subscribedSources.includes(id));
            const missingSources =
              missingSourceIds && missingSourceIds.length > 0
                ? await fetchContentSources({ homebrew: true, ids: missingSourceIds })
                : [];

            const subscribeToMissingSources = async () => {
              if (!user) return;
              for (const source of missingSources) {
                const subscriptions = await updateSubscriptions(user, source, true);
                setUser({ ...user, subscribed_content_sources: subscriptions });
                await makeRequest('update-user', {
                  subscribed_content_sources: subscriptions ?? [],
                });
              }
            };

            const applySettings = async () => {
              setCharacter((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  content_sources: campaign?.recommended_content_sources,
                  variants: campaign?.recommended_variants,
                  options: campaign?.recommended_options,
                  custom_operations: campaign?.custom_operations,
                };
              });
            };

            if (missingSources.length > 0) {
              modals.openConfirmModal({
                id: 'campaign-default-homebrew',
                title: <Title order={4}>Campaign Default Homebrew</Title>,
                children: (
                  <Box>
                    <Text size='sm'>
                      This campaign also has some default homebrew enabled. If you accept, you’ll automatically be
                      subscribed to each of these bundles which you can use in your current or future characters:
                    </Text>
                    <List>
                      {missingSources.map((source, index) => (
                        <List.Item key={index}>
                          <Group gap={3}>
                            <Text size='sm'>{source.name}</Text>
                            <HoverCard shadow='md' position='top' openDelay={500} withinPortal withArrow>
                              <HoverCard.Target>
                                <ActionIcon
                                  mr={40}
                                  color='gray.9'
                                  variant='transparent'
                                  size='xs'
                                  radius='xl'
                                  aria-label='Source Info'
                                  onClick={() => {
                                    openDrawer({
                                      type: 'content-source',
                                      data: {
                                        id: source.id,
                                        showOperations: true,
                                      },
                                    });
                                  }}
                                >
                                  <IconExternalLink size='0.6rem' stroke={1.5} />
                                </ActionIcon>
                              </HoverCard.Target>
                              <HoverCard.Dropdown px={10} py={5}>
                                <Text size='sm'>Open Source Info</Text>
                              </HoverCard.Dropdown>
                            </HoverCard>
                          </Group>
                        </List.Item>
                      ))}
                    </List>
                  </Box>
                ),
                labels: { confirm: 'Accept', cancel: 'Cancel' },
                onCancel: () => {},
                onConfirm: async () => {
                  // Subscribe to missing sources then apply settings
                  // (so that the sources are available before we add them)
                  await subscribeToMissingSources();
                  await applySettings();
                },
              });
            } else {
              await applySettings();
            }
          },
        });
      } else {
        showNotification({
          title: 'Joined Campaign!',
          message: `You've joined "${campaign.name}"`,
          color: 'blue',
          icon: null,
          autoClose: 3000,
        });
      }
    } else {
      showNotification({
        title: 'Invalid Join Key',
        message: 'Please ask your GM for a valid key.',
        color: 'red',
        icon: null,
        autoClose: 3000,
      });
    }
  };

  const leaveCampaign = () => {
    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        campaign_id: null,
      };
    });

    setTimeout(() => {
      refetchCampaign();
    }, 3000);

    showNotification({
      title: 'Left Campaign',
      message: 'You have left the campaign.',
      color: 'blue',
      icon: null,
      autoClose: 3000,
    });
  };

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
                  style={{
                    border: `1px solid ${theme.colors.dark[4]}`,
                  }}
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
                  w={isPhone ? undefined : 220}
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

      {feedbackData && (
        <ContentFeedbackModal
          opened={true}
          onCancel={() => {
            setFeedbackData(null);
          }}
          onStartFeedback={() => {
            modals.closeAll();
            openDrawer(null);
          }}
          onCompleteFeedback={() => {
            openDrawer(null);
            setFeedbackData(null);
          }}
          type={feedbackData.type}
          data={feedbackData.data}
        />
      )}
    </Stack>
  );
}
