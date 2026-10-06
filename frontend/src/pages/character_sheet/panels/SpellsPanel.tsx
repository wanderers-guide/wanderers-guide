import { sessionState } from '@atoms/supabaseAtoms';
import { ActionSymbol } from '@common/Actions';
import TokenSelect from '@common/TokenSelect';
import { collectEntitySpellcasting } from '@content/collect-content';
import { getContentFast, getDefaultSourcesKey } from '@content/content-store';
import {
  Accordion,
  ActionIcon,
  Box,
  Group,
  HoverCard,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import ManageSpellsModal from '@modals/ManageSpellsModal';
import { getKnownSpellsByRank, isCantrip } from '@spells/spell-utils';
import { getInnateSpellKey } from '@spells/innate-spells';
import {
  filterSpellCatalog,
  getExplicitSpellQueryOptions,
  getInventorySpellIds,
  getMissingSpellIds,
  mergeSpellDependencies,
  resolveItemSpellRead,
} from '@spells/item-spell-dependencies';
import type { ItemSpellRead } from '@spells/item-spell-dependencies';
import { IconSearch, IconSquareRounded, IconSquareRoundedFilled, IconX } from '@tabler/icons-react';
import {
  ActionCost,
  CastingSource,
  ContentPackage,
  ContentSource,
  InventoryItem,
  Item,
  LivingEntity,
  Spell,
  SpellInnateEntry,
  SpellListEntry,
  SpellSectionType,
  SpellSlot,
  Trait,
} from '@schemas/content';
import useRefresh from '@utils/use-refresh';
import { useEffect, useMemo, useState } from 'react';
import { SetterOrUpdater } from '@utils/type-fixing';
import FocusSpellsList from './spells_list/FocusSpellsList';
import InnateSpellsList from './spells_list/InnateSpellsList';
import PreparedSpellsList from './spells_list/PreparedSpellsList';
import RitualSpellsList from './spells_list/RitualSpellsList';
import SpontaneousSpellsList from './spells_list/SpontaneousSpellsList';
import StaffSpellsList from './spells_list/StaffSpellsList';
import WandSpellsList from './spells_list/WandSpellsList';
import SpellheartSpellsList from './spells_list/SpellheartSpellsList';
import { filterByTraitType } from '@items/inv-utils';
import { StoreID } from '@schemas/variables';
import { isTruthy } from '@utils/type-fixing';
import { groupBy } from 'lodash-es';
import { phoneQuery } from '@utils/mobile-responsive';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

/** Renders spell sections with scoped innate and item references from other accessible books. */
export default function SpellsPanel(props: {
  id: StoreID;
  content: ContentPackage;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  panelHeight: number;
  panelWidth: number;
  zIndex?: number;
}) {
  const isPhone = useMediaQuery(phoneQuery());
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const actorId = useAtomValue(sessionState)?.user.id ?? null;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryDebounced] = useDebouncedValue(searchQuery, 200);
  const [manageSpells, setManageSpells] = useState<
    | {
        source: string;
        type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY';
        filter?: {
          traditions?: string[];
          rank_min?: number;
          rank_max?: number;
        };
      }
    | undefined
  >();

  const charData = useMemo(() => {
    if (!props.entity) return null;
    return collectEntitySpellcasting(props.id, props.entity);
  }, [props.id, props.entity]);

  // Read indexing corrections from enabled official content without changing saved items.
  const itemSpellReads = useMemo(() => {
    const canonicalItems = new Map(props.content.items.map((item) => [item.id, item]));
    const sources = new Map((props.content.sources ?? []).map((source) => [source.id, source]));
    return new Map(
      (props.entity?.inventory?.items ?? []).map((entry) => [
        entry,
        resolveItemSpellRead(entry.item, canonicalItems.get(entry.item.id), sources.get(entry.item.content_source_id)),
      ])
    );
  }, [props.content.items, props.content.sources, props.entity?.inventory]);

  // Explicit innate and inventory references do not enable their books for selection.
  const missingInnateIds = useMemo(() => {
    return getMissingSpellIds(
      props.content.spells,
      (charData?.innate ?? []).map((entry) => entry.spell_id)
    );
  }, [props.content.spells, charData]);
  const missingItemIds = useMemo(() => {
    return getMissingSpellIds(
      props.content.spells,
      getInventorySpellIds(props.entity?.inventory?.items ?? [], itemSpellReads)
    );
  }, [props.content.spells, props.entity?.inventory, itemSpellReads]);
  const missingIds = useMemo(
    () => [...new Set([...missingInnateIds, ...missingItemIds])].sort((a, b) => a - b),
    [missingInnateIds, missingItemIds]
  );
  const { data: explicitSpells } = useQuery(
    getExplicitSpellQueryOptions({
      actorId,
      entityId: props.entity?.id,
      storeId: props.id,
      infoSources: getDefaultSourcesKey('INFO'),
      pageSources: getDefaultSourcesKey('PAGE'),
      ids: missingIds,
    })
  );
  const spells = useMemo(() => {
    return mergeSpellDependencies(props.content.spells, explicitSpells, missingInnateIds);
  }, [props.content.spells, explicitSpells, missingInnateIds]);

  const [actionTypeFilter, setActionTypeFilter] = useState<ActionCost | 'ALL'>('ALL');
  const allSpells = useMemo(() => {
    return filterSpellCatalog(spells, searchQueryDebounced, actionTypeFilter, (ids) =>
      getContentFast<Trait>('trait', ids).map((trait) => trait.name)
    );
  }, [spells, searchQueryDebounced, actionTypeFilter]);
  // Item-only supplements stay out of normal casting and the selection catalog.
  const allItemSpells = useMemo(() => {
    const filtered = filterSpellCatalog(explicitSpells ?? [], searchQueryDebounced, actionTypeFilter, (ids) =>
      getContentFast<Trait>('trait', ids).map((trait) => trait.name)
    );
    return mergeSpellDependencies(allSpells, filtered, missingItemIds);
  }, [allSpells, explicitSpells, missingItemIds, searchQueryDebounced, actionTypeFilter]);
  const hasFilters = searchQuery.trim().length > 0 || actionTypeFilter !== 'ALL';

  return (
    <Box h='100%'>
      <Stack gap={10}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={isPhone ? undefined : <IconSearch size='0.9rem' />}
            placeholder={`Search spells`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                backgroundColor: IMPRINT_BG_COLOR,
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : 'transparent',
              },
            }}
          />
          <ActionFilter actionTypeFilter={actionTypeFilter} setActionTypeFilter={setActionTypeFilter} />
          {/* <SegmentedControl
            value={section}
            onChange={setSection}
            disabled={!!searchQuery.trim()}
            data={[
              { label: 'Spells', value: 'NORMAL' },
              { label: 'Focus', value: 'FOCUS' },
              { label: 'Innate', value: 'INNATE' },
            ].filter((section) => {
              if (!data) return false;

              if (section.value === 'FOCUS') {
                return data.data.focus.length > 0;
              }
              if (section.value === 'INNATE') {
                return data.data.innate.length > 0;
              }
              if (section.value === 'NORMAL') {
                return data.data.slots.length > 0;
              }
            })}
          /> */}
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {charData && (
            <Accordion
              data-wg-name='spells-accordion'
              variant='separated'
              multiple
              defaultValue={[
                ...charData.sources.map((source) => `spontaneous-${source.name}`),
                ...charData.sources.map((source) => `prepared-${source.name}`),
                ...charData.sources.map((source) => `focus-${source.name}`),
                'innate',
                // 'ritual',
              ]}
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
                  marginBottom: 10,
                },
              }}
            >
              {charData.sources.map((source, index) => (
                <div key={index}>
                  {source.type.startsWith('SPONTANEOUS-') ? (
                    <>
                      {
                        <SpellList
                          id={props.id}
                          entity={props.entity}
                          setEntity={props.setEntity}
                          //
                          index={`spontaneous-${source.name}`}
                          source={source}
                          spellIds={charData.list.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                          allSpells={allSpells}
                          type='SPONTANEOUS'
                          extra={{ slots: charData.slots.filter((s) => s.source === source.name), charData: charData }}
                          openManageSpells={(source, type, filter) => setManageSpells({ source, type, filter })}
                          hasFilters={hasFilters}
                        />
                      }
                    </>
                  ) : source.type.startsWith('PREPARED-') ? (
                    <>
                      {
                        <SpellList
                          id={props.id}
                          entity={props.entity}
                          setEntity={props.setEntity}
                          //
                          index={`prepared-${source.name}`}
                          source={source}
                          spellIds={charData.list.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                          allSpells={allSpells}
                          type='PREPARED'
                          extra={{ slots: charData.slots.filter((s) => s.source === source.name), charData: charData }}
                          openManageSpells={(source, type, filter) => setManageSpells({ source, type, filter })}
                          hasFilters={hasFilters}
                        />
                      }
                    </>
                  ) : null}
                  {charData.focus.filter((d) => d.source === source.name).length > 0 && (
                    <SpellList
                      id={props.id}
                      entity={props.entity}
                      setEntity={props.setEntity}
                      //
                      index={`focus-${source.name}`}
                      source={source}
                      spellIds={charData.focus.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                      allSpells={allSpells}
                      type='FOCUS'
                      hasFilters={hasFilters}
                      extra={{ charData: charData }}
                    />
                  )}
                </div>
              ))}

              {charData.innate.length > 0 && (
                <SpellList
                  id={props.id}
                  entity={props.entity}
                  setEntity={props.setEntity}
                  //
                  index={'innate'}
                  spellIds={charData.innate.map((d) => d.spell_id)}
                  allSpells={allSpells}
                  type='INNATE'
                  extra={{ innates: charData.innate, charData: charData }}
                  hasFilters={hasFilters}
                />
              )}
              {filterByTraitType(props.entity?.inventory?.items ?? [], 'STAFF').find(
                (invItem) => invItem.is_equipped
              ) && (
                <SpellList
                  id={props.id}
                  entity={props.entity}
                  setEntity={props.setEntity}
                  //
                  index={'staff'}
                  spellIds={[]}
                  allSpells={allItemSpells}
                  type='STAFF'
                  hasFilters={hasFilters}
                  extra={{ charData: charData }}
                />
              )}
              {filterByTraitType(props.entity?.inventory?.items ?? [], 'WAND').length > 0 && (
                <SpellList
                  id={props.id}
                  entity={props.entity}
                  setEntity={props.setEntity}
                  //
                  index={'wand'}
                  spellIds={[]}
                  allSpells={allItemSpells}
                  type='WAND'
                  itemSpellReads={itemSpellReads}
                  hasFilters={hasFilters}
                  extra={{ charData: charData }}
                />
              )}
              {filterByTraitType(props.entity?.inventory?.items ?? [], 'SPELLHEART').length > 0 && (
                <SpellList
                  id={props.id}
                  entity={props.entity}
                  setEntity={props.setEntity}
                  //
                  index={'spellheart'}
                  spellIds={[]}
                  allSpells={allItemSpells}
                  type='SPELLHEART'
                  canonicalItems={props.content.items}
                  contentSources={props.content.sources}
                  hasFilters={hasFilters}
                  extra={{ charData: charData }}
                />
              )}
              {/* Always display ritual section */}
              {true && (
                <SpellList
                  id={props.id}
                  entity={props.entity}
                  setEntity={props.setEntity}
                  //
                  index={'ritual'}
                  spellIds={charData.list.filter((d) => d.source === 'RITUALS').map((d) => d.spell_id)}
                  allSpells={allSpells}
                  type='RITUAL'
                  openManageSpells={(source, type) => setManageSpells({ source, type })}
                  hasFilters={hasFilters}
                  extra={{ charData: charData }}
                />
              )}
            </Accordion>
          )}
        </ScrollArea>
      </Stack>
      {manageSpells && (
        <ManageSpellsModal
          id={props.id}
          entity={props.entity}
          setEntity={props.setEntity}
          opened={!!manageSpells}
          onClose={() => setManageSpells(undefined)}
          source={manageSpells.source}
          type={manageSpells.type}
          filter={manageSpells.filter}
          zIndex={(props.zIndex ?? 497) + 1}
        />
      )}
    </Box>
  );
}

