import { queryByName } from '@ai/vector-db/vector-manager';
import { drawerState } from '@atoms/navAtoms';
import { Loader, Text, MantineTheme, rem, useMantineTheme, Center } from '@mantine/core';
import { useDebouncedState } from '@mantine/hooks';
import { Spotlight, SpotlightActionData, isActionsGroup } from '@mantine/spotlight';
import { makeRequest } from '@requests/request-manager';
import { IconArchive, IconBrandDiscord, IconBrandPatreon, IconDashboard, IconFileText, IconHome, IconLayoutDashboard, IconSearch, IconUser } from '@tabler/icons-react';
import { Character, ContentSource, ContentType } from '@typing/content';
import { isPlayable } from '@utils/character';
import { pluralize, toLabel } from '@utils/strings';
import _, { isArray } from 'lodash';
import {
  SpotlightActionGroupData,
  SpotlightActions,
} from 'node_modules/@mantine/spotlight/lib/Spotlight';
import { useRef, useState, useEffect } from 'react';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { SetterOrUpdater, useRecoilState } from 'recoil';

export default function SearchSpotlight() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const currentQuery = useRef('');
  const [query, setQuery] = useDebouncedState('', 400);
  // For queryResult, null = loading and false = failed to find.
  const [queryResult, setQueryResult] = useState<SpotlightActionGroupData[] | null | false>(false);

  useEffect(() => {
    if (query) {
      activateQueryPipeline(defaultActions, query, navigate, openDrawer, theme).then((result) => {
        if (query === currentQuery.current) {
          setQueryResult(result);
        }
      });
    }
  }, [query]);


  const defaultActions = {
    group: 'Pages',
    actions: [
      {
        id: 'page-dashboard',
        label: 'Dashboard',
        description: 'View your characters, campaigns, and more',
        onClick: () => navigate(`/dashboard`),
        leftSection: (
          <IconLayoutDashboard style={{ width: rem(24), height: rem(24) }} stroke={1.5} />
        ),
        keywords: ['page'],
      },
      {
        id: 'page-account',
        label: 'Account',
        description: 'View your account details and settings',
        onClick: () => navigate(`/account`),
        leftSection: <IconUser style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
        keywords: ['page'],
      },
      {
        id: 'page-community',
        label: 'Community',
        description: 'View the community forums and discussions',
        onClick: () => navigate(`/community`),
        leftSection: <IconBrandDiscord style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
        keywords: ['page'],
      },
      {
        id: 'page-support',
        label: 'Support',
        description: 'Support the site on Patreon and get access to additional features',
        onClick: () => navigate(`/support`),
        leftSection: <IconBrandPatreon style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
        keywords: ['page'],
      },
      {
        id: 'page-legacy-site',
        label: 'Legacy Site',
        description: `Go to the legacy site for original Pathfinder 2e`,
        onClick: () => {
          window.location.href = `https://legacy.wanderersguide.app/`;
        },
        leftSection: <IconArchive style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
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
      actions={
        queryResult === null
          ? []
          : queryResult === false || query === ''
          ? [defaultActions]
          : [...queryResult]
      }
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
        placeholder: 'Search...',
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
  query: string,
  navigate: NavigateFunction,
  openDrawer: SetterOrUpdater<any>,
  theme: MantineTheme
): Promise<SpotlightActionGroupData[] | null | false> {
  let actions: SpotlightActionData[] = [];
  if (query && query.length >= 3) {
    actions = [...(await queryResults(query, openDrawer)), ...actions];
    actions = [...(await fetchCharacters(query, navigate)), ...actions];
    // Add more here.
  }

  const groupedActions = _.groupBy(actions, '_type');

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
  openDrawer: SetterOrUpdater<any>
): Promise<SpotlightActionData[]> {
  const result = await queryByName(query, undefined, 10);

  return result.map((data) => {
    let description = `${data.description}`;
    description = _.truncate(description.split('.')[0] + '.', { length: 80 });
    return {
      id: `${data._type}-${data.id}`,
      label: `${data.name}`,
      description: description,
      onClick: () => {
        openDrawer({ type: data._type, data: { id: data.id } });
      },
      leftSection: <IconFileText style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
      keywords: ['query', `${data._type}`],
      _type: data._type,
    };
  });
}

async function fetchCharacters(
  query: string,
  navigate: NavigateFunction
): Promise<SpotlightActionData[]> {
  const charDetails = await makeRequest<{ characters: Character[]; books: ContentSource[] }>(
    'find-characters',
    {}
  );
  if (!charDetails) return [];
  return charDetails.characters.map((character) => {
    const level = character.level;
    const heritage = character.details?.heritage?.name ?? '';
    const ancestry = character.details?.ancestry?.name ?? '';
    //const background = character.details?.background?.name ?? '';
    const class_ = character.details?.class?.name ?? '';

    let description = `Lvl. ${level} | ${heritage} ${ancestry} | ${class_}`;
    description = _.truncate(description, { length: 80 });
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
      leftSection: <IconFileText style={{ width: rem(24), height: rem(24) }} stroke={1.5} />,
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
