/* eslint-disable react-refresh/only-export-components */
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import { BuyItemButton } from '@common/BuyItemButton';
import TraitsDisplay from '@common/TraitsDisplay';
import { fetchContentAll, fetchContentById, fetchContentSources } from '@content/content-store';
import { isActionCost } from '@content/content-utils';
import { GenericData } from '@drawers/types/GenericDrawer';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  CloseButton,
  Divider,
  FocusTrap,
  Group,
  Indicator,
  Loader,
  Menu,
  MultiSelect,
  Overlay,
  Pagination,
  Popover,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Transition,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useDebouncedState, useHover, useMediaQuery } from '@mantine/hooks';
import { ContextModalProps, modals, openContextModal } from '@mantine/modals';
import {
  IconArrowNarrowRight,
  IconCheck,
  IconChevronDown,
  IconCircleDotFilled,
  IconCopy,
  IconDots,
  IconFilter,
  IconQuestionMark,
  IconReplace,
  IconSearch,
  IconTransform,
  IconTrash,
  IconX,
  IconZoomCheck,
  IconZoomScan,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ExtendedProficiencyType, ProficiencyType, VariableListStr, VariableProf } from '@typing/variables';
import { pluralize, toLabel } from '@utils/strings';
import { getStatBlockDisplay, getStatDisplay } from '@variables/initial-stats-display';
import { meetsPrerequisites } from '@variables/prereq-detection';
import {
  getAllAncestryTraitVariables,
  getAllArchetypeTraitVariables,
  getAllAttributeVariables,
  getAllClassTraitVariables,
  getVariable,
} from '@variables/variable-manager';
import {
  isProficiencyType,
  maxProficiencyType,
  nextProficiencyType,
  prevProficiencyType,
  proficiencyTypeToLabel,
} from '@variables/variable-utils';
import * as JsSearch from 'js-search';
import * as _ from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  AbilityBlock,
  AbilityBlockType,
  Ancestry,
  Background,
  Class,
  ContentType,
  Creature,
  Item,
  Language,
  Spell,
  Trait,
  VersatileHeritage,
} from '../../typing/content';
import { characterState } from '@atoms/characterAtoms';
import { DrawerType } from '@typing/index';
import { hasTraitType } from '@utils/traits';
import { ObjectWithUUID } from '@operations/operation-utils';
import { isItemArchaic, isItemWeapon } from '@items/inv-utils';
import { getAdjustedAncestryOperations } from '@operations/operation-controller';
import { phoneQuery } from '@utils/mobile-responsive';

interface FilterOptions {
  options: {
    title: string;
    type: 'MULTI-SELECT' | 'SELECT' | 'TRAITS-SELECT' | 'TEXT-INPUT' | 'NUMBER-INPUT' | 'CHECKBOX';
    key: string;
    options?: string[] | { label: string; value: string }[];
  }[];
}

export function SelectContentButton<T extends Record<string, any> = Record<string, any>>(props: {
  type: ContentType;
  onClick: (option: T) => void;
  onClear?: () => void;
  selectedId?: number;
  options?: {
    overrideOptions?: T[];
    overrideLabel?: string;
    abilityBlockType?: AbilityBlockType;
    skillAdjustment?: ExtendedProficiencyType;
    groupBySource?: boolean;
    filterOptions?: FilterOptions;
    filterFn?: (option: T) => boolean;
    includeDetails?: boolean;
    includeOptions?: boolean;
  };
}) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [selected, setSelected] = useState<T | undefined>();

  // Fill in selected content
  useEffect(() => {
    (async () => {
      if (!props.selectedId) {
        setSelected(undefined);
        return;
      }
      if (_.isNumber(props.selectedId)) {
        const content = await fetchContentById<T>(props.type, props.selectedId);
        if (content) {
          setSelected(content);
          return;
        }
      }
      if (props.options?.overrideOptions) {
        const option = props.options.overrideOptions.find(
          // @ts-ignore
          (option) => option.id === props.selectedId
        );
        if (option) {
          setSelected(option);
          return;
        }
      }
    })();
  }, [props.selectedId, props.type, props.options?.overrideOptions]);

  const typeName = toLabel(props.options?.abilityBlockType || props.type);

  const label = selected ? selected.name : props.options?.overrideLabel ?? `Select ${typeName}`;

  const onSelect = () => {
    selectContent<T>(
      props.type,
      (option) => {
        setSelected(option);
        props.onClick(option);
      },
      {
        overrideOptions: props.options?.overrideOptions as Record<string, any>[],
        overrideLabel: props.options?.overrideLabel,
        abilityBlockType: props.options?.abilityBlockType,
        groupBySource: props.options?.groupBySource,
        skillAdjustment: props.options?.skillAdjustment,
        // @ts-ignore
        selectedId: selected?.id,
        // @ts-ignore
        filterFn: props.options?.filterFn,
        includeDetails: props.options?.includeDetails,
        includeOptions: props.options?.includeOptions,
      }
    );
  };

  const drawerType: DrawerType = props.options?.abilityBlockType ?? props.type;
  const specialSelect = drawerType === 'ability-block';
  const onView = () => {
    openDrawer({
      type: drawerType,
      data: { id: selected?.id },
      extra: { addToHistory: true },
    });
  };

  return (
    <Button.Group className='selection-choice-base'>
      <Button
        className={selected ? 'selection-choice-selected' : 'selection-choice-unselected'}
        variant={selected ? 'light' : 'filled'}
        size='compact-sm'
        radius='xl'
        w={specialSelect ? undefined : 160}
        miw={specialSelect ? 140 : undefined}
        onClick={() => {
          if (selected && !specialSelect) {
            onView();
          } else {
            onSelect();
          }
        }}
      >
        {label}
      </Button>
      {selected && (
        <>
          {!specialSelect && (
            <Button
              variant='light'
              size='compact-sm'
              radius='xl'
              onClick={() => {
                onSelect();
              }}
              style={{
                borderLeft: '1px solid',
              }}
            >
              <IconTransform size='0.9rem' />
            </Button>
          )}
          <Button
            variant='light'
            size='compact-sm'
            radius='xl'
            onClick={() => {
              setSelected(undefined);
              props.onClear && props.onClear();
            }}
            style={{
              borderLeft: '1px solid',
            }}
          >
            <IconX size='1rem' />
          </Button>
        </>
      )}
    </Button.Group>
  );
}

export function selectContent<T = Record<string, any>>(
  type: ContentType,
  onClick: (option: T) => void,
  options?: {
    overrideOptions?: Record<string, any>[];
    overrideLabel?: string;
    abilityBlockType?: AbilityBlockType;
    skillAdjustment?: ExtendedProficiencyType;
    groupBySource?: boolean;
    filterOptions?: FilterOptions;
    selectedId?: number;
    filterFn?: (option: Record<string, any>) => boolean;
    includeDetails?: boolean;
    includeOptions?: boolean;
  }
) {
  let label = `Select ${toLabel(options?.abilityBlockType || type)}`;
  if (options?.overrideLabel) label = options.overrideLabel;

  openContextModal({
    modal: 'selectContent',
    title: <Title order={3}>{label}</Title>,
    innerProps: {
      type,
      onClick: (option) => onClick(option as T),
      options,
    },
  });
}