function ActionFilter(props: {
  actionTypeFilter: 'ALL' | ActionCost;
  setActionTypeFilter: (v: 'ALL' | ActionCost) => void;
}) {
  const { actionTypeFilter, setActionTypeFilter } = props;
  const theme = useMantineTheme();

  return (
    <Group gap={5}>
      <ActionIcon
        variant='subtle'
        color='dark'
        radius='xl'
        size='lg'
        aria-label='Filter All Actions'
        style={{
          backgroundColor: actionTypeFilter === 'ALL' ? IMPRINT_BG_COLOR : undefined,
          borderColor: actionTypeFilter === 'ALL' ? IMPRINT_BORDER_COLOR : undefined,
        }}
        onClick={() => {
          setActionTypeFilter('ALL');
        }}
      >
        <Text c='gray.2'>All</Text>
      </ActionIcon>
      <ActionIcon
        variant='subtle'
        color='dark'
        radius='xl'
        size='lg'
        aria-label='Filter One Action'
        style={{
          backgroundColor: actionTypeFilter === 'ONE-ACTION' ? IMPRINT_BG_COLOR : undefined,
          borderColor: actionTypeFilter === 'ONE-ACTION' ? theme.colors['guide'][8] : undefined,
        }}
        onClick={() => {
          setActionTypeFilter('ONE-ACTION');
        }}
      >
        <ActionSymbol cost={'ONE-ACTION'} size={'1.9rem'} />
      </ActionIcon>
      <ActionIcon
        variant='subtle'
        color='dark'
        radius='xl'
        size='lg'
        aria-label='Filter Two Actions'
        style={{
          backgroundColor: actionTypeFilter === 'TWO-ACTIONS' ? IMPRINT_BG_COLOR : undefined,
          borderColor: actionTypeFilter === 'TWO-ACTIONS' ? theme.colors['guide'][8] : undefined,
        }}
        onClick={() => {
          setActionTypeFilter('TWO-ACTIONS');
        }}
      >
        <ActionSymbol cost={'TWO-ACTIONS'} size={'1.9rem'} />
      </ActionIcon>
      <ActionIcon
        variant='subtle'
        color='dark'
        radius='xl'
        size='lg'
        aria-label='Filter Three Actions'
        style={{
          backgroundColor: actionTypeFilter === 'THREE-ACTIONS' ? IMPRINT_BG_COLOR : undefined,
          borderColor: actionTypeFilter === 'THREE-ACTIONS' ? theme.colors['guide'][8] : undefined,
        }}
        onClick={() => {
          setActionTypeFilter('THREE-ACTIONS');
        }}
      >
        <ActionSymbol cost={'THREE-ACTIONS'} size={'1.9rem'} />
      </ActionIcon>
      <ActionIcon
        variant='subtle'
        color='dark'
        radius='xl'
        size='lg'
        aria-label='Filter Free Action'
        style={{
          backgroundColor: actionTypeFilter === 'FREE-ACTION' ? IMPRINT_BG_COLOR : undefined,
          borderColor: actionTypeFilter === 'FREE-ACTION' ? theme.colors['guide'][8] : undefined,
        }}
        onClick={() => {
          setActionTypeFilter('FREE-ACTION');
        }}
      >
        <ActionSymbol cost={'FREE-ACTION'} size={'1.9rem'} />
      </ActionIcon>
      <ActionIcon
        variant='subtle'
        color='dark'
        radius='xl'
        size='lg'
        aria-label='Filter Reaction'
        style={{
          backgroundColor: actionTypeFilter === 'REACTION' ? IMPRINT_BG_COLOR : undefined,
          borderColor: actionTypeFilter === 'REACTION' ? theme.colors['guide'][8] : undefined,
        }}
        onClick={() => {
          setActionTypeFilter('REACTION');
        }}
      >
        <ActionSymbol cost={'REACTION'} size={'1.9rem'} />
      </ActionIcon>
    </Group>
  );
}

