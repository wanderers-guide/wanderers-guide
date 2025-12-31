import { drawerState } from '@atoms/navAtoms';
import { ItemSelectionOption } from '@common/select/SelectContent';
import { fetchContentAll, getDefaultSources } from '@content/content-store';
import {
  ActionIcon,
  Center,
  FocusTrap,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import { IconSearch, IconAdjustments, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Item } from '@typing/content';
import { labelToVariable } from '@variables/variable-utils';
import { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import * as JsSearch from 'js-search';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import { isItemVisible } from '@content/content-hidden';
import { AdvancedSearchModal } from './AdvancedSearchModal';

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

  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);

  const { data: rawItems, isFetching } = useQuery({
    queryKey: [`find-items-add-items`],
    queryFn: async () => {
      return (await fetchContentAll<Item>('item', getDefaultSources('PAGE'))).filter((item) =>
        isItemVisible('CHARACTER', item)
      );
    },
  });

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!rawItems) return;
    search.current.addIndex('name');
    search.current.addIndex('group');
    search.current.addDocuments(rawItems);
  }, [rawItems]);

  const allFilteredItems = (
    (searchQuery.trim() ? (search.current?.search(searchQuery.trim()) as Item[] | undefined) : (rawItems ?? [])) ?? []
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

  const handleAddItem = (item: Item, type: 'GIVE' | 'BUY' | 'FORMULA') => {
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
  };

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
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setPage(1);
                setSearchQuery(value);
              }}
              rightSection={
                searchQuery.trim() ? (
                  <ActionIcon
                    variant='subtle'
                    size='md'
                    color='gray'
                    radius='xl'
                    aria-label='Clear search'
                    onClick={() => {
                      setSearchQuery('');
                    }}
                  >
                    <IconX size='1.2rem' stroke={2} />
                  </ActionIcon>
                ) : undefined
              }
              styles={{
                input: {
                  borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
                },
              }}
            />
          </FocusTrap>
          <ActionIcon
            size='lg'
            variant='light'
            radius='md'
            aria-label='Advanced Search'
            color='gray'
            onClick={() => {
              setAdvancedSearchOpen(true);
            }}
          >
            <IconAdjustments size='1rem' stroke={1.5} />
          </ActionIcon>
          <AdvancedSearchModal<Item>
            opened={advancedSearchOpen}
            presetFilters={{
              type: 'item',
              content_sources: getDefaultSources('PAGE'),
            }}
            extraFilterFn={(item) => isItemVisible('CHARACTER', item)}
            onSelect={(item) => {
              handleAddItem(item, 'GIVE');
            }}
            onClose={() => {
              setAdvancedSearchOpen(false);
              context.closeModal(id);
            }}
          />
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
              handleAddItem(item, type);
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