export default function SelectContentModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  type: ContentType;
  onClick: (option: Record<string, any>) => void;
  options?: {
    overrideOptions?: Record<string, any>[];
    abilityBlockType?: AbilityBlockType;
    skillAdjustment?: ExtendedProficiencyType;
    groupBySource?: boolean;
    filterOptions?: FilterOptions;
    selectedId?: number;
    filterFn?: (option: Record<string, any>) => boolean;
    includeDetails?: boolean;
    includeOptions?: boolean;
  };
}>) {
  const [openedDrawer, setOpenedDrawer] = useState(false);

  const theme = useMantineTheme();

  const [searchQuery, setSearchQuery] = useDebouncedState('', 200);
  const [selectedSource, setSelectedSource] = useState<number | 'all'>('all');

  const [filterSelections, setFilterSelections] = useState<Record<string, any>>({});
  const [openedFilters, setOpenedFilters] = useState(false);

  const updateFilterSelection = (key: string, value: any) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      // Remove
      const newFilterSelections = { ...filterSelections };
      delete newFilterSelections[key];
      setFilterSelections(newFilterSelections);
    } else {
      // Add
      setFilterSelections((prev) => ({ ...prev, [key]: value }));
    }
  };

  const getMergedFilterFn = () => {
    const newFilterFn = (option: Record<string, any>) => {
      for (const key of Object.keys(filterSelections)) {
        const value = option[key];
        const filterValue = filterSelections[key];
        if (Array.isArray(value)) {
          if (Array.isArray(filterValue)) {
            if (!value.every((val) => filterValue.includes(val))) {
              return false;
            }
          } else {
            if (!filterValue.includes(value)) {
              return false;
            }
          }
        } else if (typeof value === 'number') {
          if (Array.isArray(filterValue)) {
            if (!filterValue.find((val) => `${val}` === `${value}`)) {
              return false;
            }
          } else {
            if (`${value}` !== `${filterValue}`) {
              return false;
            }
          }
        } else if (typeof value === 'string') {
          if (Array.isArray(filterValue)) {
            if (!filterValue.find((val) => value.toLowerCase().includes(val.toLowerCase()))) {
              return false;
            }
          } else {
            if (!value.toLowerCase().includes(filterValue.toLowerCase())) {
              return false;
            }
          }
        } else if (typeof value === 'boolean') {
          if (Array.isArray(filterValue)) {
            if (!filterValue.find((val) => val === value)) {
              return false;
            }
          } else {
            if (value !== filterValue) {
              return false;
            }
          }
        }
      }
      return innerProps.options?.filterFn ? innerProps.options.filterFn(option) : true;
    };
    return newFilterFn;
  };

  const typeName = toLabel(innerProps.options?.abilityBlockType || innerProps.type);

  const { data: contentSources, isFetching } = useQuery({
    queryKey: [`enabled-content-sources`, {}],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, {}] = queryKey;
      return await fetchContentSources();
    },
    enabled: !!innerProps.options?.groupBySource && !innerProps.options?.overrideOptions,
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

  const getSelectionContents = (selectionOptions: React.ReactNode) => (
    <Stack gap={10}>
      <Group wrap='nowrap'>
        <FocusTrap active={true}>
          <TextInput
            data-autofocus
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search ${pluralize(typeName.toLowerCase())}`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />
        </FocusTrap>
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

        {innerProps.options?.filterOptions && (
          <Popover
            width={200}
            position='bottom'
            withArrow
            shadow='md'
            opened={openedFilters}
            closeOnClickOutside={false}
          >
            <Popover.Target>
              <Indicator
                inline
                label={`${Object.keys(filterSelections).length}`}
                size={16}
                zIndex={1000}
                disabled={Object.keys(filterSelections).length === 0}
              >
                <ActionIcon
                  size='lg'
                  variant='light'
                  radius='md'
                  aria-label='Filters'
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setOpenedFilters(!openedFilters);
                  }}
                >
                  <IconFilter size='1rem' />
                </ActionIcon>
              </Indicator>
            </Popover.Target>
            <Popover.Dropdown>
              <Group wrap='nowrap' justify='space-between'>
                <Title order={5}>Filters</Title>
                <CloseButton
                  onClick={() => {
                    setOpenedFilters(false);
                  }}
                />
              </Group>
              <Divider mt={5} />
              <Stack gap={10}>
                {innerProps.options.filterOptions.options.map((option, index) => (
                  <Box key={index}>
                    {option.type === 'MULTI-SELECT' && (
                      <MultiSelect
                        label={option.title}
                        data={option.options ?? []}
                        onChange={(value) => {
                          updateFilterSelection(option.key, value);
                        }}
                        value={filterSelections[option.key] ?? []}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        )}
      </Group>

      {selectionOptions}
    </Stack>
  );

  /// Handle Class Feats ///

  const [classFeatTab, setClassFeatTab] = useState<string | null>('class-feat');
  const isClassFeat = useMemo(() => {
    if (innerProps.options?.abilityBlockType !== 'feat') return false;

    const classTraitIds = getAllClassTraitVariables('CHARACTER').map((v) => v.value) ?? [];
    const options = innerProps.options?.overrideOptions ?? [];
    if (options.length === 0) return false;
    if (classTraitIds.length === 0) return false;

    // Check if all of the selection options contain at least one of the class traits
    for (const option of options) {
      if (_.intersection(classTraitIds, option.traits ?? []).length === 0) {
        return false;
      }
    }

    return true;
  }, [innerProps.options?.abilityBlockType, innerProps.options?.overrideOptions]);
  const classFeatSourceLevel =
    innerProps.options?.overrideOptions && innerProps.options?.overrideOptions.length > 0
      ? innerProps.options?.overrideOptions?.[0]?._source_level
      : 0;

  const { data: selectedClassFeat } = useQuery({
    queryKey: [`select-content-selected-class-feat`, { selectedId: innerProps.options?.selectedId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { selectedId }] = queryKey;
      return await fetchContentById<AbilityBlock>('ability-block', selectedId ?? -1);
    },
    enabled: !!innerProps.options?.selectedId && isClassFeat,
  });

  useEffect(() => {
    if (!selectedClassFeat) return;

    if (hasTraitType('DEDICATION', selectedClassFeat.traits)) {
      setClassFeatTab('add-dedication');
    } else if (
      _.intersection(
        getAllArchetypeTraitVariables('CHARACTER').map((v) => v.value) ?? [],
        selectedClassFeat.traits ?? []
      ).length > 0
    ) {
      setClassFeatTab('archetype-feat');
    } else {
      setClassFeatTab('class-feat');
    }
  }, [selectedClassFeat]);

  /// ------------------ ///

  /// Handle Versatile Heritages ///

  const [versHeritageTab, setVersHeritageTab] = useState<string | null>('ancestry-heritage');
  const isHeritage = useMemo(() => {
    // Do all this because sometimes we can have a heritage select that isn't abilityBlockType === 'heritage'
    if (innerProps.options?.abilityBlockType === 'feat') return false;

    const ancestryTraitIds = getAllAncestryTraitVariables('CHARACTER').map((v) => v.value) ?? [];
    const options = innerProps.options?.overrideOptions ?? [];
    if (options.length === 0) return false;
    if (ancestryTraitIds.length === 0) return false;

    // Check if all of the selection options contain at least one of the ancestry traits
    for (const option of options) {
      if (_.intersection(ancestryTraitIds, option.traits ?? []).length === 0) {
        return false;
      }
    }

    return true;
  }, [innerProps.options?.overrideOptions, innerProps.options?.abilityBlockType]);

  const { data: versHeritageData } = useQuery({
    queryKey: [`select-content-vers-heritage-data`, { selectedId: innerProps.options?.selectedId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { selectedId }] = queryKey;
      const heritage = await fetchContentById<AbilityBlock>('ability-block', selectedId ?? -1);
      const versHeritages = await fetchContentAll<VersatileHeritage>('versatile-heritage');
      return {
        heritage,
        versHeritages,
      };
    },
    enabled: isHeritage,
  });

  useEffect(() => {
    if (!versHeritageData) return;
    const verHeritage = versHeritageData.versHeritages.find((v) => v.heritage_id === versHeritageData.heritage?.id);
    if (verHeritage) {
      setVersHeritageTab('versatile-heritage');
    } else {
      setVersHeritageTab('ancestry-heritage');
    }
  }, [versHeritageData]);

  return (
    <Box style={{ position: 'relative', height: isClassFeat || isHeritage ? 490 : 455 }}>
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
                    ].toLocaleString()} ${pluralize(innerProps.options?.abilityBlockType ?? innerProps.type)}`}
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

      {isClassFeat && (
        <Tabs value={classFeatTab} onChange={setClassFeatTab}>
          <Tabs.List grow mb={10}>
            <Tabs.Tab value='class-feat'>Class Feats</Tabs.Tab>
            <Tabs.Tab value='archetype-feat'>Archetype Feats</Tabs.Tab>
            <Tabs.Tab value='add-dedication'>Add Dedication</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='class-feat'>
            <Box>
              {getSelectionContents(
                <SelectionOptions
                  type={innerProps.type}
                  abilityBlockType={innerProps.options?.abilityBlockType}
                  skillAdjustment={innerProps.options?.skillAdjustment}
                  sourceId={innerProps.options?.groupBySource ? selectedSource : undefined}
                  selectedId={innerProps.options?.selectedId}
                  overrideOptions={innerProps.options?.overrideOptions}
                  searchQuery={searchQuery}
                  onClick={(option) => {
                    innerProps.onClick(option);
                    context.closeModal(id);
                  }}
                  filterFn={getMergedFilterFn()}
                  includeOptions={innerProps.options?.includeOptions}
                  includeDetails={innerProps.options?.includeDetails}
                />
              )}
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value='archetype-feat'>
            <Box>
              {getSelectionContents(
                <SelectionOptions
                  type='ability-block'
                  abilityBlockType='feat'
                  sourceId={innerProps.options?.groupBySource ? selectedSource : undefined}
                  selectedId={innerProps.options?.selectedId}
                  searchQuery={searchQuery}
                  onClick={(option) => {
                    innerProps.onClick({
                      ...option,
                      // Need this for selection ops to work correctly
                      // since we're not using the override options
                      _select_uuid: `${option.id}`,
                      _content_type: 'ability-block',
                    } satisfies ObjectWithUUID);
                    context.closeModal(id);
                  }}
                  filterFn={(option) =>
                    _.intersection(
                      getAllArchetypeTraitVariables('CHARACTER').map((v) => v.value) ?? [],
                      option.traits ?? []
                    ).length > 0 && option.level <= classFeatSourceLevel
                  }
                  includeOptions={innerProps.options?.includeOptions}
                  includeDetails={innerProps.options?.includeDetails}
                />
              )}
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value='add-dedication'>
            <Box>
              {getSelectionContents(
                <SelectionOptions
                  type='ability-block'
                  abilityBlockType='feat'
                  sourceId={innerProps.options?.groupBySource ? selectedSource : undefined}
                  selectedId={innerProps.options?.selectedId}
                  searchQuery={searchQuery}
                  onClick={(option) => {
                    innerProps.onClick({
                      ...option,
                      // Need this for selection ops to work correctly
                      // since we're not using the override options
                      _select_uuid: `${option.id}`,
                      _content_type: 'ability-block',
                    } satisfies ObjectWithUUID);
                    context.closeModal(id);
                  }}
                  filterFn={(option) =>
                    hasTraitType('DEDICATION', option.traits) && option.level <= classFeatSourceLevel
                  }
                  includeOptions={innerProps.options?.includeOptions}
                  includeDetails={innerProps.options?.includeDetails}
                />
              )}
            </Box>
          </Tabs.Panel>
        </Tabs>
      )}

      {isHeritage && (
        <Tabs value={versHeritageTab} onChange={setVersHeritageTab}>
          <Tabs.List grow mb={10}>
            <Tabs.Tab value='ancestry-heritage'>Ancestry Heritages</Tabs.Tab>
            <Tabs.Tab value='versatile-heritage'>Versatile Heritages</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='ancestry-heritage'>
            <Box>
              {getSelectionContents(
                <SelectionOptions
                  type={innerProps.type}
                  abilityBlockType={innerProps.options?.abilityBlockType}
                  skillAdjustment={innerProps.options?.skillAdjustment}
                  sourceId={innerProps.options?.groupBySource ? selectedSource : undefined}
                  selectedId={innerProps.options?.selectedId}
                  overrideOptions={innerProps.options?.overrideOptions}
                  searchQuery={searchQuery}
                  onClick={(option) => {
                    innerProps.onClick(option);
                    context.closeModal(id);
                  }}
                  filterFn={(option) =>
                    getMergedFilterFn() && !versHeritageData?.versHeritages.find((v) => v.heritage_id === option.id)
                  }
                  includeOptions={innerProps.options?.includeOptions}
                  includeDetails={innerProps.options?.includeDetails}
                />
              )}
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value='versatile-heritage'>
            <Box>
              {getSelectionContents(
                <SelectionOptions
                  type='ability-block'
                  abilityBlockType='heritage'
                  sourceId={innerProps.options?.groupBySource ? selectedSource : undefined}
                  selectedId={innerProps.options?.selectedId}
                  searchQuery={searchQuery}
                  onClick={(option) => {
                    innerProps.onClick({
                      ...option,
                      // Need this for selection ops to work correctly
                      // since we're not using the override options
                      _select_uuid: `${option.id}`,
                      _content_type: 'ability-block',
                    } satisfies ObjectWithUUID);
                    context.closeModal(id);
                  }}
                  filterFn={(option) => !!versHeritageData?.versHeritages.find((v) => v.heritage_id === option.id)}
                  includeOptions={innerProps.options?.includeOptions}
                  includeDetails={innerProps.options?.includeDetails}
                />
              )}
            </Box>
          </Tabs.Panel>
        </Tabs>
      )}

      {!(isClassFeat || isHeritage) && (
        <Box>
          {getSelectionContents(
            <SelectionOptions
              type={innerProps.type}
              abilityBlockType={innerProps.options?.abilityBlockType}
              skillAdjustment={innerProps.options?.skillAdjustment}
              sourceId={innerProps.options?.groupBySource ? selectedSource : undefined}
              selectedId={innerProps.options?.selectedId}
              overrideOptions={innerProps.options?.overrideOptions}
              searchQuery={searchQuery}
              onClick={(option) => {
                innerProps.onClick(option);
                context.closeModal(id);
              }}
              filterFn={getMergedFilterFn()}
              includeOptions={innerProps.options?.includeOptions}
              includeDetails={innerProps.options?.includeDetails}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

function ContentSourceOption(props: { name: string; description: string; onClick: () => void; selected?: boolean }) {
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
  skillAdjustment?: ExtendedProficiencyType;
  abilityBlockType?: AbilityBlockType;
  sourceId?: number | 'all';
  onClick: (option: Record<string, any>) => void;
  selectedId?: number;
  overrideOptions?: Record<string, any>[];
  filterFn?: (option: Record<string, any>) => boolean;
  includeOptions?: boolean;
  includeDetails?: boolean;
}) {
  const { data, isFetching } = useQuery({
    queryKey: [`select-content-options-${props.type}`, { sourceId: props.sourceId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { sourceId }] = queryKey;
      return (await fetchContentAll(props.type, sourceId === 'all' || !sourceId ? undefined : [sourceId])) ?? null;
    },
    refetchOnMount: true,
    //enabled: !props.overrideOptions, Run even for override options to update JsSearch
  });
  let options = useMemo(() => (data ? [...data.values()] : []), [data]);
  if (props.overrideOptions) options = props.overrideOptions;
  options = options.filter((d) => d).filter(props.filterFn ? props.filterFn : () => true);

  // Filter options based on source
  if (props.sourceId !== undefined && props.sourceId !== 'all') {
    options = options.filter((option) => option.content_source_id === props.sourceId);
  }

  // Filter by ability block type
  if (props.abilityBlockType) {
    options = options.filter((option) => option.type === props.abilityBlockType);
  } else {
    // An ability block type is required for ability blocks
    if (props.type === 'ability-block' && (!props.overrideOptions || props.overrideOptions.length === 0)) {
      options = [];
    }
  }

  // Filter out already selected feats
  if (props.abilityBlockType === 'feat') {
    const featIds = getVariable<VariableListStr>('CHARACTER', 'FEAT_IDS')?.value.map((v) => parseInt(v)) ?? [];
    options = options.filter((option) => !featIds.includes(option.id) || option.meta_data?.can_select_multiple_times);
  }

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!options) return;
    search.current.addIndex('name');
    //search.current.addIndex('description');
    search.current.addDocuments(options);
  }, [options]);
  let filteredOptions = props.searchQuery
    ? (search.current.search(props.searchQuery) as Record<string, any>[])
    : options;

  // Sort by level/rank then name
  filteredOptions = filteredOptions.sort((a, b) => {
    if (a.level !== undefined && b.level !== undefined) {
      if (a.level !== b.level) {
        // Sort greatest first if it's overrideOptions
        if (props.overrideOptions) {
          return b.level - a.level;
        } else {
          return a.level - b.level;
        }
      }
    } else if (a.rank !== undefined && b.rank !== undefined) {
      if (a.rank !== b.rank) {
        // Sort greatest first if it's overrideOptions
        if (props.overrideOptions) {
          return b.rank - a.rank;
        } else {
          return a.rank - b.rank;
        }
      }
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <SelectionOptionsInner
      options={filteredOptions}
      type={props.type}
      skillAdjustment={props.skillAdjustment}
      abilityBlockType={props.abilityBlockType}
      isLoading={isFetching || !options}
      onClick={props.onClick}
      selectedId={props.selectedId}
      includeDetails={props.includeDetails}
      includeOptions={props.includeOptions}
    />
  );
}

export function SelectionOptionsInner(props: {
  options: Record<string, any>[];
  type: ContentType;
  skillAdjustment?: ExtendedProficiencyType;
  abilityBlockType?: AbilityBlockType;
  isLoading: boolean;
  onClick: (option: Record<string, any>) => void;
  selectedId?: number;
  includeOptions?: boolean;
  includeDetails?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
  h?: number;
}) {
  const NUM_PER_PAGE = 20;
  const [activePage, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    scrollToTop();
  }, [props.options.length]);

  const viewport = useRef<HTMLDivElement>(null);
  const scrollToTop = () => viewport.current?.scrollTo({ top: 0 });

  const typeName = toLabel(props.abilityBlockType || props.type);
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
      <ScrollArea viewportRef={viewport} h={props.h ?? 372} scrollbars='y' style={{ position: 'relative' }}>
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
            options={props.options.slice((activePage - 1) * NUM_PER_PAGE, activePage * NUM_PER_PAGE)}
            type={props.type}
            skillAdjustment={props.skillAdjustment}
            abilityBlockType={props.abilityBlockType}
            onClick={props.onClick}
            selectedId={props.selectedId}
            includeDetails={props.includeDetails}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
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
  skillAdjustment?: ExtendedProficiencyType;
  abilityBlockType?: AbilityBlockType;
  onClick: (option: Record<string, any>) => void;
  selectedId?: number;
  includeOptions?: boolean;
  includeDetails?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  // Render appropriate options based on type
  if (props.type === 'ability-block') {
    if (props.abilityBlockType === 'feat') {
      return (
        <>
          {props.options.map((feat, index) => (
            <FeatSelectionOption
              key={'feat-' + index}
              feat={feat as AbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === feat.id}
              displayLevel={true}
              includeDetails={true}
              includeOptions={props.includeOptions}
              onDelete={props.onDelete}
              onCopy={props.onCopy}
            />
          ))}
        </>
      );
    } else if (props.abilityBlockType === 'action') {
      return (
        <>
          {props.options.map((action, index) => (
            <ActionSelectionOption
              key={'action-' + index}
              action={action as AbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === action.id}
              includeDetails={props.includeDetails}
              includeOptions={props.includeOptions}
              onDelete={props.onDelete}
              onCopy={props.onCopy}
            />
          ))}
        </>
      );
    } else if (props.abilityBlockType === 'class-feature') {
      return (
        <>
          {props.options.map((classFeature, index) => (
            <ClassFeatureSelectionOption
              key={'class-feature-' + index}
              classFeature={classFeature as AbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === classFeature.id}
              includeDetails={props.includeDetails}
              includeOptions={props.includeOptions}
              onDelete={props.onDelete}
              onCopy={props.onCopy}
            />
          ))}
        </>
      );
    } else if (props.abilityBlockType === 'sense') {
      return (
        <>
          {props.options.map((sense, index) => (
            <SenseSelectionOption
              key={'sense-' + index}
              sense={sense as AbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === sense.id}
              includeOptions={props.includeOptions}
              onDelete={props.onDelete}
              onCopy={props.onCopy}
            />
          ))}
        </>
      );
    } else if (props.abilityBlockType === 'physical-feature') {
      return (
        <>
          {props.options.map((physicalFeature, index) => (
            <PhysicalFeatureSelectionOption
              key={'physical-feature-' + index}
              physicalFeature={physicalFeature as AbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === physicalFeature.id}
              includeDetails={props.includeDetails}
              includeOptions={props.includeOptions}
              onDelete={props.onDelete}
              onCopy={props.onCopy}
            />
          ))}
        </>
      );
    } else if (props.abilityBlockType === 'heritage') {
      return (
        <>
          {props.options.map((heritage, index) => (
            <HeritageSelectionOption
              key={'heritage-' + index}
              heritage={heritage as AbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === heritage.id}
              includeDetails={true}
              includeOptions={props.includeOptions}
              onDelete={props.onDelete}
              onCopy={props.onCopy}
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
            key={'class-' + index}
            class_={class_ as Class}
            onClick={props.onClick}
            selected={props.selectedId === class_.id}
            hasSelected={props.selectedId !== undefined}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
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
            key={'background-' + index}
            background={background as Background}
            onClick={props.onClick}
            selected={props.selectedId === background.id}
            hasSelected={props.selectedId !== undefined}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
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
            key={'ancestry-' + index}
            ancestry={ancestry as Ancestry}
            onClick={props.onClick}
            selected={props.selectedId === ancestry.id}
            hasSelected={props.selectedId !== undefined}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
          />
        ))}
      </>
    );
  }
  if (props.type === 'item') {
    return (
      <>
        {props.options.map((item, index) => (
          <ItemSelectionOption
            key={'item-' + index}
            item={item as Item}
            onClick={props.onClick}
            selected={props.selectedId === item.id}
            includeDetails={props.includeDetails}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
          />
        ))}
      </>
    );
  }
  if (props.type === 'spell') {
    return (
      <>
        {props.options.map((spell, index) => (
          <SpellSelectionOption
            key={'spell-' + index}
            spell={spell as Spell}
            onClick={props.onClick}
            selected={props.selectedId === spell.id}
            includeDetails={props.includeDetails}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
          />
        ))}
      </>
    );
  }
  if (props.type === 'trait') {
    return (
      <>
        {props.options.map((trait, index) => (
          <TraitSelectionOption
            key={'trait-' + index}
            trait={trait as Trait}
            onClick={props.onClick}
            selected={props.selectedId === trait.id}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
          />
        ))}
      </>
    );
  }
  if (props.type === 'language') {
    return (
      <>
        {props.options.map((language, index) => (
          <LanguageSelectionOption
            key={'language-' + index}
            language={language as Language}
            onClick={props.onClick}
            selected={props.selectedId === language.id}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
          />
        ))}
      </>
    );
  }
  if (props.type === 'creature') {
    return (
      <>
        {props.options.map((creature, index) => (
          <CreatureSelectionOption
            key={'creature-' + index}
            creature={creature as Creature}
            onClick={props.onClick}
            selected={props.selectedId === creature.id}
            includeOptions={props.includeOptions}
            onDelete={props.onDelete}
            onCopy={props.onCopy}
          />
        ))}
      </>
    );
  }

  // Skill increase with lore support
  const isSkillIncreaseWithLore = props.skillAdjustment && props.options.find((o) => o.variable === 'SKILL_LORE____');
  if (isSkillIncreaseWithLore) {
    const addNewLore = (option: AbilityBlock) => {
      openContextModal({
        modal: 'addNewLore',
        title: <Title order={3}>Add New Lore</Title>,
        innerProps: {
          onConfirm: (loreName) => {
            props.onClick({
              ...option,
              _select_uuid: `SKILL_LORE_${loreName}`,
            });
          },
        },
      });
    };

    // If the only options are lores, it's adding a new lore. Just shortcut to that.
    if (props.options.filter((o) => o.variable.startsWith('SKILL_LORE_')).length === props.options.length) {
      modals.closeAll();
      addNewLore(isSkillIncreaseWithLore as AbilityBlock);
      return null;
    }

    return (
      <>
        {props.options
          .filter((o) => o.variable !== 'SKILL_LORE____')
          .map((option, index) => (
            <GenericSelectionOption
              key={'generic-' + index}
              option={option as GenericAbilityBlock}
              onClick={props.onClick}
              selected={props.selectedId === option.id}
              skillAdjustment={props.skillAdjustment}
              includeOptions={props.includeOptions}
              onDelete={props.onDelete}
              onCopy={props.onCopy}
            />
          ))}
        <GenericSelectionOption
          option={
            {
              ...isSkillIncreaseWithLore,
              name: `Add New Lore`,
            } as GenericAbilityBlock
          }
          onClick={(option) => {
            addNewLore(option);
          }}
          selected={false}
          skillAdjustment={props.skillAdjustment}
          includeOptions={props.includeOptions}
          onDelete={props.onDelete}
          onCopy={props.onCopy}
        />
      </>
    );
  }

  // Generic ability block. Probably used for variables.
  return (
    <>
      {props.options.map((option, index) => (
        <GenericSelectionOption
          key={'generic-' + index}
          option={option as GenericAbilityBlock}
          onClick={props.onClick}
          selected={props.selectedId === option.id}
          skillAdjustment={props.skillAdjustment}
          includeOptions={props.includeOptions}
          onDelete={props.onDelete}
          onCopy={props.onCopy}
        />
      ))}
    </>
  );
}

interface GenericAbilityBlock extends AbilityBlock {
  _content_type?: ContentType;
  _select_uuid?: string;
  _custom_select?: GenericData;
  _is_core?: boolean;
  _source_level?: number;
}
export function GenericSelectionOption(props: {
  option: GenericAbilityBlock;
  onClick: (option: GenericAbilityBlock) => void;
  selected?: boolean;
  skillAdjustment?: ExtendedProficiencyType;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // @ts-ignore
  const variable = getVariable('CHARACTER', props.option.variable);

  let currentProf: ProficiencyType | undefined | null = (variable as VariableProf)?.value.value;
  let nextProf =
    props.skillAdjustment === '1'
      ? nextProficiencyType(currentProf ?? 'U')
      : props.skillAdjustment === '-1'
        ? prevProficiencyType(currentProf ?? 'U')
        : props.skillAdjustment;

  console.log(currentProf);
  console.log(nextProf);

  // If selected already, show the previous data to reflect the change
  if (props.selected && currentProf) {
    nextProf = currentProf;
    currentProf =
      props.skillAdjustment === '1'
        ? prevProficiencyType(currentProf)
        : props.skillAdjustment === '-1'
          ? nextProficiencyType(currentProf)
          : props.skillAdjustment;
  }

  let limitedByLevel = false;
  if (props.skillAdjustment === '1') {
    if (nextProf && nextProf === 'M' && (props.option._source_level ?? 1) < 7) {
      limitedByLevel = true;
    } else if (nextProf && nextProf === 'L' && (props.option._source_level ?? 1) < 15) {
      limitedByLevel = true;
    }
  }

  let alreadyProficient =
    !props.selected &&
    currentProf &&
    (currentProf === props.skillAdjustment ||
      (isProficiencyType(props.skillAdjustment) &&
        maxProficiencyType(currentProf ?? 'U', props.skillAdjustment) === currentProf));

  if (nextProf === null) {
    alreadyProficient = true;
  }

  const disabled = alreadyProficient || limitedByLevel;

  return (
    <Group
      ref={ref}
      p='sm'
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: disabled
          ? theme.colors.dark[8]
          : hovered || props.selected
            ? theme.colors.dark[6]
            : 'transparent',
        position: 'relative',
      }}
      onClick={() => {
        if (disabled) return;
        props.onClick(props.option);
      }}
      justify='space-between'
    >
      <Group wrap='nowrap' gap={5}>
        <Group pl={8} wrap='nowrap' gap={5}>
          <Text fz='sm'>{props.option.name}</Text>{' '}
          {/* {props.skillAdjustment && variable && (variable as VariableProf).attribute && (
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
              {compactLabels(variableNameToLabel((variable as VariableProf).attribute!))}
            </Badge>
          )} */}
        </Group>
        {props.option._is_core && (
          <ThemeIcon variant='light' size='xs' radius='xl'>
            <IconCircleDotFilled style={{ width: '70%', height: '70%' }} />
          </ThemeIcon>
        )}
      </Group>
      <Group wrap='nowrap' gap={5}>
        {props.skillAdjustment && variable && (
          <Badge
            variant='dot'
            size='xs'
            styles={{
              root: {
                // @ts-ignore
                '--badge-dot-size': 0,
                textTransform: 'initial',
              },
            }}
            c='gray.6'
          >
            <Group gap={2} wrap='nowrap'>
              {alreadyProficient ? (
                <>{proficiencyTypeToLabel(currentProf ?? 'U')}</>
              ) : (
                <>
                  {proficiencyTypeToLabel(currentProf ?? 'U')}
                  <IconArrowNarrowRight size='0.8rem' />
                  {proficiencyTypeToLabel(nextProf ?? 'U')}
                </>
              )}
            </Group>
          </Badge>
        )}
        {props.option._content_type === 'language' && (
          <Button
            size='xs'
            px={5}
            variant='subtle'
            style={{
              position: 'absolute',
              top: 12,
              right: props.includeOptions ? 40 : 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              openDrawer({ type: 'language', data: { id: props.option.id } });
            }}
          >
            Details
          </Button>
        )}
        {props.option._custom_select && (
          <Button
            size='xs'
            px={5}
            variant='subtle'
            style={{
              position: 'absolute',
              top: 12,
              right: props.includeOptions ? 40 : 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              openDrawer({
                type: 'generic',
                data: props.option._custom_select,
              });
            }}
          >
            Details
          </Button>
        )}

        {props.includeOptions && (
          <Menu shadow='md' width={200}>
            <Menu.Target>
              <ActionIcon
                size='sm'
                variant='subtle'
                color='gray.5'
                radius='xl'
                style={{
                  position: 'absolute',
                  top: 13,
                  right: 15,
                }}
                aria-label='Options'
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <IconDots size='1rem' />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Options</Menu.Label>
              <Menu.Item
                leftSection={
                  <IconCopy
                    style={{ width: rem(14), height: rem(14) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onCopy?.(props.option.id);
                    }}
                  />
                }
              >
                Duplicate
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>Danger zone</Menu.Label>
              <Menu.Item
                color='red'
                leftSection={
                  <IconTrash
                    style={{ width: rem(14), height: rem(14) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDelete?.(props.option.id);
                    }}
                  />
                }
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
    </Group>
  );
}

export function FeatSelectionOption(props: {
  feat: AbilityBlock;
  onClick: (feat: AbilityBlock) => void;
  selected?: boolean;
  displayLevel?: boolean;
  includeDetails?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const character = useRecoilValue(characterState);
  const DETECT_PREREQUS = character?.options?.auto_detect_prerequisites ?? false;

  const prereqMet = DETECT_PREREQUS && meetsPrerequisites('CHARACTER', props.feat.prerequisites);

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
      {props.displayLevel && !props.feat.meta_data?.unselectable && (
        <Text
          fz={9}
          c='dimmed'
          ta='right'
          w={14}
          style={{
            position: 'absolute',
            top: 18,
            left: 2,
          }}
        >
          {props.feat.level}.
        </Text>
      )}
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.feat.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.feat.actions} gap={5} />
        </Box>
        {prereqMet && prereqMet.result && (
          <>
            {prereqMet.result === 'FULLY' && (
              <ThemeIcon variant='light' size='xs' radius='xl'>
                <IconCheck style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            )}
            {prereqMet.result === 'PARTIALLY' && (
              <ThemeIcon variant='light' size='xs' radius='xl'>
                <IconZoomCheck style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            )}
            {prereqMet.result === 'UNKNOWN' && (
              <ThemeIcon variant='light' size='xs' radius='xl' color='yellow'>
                <IconQuestionMark style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            )}
            {prereqMet.result === 'NOT' && (
              <ThemeIcon variant='light' size='xs' radius='xl' color='red'>
                <IconX style={{ width: '70%', height: '70%' }} />
              </ThemeIcon>
            )}
          </>
        )}
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay justify='flex-end' size='xs' traitIds={props.feat.traits ?? []} rarity={props.feat.rarity} />
        </Box>
        {(props.includeDetails || props.includeOptions) && <Box w={props.includeOptions ? 80 : 50}></Box>}
      </Group>
      {props.includeDetails && (
        <Button
          size='xs'
          px={5}
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: props.includeOptions ? 40 : 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({ type: 'feat', data: { id: props.feat.id } });
          }}
        >
          Details
        </Button>
      )}
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.feat.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.feat.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function ActionSelectionOption(props: {
  action: AbilityBlock;
  onClick: (action: AbilityBlock) => void;
  selected?: boolean;
  includeOptions?: boolean;
  includeDetails?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => props.onClick(props.action)}
      justify='space-between'
    >
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.action.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.action.actions} gap={5} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.action.traits ?? []}
            rarity={props.action.rarity}
            skill={props.action.meta_data?.skill}
          />
        </Box>
        {(props.includeDetails || props.includeOptions) && <Box w={props.includeOptions ? 80 : 50}></Box>}
      </Group>
      {props.includeDetails && (
        <Button
          size='xs'
          px={5}
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: props.includeOptions ? 40 : 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({ type: 'action', data: { id: props.action.id } });
          }}
        >
          Details
        </Button>
      )}
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.action.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.action.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function ClassFeatureSelectionOption(props: {
  classFeature: AbilityBlock;
  onClick: (classFeature: AbilityBlock) => void;
  selected?: boolean;
  includeOptions?: boolean;
  includeDetails?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => props.onClick(props.classFeature)}
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
        {props.classFeature.level}.
      </Text>
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.classFeature.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.classFeature.actions} gap={5} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.classFeature.traits ?? []}
            rarity={props.classFeature.rarity}
          />
        </Box>
        {(props.includeDetails || props.includeOptions) && <Box w={props.includeOptions ? 80 : 50}></Box>}
      </Group>
      {props.includeDetails && (
        <Button
          size='xs'
          px={5}
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: props.includeOptions ? 40 : 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({
              type: 'class-feature',
              data: { id: props.classFeature.id },
            });
          }}
        >
          Details
        </Button>
      )}
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.classFeature.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.classFeature.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function HeritageSelectionOption(props: {
  heritage: AbilityBlock;
  onClick: (heritage: AbilityBlock) => void;
  selected?: boolean;
  includeDetails?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => props.onClick(props.heritage)}
      justify='space-between'
    >
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.heritage.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.heritage.actions} gap={5} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.heritage.traits ?? []}
            rarity={props.heritage.rarity}
          />
        </Box>
        {(props.includeDetails || props.includeOptions) && <Box w={props.includeOptions ? 80 : 50}></Box>}
      </Group>
      {props.includeDetails && (
        <Button
          size='xs'
          px={5}
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: props.includeOptions ? 40 : 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({ type: 'heritage', data: { id: props.heritage.id } });
          }}
        >
          Details
        </Button>
      )}
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.heritage.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.heritage.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function PhysicalFeatureSelectionOption(props: {
  physicalFeature: AbilityBlock;
  onClick: (physicalFeature: AbilityBlock) => void;
  selected?: boolean;
  includeDetails?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => props.onClick(props.physicalFeature)}
      justify='space-between'
    >
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.physicalFeature.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.physicalFeature.actions} gap={5} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.physicalFeature.traits ?? []}
            rarity={props.physicalFeature.rarity}
          />
        </Box>
        {(props.includeDetails || props.includeOptions) && <Box w={props.includeOptions ? 80 : 50}></Box>}
      </Group>
      {props.includeDetails && (
        <Button
          size='xs'
          px={5}
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: props.includeOptions ? 40 : 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({
              type: 'physical-feature',
              data: { id: props.physicalFeature.id },
            });
          }}
        >
          Details
        </Button>
      )}
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.physicalFeature.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.physicalFeature.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function SenseSelectionOption(props: {
  sense: AbilityBlock;
  onClick: (sense: AbilityBlock) => void;
  selected?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => props.onClick(props.sense)}
      justify='space-between'
    >
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.sense.name}</Text>
        </Box>
        <Box>
          <ActionSymbol cost={props.sense.actions} gap={5} />
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay justify='flex-end' size='xs' traitIds={props.sense.traits ?? []} rarity={props.sense.rarity} />
        </Box>
        <Box w={props.includeOptions ? 80 : 50}></Box>
      </Group>
      <Button
        size='xs'
        px={5}
        variant='subtle'
        style={{
          position: 'absolute',
          top: 12,
          right: props.includeOptions ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDrawer({ type: 'sense', data: { id: props.sense.id } });
        }}
      >
        Details
      </Button>
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.sense.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.sense.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function ClassSelectionOption(props: {
  class_: Class;
  onClick: (class_: Class) => void;
  selected?: boolean;
  hasSelected?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const classHp = getStatDisplay('CHARACTER', 'MAX_HEALTH_CLASS_PER_LEVEL', props.class_.operations ?? [], 'READ');
  const attributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    props.class_.operations ?? [],
    'READ'
  );
  const keyAttribute =
    attributes.length > 0
      ? attributes[0]
      : {
          ui: null,
          operation: null,
        };

  const openConfirmModal = () =>
    modals.openConfirmModal({
      id: 'change-option',
      title: <Title order={4}>Change Class</Title>,
      children: (
        <Text size='sm'>Are you sure you want to change your class? Any previous class selections will be erased.</Text>
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
              {classHp.ui ?? '-'} HP
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
              {keyAttribute.ui ?? 'Varies'}
            </Badge>
          </Group>
        </div>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay justify='flex-end' size='xs' traitIds={[]} rarity={props.class_.rarity} />
        </Box>
        <Box w={props.includeOptions ? 80 : 50}></Box>
      </Group>
      <Button
        size='xs'
        px={5}
        variant='subtle'
        style={{
          position: 'absolute',
          top: 20,
          right: props.includeOptions ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDrawer({ type: 'class', data: { id: props.class_.id } });
        }}
      >
        Details
      </Button>
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.class_.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.class_.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function AncestrySelectionOption(props: {
  ancestry: Ancestry;
  onClick: (ancestry: Ancestry) => void;
  selected?: boolean;
  hasSelected?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const character = useRecoilValue(characterState);

  const operations = character
    ? getAdjustedAncestryOperations('CHARACTER', character, props.ancestry.operations ?? [])
    : props.ancestry.operations ?? [];

  const ancestryHp = getStatDisplay('CHARACTER', 'MAX_HEALTH_ANCESTRY', operations, 'READ');
  const attributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    operations,
    'READ'
  );

  const flawAttributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    operations,
    'READ',
    undefined,
    { onlyNegatives: true }
  );

  const openConfirmModal = () =>
    modals.openConfirmModal({
      id: 'change-option',
      title: <Title order={4}>Change Ancestry</Title>,
      children: (
        <Text size='sm'>
          Are you sure you want to change your ancestry? Any previous ancestry selections will be erased.
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
              {ancestryHp.ui} HP
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
              +
              {attributes.flatMap((attribute, index) =>
                index < attributes.length - 1 ? [attribute.ui, ', '] : [attribute.ui]
              )}
            </Badge>
            {flawAttributes.length > 0 && (
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
                -
                {flawAttributes.flatMap((attribute, index) =>
                  index < flawAttributes.length - 1 ? [attribute.ui, ', '] : [attribute.ui]
                )}
              </Badge>
            )}
          </Group>
        </div>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay justify='flex-end' size='xs' traitIds={[]} rarity={props.ancestry.rarity} />
        </Box>
        <Box w={props.includeOptions ? 80 : 50}></Box>
      </Group>
      <Button
        size='xs'
        px={5}
        variant='subtle'
        style={{
          position: 'absolute',
          top: 20,
          right: props.includeOptions ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDrawer({ type: 'ancestry', data: { id: props.ancestry.id } });
        }}
      >
        Details
      </Button>
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.ancestry.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.ancestry.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function BackgroundSelectionOption(props: {
  background: Background;
  onClick: (background: Background) => void;
  selected?: boolean;
  hasSelected?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const openConfirmModal = () =>
    modals.openConfirmModal({
      id: 'change-option',
      title: <Title order={4}>Change Background</Title>,
      children: (
        <Text size='sm'>
          Are you sure you want to change your background? Any previous background selections will be erased.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => props.onClick(props.background),
    });

  const attributes = getStatBlockDisplay(
    'CHARACTER',
    getAllAttributeVariables('CHARACTER').map((v) => v.name),
    props.background.operations ?? [],
    'READ'
  );

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
            {attributes.map((attribute, index) => (
              <Badge
                key={index}
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
                {attribute.ui}
              </Badge>
            ))}
          </Group>
        </div>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay justify='flex-end' size='xs' traitIds={[]} rarity={props.background.rarity} />
        </Box>
        <Box w={props.includeOptions ? 80 : 50}></Box>
      </Group>
      <Button
        size='xs'
        px={5}
        variant='subtle'
        style={{
          position: 'absolute',
          top: 20,
          right: props.includeOptions ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDrawer({ type: 'background', data: { id: props.background.id } });
        }}
      >
        Details
      </Button>
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.background.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.background.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function ItemSelectionOption(props: {
  item: Item;
  onClick: (item: Item) => void;
  selected?: boolean;
  includeDetails?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
  includeAdd?: boolean;
  onAdd?: (item: Item, type: 'GIVE' | 'BUY' | 'FORMULA') => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => hovered && props.onClick(props.item)}
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
        {props.item.level}.
      </Text>
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.item.name}</Text>
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.item.traits ?? []}
            rarity={props.item.rarity}
            archaic={isItemArchaic(props.item)}
          />
        </Box>
        {(props.includeDetails || props.includeOptions || props.includeAdd) && (
          <Box w={props.includeOptions ? 80 : 55}></Box>
        )}
      </Group>
      {props.includeAdd && (
        <Box
          style={{
            position: 'absolute',
            top: 12,
            right: 10,
          }}
        >
          <BuyItemButton
            onBuy={() => props.onAdd?.(props.item, 'BUY')}
            onGive={() => props.onAdd?.(props.item, 'GIVE')}
            onFormula={() => props.onAdd?.(props.item, 'FORMULA')}
          />
        </Box>
      )}
      {props.includeDetails && (
        <Button
          size='xs'
          px={5}
          variant='subtle'
          style={{
            position: 'absolute',
            top: 12,
            right: props.includeOptions ? 40 : 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer({ type: 'item', data: { id: props.item.id } });
          }}
        >
          Details
        </Button>
      )}
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.item.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.item.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function SpellSelectionOption(props: {
  spell: Spell;
  onClick: (spell: Spell) => void;
  selected?: boolean;
  includeOptions?: boolean;
  includeDetails?: boolean;
  leftSection?: React.ReactNode;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
  noBackground?: boolean;
  hideRank?: boolean;
  exhausted?: boolean;
  px?: number;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const isPhone = useMediaQuery(phoneQuery());

  return (
    <Group
      ref={ref}
      py='sm'
      px={props.px ?? 'sm'}
      style={{
        cursor: 'pointer',
        borderBottom: '1px solid ' + theme.colors.dark[6],
        backgroundColor: (hovered || props.selected) && !props.noBackground ? theme.colors.dark[6] : 'transparent',
        position: 'relative',
        opacity: props.exhausted ? 0.5 : 1,
        width: '100%',
      }}
      onClick={() => props.onClick(props.spell)}
      justify='space-between'
    >
      {!props.hideRank && props.spell.rank !== 0 && (
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
          {props.spell.rank}.
        </Text>
      )}
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm' td={props.exhausted ? 'line-through' : undefined}>
            {props.spell.name}
          </Text>
        </Box>
        {isActionCost(props.spell.cast) && (
          <Box>
            <ActionSymbol cost={props.spell.cast} gap={5} />
          </Box>
        )}
        {props.leftSection && <Box>{props.leftSection}</Box>}
      </Group>
      {!isPhone && (
        <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
          <Box>
            <TraitsDisplay
              justify='flex-end'
              size='xs'
              traitIds={props.spell.traits ?? []}
              rarity={props.spell.rarity}
            />
          </Box>
          <Box w={props.includeOptions ? 80 : 50}></Box>
        </Group>
      )}
      {props.includeDetails === undefined ||
        (props.includeDetails === true && (
          <Button
            size='xs'
            px={5}
            variant='subtle'
            style={{
              position: 'absolute',
              top: 12,
              right: props.includeOptions ? 40 : 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              openDrawer({ type: 'spell', data: { id: props.spell.id } });
            }}
          >
            Details
          </Button>
        ))}
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            {props.onCopy && (
              <Menu.Item
                leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onCopy?.(props.spell.id);
                }}
              >
                Duplicate
              </Menu.Item>
            )}

            {props.onDelete && (
              <Menu.Item
                color='red'
                leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDelete?.(props.spell.id);
                }}
              >
                Delete
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function TraitSelectionOption(props: {
  trait: Trait;
  onClick: (trait: Trait) => void;
  selected?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => props.onClick(props.trait)}
      justify='space-between'
    >
      <Group wrap='nowrap' gap={5}>
        <Indicator
          disabled={!props.trait.meta_data?.important}
          inline
          size={12}
          offset={-10}
          position='middle-end'
          color={theme.colors.gray[5]}
          withBorder
        >
          <Box pl={8}>
            <Text fz='sm'>{props.trait.name}</Text>
          </Box>
        </Indicator>
      </Group>
      <Button
        size='xs'
        px={5}
        variant='subtle'
        style={{
          position: 'absolute',
          top: 12,
          right: props.includeOptions ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDrawer({ type: 'trait', data: { id: props.trait.id } });
        }}
      >
        Details
      </Button>
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.trait.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.trait.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function LanguageSelectionOption(props: {
  language: Language;
  onClick: (language: Language) => void;
  selected?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
      onClick={() => props.onClick(props.language)}
      justify='space-between'
    >
      <Group wrap='nowrap' gap={5}>
        <Box pl={8}>
          <Text fz='sm'>{props.language.name}</Text>
        </Box>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay justify='flex-end' size='xs' traitIds={[]} rarity={props.language.rarity} />
        </Box>
        <Box w={props.includeOptions ? 80 : 50}></Box>
      </Group>
      <Button
        size='xs'
        px={5}
        variant='subtle'
        style={{
          position: 'absolute',
          top: 12,
          right: props.includeOptions ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDrawer({ type: 'language', data: { id: props.language.id } });
        }}
      >
        Details
      </Button>
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.language.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.language.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

export function CreatureSelectionOption(props: {
  creature: Creature;
  onClick: (creature: Creature) => void;
  selected?: boolean;
  hasSelected?: boolean;
  includeOptions?: boolean;
  onDelete?: (id: number) => void;
  onCopy?: (id: number) => void;
}) {
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
        props.onClick(props.creature);
      }}
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
        {props.creature.level}.
      </Text>
      <Group ml={8} wrap='nowrap'>
        <Avatar
          src={props.creature.details.image_url}
          radius='sm'
          styles={{
            image: {
              objectFit: 'contain',
            },
          }}
        />

        <div style={{ flex: 1 }}>
          <Text size='sm' fw={500}>
            {props.creature.name}
          </Text>

          <Group gap={5}>
            {/* {props.creature.family_type && (
              <Badge
                variant='dot'
                size='xs'
                styles={{
                  root: {
                    // @ts-ignore
                    '--badge-dot-size': 0,
                    textTransform: 'initial',
                  },
                }}
                c='gray.6'
              >
                {props.creature.family_type}
              </Badge>
            )} */}
            {/* <Badge
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
              AC {props.creature.stats?.ac}
            </Badge> */}
            {/* <Badge
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
              {props.creature.stats?.hp.max} HP
            </Badge> */}
          </Group>
        </div>
      </Group>
      <Group wrap='nowrap' justify='flex-end' style={{ marginLeft: 'auto' }}>
        <Box>
          <TraitsDisplay
            justify='flex-end'
            size='xs'
            traitIds={props.creature.traits ?? []}
            rarity={props.creature.rarity}
          />
        </Box>
        <Box w={props.includeOptions ? 80 : 50}></Box>
      </Group>
      <Button
        size='xs'
        px={5}
        variant='subtle'
        style={{
          position: 'absolute',
          top: 20,
          right: props.includeOptions ? 40 : 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDrawer({ type: 'creature', data: { id: props.creature.id } });
        }}
      >
        Details
      </Button>
      {props.includeOptions && (
        <Menu shadow='md' width={200}>
          <Menu.Target>
            <ActionIcon
              size='sm'
              variant='subtle'
              color='gray.5'
              radius='xl'
              style={{
                position: 'absolute',
                top: 13,
                right: 15,
              }}
              aria-label='Options'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <IconDots size='1rem' />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Options</Menu.Label>
            <Menu.Item
              leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onCopy?.(props.creature.id);
              }}
            >
              Duplicate
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>Danger zone</Menu.Label>
            <Menu.Item
              color='red'
              leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete?.(props.creature.id);
              }}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}