function SpellList(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  //
  index: string;
  source?: CastingSource;
  spellIds: number[];
  allSpells: Spell[];
  itemSpellReads?: ReadonlyMap<InventoryItem, ItemSpellRead>;
  canonicalItems?: Item[];
  contentSources?: ContentSource[];
  type: SpellSectionType;
  extra: {
    charData: {
      slots: SpellSlot[];
      list: SpellListEntry[];
      focus: {
        spell_id: number;
        source: string;
        rank: number | undefined;
      }[];
      innate: SpellInnateEntry[];
      sources: CastingSource[];
    };
    slots?: SpellSlot[];
    innates?: SpellInnateEntry[];
  };
  hasFilters: boolean;
  openManageSpells?: (
    source: string,
    type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY',
    filter?: {
      traditions?: string[];
      rank_min?: number;
      rank_max?: number;
    }
  ) => void;
}) {
  const castSpell = (cast: boolean, spell: Spell, selectedInnate?: SpellInnateEntry) => {
    if (!props.entity) return;

    if (isCantrip(spell)) {
      // Casting a cantrip doesn't change any spells state
      return;
    }

    if (props.type === 'PREPARED' && props.source) {
      props.setEntity((c) => {
        if (!c) return c;
        const slots = collectEntitySpellcasting(props.id, c).slots;
        const slotIndex = slots.findIndex(
          (slot) =>
            slot.spell_id === spell.id &&
            slot.rank === spell.rank &&
            slot.source === props.source!.name &&
            !!slot.exhausted === !cast
        );
        if (slotIndex === -1) return c; // Shouldn't happen
        const newSlots = [...slots];
        newSlots[slotIndex].exhausted = cast;
        return {
          ...c,
          spells: {
            ...(c.spells ?? {
              slots: [],
              list: [],
              focus_point_current: 0,
              innate_casts: [],
            }),
            slots: newSlots,
          },
        };
      });
    }

    if (props.type === 'SPONTANEOUS' && props.source) {
      props.setEntity((c) => {
        if (!c) return c;
        let added = false;
        const newUpdatedSlots = collectEntitySpellcasting(props.id, c).slots.map((slot) => {
          if (!added && slot.rank === spell.rank && slot.source === props.source!.name && !slot.exhausted === cast) {
            added = true;
            return {
              ...slot,
              exhausted: cast,
            };
          }
          return slot;
        });

        return {
          ...c,
          spells: {
            ...(c.spells ?? {
              slots: [],
              list: [],
              focus_point_current: 0,
              innate_casts: [],
            }),
            slots: newUpdatedSlots,
          },
        };
      });
    }

    if (props.type === 'FOCUS') {
      props.setEntity((c) => {
        if (!c) return c;
        return {
          ...c,
          spells: {
            ...(c.spells ?? {
              slots: [],
              list: [],
              focus_point_current: 0,
              innate_casts: [],
            }),
            focus_point_current: Math.max((c.spells?.focus_point_current ?? 0) + (cast ? -1 : 1), 0),
          },
        };
      });
    }

    if (props.type === 'INNATE') {
      props.setEntity((c) => {
        if (!c) return c;

        const innates = collectEntitySpellcasting(props.id, c).innate.map((innate) => {
          if (selectedInnate && getInnateSpellKey(innate) === getInnateSpellKey(selectedInnate)) {
            return {
              ...innate,
              casts_current: cast
                ? Math.min(innate.casts_current + 1, innate.casts_max)
                : Math.max(innate.casts_current - 1, 0),
            };
          }
          return innate;
        });

        return {
          ...c,
          spells: {
            ...(c.spells ?? {
              slots: [],
              list: [],
              focus_point_current: 0,
              innate_casts: [],
            }),
            innate_casts: innates,
          },
        };
      });
    }
  };

  // Display spells in an ordered list by rank
  const spells = useMemo(
    () =>
      getKnownSpellsByRank(props.spellIds, props.allSpells, props.extra.charData.list, props.source?.name, props.type),
    [props.spellIds, props.allSpells, props.extra.charData.list, props.source?.name, props.type]
  );

  const slots = useMemo(() => {
    if (!props.extra?.slots || props.extra.slots.length === 0) return null;

    const mappedSlots = props.extra.slots.map((slot) => {
      let spell = props.allSpells.find((spell) => spell.id === slot.spell_id);
      if (spell) {
        spell = {
          ...spell,
          rank: slot.rank,
        };
      }
      return {
        ...slot,
        spell: spell,
      };
    });
    return groupBy(mappedSlots, 'rank');
  }, [props.extra?.slots, props.allSpells]);

  const innateSpells = useMemo(() => {
    const filteredSpells = props.extra?.innates
      ?.map((innate) => {
        let spell = props.allSpells.find((spell) => spell.id === innate.spell_id);
        if (spell) {
          spell = {
            ...spell,
            rank: innate.rank,
          };
        }
        return {
          ...innate,
          spell: spell,
        };
      })
      .filter((innate) => innate.spell);
    return groupBy(filteredSpells, 'rank');
  }, [props.extra?.innates, props.allSpells]);

  if (props.type === 'PREPARED' && props.source) {
    return <PreparedSpellsList {...props} slots={slots} castSpell={castSpell} />;
  }

  if (props.type === 'SPONTANEOUS' && props.source) {
    return (
      <SpontaneousSpellsList
        {...props}
        slots={slots}
        castSpell={castSpell}
        spells={spells}
        setEntity={props.setEntity}
      />
    );
  }

  if (props.type === 'FOCUS' && props.source && props.entity) {
    return (
      <FocusSpellsList
        {...props}
        castSpell={castSpell}
        spells={spells}
        entity={props.entity}
        setEntity={props.setEntity}
      />
    );
  }

  if (props.type === 'INNATE' && props.extra?.innates) {
    return (
      <InnateSpellsList
        {...props}
        castSpell={castSpell}
        innateSpells={innateSpells}
        entity={props.entity}
        setEntity={props.setEntity}
      />
    );
  }

  if (props.type === 'STAFF' && props.entity) {
    return (
      <>
        {filterByTraitType(props.entity?.inventory?.items ?? [], 'STAFF')
          .filter((invItem) => invItem.is_equipped)
          .map((invItem) => (
            <StaffSpellsList
              {...props}
              index={`${props.index}-${invItem.id}`}
              staff={invItem}
              entity={props.entity!}
              setEntity={props.setEntity}
            />
          ))}
      </>
    );
  }

  if (props.type === 'WAND' && props.entity) {
    return (
      <WandSpellsList
        {...props}
        wands={filterByTraitType(props.entity?.inventory?.items ?? [], 'WAND')}
        entity={props.entity}
        setEntity={props.setEntity}
      />
    );
  }

  if (props.type === 'SPELLHEART' && props.entity) {
    return (
      <SpellheartSpellsList
        {...props}
        spellhearts={filterByTraitType(props.entity?.inventory?.items ?? [], 'SPELLHEART')}
        entity={props.entity}
        setEntity={props.setEntity}
      />
    );
  }

  if (props.type === 'RITUAL') {
    return <RitualSpellsList {...props} spells={spells} castSpell={castSpell} />;
  }

  return null;
}

