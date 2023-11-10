/* eslint-disable react-refresh/only-export-components */
import {
  ActionIcon,
  Box,
  Button,
  CloseButton,
  Group,
  Overlay,
  Stack,
  TextInput,
  Text,
  Title,
  Transition,
  useMantineTheme,
  LoadingOverlay,
  Loader,
  Badge,
  Pagination,
  ScrollArea,
  Center,
  Portal,
  Avatar,
  MantineColor,
  BackgroundImage,
} from '@mantine/core';
import {
  AbilityBlock,
  AbilityBlockType,
  Ancestry,
  Background,
  Class,
  ContentType,
  Rarity,
  Trait,
} from '../../typing/content';
import { ContextModalProps, modals, openContextModal } from '@mantine/modals';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';
import {
  useClickOutside,
  useDebouncedState,
  useDebouncedValue,
  useHover,
  usePagination,
} from '@mantine/hooks';
import {
  IconChevronDown,
  IconChevronsLeft,
  IconChevronsRight,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PLAYER_CORE_SOURCE_ID,
  getContent,
  getContentStore,
  getEnabledContentSources,
  getTraits,
} from '@content/content-controller';
import { ActionSymbol } from '@common/Actions';
import * as JsSearch from 'js-search';
import { pluralize } from '@utils/strings';

export function SelectContentButton<T = Record<string, any>>(props: {
  type: ContentType;
  onClick: (option: T) => void;
  selectedId?: number;
  options?: {
    abilityBlockType?: AbilityBlockType;
    groupBySource?: boolean;
  };
}) {
  const [selected, setSelected] = useState<T | undefined>();

  // Fill in selected content
  useEffect(() => {
    (async () => {
      if (!props.selectedId) return;
      const content = await getContent<T>(props.type, props.selectedId);
      if (content) {
        setSelected(content);
      }
    })();
  }, [props.selectedId, props.type]);

  const typeName = _.startCase(props.options?.abilityBlockType?.replace('-', ' ') || props.type);
  // @ts-ignore
  const label = selected ? selected.name : `Select ${typeName}`;

  return (
    <Box>
      <Button.Group>
        <Button
          variant={selected ? 'filled' : 'light'}
          size='compact-sm'
          radius='xl'
          onClick={() => {
            selectContent<T>(
              props.type,
              (option) => {
                setSelected(option);
                props.onClick(option);
              },
              {
                abilityBlockType: props.options?.abilityBlockType,
                groupBySource: props.options?.groupBySource,
                // @ts-ignore
                selectedId: selected?.id,
              }
            );
          }}
        >
          {label}
        </Button>
        {selected && (
          <Button
            variant='filled'
            size='compact-sm'
            radius='xl'
            onClick={() => {
              setSelected(undefined);
            }}
          >
            <IconX size='1rem' />
          </Button>
        )}
      </Button.Group>
    </Box>
  );
}

export function selectContent<T = Record<string, any>>(
  type: ContentType,
  onClick: (option: T) => void,
  options?: {
    abilityBlockType?: AbilityBlockType;
    groupBySource?: boolean;
    selectedId?: number;
  }
) {
  openContextModal({
    modal: 'selectContent',
    title: <Title order={3}>Select {_.startCase(options?.abilityBlockType?.replace('-', ' ') || type)}</Title>,
    innerProps: {
      type,
      onClick: (option) => onClick(option as T),
      options,
    },
  });
}

