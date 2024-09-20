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
  Textarea,
  Menu,
} from '@mantine/core';
import { useElementSize, useMediaQuery } from '@mantine/hooks';
import { modals, openContextModal } from '@mantine/modals';
import { hideNotification, showNotification } from '@mantine/notifications';
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
  IconHexagonalPrism,
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
import { AbilityBlockType, Campaign, Character, ContentType } from '@typing/content';
import ContentFeedbackModal from '@modals/ContentFeedbackModal';
import { userState } from '@atoms/userAtoms';
import { isValidImage } from '@utils/images';
import { makeRequest } from '@requests/request-manager';

export default function SettingsPanel(props: {
  panelHeight: number;
  panelWidth: number;
  campaign: Campaign;
  players: Character[];
  setCampaign: (campaign: Campaign) => void;
}) {
  const theme = useMantineTheme();

  const { ref, height } = useElementSize();
  const topGap = 30;
  const isPhone = useMediaQuery(phoneQuery());

  const [isValidImageURL, setIsValidImageURL] = useState(true);

  const queryClient = useQueryClient();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [feedbackData, setFeedbackData] = useState<{
    type: ContentType | AbilityBlockType;
    data: { id?: number; contentSourceId?: number };
  } | null>(null);

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
      return await fetchContentSources({ ids: 'all' });
    },
  });
  const books = fetchedBooks ?? [];

  const hasBookEnabled = (bookId: number) => {
    return props.campaign.recommended_content_sources?.enabled?.includes(bookId);
  };

  const setBooksEnabled = async (inputIds: number[], enabled: boolean) => {
    // For the sake of a responsive UI, let's change the clicked book immediately
    props.setCampaign({
      ...props.campaign,
      recommended_content_sources: {
        ...props.campaign.recommended_content_sources,
        enabled: enabled
          ? _.uniq([...(props.campaign.recommended_content_sources?.enabled ?? []), ...inputIds])
          : props.campaign.recommended_content_sources?.enabled?.filter((id: number) => !inputIds.includes(id)),
      },
    });
    //

    const changeBooks = (bookIds: number[]) => {
      // Update character content sources
      props.setCampaign({
        ...props.campaign,
        recommended_content_sources: {
          ...props.campaign.recommended_content_sources,
          enabled: enabled
            ? _.uniq([...(props.campaign.recommended_content_sources?.enabled ?? []), ...bookIds])
            : props.campaign.recommended_content_sources?.enabled?.filter((id: number) => !bookIds.includes(id)),
        },
      });
      setTimeout(() => {
        // Refresh data to repopulate with new book content
        resetContentStore();
        defineDefaultSources(props.campaign?.recommended_content_sources?.enabled ?? []);
        refetch();
      }, 200);
    };

    if (enabled) {
      // Handle dependency logic
      const requiredBooks = await findRequiredContentSources(
        _.uniq([...(props.campaign?.recommended_content_sources?.enabled ?? []), ...inputIds])
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
      <Title order={4} px='xs'>
        Player Default Settings
      </Title>
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
                  icon={IconHexagonalPrism}
                  label={'Playtest'}
                  links={books
                    .filter((book) => book.group === 'playtest')
                    .map((book) => ({
                      label: book.name,
                      id: book.id,
                      url: book.url,
                      enabled: hasBookEnabled(book.id),
                    }))}
                  onLinkChange={(bookId, enabled) => setBooksEnabled([bookId], enabled)}
                  onEnableAll={() => {
                    setBooksEnabled(
                      books.filter((book) => book.group === 'playtest').map((book) => book.id),
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
                    enabled={props.campaign?.recommended_content_sources?.enabled?.includes(s.source_id)}
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
                  enabled={props.campaign?.recommended_variants?.ancestry_paragon}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_variants: {
                        ...props.campaign.recommended_variants,
                        ancestry_paragon: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Dual Class'
                  info={`Sometimes, especially when you have a particularly small play group or want to play incredibly versatile characters, you might want to allow dual-class characters that have the full benefits of two different classes.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=1328'
                  enabled={props.campaign?.recommended_variants?.dual_class}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_variants: {
                        ...props.campaign.recommended_variants,
                        dual_class: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Free Archetype'
                  info={`Sometimes the story of your game calls for a group where everyone is a pirate or an apprentice at a magic school. The free archetype variant introduces a shared aspect to every character without taking away any of that character’s existing choices.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=2751'
                  enabled={props.campaign?.recommended_variants?.free_archetype}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_variants: {
                        ...props.campaign.recommended_variants,
                        free_archetype: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Gradual Attribute Boosts'
                  info={`In this variant, a character gains attribute boosts more gradually as they level up, rather than receiving four attribute boosts at 5th, 10th, 15th, and 20th levels. Each character gains one attribute boost when they reach each of 2nd, 3rd, 4th, and 5th levels. These are collectively a single set of attribute boosts, so a character can’t boost the same attribute more than once per set; players can put a dot next to each boosted attribute or otherwise mark it to keep track. PCs also receive an attribute boost at 7th, 8th, 9th, and 10th level (a second set); at 12th, 13th, 14th, and 15th level (a third set); and at 17th, 18th, 19th, and 20th level (the fourth and final set).\n\nThis spreads out the attribute boosts, and using them earlier means a character can increase their most important attribute modifiers at a lower level. This makes characters slightly more powerful on average, but it makes levels 5, 10, 15, and 20 less important since characters usually choose the least important attribute boost of the set at those levels.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=1300'
                  enabled={props.campaign?.recommended_variants?.gradual_attribute_boosts}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_variants: {
                        ...props.campaign.recommended_variants,
                        gradual_attribute_boosts: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Proficiency without Level'
                  info={`This variant removes a character's level from their proficiency bonus, scaling it differently for a style of game that's outside the norm. This is a significant change to the system. The proficiency rank progression in Player Core is designed for heroic fantasy games where heroes rise from humble origins to world-shattering strength. For some games, this narrative arc doesn't fit. Such games are about hedging bets in an uncertain and gritty world, in which even the world's best fighter can't guarantee a win against a large group of moderately skilled brigands.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=2762'
                  enabled={props.campaign?.recommended_variants?.proficiency_without_level}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_variants: {
                        ...props.campaign.recommended_variants,
                        proficiency_without_level: enabled,
                      },
                    });
                  }}
                />
                {/* <LinkSwitch
                  label='Stamina'
                  info={`In some fantasy stories, the heroes are able to avoid any serious injury until the situation gets dire, getting by with a graze or a flesh wound and needing nothing more than a quick rest to get back on their feet. If your group wants to tell tales like those, you can use the stamina variant to help make that happen.`}
                  url='https://2e.aonprd.com/Rules.aspx?ID=1378'
                  enabled={props.campaign?.recommended_variants?.stamina}
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
                  enabled={props.campaign.recommended_options?.alternate_ancestry_boosts}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        alternate_ancestry_boosts: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Auto Detect Prerequisites'
                  info={`**[Beta]** Automatically determine if a feat or feature has its prerequisites met in order to be taken. This is a beta feature and may not always work correctly.`}
                  enabled={props.campaign.recommended_options?.auto_detect_prerequisites}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        auto_detect_prerequisites: enabled,
                      },
                    });
                  }}
                />
                {/* <LinkSwitch
                      label='Auto Heighten Spells'
                      info={`**[Beta]** Automatically apply the heightened effects of a spell to its stat block. This is a beta feature and may not always work correctly.`}
                      enabled={props.campaign.recommended_options?.auto_heighten_spells}
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
                      enabled={props.campaign.recommended_options?.class_archetypes}
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
                  enabled={props.campaign.recommended_options?.dice_roller}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        dice_roller: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Ignore Bulk Limit'
                  info={`Disables the negative effects of carrying too much bulk, such as adding the encumbered condition.`}
                  enabled={props.campaign.recommended_options?.ignore_bulk_limit}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        ignore_bulk_limit: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Organized Play'
                  info={`Paizo Organized Play is a worldwide roleplaying organization where players can take the same character and play in any game around the globe.  Scenarios and quests are designed to bring players together as they explore new worlds, investigate mysteries and fight the forces of evil in a shared setting that responds to their decisions.`}
                  enabled={props.campaign.recommended_options?.organized_play}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        organized_play: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Public Character'
                  info={`Makes the character public and viewable by anyone with their sheet link.`}
                  enabled={props.campaign.recommended_options?.is_public}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        is_public: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Voluntary Flaw'
                  info={`Sometimes, it’s fun to play a character with a major flaw regardless of your ancestry. You can elect to take an additional attribute flaw when applying the attribute boosts and attribute flaws from your ancestry.`}
                  enabled={props.campaign.recommended_options?.voluntary_flaws}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        voluntary_flaws: enabled,
                      },
                    });
                  }}
                />
                <LinkSwitch
                  label='Custom Operations'
                  info={`Enables an area to add custom operations to your character. These are executed before most other operations.`}
                  enabled={props.campaign.recommended_options?.custom_operations}
                  onLinkChange={(enabled) => {
                    props.setCampaign({
                      ...props.campaign,
                      recommended_options: {
                        ...props.campaign.recommended_options,
                        custom_operations: enabled,
                      },
                    });
                  }}
                />
                {props.campaign.recommended_options?.custom_operations && (
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
                      {props.campaign.custom_operations && props.campaign.custom_operations.length > 0
                        ? `(${props.campaign.custom_operations.length})`
                        : ''}
                    </BlurButton>
                    <OperationsModal
                      title='Custom Operations'
                      opened={openedOperations}
                      onClose={() => setOpenedOperations(false)}
                      operations={_.cloneDeep(props.campaign.custom_operations ?? [])}
                      onChange={(operations) => {
                        if (_.isEqual(props.campaign.custom_operations, operations)) return;

                        props.setCampaign({
                          ...props.campaign,
                          custom_operations: operations,
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
      <Title order={4} px='xs'>
        Game Config
      </Title>
      <Paper
        shadow='sm'
        p='sm'
        h='100%'
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.13)',
        }}
      >
        <Stack>
          <TextInput
            label='Name'
            placeholder='My Campaign'
            value={props.campaign.name}
            onChange={(e) => {
              props.setCampaign({
                ...props.campaign,
                name: e.currentTarget.value,
              });
            }}
          />
          <Textarea
            label='Description'
            placeholder='A brief description of the campaign...'
            minRows={4}
            maxRows={4}
            autosize
            value={props.campaign.description}
            onChange={(e) => {
              props.setCampaign({
                ...props.campaign,
                description: e.currentTarget.value,
              });
            }}
          />

          <Select
            label='Show Party Member Status'
            placeholder='Status of Party Members'
            data={[
              { label: 'Disabled', value: 'OFF' },
              { label: 'Status Only', value: 'STATUS' },
              { label: 'Detailed', value: 'DETAILED' },
            ]}
            value={props.campaign.meta_data?.settings?.show_party_member_status ?? 'STATUS'}
            onChange={(v) => {
              props.setCampaign({
                ...props.campaign,
                meta_data: {
                  ...props.campaign.meta_data,
                  settings: {
                    ...props.campaign.meta_data?.settings,
                    show_party_member_status: (v as 'OFF' | 'STATUS' | 'DETAILED') ?? 'STATUS',
                  },
                },
              });
            }}
          />

          <TextInput
            defaultValue={props.campaign.meta_data?.image_url ?? ''}
            label='Image URL'
            onBlur={async (e) => {
              setIsValidImageURL(e.target.value.trim() ? await isValidImage(e.target.value) : true);
              props.setCampaign({
                ...props.campaign,
                meta_data: {
                  ...props.campaign.meta_data,
                  image_url: e.target.value,
                },
              });
            }}
            error={isValidImageURL ? false : 'Invalid URL'}
          />

          <Menu shadow='md' width={260}>
            <Menu.Target>
              <Button mt='md' variant='light' color='red' px={5} size='compact-sm'>
                Kick Player
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              {props.players.map((player, index) => (
                <Menu.Item
                  key={index}
                  onClick={() => {
                    modals.openConfirmModal({
                      id: 'kick-player',
                      title: <Title order={4}>{`Kick "${player.name}"`}</Title>,
                      children: <Text size='sm'>{`Are you sure you want to remove this player?`}</Text>,
                      labels: { confirm: 'Yep, bye 👋', cancel: 'Cancel' },
                      onCancel: () => {},
                      onConfirm: async () => {
                        await makeRequest('update-character', {
                          id: player.id,
                          campaign_id: null,
                        });
                        window.location.reload();
                      },
                    });
                  }}
                >
                  {player.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>

          <Button
            size='compact-sm'
            variant='light'
            color='red'
            onClick={() => {
              modals.openConfirmModal({
                id: 'delete-campaign',
                title: <Title order={4}>{'Delete Campaign'}</Title>,
                children: <Text size='sm'>{'Are you sure you want to delete this campaign?'}</Text>,
                labels: { confirm: 'Yep, bye 👋', cancel: 'Cancel' },
                onCancel: () => {},
                onConfirm: async () => {
                  await deleteCampaign();
                },
              });
            }}
          >
            Delete Campaign
          </Button>
        </Stack>
      </Paper>
    </Box>
  );

  async function deleteCampaign() {
    showNotification({
      id: `delete-campaign`,
      title: `Deleting Campaign`,
      message: 'Please wait...',
      autoClose: false,
      withCloseButton: false,
      loading: true,
    });

    const result = await makeRequest('delete-content', {
      id: props.campaign.id,
      type: 'campaign',
    });

    hideNotification(`delete-campaign`);

    window.location.href = '/campaigns';

    return result;
  }

  return (
    <Stack gap={topGap}>
      {isPhone ? (
        <Stack h='100%'>
          <Box h={390}>{getOptionsSection()}</Box>
          {getSidebarSection()}
        </Stack>
      ) : (
        <Group gap={10} align='flex-start' wrap='nowrap' h={props.panelHeight - height - topGap}>
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
