/* eslint-disable react-hooks/exhaustive-deps */
import { drawerState } from '@atoms/navAtoms';
import ActionsInput from '@common/ActionsInput';
import { SelectionOptionsInner } from '@common/select/SelectContent';
import TraitsInput from '@common/TraitsInput';
import { fetchContent } from '@content/content-store';
import { defineDefaultSourcesForUser } from '@content/homebrew';
import { mapToDrawerData } from '@drawers/drawer-utils';
import {
  Accordion,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Title,
  Text,
  Stack,
  Pill,
  Badge,
  Divider,
  Select,
  TextInput,
  NumberInput,
  RangeSlider,
  TagsInput,
  Center,
  ActionIcon,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { makeRequest } from '@requests/request-manager';
import { IconBoomFilled, IconLineDotted } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  AbilityBlockType,
  ActionCost,
  Availability,
  ContentSource,
  ContentType,
  ItemGroup,
  Rarity,
  Size,
} from '@typing/content';
import { DrawerType } from '@typing/index';
import { Operation } from '@typing/operations';
import { actionCostToLabel } from '@utils/actions';
import { displayError } from '@utils/notifications';
import { hashData } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { useEffect, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';

interface FiltersParams {
  type?: ContentType;
  name?: string;
  rarity?: Rarity;
  availability?: Availability;
  traits?: number[];
  description?: string;
  cost?: string;
  trigger?: string;
  requirements?: string;
  level_min?: number;
  level_max?: number;
  size?: Size;
  rank_min?: number;
  rank_max?: number;
  cast?: ActionCost | string;
  traditions?: string[];
  defense?: string;
  range?: string;
  area?: string;
  targets?: string;
  duration?: string;
  actions?: ActionCost;
  prerequisites?: string[];
  frequency?: string;
  access?: string;
  special?: string;
  ab_type?: AbilityBlockType;
  bulk?: string;
  group?: ItemGroup;
  hands?: string;
  craft_requirements?: string;
  usage?: string;
  content_sources?: number[];
}

const MAX_SECTION_HEIGHT = 350;
const MAX_RESULTS_RETURNED = 10000;

export function AdvancedSearchModal<T = ContentType, C = Record<string, any>>(props: {
  opened: boolean;
  zIndex?: number;
  type?: T;

  onSearch?: (filters: FiltersParams) => void;
  onSelect?: (option: C) => void;
  onClose?: () => void;
}) {
  const [isLoading, setLoading] = useState(false);
  const [traitsCached, setTraitsCached] = useState<Record<number, string>>({});
  const [contentSourcesCached, setContentSourcesCached] = useState<ContentSource[]>([]);

  const [accordionValue, setAccordionValue] = useState<string | null>('filters');

  const [filters, setFilters] = useState<FiltersParams>({
    type: props.type as ContentType,
  });

  const updateFilters = (
    updates: { key: keyof FiltersParams; value: any }[],
    callback?: (result: FiltersParams) => void
  ) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      updates.forEach(({ key, value }) => {
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          delete newFilters[key];
        } else {
          newFilters[key] = value;
        }
      });
      callback?.({ ...newFilters });
      return newFilters;
    });
  };

  const removeFilters = (keys: (keyof FiltersParams)[], callback?: (result: FiltersParams) => void) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      keys.forEach((key) => {
        delete newFilters[key];
      });
      callback?.({ ...newFilters });
      return newFilters;
    });
  };

  // Load content sources
  useEffect(() => {
    if (props.opened) {
      defineDefaultSourcesForUser().then(async (sourceIds) => {
        const sources = await fetchContent<ContentSource>('content-source', {
          id: sourceIds,
        });
        setContentSourcesCached(sources);
      });
    }
  }, [props.opened]);

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [_data, _setData] = useState<Record<string, any>[]>([]);
  const isOverMaxResults = _data.length >= MAX_RESULTS_RETURNED;
  const [prevFiltersHash, setPrevFiltersHash] = useState<number>(-1);
  const isResultsStale = useMemo(() => {
    const currentHash = hashData(filters);
    return currentHash !== prevFiltersHash;
  }, [filters, prevFiltersHash]);

  // Auto-search when results are stale and user views results tab
  useEffect(() => {
    if (isResultsStale && accordionValue === 'results') {
      handleSearch(filters);
    }
  }, [isResultsStale]);

  const handleSearch = async (f: FiltersParams) => {
    // No type selected
    if (!f.type) {
      _setData([]);
      return;
    }

    // Prevent duplicate searches
    const hash = hashData(f);
    if (hash === prevFiltersHash) {
      return;
    }
    setPrevFiltersHash(hash);

    // Notify parent
    props.onSearch?.(f);

    // Fetch data
    setLoading(true);
    const result = await makeRequest('search-data', {
      ...f,
      is_advanced: true,
      content_sources: f.content_sources ?? contentSourcesCached.map((source) => source.id),
    });

    if (result) {
      if (f.type === 'ability-block') {
        _setData(result.ability_blocks ?? []);
      } else if (f.type === 'ancestry') {
        _setData(result.ancestries ?? []);
      } else if (f.type === 'archetype') {
        _setData(result.archetypes ?? []);
      } else if (f.type === 'background') {
        _setData(result.backgrounds ?? []);
      } else if (f.type === 'class') {
        _setData(result.classes ?? []);
      } else if (f.type === 'creature') {
        _setData(result.creatures ?? []);
      } else if (f.type === 'item') {
        _setData(result.items ?? []);
      } else if (f.type === 'language') {
        _setData(result.languages ?? []);
      } else if (f.type === 'spell') {
        _setData(result.spells ?? []);
      } else if (f.type === 'trait') {
        _setData(result.traits ?? []);
      } else if (f.type === 'versatile-heritage') {
        _setData(result.versatile_heritages ?? []);
      } else {
        _setData([]);
      }
      setLoading(false);
    } else {
      displayError('Failed to fetch search results.');
    }
  };

  const results = isLoading ? null : _data;

  const renderFiltersSection = () => {
    const filterRecords = Object.keys(filters)
      .map((k) => {
        const key = k as keyof FiltersParams;
        const value = filters[key];

        const labelKey = (() => {
          let _k = k;
          if (_k.endsWith('_min')) {
            _k = _k.replace('_min', '');
          }
          return toLabel(_k);
        })();

        const labelValue = (() => {
          let v = value;
          if (key === 'type' && filters.ab_type) {
            // Handle ability block type
            v = JSON.stringify(filters.ab_type);
          } else if (key.endsWith('_min')) {
            // Handle min - max values
            const minValue = value;
            const maxValue = filters[key.replace('_min', '_max') as keyof FiltersParams];

            if (minValue === maxValue) {
              v = JSON.stringify(`${minValue}`);
            } else {
              v = JSON.stringify(`${minValue} - ${maxValue}`);
            }
          } else if (key === 'traits' && Array.isArray(value)) {
            // Handle traits array
            v = `[ ${value.map((traitId) => traitsCached[Number(traitId)] ?? `${traitId}`).join(', ')} ]`;
          } else if (key === 'content_sources' && Array.isArray(value)) {
            // Handle content sources array
            v = `[ ${value
              .map((sourceId) => {
                return contentSourcesCached.find((source) => source.id === sourceId)?.name ?? `${sourceId}`;
              })
              .join(', ')} ]`;
          } else {
            v = JSON.stringify(v);
          }

          return toLabel(v);
        })();

        return {
          key,
          value,
          labelKey: labelKey,
          labelValue: labelValue,
        };
      })
      .filter((record) => {
        if (record.value === undefined || record.value === null) {
          return false;
        }
        if (Array.isArray(record.value) && record.value.length === 0) {
          return false;
        }
        if (typeof record.value === 'string' && record.value.trim() === '') {
          return false;
        }
        if (typeof record.value === 'number' && isNaN(record.value)) {
          return false;
        }
        if (record.key === 'ab_type') {
          return false;
        }
        if (record.key.endsWith('_max')) {
          return false;
        }

        return true;
      });

    return (
      <Pill.Group>
        <Group align='center' gap='xs'>
          <Text>Filters</Text>
          {filterRecords.length === 0 && (
            <Text fz='xs' fs='italic' c='gray.6'>
              — None —
            </Text>
          )}
        </Group>
        {filterRecords.map((record, index) => (
          <Pill
            key={index}
            size='sm'
            c='dark.1'
            withRemoveButton={record.key !== 'type'}
            onRemove={() => {
              if (record.key.endsWith('_min')) {
                const correspondingMaxKey = record.key.replace('_min', '_max') as keyof FiltersParams;
                removeFilters([record.key, correspondingMaxKey]);
              } else {
                removeFilters([record.key]);
              }
            }}
          >
            {record.labelKey}: {record.labelValue}
          </Pill>
        ))}
      </Pill.Group>
    );
  };

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onClose?.();
      }}
      title={<Title order={3}>Advanced Search</Title>}
      size={'md'}
      closeOnClickOutside={false}
      closeOnEscape={false}
      keepMounted={false}
    >
      <Stack>
        <Accordion
          variant='separated'
          defaultValue='options'
          styles={{
            label: {
              paddingTop: 5,
              paddingBottom: 5,
            },
            control: {
              paddingLeft: 13,
              paddingRight: 13,
            },
            item: {
              marginTop: 0,
              marginBottom: 0,
            },
            content: {
              padding: 0,
            },
          }}
          value={accordionValue}
          onChange={(v) => {
            setAccordionValue(v);
            if (v === 'results') {
              handleSearch(filters);
            }
          }}
        >
          <Accordion.Item
            value='filters'
            style={{
              marginBottom: 10,
            }}
          >
            <Accordion.Control>{renderFiltersSection()}</Accordion.Control>
            <Accordion.Panel>
              <Divider />
              <ScrollArea px={14} scrollbars='y' h={MAX_SECTION_HEIGHT}>
                <Stack mt='xs' mb='md'>
                  <Select
                    label='Search for'
                    data={[
                      { value: 'ability-block_feat', label: 'Feat' },
                      { value: 'ability-block_action', label: 'Action' },
                      { value: 'ability-block_physical-feature', label: 'Physical Feature' },
                      { value: 'ability-block_sense', label: 'Sense' },
                      { value: 'ability-block_class-feature', label: 'Class Feature' },
                      { value: 'ability-block_heritage', label: 'Heritage' },
                      { value: 'trait', label: 'Trait' },
                      { value: 'item', label: 'Item' },
                      { value: 'spell', label: 'Spell' },
                      { value: 'archetype', label: 'Archetype' },
                      { value: 'versatile-heritage', label: 'Versatile Heritage' },
                      // { value: 'creature', label: 'Creature' },
                      { value: 'ancestry', label: 'Ancestry' },
                      { value: 'background', label: 'Background' },
                      { value: 'language', label: 'Language' },
                    ]}
                    placeholder='Select content type'
                    searchable
                    value={[filters.type, filters.ab_type].filter((v) => Boolean(v)).join('_')}
                    onChange={(value) => {
                      updateFilters([
                        { key: 'type', value: value?.split('_')[0] as ContentType },
                        { key: 'ab_type', value: value?.split('_')[1] as AbilityBlockType },
                      ]);
                    }}
                    disabled={props.type !== undefined}
                    readOnly={props.type !== undefined}
                  />
                  <TextInput
                    label='Name'
                    placeholder='Any words in the name, e.g. "Bolt"'
                    value={filters.name ?? ''}
                    onChange={(e) => {
                      updateFilters([{ key: 'name', value: e.currentTarget.value }]);
                    }}
                  />
                  <TextInput
                    label='Description'
                    placeholder='Any text, e.g. "Strike"'
                    value={filters.description ?? ''}
                    onChange={(e) => {
                      updateFilters([{ key: 'description', value: e.currentTarget.value }]);
                    }}
                  />
                  {filters.type !== 'trait' && (
                    <Group wrap='nowrap' justify='stretch'>
                      <Select
                        label='Rarity'
                        placeholder='Any'
                        searchable
                        clearable
                        data={[
                          { value: 'COMMON', label: 'Common' },
                          { value: 'UNCOMMON', label: 'Uncommon' },
                          { value: 'RARE', label: 'Rare' },
                          { value: 'UNIQUE', label: 'Unique' },
                        ]}
                        value={filters.rarity ?? null}
                        onChange={(value) => {
                          updateFilters([{ key: 'rarity', value }]);
                        }}
                      />
                      <Select
                        label='Availability'
                        placeholder='Any'
                        searchable
                        clearable
                        data={[
                          { value: 'STANDARD', label: 'Standard' },
                          { value: 'LIMITED', label: 'Limited' },
                          { value: 'RESTRICTED', label: 'Restricted' },
                        ]}
                        value={filters.availability ?? null}
                        onChange={(value) => {
                          updateFilters([{ key: 'availability', value }]);
                        }}
                      />
                    </Group>
                  )}
                  {['item', 'spell', 'ability-block'].includes(filters.type ?? '<!>') && (
                    <TraitsInput
                      label='Traits'
                      placeholder='Select traits'
                      traits={filters.traits ?? []}
                      onTraitChange={(traits) => {
                        setTraitsCached((prev) => {
                          const newCache = { ...prev };
                          traits.forEach((trait) => {
                            newCache[trait.id] = trait.name;
                          });
                          return newCache;
                        });
                        updateFilters([{ key: 'traits', value: traits.map((trait) => trait.id) }]);
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                  {['spell', 'ability-block'].includes(filters.type ?? '<!>') &&
                    ['action', 'feat', 'physical-feature'].includes(filters.ab_type ?? '') && (
                      <TextInput
                        label='Cost'
                        placeholder='Any -'
                        value={filters.cost ?? ''}
                        onChange={(e) => {
                          updateFilters([{ key: 'cost', value: e.currentTarget.value }]);
                        }}
                      />
                    )}
                  {['spell', 'ability-block'].includes(filters.type ?? '<!>') &&
                    ['action', 'feat', 'physical-feature'].includes(filters.ab_type ?? '') && (
                      <TextInput
                        label='Trigger'
                        placeholder='Any -'
                        value={filters.trigger ?? ''}
                        onChange={(e) => {
                          updateFilters([{ key: 'trigger', value: e.currentTarget.value }]);
                        }}
                      />
                    )}
                  {['spell', 'ability-block'].includes(filters.type ?? '<!>') &&
                    ['action', 'feat', 'physical-feature'].includes(filters.ab_type ?? '') && (
                      <TextInput
                        label='Requirements'
                        placeholder='Any -'
                        value={filters.requirements ?? ''}
                        onChange={(e) => {
                          updateFilters([{ key: 'requirements', value: e.currentTarget.value }]);
                        }}
                      />
                    )}
                  {['item', 'ability-block', 'creature'].includes(filters.type ?? '<!>') &&
                    ['feat', 'class-feature'].includes(filters.ab_type ?? '') && (
                      <Stack gap={5} pb={10}>
                        <Text fz='sm'>Level</Text>
                        <RangeSlider
                          value={[filters.level_min ?? 0, filters.level_max ?? 30]}
                          onChange={(value) => {
                            updateFilters([
                              { key: 'level_min', value: value[0] },
                              { key: 'level_max', value: value[1] },
                            ]);
                          }}
                          min={0}
                          max={30}
                          minRange={0}
                          labelTransitionProps={{
                            transition: 'skew-down',
                            duration: 150,
                            timingFunction: 'linear',
                          }}
                          marks={[
                            { value: 0, label: '0' },
                            { value: 5, label: '5' },
                            { value: 10, label: '10' },
                            { value: 15, label: '15' },
                            { value: 20, label: '20' },
                            { value: 25, label: '25' },
                            { value: 30, label: '30' },
                          ]}
                        />
                      </Stack>
                    )}
                  {['item', 'creature'].includes(filters.type ?? '<!>') && (
                    <Select
                      label='Size'
                      placeholder='Any'
                      searchable
                      clearable
                      data={[
                        { value: 'TINY', label: 'Tiny' },
                        { value: 'SMALL', label: 'Small' },
                        { value: 'MEDIUM', label: 'Medium' },
                        { value: 'LARGE', label: 'Large' },
                        { value: 'HUGE', label: 'Huge' },
                        { value: 'GARGANTUAN', label: 'Gargantuan' },
                      ]}
                      value={filters.size ?? null}
                      onChange={(value) => {
                        updateFilters([{ key: 'size', value }]);
                      }}
                    />
                  )}
                  {filters.type === 'spell' && (
                    <Stack gap={5} pb={10}>
                      <Text fz='sm'>Rank</Text>
                      <RangeSlider
                        value={[filters.rank_min ?? 0, filters.rank_max ?? 10]}
                        onChange={(value) => {
                          updateFilters([
                            { key: 'rank_min', value: value[0] },
                            { key: 'rank_max', value: value[1] },
                          ]);
                        }}
                        min={0}
                        max={10}
                        minRange={0}
                        labelTransitionProps={{
                          transition: 'skew-down',
                          duration: 150,
                          timingFunction: 'linear',
                        }}
                        marks={[
                          { value: 0, label: 'C.' },
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                          { value: 3, label: '3' },
                          { value: 4, label: '4' },
                          { value: 5, label: '5' },
                          { value: 6, label: '6' },
                          { value: 7, label: '7' },
                          { value: 8, label: '8' },
                          { value: 9, label: '9' },
                          { value: 10, label: '10' },
                        ]}
                      />
                    </Stack>
                  )}
                  {filters.type === 'spell' && (
                    <Select
                      label='Cast'
                      placeholder='Any'
                      clearable
                      data={[
                        { value: 'ONE-ACTION', label: actionCostToLabel('ONE-ACTION') },
                        { value: 'TWO-ACTIONS', label: actionCostToLabel('TWO-ACTIONS') },
                        { value: 'THREE-ACTIONS', label: actionCostToLabel('THREE-ACTIONS') },
                        { value: 'FREE-ACTION', label: actionCostToLabel('FREE-ACTION') },
                        { value: 'REACTION', label: actionCostToLabel('REACTION') },
                        { value: 'ONE-TO-TWO-ACTIONS', label: actionCostToLabel('ONE-TO-TWO-ACTIONS') },
                        { value: 'ONE-TO-THREE-ACTIONS', label: actionCostToLabel('ONE-TO-THREE-ACTIONS') },
                        { value: 'TWO-TO-THREE-ACTIONS', label: actionCostToLabel('TWO-TO-THREE-ACTIONS') },
                        { value: 'TWO-TO-TWO-ROUNDS', label: actionCostToLabel('TWO-TO-TWO-ROUNDS') },
                        { value: 'TWO-TO-THREE-ROUNDS', label: actionCostToLabel('TWO-TO-THREE-ROUNDS') },
                        { value: 'THREE-TO-TWO-ROUNDS', label: actionCostToLabel('THREE-TO-TWO-ROUNDS') },
                        { value: 'THREE-TO-THREE-ROUNDS', label: actionCostToLabel('THREE-TO-THREE-ROUNDS') },
                        { value: '2 rounds', label: '2 rounds' },
                        { value: '3 rounds', label: '3 rounds' },
                        { value: '1 minute', label: '1 minute' },
                        { value: '5 minutes', label: '5 minutes' },
                        { value: '10 minutes', label: '10 minutes' },
                        { value: '30 minutes', label: '30 minutes' },
                        { value: '1 hour', label: '1 hour' },
                        { value: '2 hours', label: '2 hours' },
                        { value: '4 hours', label: '4 hours' },
                        { value: '8 hours', label: '8 hours' },
                        { value: '24 hours', label: '24 hours' },
                        { value: '2 days', label: '2 days' },
                        { value: '3 days', label: '3 days' },
                        { value: '4 days', label: '4 days' },
                        { value: '5 days', label: '5 days' },
                        { value: '6 days', label: '6 days' },
                        { value: '7 days', label: '7 days' },
                        { value: '8 days', label: '8 days' },
                        { value: '9 days', label: '9 days' },
                      ]}
                      value={filters.cast ?? null}
                      onChange={(value) => {
                        updateFilters([{ key: 'cast', value }]);
                      }}
                    />
                  )}
                  {filters.type === 'spell' && (
                    <TagsInput
                      label='Traditions'
                      placeholder='Select traditions'
                      splitChars={[',', ';', '|']}
                      data={['arcane', 'divine', 'occult', 'primal']}
                      value={filters.traditions ?? []}
                      onChange={(value) => {
                        updateFilters([{ key: 'traditions', value }]);
                      }}
                    />
                  )}
                  {filters.type === 'spell' && (
                    <TextInput
                      label='Defense'
                      placeholder='Any -'
                      value={filters.defense ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'defense', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'spell' && (
                    <TextInput
                      label='Range'
                      placeholder='Any -'
                      value={filters.range ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'range', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'spell' && (
                    <TextInput
                      label='Area'
                      placeholder='Any -'
                      value={filters.area ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'area', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'spell' && (
                    <TextInput
                      label='Targets'
                      placeholder='Any -'
                      value={filters.targets ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'targets', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'spell' && (
                    <TextInput
                      label='Duration'
                      placeholder='Any -'
                      value={filters.duration ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'duration', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'ability-block' &&
                    ['action', 'feat', 'physical-feature'].includes(filters.ab_type ?? '<!>') && (
                      <ActionsInput
                        label='Actions'
                        placeholder='—'
                        value={filters.actions ?? null}
                        onChange={(value) => {
                          updateFilters([{ key: 'actions', value }]);
                        }}
                      />
                    )}
                  {filters.type === 'ability-block' && ['feat'].includes(filters.ab_type ?? '<!>') && (
                    <TagsInput
                      label='Prerequisites'
                      placeholder='Select prerequisites'
                      splitChars={[',', ';', '|']}
                      value={filters.prerequisites ?? []}
                      onChange={(value) => {
                        updateFilters([{ key: 'prerequisites', value }]);
                      }}
                    />
                  )}
                  {filters.type === 'ability-block' &&
                    ['action', 'feat', 'physical-feature'].includes(filters.ab_type ?? '<!>') && (
                      <TextInput
                        label='Frequency'
                        placeholder='Any -'
                        value={filters.frequency ?? ''}
                        onChange={(e) => {
                          updateFilters([{ key: 'frequency', value: e.currentTarget.value }]);
                        }}
                      />
                    )}
                  {filters.type === 'ability-block' && ['feat', 'heritage'].includes(filters.ab_type ?? '<!>') && (
                    <TextInput
                      label='Access'
                      placeholder='Any -'
                      value={filters.access ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'access', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'ability-block' && (
                    <TextInput
                      label='Special'
                      placeholder='Any -'
                      value={filters.special ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'special', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'item' && (
                    <TextInput
                      label='Bulk'
                      placeholder='Any -'
                      value={filters.bulk ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'bulk', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'item' && (
                    <TextInput
                      label='Hands'
                      placeholder='Any -'
                      value={filters.hands ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'hands', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'item' && (
                    <Select
                      label='Group'
                      placeholder='Any'
                      searchable
                      clearable
                      data={
                        [
                          { value: 'GENERAL', label: 'General' },
                          { value: 'ARMOR', label: 'Armor' },
                          { value: 'SHIELD', label: 'Shield' },
                          { value: 'WEAPON', label: 'Weapon' },
                          { value: 'RUNE', label: 'Rune' },
                          { value: 'UPGRADE', label: 'Upgrade' },
                          { value: 'MATERIAL', label: 'Material' },
                        ] satisfies { value: ItemGroup; label: string }[]
                      }
                      value={filters.group ?? null}
                      onChange={(value) => {
                        updateFilters([{ key: 'group', value }]);
                      }}
                    />
                  )}
                  {filters.type === 'item' && (
                    <TextInput
                      label='Craft Requirements'
                      placeholder='Any -'
                      value={filters.craft_requirements ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'craft_requirements', value: e.currentTarget.value }]);
                      }}
                    />
                  )}
                  {filters.type === 'item' && (
                    <TextInput
                      label='Usage'
                      placeholder='Any -'
                      value={filters.usage ?? ''}
                      onChange={(e) => {
                        updateFilters([{ key: 'usage', value: e.currentTarget.value }]);
                      }}
                    />
                  )}

                  {filters.type !== 'content-source' && (
                    <TagsInput
                      label='Content Sources'
                      placeholder='Select books'
                      splitChars={[',', ';', '|']}
                      // Store names for easier selection
                      data={contentSourcesCached.map((source) => source.name)}
                      value={
                        // Map IDs to names
                        filters.content_sources
                          ?.map((s) => {
                            return contentSourcesCached.find((source) => source.id === s)?.name;
                          })
                          .filter((s) => s !== undefined) ?? []
                      }
                      onChange={(value) => {
                        // Convert back to IDs
                        updateFilters([
                          {
                            key: 'content_sources',
                            value: value
                              .map((name) => {
                                return contentSourcesCached.find((s) => s.name === name)?.id;
                              })
                              .filter((id) => id !== undefined),
                          },
                        ]);
                      }}
                    />
                  )}
                </Stack>
              </ScrollArea>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value='results'>
            <Accordion.Control>
              <Group align='center' gap='xs'>
                <Text>Results</Text>
                {results && !isResultsStale ? (
                  <>
                    {results.length === 0 ? (
                      <Text fz='xs' fs='italic' c='gray.6'>
                        — None —
                      </Text>
                    ) : (
                      <Pill c='dark.1' size='md'>
                        {results.length.toLocaleString()}
                        {isOverMaxResults ? '+' : ''}
                      </Pill>
                    )}
                  </>
                ) : (
                  <Pill size='md'>
                    <ActionIcon
                      variant='transparent'
                      c='dark.1'
                      size='md'
                      style={{
                        pointerEvents: 'none',
                      }}
                    >
                      <IconLineDotted size='2rem' stroke={1.5} />
                    </ActionIcon>
                  </Pill>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {!isLoading && <Divider />}
              {!filters.type && (
                <Center h={MAX_SECTION_HEIGHT * 0.9}>
                  <Stack align='center' justify='center' gap={0}>
                    <ActionIcon
                      variant='transparent'
                      c='dark'
                      size={100}
                      style={{
                        pointerEvents: 'none',
                      }}
                    >
                      <IconLineDotted size='5rem' stroke={1.5} />
                    </ActionIcon>
                    <Text fz='sm' fs='italic' c='gray.6'>
                      Please select a content type to search for.
                    </Text>
                  </Stack>
                </Center>
              )}

              {filters.type && (
                <Box mih={MAX_SECTION_HEIGHT}>
                  {results && results.length === 0 && (
                    <Center h={MAX_SECTION_HEIGHT * 0.9}>
                      <Stack align='center' justify='center' gap={0}>
                        <ActionIcon
                          variant='transparent'
                          c='dark'
                          size={100}
                          style={{
                            pointerEvents: 'none',
                          }}
                        >
                          <IconBoomFilled size='5rem' stroke={1.5} />
                        </ActionIcon>
                        <Text fz='sm' fs='italic' c='gray.6'>
                          No results found, try adjusting your filters.
                        </Text>
                      </Stack>
                    </Center>
                  )}

                  {results && results.length > 0 && (
                    <Stack gap='xs' mb='xs'>
                      <SelectionOptionsInner
                        isLoading={isLoading}
                        options={results}
                        type={filters.type!}
                        abilityBlockType={filters.ab_type}
                        onClick={(option) => {
                          if (props.onSelect) {
                            props.onSelect(option as C);
                          } else {
                            const drawerType: DrawerType = filters.ab_type ?? filters.type ?? 'generic';
                            openDrawer({
                              type: drawerType,
                              data: {
                                id: option.id,
                                onSelect:
                                  props.onSelect !== undefined ? () => props.onSelect?.(option as C) : undefined,
                              },
                              extra: { addToHistory: true },
                            });
                          }
                        }}
                        showButton={props.onSelect !== undefined}
                      />
                    </Stack>
                  )}

                  <LoadingOverlay
                    visible={isLoading}
                    overlayProps={{
                      radius: 'md',
                    }}
                  />
                </Box>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Modal>
  );
}
