import { drawerState } from '@atoms/navAtoms';
import { ItemSelectionOption } from '@common/select/SelectContent';
import { fetchContentAll } from '@content/content-store';
import {
  ActionIcon,
  Box,
  Button,
  Center,
  CloseButton,
  Divider,
  FocusTrap,
  Group,
  HoverCard,
  Indicator,
  Loader,
  MultiSelect,
  Pagination,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { getHotkeyHandler, useDidUpdate } from '@mantine/hooks';
import { ContextModalProps } from '@mantine/modals';
import { IconSearch, IconAdjustments, IconFilter } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Item, ItemGroup, Spell } from '@typing/content';
import { labelToVariable } from '@variables/variable-utils';
import { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import * as JsSearch from 'js-search';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import _ from 'lodash-es';
import { compileTraits } from '@items/inv-utils';
import TraitsInput from '@common/TraitsInput';
import useRefresh from '@utils/use-refresh';
import { isItemVisible } from '@content/content-hidden';

export default function AddItemsModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  onAddItem: (item: Item, type: 'GIVE' | 'BUY' | 'FORMULA') => void;
  options?: { zIndex?: number };
}>) {
  const [searchQuery, setSearchQuery] = useState('');
  const NUM_PER_PAGE = 20;
  const [activePage, setPage] = useState(1);
  const theme = useMantineTheme();

  const { data: rawItems, isFetching } = useQuery({
    queryKey: [`find-items-add-items`],
    queryFn: async () => {
      return (await fetchContentAll<Item>('item')).filter((item) => isItemVisible('CHARACTER', item));
    },
  });

  // Item advanced search filters
  const [openedFilters, setOpenedFilters] = useState(false);
  const [displayTraitFilter, refreshDisplayTraitFilter] = useRefresh();

  useDidUpdate(() => {
    refreshDisplayTraitFilter();
  }, [openedFilters]);

  const [filterSelections, setFilterSelections] = useState<{
    name?: string;
    description?: string;
    group?: ItemGroup;
    traits?: number[];
    level?: number;
  }>();
  let filtersApplied =
    filterSelections && Object.keys(filterSelections).length > 0
      ? Object.values(filterSelections).filter((f) => f).length
      : 0;
  if (searchQuery.trim()) {
    filtersApplied = 0;
  }

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!rawItems) return;
    search.current.addIndex('name');
    search.current.addIndex('group');
    search.current.addDocuments(rawItems);
  }, [rawItems]);

  const allFilteredItems = (
    (searchQuery.trim()
      ? (search.current?.search(searchQuery.trim()) as Item[] | undefined)
      : (rawItems ?? []).filter((item) => {
          let hideItem = false;
          if (filterSelections) {
            if (filterSelections?.name) {
              if (item.name.toLowerCase().includes(filterSelections.name.toLowerCase())) {
                // Match
              } else {
                if (item.meta_data?.base_item) {
                  if (item.meta_data.base_item.toLowerCase().includes(filterSelections.name.toLowerCase())) {
                    // Match
                  } else {
                    hideItem = true;
                  }
                } else {
                  hideItem = true;
                }
              }
            }
            if (filterSelections?.description) {
              if (item.description?.toLowerCase().includes(filterSelections.description.toLowerCase())) {
                // Match
              } else {
                hideItem = true;
              }
            }
            if (filterSelections?.group) {
              if (item.group === filterSelections?.group) {
                // Match
              } else {
                hideItem = true;
              }
            }
            if (filterSelections?.traits) {
              if (
                _.intersection(filterSelections.traits, compileTraits(item)).length === filterSelections.traits.length
              ) {
                // Match
              } else {
                hideItem = true;
              }
            }
            if (filterSelections?.level) {
              if (item.level === filterSelections.level) {
                // Match
              } else {
                hideItem = true;
              }
            }
          }
          return !hideItem;
        })) ?? []
  ).sort((a, b) => {
    if (a.level === b.level) return a.name.localeCompare(b.name);
    return a.level - b.level;
  });

  useEffect(() => {
    setPage(1);
    scrollToTop();
  }, [rawItems]);

  const viewport = useRef<HTMLDivElement>(null);
  const scrollToTop = () => viewport.current?.scrollTo({ top: 0 });

  return (
    <Stack gap={5} justify='space-between' style={{ overflow: 'hidden' }}>
      <Stack gap={5}>
        <Group gap={10}>
          <FocusTrap active={true}>
            <TextInput
              data-autofocus
              style={{ flex: 1 }}
              leftSection={<IconSearch size='0.9rem' />}
              placeholder={`Search all items`}
              onChange={(e) => {
                const value = e.target.value;
                setPage(1);
                setSearchQuery(value);
              }}
              styles={{
                input: {
                  borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
                },
              }}
            />
          </FocusTrap>
          <Popover
            width={200}
            position='bottom'
            withArrow
            shadow='md'
            opened={openedFilters}
            closeOnClickOutside={false}
            zIndex={(innerProps.options?.zIndex ?? 499) + 1}
          >
            <Popover.Target>
              <Indicator
                inline
                label={`${filtersApplied}`}
                offset={3}
                size={16}
                zIndex={1001}
                position='bottom-start'
                disabled={filtersApplied === 0}
              >
                <ActionIcon
                  size='lg'
                  variant='light'
                  color={filtersApplied > 0 ? theme.colors['blue'][6] : theme.colors['gray'][6]}
                  radius='md'
                  aria-label='Advanced Search'
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
                <TextInput
                  label='Name'
                  value={filterSelections?.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilterSelections((prev) => ({ ...prev, name: value }));
                  }}
                />
                <TextInput
                  label='Description'
                  value={filterSelections?.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilterSelections((prev) => ({ ...prev, description: value }));
                  }}
                />
                <Select
                  label='Group'
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
                  value={filterSelections?.group}
                  onChange={(value) => {
                    setFilterSelections((prev) => ({ ...prev, group: value as ItemGroup | undefined }));
                  }}
                  styles={(t) => ({
                    dropdown: {
                      zIndex: (innerProps.options?.zIndex ?? 499) + 2,
                    },
                  })}
                />
                <Select
                  label='Level'
                  data={Array.from({ length: 31 }, (_, i) => i.toString())}
                  value={filterSelections?.level ? `${filterSelections.level}` : undefined}
                  onChange={(value) => {
                    setFilterSelections((prev) => ({ ...prev, level: value ? parseInt(value) : undefined }));
                  }}
                  styles={(t) => ({
                    dropdown: {
                      zIndex: (innerProps.options?.zIndex ?? 499) + 2,
                    },
                  })}
                />
                {displayTraitFilter && (
                  <TraitsInput
                    label='Traits'
                    traits={filterSelections?.traits}
                    onTraitChange={(traits) => {
                      setFilterSelections((prev) => ({
                        ...prev,
                        traits: traits.length === 0 ? undefined : traits.map((trait) => trait.id),
                      }));
                    }}
                    style={{ flex: 1 }}
                    styles={(t) => ({
                      dropdown: {
                        zIndex: (innerProps.options?.zIndex ?? 499) + 2,
                      },
                    })}
                  />
                )}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </Stack>
      <ScrollArea
        viewportRef={viewport}
        h={EDIT_MODAL_HEIGHT - 80}
        style={{ position: 'relative' }}
        pr={5}
        scrollbars='y'
      >
        {isFetching ? (
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
          <ItemsList
            options={allFilteredItems.slice((activePage - 1) * NUM_PER_PAGE, activePage * NUM_PER_PAGE)}
            onClick={(item, type) => {
              const baseItem = item.meta_data?.base_item
                ? rawItems?.find((i) => labelToVariable(i.name) === labelToVariable(item.meta_data!.base_item!))
                : undefined;

              const injectedItem = {
                ...item,
                meta_data: item.meta_data
                  ? {
                      ...item.meta_data,
                      base_item_content: baseItem,
                    }
                  : undefined,
              };

              innerProps.onAddItem(injectedItem, type);
            }}
          />
        )}
      </ScrollArea>
      <Center>
        {allFilteredItems && (
          <Pagination
            size='sm'
            total={Math.ceil(allFilteredItems.length / NUM_PER_PAGE)}
            value={activePage}
            onChange={(value) => {
              setPage(value);
              scrollToTop();
            }}
          />
        )}
      </Center>
    </Stack>
  );
}

function ItemsList(props: {
  options: Item[];
  onClick: (item: Item, type: 'GIVE' | 'BUY' | 'FORMULA') => void;
  onMetadataChange?: () => void;
}) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <Stack gap={0}>
      {props.options
        .sort((a, b) => {
          if (a.level === b.level) return a.name.localeCompare(b.name);
          return a.level - b.level;
        })
        .map((item, index) => (
          <ItemSelectionOption
            key={index}
            item={item}
            onClick={(item) => {
              props.onMetadataChange?.();
              openDrawer({
                type: 'item',
                data: { id: item.id },
                extra: { addToHistory: true },
              });
            }}
            includeAdd
            onAdd={props.onClick}
          />
        ))}
      {props.options.length === 0 && (
        <Text fz='sm' c='dimmed' ta='center' fs='italic' pt={25}>
          No items found.
        </Text>
      )}
    </Stack>
  );
}