export function SelectContentModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  type: ContentType;
  onClick: (option: Record<string, any>) => void;
  options?: {
    abilityBlockType?: AbilityBlockType;
    groupBySource?: boolean;
    selectedId?: number;
  };
}>) {
  const [openedDrawer, setOpenedDrawer] = useState(false);

  const theme = useMantineTheme();

  const [searchQuery, setSearchQuery] = useDebouncedState('', 200);
  const [selectedSource, setSelectedSource] = useState<number | 'all'>('all');

  const typeName = _.startCase(
    innerProps.options?.abilityBlockType?.replace('-', ' ') || innerProps.type
  );

  const {
    data: contentSources,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [`enabled-content-sources`, {}],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, {}] = queryKey;
      return await getEnabledContentSources();
    },
    enabled: !!innerProps.options?.groupBySource,
  });

  const activeSource = contentSources?.find((source) => source.id === selectedSource);

  const totalOptionCount =
    contentSources?.reduce(
      (total, source) =>
        ((source.meta_data?.counts
          ? source.meta_data.counts[innerProps.options?.abilityBlockType ?? innerProps.type]
          : undefined) ?? 0) + total,
      0
    ) ?? 0;

  return (
    <Box style={{ position: 'relative', height: 455 }}>
      <Transition mounted={openedDrawer} transition='slide-right'>
        {(styles) => (
          <Box
            style={{
              ...styles,
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: theme.colors.dark[7],
              width: 'max(50%, 275px)',
              height: '100%',
              zIndex: 100,

              borderRightWidth: 2,
              borderRightStyle: 'solid',
              borderRightColor: theme.colors.dark[6],
            }}
          >
            <Box
              style={{
                position: 'relative',
                height: '100%',
                //borderTop: '1px solid ' + theme.colors.dark[6],
              }}
            >
              {/* <CloseButton
                variant='subtle'
                size='xs'
                aria-label='Close Content Sources'
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                }}
                m={5}
                onClick={() => setOpenedDrawer(false)}
              /> */}
              {isFetching && (
                <Loader
                  type='bars'
                  style={{
                    position: 'absolute',
                    top: '35%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
              <ContentSourceOption
                name={'All Books'}
                description={`${totalOptionCount.toLocaleString()} ${pluralize(
                  innerProps.options?.abilityBlockType ?? innerProps.type
                )}`}
                onClick={() => {
                  setSelectedSource('all');
                  setOpenedDrawer(false);
                }}
                selected={selectedSource === 'all'}
              />
              {contentSources
                ?.filter(
                  (source) =>
                    source.meta_data?.counts &&
                    source.meta_data.counts[innerProps.options?.abilityBlockType ?? innerProps.type]
                )
                .map((source, index) => (
                  <ContentSourceOption
                    key={index}
                    name={source.name}
                    description={`${source.meta_data!.counts![
                      innerProps.options?.abilityBlockType ?? innerProps.type
                    ].toLocaleString()} ${pluralize(
                      innerProps.options?.abilityBlockType ?? innerProps.type
                    )}`}
                    onClick={() => {
                      setSelectedSource(source.id);
                      setOpenedDrawer(false);
                    }}
                    selected={source.id === selectedSource}
                  />
                ))}
            </Box>
          </Box>
        )}
      </Transition>
      {/* {!openedDrawer && (
        <ActionIcon
          variant='subtle'
          size='md'
          radius='xl'
          aria-label='Open Content Sources'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 100,
          }}
          onClick={() => setOpenedDrawer(true)}
        >
          <IconChevronsRight size='2rem' stroke={1.5} />
        </ActionIcon>
      )} */}
      {openedDrawer && (
        <Overlay
          color={theme.colors.dark[7]}
          backgroundOpacity={0.35}
          blur={2}
          zIndex={99}
          onClick={() => {
            setOpenedDrawer(false);
          }}
        />
      )}
      <Stack gap={10}>
        <Group wrap='nowrap'>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search ${pluralize(typeName.toLowerCase())}`}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {innerProps.options?.groupBySource && (
            <Button
              size='compact-lg'
              fz='xs'
              variant='light'
              onClick={() => setOpenedDrawer(true)}
              rightSection={<IconChevronDown size='1.1rem' />}
              styles={{
                section: {
                  marginLeft: 3,
                },
              }}
            >
              {_.truncate(activeSource?.name ?? 'All Books', { length: 20 })}
            </Button>
          )}
        </Group>

        <SelectionOptions
          type={innerProps.type}
          abilityBlockType={innerProps.options?.abilityBlockType}
          sourceId={innerProps.options?.groupBySource ? selectedSource : undefined}
          selectedId={innerProps.options?.selectedId}
          searchQuery={searchQuery}
          onClick={(option) => {
            innerProps.onClick(option);
            context.closeModal(id);
          }}
        />
      </Stack>
    </Box>
  );
}

function ContentSourceOption(props: {
  name: string;
  description: string;
  onClick: () => void;
  selected?: boolean;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: hovered || props.selected ? theme.colors.dark[6] : 'transparent',
      }}
      onClick={props.onClick}
      justify='space-between'
      align='center'
    >
      <Box>
        <Text>{props.name}</Text>
      </Box>
        <Badge
          variant='dot'
          size='xs'
          styles={{
            root: {
              // @ts-ignore
              '--badge-dot-size': 0,
              textTransform: 'initial',
              color: theme.colors.dark[1],
            },
          }}
        >
          {props.description}
        </Badge>
    </Group>
  );
}

function SelectionOptions(props: {
  searchQuery: string;
  type: ContentType;
  abilityBlockType?: AbilityBlockType;
  sourceId?: number | 'all';
  onClick: (option: Record<string, any>) => void;
  selectedId?: number;
}) {
  const { data, isFetching } = useQuery({
    queryKey: [`select-options-${props.type}`, { sourceId: props.sourceId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { sourceId }] = queryKey;
      return await getContentStore(props.type, {
        fetch: true,
        sourceId: sourceId === 'all' ? undefined : sourceId,
        abilityBlockType: props.abilityBlockType,
      });
    },
  });
  let options = data ? [...data.values()].filter((d) => d) : [];

  // Sort by level/rank then name
  options = options.sort((a, b) => {
    if (a.level && b.level) {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
    } else if (a.rank && b.rank) {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
    }
    return a.name.localeCompare(b.name);
  });

  // Filter options based on source
  if (props.sourceId !== undefined && props.sourceId !== 'all') {
    options = options.filter((option) => option.content_source_id === props.sourceId);
  }

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!data) return;
    search.current.addIndex('name');
    search.current.addIndex('description');
    search.current.addDocuments(options);
  }, [data]);
  const filteredOptions = props.searchQuery ? search.current.search(props.searchQuery) : options;

  return (
    <SelectionOptionsInner
      options={filteredOptions}
      type={props.type}
      abilityBlockType={props.abilityBlockType}
      isLoading={isFetching || !options}
      onClick={props.onClick}
      selectedId={props.selectedId}
    />
  );
}

function SelectionOptionsInner(props: {
  options: Record<string, any>[];
  type: ContentType;
  abilityBlockType?: AbilityBlockType;
  isLoading: boolean;
  onClick: (option: Record<string, any>) => void;
  selectedId?: number;
}) {
  const NUM_PER_PAGE = 20;
  const [activePage, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    scrollToTop();
  }, [props.options]);

  const viewport = useRef<HTMLDivElement>(null);
  const scrollToTop = () => viewport.current?.scrollTo({ top: 0 });

  const typeName = _.startCase(props.abilityBlockType?.replace('-', ' ') || props.type);
  if (!props.isLoading && props.options.length === 0) {
    return (
      <Box pt='lg'>
        <Text fz='md' c='dimmed' ta='center' fs='italic'>
          No {pluralize(typeName.toLowerCase())} found!
        </Text>
      </Box>
    );
  }

  return (
    <>
      <ScrollArea viewportRef={viewport} h={372} style={{ position: 'relative' }}>
        {props.isLoading ? (
          <Loader
            type='bars'
            style={{
              position: 'absolute',
              top: '35%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ) : (
          <SelectionOptionsRoot
            options={props.options.slice(
              (activePage - 1) * NUM_PER_PAGE,
              activePage * NUM_PER_PAGE
            )}
            type={props.type}
            abilityBlockType={props.abilityBlockType}
            onClick={props.onClick}
            selectedId={props.selectedId}
          />
        )}
      </ScrollArea>
      <Center>
        <Pagination
          size='sm'
          total={Math.ceil(props.options.length / NUM_PER_PAGE)}
          value={activePage}
          onChange={(value) => {
            setPage(value);
            scrollToTop();
          }}
        />
      </Center>
    </>
  );
}

function SelectionOptionsRoot(props: {
  options: Record<string, any>[];
  type: ContentType;
  abilityBlockType?: AbilityBlockType;
  onClick: (option: Record<string, any>) => void;
  selectedId?: number;
}) {
  // Render appropriate options based on type
  if (props.type === 'ability-block') {
    if (props.abilityBlockType === 'feat') {
      return (
        <>
          {props.options.map((feat, index) => (
            <FeatSelectionOption
              key={index}
              feat={feat as AbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === feat.id}
            />
          ))}
        </>
      );
    }
  }
  if (props.type === 'class') {
    return (
      <>
        {props.options.map((class_, index) => (
          <ClassSelectionOption
            key={index}
            class_={class_ as Class}
            onClick={props.onClick}
            selected={props.selectedId === class_.id}
            hasSelected={props.selectedId !== undefined}
          />
        ))}
      </>
    );
  }
  if (props.type === 'background') {
    return (
      <>
        {props.options.map((background, index) => (
          <BackgroundSelectionOption
            key={index}
            background={background as Background}
            onClick={props.onClick}
            selected={props.selectedId === background.id}
            hasSelected={props.selectedId !== undefined}
          />
        ))}
      </>
    );
  }
  if (props.type === 'ancestry') {
    return (
      <>
        {props.options.map((ancestry, index) => (
          <AncestrySelectionOption
            key={index}
            ancestry={ancestry as Ancestry}
            onClick={props.onClick}
            selected={props.selectedId === ancestry.id}
            hasSelected={props.selectedId !== undefined}
          />
        ))}
      </>
    );
  }

  console.log(props.options);
  return (
    <Stack>
      {props.type} ({props.abilityBlockType}) TODO
    </Stack>
  );
}

export function FeatSelectionOption(props: {
  feat: AbilityBlock;
  onClick: (feat: AbilityBlock) => void;
  selected?: boolean;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: hovered || props.selected ? theme.colors.dark[6] : 'transparent',
        position: 'relative',
      }}
      onClick={() => props.onClick(props.feat)}
      justify='space-between'
    >
      <Text
        fz={10}
        c='dimmed'
        ta='right'
        w={14}
        style={{
          position: 'absolute',
          top: 15,
          left: 1,
        }}
      >
        {props.feat.level}.
      </Text>
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.feat.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.feat.actions} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end'>
        <Box>
          <TraitsDisplay traitIds={props.feat.traits ?? []} rarity={props.feat.rarity} />
        </Box>
        <Box w={50}></Box>
      </Group>
      <Button
        size='compact-xs'
        variant='subtle'
        style={{
          position: 'absolute',
          top: 12,
          right: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        Details
      </Button>
    </Group>
  );
}

export function ClassSelectionOption(props: {
  class_: Class;
  onClick: (class_: Class) => void;
  selected?: boolean;
  hasSelected?: boolean;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();

  const openConfirmModal = () =>
    modals.openConfirmModal({
      id: 'change-option',
      title: <Title order={4}>Change Class</Title>,
      children: (
        <Text size='sm'>
          Are you sure you want to change your class? Any previous class selections will be erased.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => props.onClick(props.class_),
    });

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: hovered || props.selected ? theme.colors.dark[6] : 'transparent',
        position: 'relative',
      }}
      onClick={() => {
        if (props.hasSelected && !props.selected) {
          openConfirmModal();
        } else {
          props.onClick(props.class_);
        }
      }}
      justify='space-between'
    >
      <Group wrap='nowrap'>
        <Avatar
          src={props.class_.artwork_url}
          radius='sm'
          styles={{
            image: {
              objectFit: 'contain',
            },
          }}
        />

        <div style={{ flex: 1 }}>
          <Text size='sm' fw={500}>
            {props.class_.name}
          </Text>

          <Group gap={5}>
            <Badge
              variant='dot'
              size='xs'
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': 0,
                },
              }}
              c='gray.6'
            >
              {props.class_.hp} HP
            </Badge>
            <Badge
              variant='dot'
              size='xs'
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': 0,
                },
              }}
              c='gray.6'
            >
              {props.class_.key_attribute}
            </Badge>
          </Group>
        </div>
      </Group>
      <Group wrap='nowrap' justify='flex-end'>
        <Box>
          <TraitsDisplay traitIds={[]} rarity={props.class_.rarity} />
        </Box>
        <Box w={50}></Box>
      </Group>
      <Button
        size='compact-xs'
        variant='subtle'
        style={{
          position: 'absolute',
          top: 20,
          right: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        Details
      </Button>
    </Group>
  );
}

export function AncestrySelectionOption(props: {
  ancestry: Ancestry;
  onClick: (ancestry: Ancestry) => void;
  selected?: boolean;
  hasSelected?: boolean;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();

  const openConfirmModal = () =>
    modals.openConfirmModal({
      id: 'change-option',
      title: <Title order={4}>Change Ancestry</Title>,
      children: (
        <Text size='sm'>
          Are you sure you want to change your ancestry? Any previous ancestry selections will be
          erased.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => props.onClick(props.ancestry),
    });

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: hovered || props.selected ? theme.colors.dark[6] : 'transparent',
        position: 'relative',
      }}
      onClick={() => {
        if (props.hasSelected && !props.selected) {
          openConfirmModal();
        } else {
          props.onClick(props.ancestry);
        }
      }}
      justify='space-between'
    >
      <Group wrap='nowrap'>
        <Avatar
          src={props.ancestry.artwork_url}
          radius='sm'
          styles={{
            image: {
              objectFit: 'contain',
            },
          }}
        />

        <div style={{ flex: 1 }}>
          <Text size='sm' fw={500}>
            {props.ancestry.name}
          </Text>

          <Group gap={5}>
            <Badge
              variant='dot'
              size='xs'
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': 0,
                },
              }}
              c='gray.6'
            >
              {props.ancestry.hp} HP
            </Badge>
            <Badge
              variant='dot'
              size='xs'
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': 0,
                },
              }}
              c='gray.6'
            >
              ANY, STR/DEX
            </Badge>
          </Group>
        </div>
      </Group>
      <Group wrap='nowrap' justify='flex-end'>
        <Box>
          <TraitsDisplay traitIds={[]} rarity={props.ancestry.rarity} />
        </Box>
        <Box w={50}></Box>
      </Group>
      <Button
        size='compact-xs'
        variant='subtle'
        style={{
          position: 'absolute',
          top: 20,
          right: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        Details
      </Button>
    </Group>
  );
}

export function BackgroundSelectionOption(props: {
  background: Background;
  onClick: (background: Background) => void;
  selected?: boolean;
  hasSelected?: boolean;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();

  const openConfirmModal = () =>
    modals.openConfirmModal({
      id: 'change-option',
      title: <Title order={4}>Change Background</Title>,
      children: (
        <Text size='sm'>
          Are you sure you want to change your background? Any previous background selections will
          be erased.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => props.onClick(props.background),
    });

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: hovered || props.selected ? theme.colors.dark[6] : 'transparent',
        position: 'relative',
      }}
      onClick={() => {
        if (props.hasSelected && !props.selected) {
          openConfirmModal();
        } else {
          props.onClick(props.background);
        }
      }}
      justify='space-between'
    >
      <Group wrap='nowrap'>
        <div style={{ flex: 1 }}>
          <Text size='sm' fw={500}>
            {props.background.name}
          </Text>

          <Group gap={5}>
            <Badge
              variant='dot'
              size='xs'
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': 0,
                },
              }}
              c='gray.6'
            >
              ANY
            </Badge>
            <Badge
              variant='dot'
              size='xs'
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': 0,
                },
              }}
              c='gray.6'
            >
              ANY
            </Badge>
          </Group>
        </div>
      </Group>
      <Group wrap='nowrap' justify='flex-end'>
        <Box>
          <TraitsDisplay traitIds={[]} rarity={props.background.rarity} />
        </Box>
        <Box w={50}></Box>
      </Group>
      <Button
        size='compact-xs'
        variant='subtle'
        style={{
          position: 'absolute',
          top: 20,
          right: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        Details
      </Button>
    </Group>
  );
}

export function TraitsDisplay(props: { traitIds: number[]; rarity?: Rarity }) {
  
  const theme = useMantineTheme();

  const { data: traits } = useQuery({
    queryKey: [`find-traits-${props.traitIds.join('_')}`, {}],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, {}] = queryKey;

      if (props.traitIds.length === 0) return [];
      return await getTraits(props.traitIds);
    },
  });

  if (!traits) {
    return <Loader color='blue' size='xs' type='dots' />;
  }

  return (
    <Group gap={3}>
      {props.rarity && <RarityDisplay rarity={props.rarity} />}
      {traits.map((trait, index) => (
        <Badge
          key={index}
          variant='dot'
          size='xs'
          styles={{
            root: {
              // @ts-ignore
              '--badge-dot-size': trait.meta_data?.important ? undefined : 0,
              textTransform: 'initial',
              color: theme.colors.dark[1],
            },
          }}
        >
          {trait.name}
        </Badge>
      ))}
    </Group>
  );
}

export function RarityDisplay(props: { rarity: Rarity }) {
  if (props.rarity === 'COMMON') return null;

  let color: MantineColor = 'gray';
  if (props.rarity === 'UNCOMMON') color = 'teal';
  if (props.rarity === 'RARE') color = 'indigo';
  if (props.rarity === 'UNIQUE') color = 'violet';

  return (
    <Badge
      size='xs'
      color={color}
      styles={{
        root: {
          textTransform: 'initial',
        },
      }}
    >
      {_.startCase(props.rarity.toLowerCase())}
    </Badge>
  );
}