export function SpellSlotSelect(props: { current: number; max: number; onChange: (v: number) => void; text: string }) {
  const [displaySlots, refreshDisplaySlots] = useRefresh();

  useEffect(() => {
    refreshDisplaySlots();
  }, [props.current, props.max]);

  return (
    <Box pt={3} style={{ zIndex: 100 }}>
      {displaySlots && (
        <HoverCard width={280} shadow='md'>
          <HoverCard.Target>
            <TokenSelect
              count={props.max}
              value={props.current}
              onChange={props.onChange}
              size='xs'
              invertedSelect
              emptySymbol={
                <ActionIcon
                  variant='transparent'
                  color='gray.1'
                  aria-label='Spell Slot, Unused'
                  size='xs'
                  style={{ opacity: 0.7 }}
                >
                  <IconSquareRounded size='1rem' />
                </ActionIcon>
              }
              fullSymbol={
                <ActionIcon
                  variant='transparent'
                  color='gray.1'
                  aria-label='Spell Slot, Exhuasted'
                  size='xs'
                  style={{ opacity: 0.7 }}
                >
                  <IconSquareRoundedFilled size='1rem' />
                </ActionIcon>
              }
            />
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Text size='sm'>
              {props.text}: {props.current}/{props.max}
            </Text>
          </HoverCard.Dropdown>
        </HoverCard>
      )}
    </Box>
  );
}
