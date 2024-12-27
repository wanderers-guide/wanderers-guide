import { queryByName } from '@ai/vector-db/vector-manager';
import { drawerState } from '@atoms/navAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { getCachedPublicUser, getPublicUser } from '@auth/user-manager';
import { DrawerStateSet } from '@common/rich_text_input/ContentLinkExtension';
import { DISCORD_URL, LEGACY_URL, PATREON_URL } from '@constants/data';
import { fetchContentSources } from '@content/content-store';
import { getIconFromContentType } from '@content/content-utils';
import { defineDefaultSourcesForUser } from '@content/homebrew';
import { ActionIcon, Avatar, Center, HoverCard, Loader, MantineTheme, Text, rem, useMantineTheme } from '@mantine/core';
import { useDebouncedState } from '@mantine/hooks';
import { Spotlight, SpotlightActionData, spotlight } from '@mantine/spotlight';
import { makeRequest } from '@requests/request-manager';
import { Session } from '@supabase/supabase-js';
import {
  IconAdjustments,
  IconArchive,
  IconAsset,
  IconBrandDiscord,
  IconBrandPatreon,
  IconFileText,
  IconFlag,
  IconHome,
  IconSearch,
  IconSettings,
  IconSoup,
  IconSpeakerphone,
  IconSwords,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { AbilityBlockType, Character, ContentType } from '@typing/content';
import { DrawerType } from '@typing/index';
import { isPlayable } from '@utils/character';
import { displayComingSoon } from '@utils/notifications';
import { pluralize, toLabel } from '@utils/strings';
import { setQueryParam } from '@utils/url';
import { labelToVariable } from '@variables/variable-utils';
import { groupBy, isArray, truncate } from 'lodash-es';
import { SpotlightActionGroupData } from 'node_modules/@mantine/spotlight/lib/Spotlight';
import { useEffect, useRef, useState } from 'react';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import stripMd from 'remove-markdown';

const MAX_QUERY_LENGTH = 100;

export default function SearchSpotlight() {
  const theme = useMantineTheme();
  const session = useRecoilValue(sessionState);

  const navigate = useNavigate();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const currentQuery = useRef('');
  const [query, setQuery] = useDebouncedState('', 400);
  // For queryResult, null = loading and false = failed to find.
  const [queryResult, setQueryResult] = useState<SpotlightActionGroupData[] | null | false>(false);

  useEffect(() => {
    if (query) {
      activateQueryPipeline(defaultActions, query, navigate, openDrawer, theme, session).then((result) => {
        if (query === currentQuery.current) {
          setQueryResult(result);
        } else {
          setQuery(currentQuery.current);
        }
      });
    }
  }, [query]);

  const LOGGED_IN_ACTIONS = session
    ? [
        {
          id: 'page-characters',
          label: 'Characters',
          description: 'View and edit your characters',
          onClick: () => navigate(`/characters`),
          leftSection: <IconUsers style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
          keywords: ['page'],
        },
        {
          id: 'page-homebrew',
          label: 'Homebrew',
          description: 'View and create homebrew content',
          onClick: () => navigate(`/homebrew`),
          leftSection: <IconAsset style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
          keywords: ['page'],
        },
        {
          id: 'page-encounters',
          label: 'Encounters',
          description: 'Create and manage encounters for your games',
          onClick: () => navigate(`/encounters`),
          leftSection: <IconSwords style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
          keywords: ['page'],
        },
        {
          id: 'page-campaigns',
          label: 'Campaigns',
          description: 'View your campaigns and manage your players',
          onClick: () => navigate(`/campaigns`),
          leftSection: <IconFlag style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
          keywords: ['page'],
        },
        {
          id: 'page-account',
          label: 'Account',
          description: 'View your account details and settings',
          onClick: () => navigate(`/account`),
          leftSection: <IconSettings style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
          highlightColor: theme.colors[theme.primaryColor][2],
          keywords: ['page'],
        },
      ]
    : ([] satisfies SpotlightActionData[]);

  const defaultActions = {
    group: 'Pages',
    actions: [
      ...LOGGED_IN_ACTIONS,
      {
        id: 'page-home',
        label: 'Home',
        description: 'Go to the home page',
        onClick: () => navigate(`/`),
        leftSection: <IconHome style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
        highlightColor: theme.colors[theme.primaryColor][2],
        keywords: ['page'],
      },
      {
        id: 'page-community',
        label: 'Community',
        description: 'View the community forums and discussions',
        onClick: () => {
          window.open(DISCORD_URL, '_blank');
        },
        leftSection: <IconBrandDiscord style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
        highlightColor: theme.colors[theme.primaryColor][2],
        keywords: ['page'],
      },
      {
        id: 'page-support',
        label: 'Support',
        description: 'Support the site on Patreon and get access to additional features',
        onClick: () => {
          window.open(PATREON_URL, '_blank');
        },
        leftSection: <IconBrandPatreon style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
        highlightColor: theme.colors[theme.primaryColor][2],
        keywords: ['page'],
      },
      {
        id: 'page-legacy-site',
        label: 'Legacy Site',
        description: `Go to the legacy site for original Pathfinder 2e`,
        onClick: () => {
          window.open(LEGACY_URL, '_blank');
        },
        leftSection: <IconArchive style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
        highlightColor: theme.colors[theme.primaryColor][2],
        keywords: ['page'],
      },
    ],
  } satisfies SpotlightActionGroupData;

  return (
    <Spotlight
      scrollable
      onQueryChange={(query: string) => {
        /* Whenever input changes, this function is called and query is set via setQuery
         * setQuery is a debouncer, after the set debounce time the above useEffect callback is executed.
         * That callback fetches the result data and updates queryResult accordingly.
         */
        setQuery(query.trim());
        currentQuery.current = query.trim();
        if (query.trim() === '') {
          setQueryResult(false);
        } else {
          setQueryResult(null);
        }
      }}
      actions={queryResult === null ? [] : queryResult === false || query === '' ? [defaultActions] : [...queryResult]}
      nothingFound={
        queryResult === null ? (
          <Center h={200}>
            <Loader type='dots' size='lg' />
          </Center>
        ) : (
          <Center h={200}>
            <Text c='dimmed' fs='italic'>
              Nothing found...
            </Text>
          </Center>
        )
      }
      highlightQuery
      searchProps={{
        leftSection: <IconSearch style={{ width: rem(20), height: rem(20) }} stroke={1.5} />,
        rightSection: (
          <HoverCard shadow='md' position='top' openDelay={250} zIndex={10000} withinPortal>
            <HoverCard.Target>
              <ActionIcon
                variant='subtle'
                radius='xl'
                size='lg'
                color='gray.6'
                aria-label='Advanced Search'
                onClick={() => {
                  console.log('Advanced Search');
                  spotlight.close();
                  displayComingSoon();
                }}
                style={{
                  pointerEvents: 'auto',
                }}
              >
                <IconAdjustments style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
              </ActionIcon>
            </HoverCard.Target>
            <HoverCard.Dropdown px={10} py={5}>
              <Text size='sm'>Advanced Search</Text>
            </HoverCard.Dropdown>
          </HoverCard>
        ),
        placeholder: 'Search anything...',
      }}
      filter={(query, actions) => {
        if (!query) return actions;
        const newGroups = [];
        for (let group of actions as SpotlightActionGroupData[]) {
          const newActions = group.actions.filter((action) => {
            if (getQueryType(action)) {
              return true;
            } else {
              const inLabel = action.label?.toLowerCase().includes(query.toLowerCase());
              const inDescription = action.description?.toLowerCase().includes(query.toLowerCase());
              const inKeywords = (isArray(action.keywords) ? action.keywords : []).some((keyword) =>
                keyword.toLowerCase().includes(query.toLowerCase())
              );
              return inLabel || inDescription || inKeywords;
            }
          });
          if (newActions.length > 0) {
            newGroups.push({ ...group, actions: newActions });
          }
        }
        return newGroups;
      }}
    />
  );
}

/**
 *
 * @param query
 * @param navigate
 * @returns - SplotlightActions, or null (= loading) or false (= failed to find).
 */
async function activateQueryPipeline(
  defaultActions: SpotlightActionGroupData,
  rawQuery: string,
  navigate: NavigateFunction,
  openDrawer: DrawerStateSet,
  theme: MantineTheme,
  session: Session | null
): Promise<SpotlightActionGroupData[] | null | false> {
  const query = (rawQuery.length > MAX_QUERY_LENGTH ? rawQuery.slice(0, MAX_QUERY_LENGTH) : rawQuery).trim();
  let actions: SpotlightActionData[] = [];
  if (query && query.length >= 3) {
    actions = [...actions, ...(await queryResults(query, openDrawer, theme))];
    actions = [...actions, ...(await fetchBooks(query, openDrawer, theme))];
    actions = [...actions, ...(await fetchCharacters(query, navigate, theme, session))];
    // Add more here.

    // Put exact matches first and preserve order of other results.
    actions = ((arr: SpotlightActionData[], match: string) => {
      const matchedItems: SpotlightActionData[] = [];
      const otherItems: SpotlightActionData[] = [];
      for (const item of arr) {
        if (labelToVariable(`${item.label}`) === labelToVariable(match)) {
          matchedItems.push(item);
        } else {
          otherItems.push(item);
        }
      }
      return matchedItems.concat(otherItems);
    })(actions, query);
  }

  const groupedActions = groupBy(actions, '_type');

  const finalActions: SpotlightActionGroupData[] = [];
  for (const key in groupedActions) {
    finalActions.push({
      group: pluralize(toLabel(key)),
      actions: groupedActions[key],
    });
  }
  return [defaultActions, ...finalActions];
}

async function queryResults(
  query: string,
  openDrawer: DrawerStateSet,
  theme: MantineTheme
): Promise<SpotlightActionData[]> {
  // Vector search
  // const result = await queryByName(query, {
  //   amount: 10,
  //   applyWeights: true,
  // });

  // Traditional search
  const queryDbSearch = async () => {
    // Filter out all sources that's not been subscribed or official
    let user = getCachedPublicUser();
    if (!user) {
      user = await getPublicUser();
    }
    const validSources = await defineDefaultSourcesForUser();

    // Fetch search results
    const searchData =
      (await makeRequest('search-data', {
        text: query,
        content_sources: validSources,
      })) ?? {};

    // Format results to single array
    const result: Record<string, any>[] = []
      .concat(searchData.ability_blocks.map((a: any) => ({ ...a, _type: 'ability-block' })))
      .concat(searchData.ancestries.map((a: any) => ({ ...a, _type: 'ancestry' })))
      .concat(searchData.archetypes.map((a: any) => ({ ...a, _type: 'archetype' })))
      .concat(searchData.backgrounds.map((a: any) => ({ ...a, _type: 'background' })))
      .concat(searchData.classes.map((a: any) => ({ ...a, _type: 'class' })))
      .concat(searchData.creatures.map((a: any) => ({ ...a, _type: 'creature' })))
      .concat(searchData.items.map((a: any) => ({ ...a, _type: 'item' })))
      .concat(searchData.languages.map((a: any) => ({ ...a, _type: 'language' })))
      .concat(searchData.spells.map((a: any) => ({ ...a, _type: 'spell' })))
      .concat(searchData.traits.map((a: any) => ({ ...a, _type: 'trait' })))
      .concat(searchData.versatile_heritages.map((a: any) => ({ ...a, _type: 'versatile-heritage' })));

    return result;
    // Filter out results again, just in case
    //return result.filter((a) => validSources.find((c) => c.id === a.content_source_id));
  };

  const result = await queryDbSearch();

  // Format results to spotlight actions
  return result.map((data) => {
    let description = `${stripMd(`${data.description}`)}`.split('.')[0] + '.';

    const abilityBlockType = data._type === 'ability-block' ? (data.type as AbilityBlockType) : null;

    if (data.level && (!abilityBlockType || +data.level > 0)) {
      description = `Lvl. ${data.level} | ` + description;
    } else if (data.rank) {
      description = `Rk. ${data.rank} | ` + description;
    }

    description = truncate(description, { length: 80 });
    return {
      id: `${data._type}-${data.id}`,
      label: `${data.name}`,
      description: data.description ? description : undefined,
      onClick: () => {
        setQueryParam('open', `link_${abilityBlockType ?? data._type}_${data.id}`);
        openDrawer({
          type: (abilityBlockType ?? data._type) as DrawerType,
          data: { id: data.id },
        });
      },
      leftSection: getIconFromContentType(data._type as ContentType, '1.5rem'),
      highlightColor: theme.colors[theme.primaryColor][2],
      keywords: ['query', `${data._type}`],
      _type: abilityBlockType ?? data._type,
    };
  });
}

async function fetchBooks(
  query: string,
  openDrawer: DrawerStateSet,
  theme: MantineTheme
): Promise<SpotlightActionData[]> {
  const sources = await fetchContentSources({
    published: true,
    ids: 'all',
  });
  return sources.map((source) => {
    return {
      id: `content-source-${source.id}`,
      label: source.name,
      description: truncate(source.description, { length: 80 }),
      onClick: () => {
        setQueryParam('open', `link_content-source_${source.id}`);
        openDrawer({
          type: 'content-source',
          data: { id: source.id },
        });
      },
      leftSection: getIconFromContentType('content-source', '1.5rem'),
      highlightColor: theme.colors[theme.primaryColor][2],
      keywords: [`content source`],
      _type: 'content-source',
    };
  });
}

async function fetchCharacters(
  query: string,
  navigate: NavigateFunction,
  theme: MantineTheme,
  session: Session | null
): Promise<SpotlightActionData[]> {
  const characters = await makeRequest<Character[]>('find-character', {
    user_id: session?.user.id,
  });
  return (characters ?? []).map((character) => {
    const level = character.level;
    const heritage = ''; //character.details?.heritage?.name ?? '';
    const ancestry = character.details?.ancestry?.name ?? '';
    //const background = character.details?.background?.name ?? '';
    const class_ = character.details?.class?.name ?? '';

    let description = `Lvl. ${level} | ${heritage} ${ancestry} | ${class_}`;
    description = truncate(description, { length: 80 });
    return {
      id: `character-${character.id}`,
      label: `${character.name}`,
      description: description,
      onClick: () => {
        if (isPlayable(character)) {
          navigate(`/sheet/${character.id}`);
        } else {
          navigate(`/builder/${character.id}`);
        }
      },
      leftSection: (
        // <IconFileText
        //   style={{ width: rem(24), height: rem(24) }}
        //   stroke={1.5}
        // />
        <Avatar
          src={character.details?.image_url}
          alt='Character Portrait'
          size={40}
          radius={40}
          variant='transparent'
          color='dark.3'
          bg={theme.colors.dark[6]}
        />
      ),
      highlightColor: theme.colors[theme.primaryColor][2],
      keywords: ['character'],
      _type: 'character',
    };
  });
}

function getQueryType(action: SpotlightActionData): ContentType | null {
  if (action.keywords && action.keywords.length > 0 && action.keywords[0] === 'query') {
    const type = action.keywords[1];
    return !!type ? (type as ContentType) : null;
  } else {
    return null;
  }
}
