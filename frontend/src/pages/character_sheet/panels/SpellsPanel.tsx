import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurButton from '@common/BlurButton';
import TokenSelect from '@common/TokenSelect';
import { SpellSelectionOption } from '@common/select/SelectContent';
import { collectCharacterSpellcasting, getFocusPoints } from '@content/collect-content';
import { fetchContentAll } from '@content/content-store';
import {
  useMantineTheme,
  Stack,
  Group,
  TextInput,
  ScrollArea,
  Accordion,
  Divider,
  Badge,
  HoverCard,
  ActionIcon,
  Box,
  Text,
} from '@mantine/core';
import ManageSpellsModal from '@modals/ManageSpellsModal';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { isCantrip, isRitual } from '@spells/spell-utils';
import { IconSearch, IconSquareRounded, IconSquareRoundedFilled } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Spell, CastingSource, SpellSlot, SpellInnateEntry } from '@typing/content';
import { rankNumber } from '@utils/numbers';
import { getTraitIdByType } from '@utils/traits';
import useRefresh from '@utils/use-refresh';
import { variableNameToLabel } from '@variables/variable-utils';
import _ from 'lodash-es';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRecoilValue, useRecoilState } from 'recoil';
import * as JsSearch from 'js-search';

export default function SpellsPanel(props: { panelHeight: number; panelWidth: number }) {
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [section, setSection] = useState<string>();
  const [manageSpells, setManageSpells] = useState<
    | {
        source: string;
        type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY';
      }
    | undefined
  >();

  const { data: spells } = useQuery({
    queryKey: [`find-spells-and-data`],
    queryFn: async () => {
      if (!character) return null;

      return await fetchContentAll<Spell>('spell');
    },
  });

  const charData = useMemo(() => {
    if (!character) return null;
    return collectCharacterSpellcasting(character);
  }, [character]);

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!spells) return;
    search.current.addIndex('name');
    search.current.addIndex('description');
    search.current.addIndex('duration');
    search.current.addIndex('targets');
    search.current.addIndex('area');
    search.current.addIndex('range');
    search.current.addIndex('requirements');
    search.current.addIndex('trigger');
    search.current.addIndex('cost');
    search.current.addIndex('defense');
    search.current.addDocuments(spells);
  }, [spells]);

  const allSpells = searchQuery.trim() ? (search.current?.search(searchQuery.trim()) as Spell[]) : spells ?? [];

  return (
    <Box h='100%'>
      <Stack gap={10}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search spells`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />
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
                          index={`spontaneous-${source.name}`}
                          source={source}
                          spellIds={charData.list.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                          allSpells={allSpells}
                          type='SPONTANEOUS'
                          extra={{ slots: charData.slots.filter((s) => s.source === source.name) }}
                          openManageSpells={(source, type) => setManageSpells({ source, type })}
                          hasFilters={!!searchQuery.trim()}
                        />
                      }
                    </>
                  ) : source.type.startsWith('PREPARED-') ? (
                    <>
                      {
                        <SpellList
                          index={`prepared-${source.name}`}
                          source={source}
                          spellIds={charData.list.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                          allSpells={allSpells}
                          type='PREPARED'
                          extra={{ slots: charData.slots.filter((s) => s.source === source.name) }}
                          openManageSpells={(source, type) => setManageSpells({ source, type })}
                          hasFilters={!!searchQuery.trim()}
                        />
                      }
                    </>
                  ) : null}
                  {charData.focus.filter((d) => d.source === source.name).length > 0 && (
                    <SpellList
                      index={`focus-${source.name}`}
                      source={source}
                      spellIds={charData.focus.filter((d) => d.source === source.name).map((d) => d.spell_id)}
                      allSpells={allSpells}
                      type='FOCUS'
                      hasFilters={!!searchQuery.trim()}
                    />
                  )}
                </div>
              ))}

              {charData.innate.length > 0 && (
                <SpellList
                  index={'innate'}
                  spellIds={charData.innate.map((d) => d.spell_id)}
                  allSpells={allSpells}
                  type='INNATE'
                  extra={{ innates: charData.innate }}
                  hasFilters={!!searchQuery.trim()}
                />
              )}
              {/* Always display ritual section */}
              {true && (
                <SpellList
                  index={'ritual'}
                  spellIds={charData.list.filter((d) => d.source === 'RITUALS').map((d) => d.spell_id)}
                  allSpells={allSpells}
                  type='RITUAL'
                  openManageSpells={(source, type) => setManageSpells({ source, type })}
                  hasFilters={!!searchQuery.trim()}
                />
              )}
            </Accordion>
          )}
        </ScrollArea>
      </Stack>
      {manageSpells && (
        <ManageSpellsModal
          opened={!!manageSpells}
          onClose={() => setManageSpells(undefined)}
          source={manageSpells.source}
          type={manageSpells.type}
        />
      )}
    </Box>
  );
}

function SpellList(props: {
  index: string;
  source?: CastingSource;
  spellIds: number[];
  allSpells: Spell[];
  type: 'PREPARED' | 'SPONTANEOUS' | 'FOCUS' | 'INNATE' | 'RITUAL';
  extra?: {
    slots?: SpellSlot[];
    innates?: SpellInnateEntry[];
  };
  hasFilters: boolean;
  openManageSpells?: (source: string, type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY') => void;
}) {
  const [character, setCharacter] = useRecoilState(characterState);

  const castSpell = (cast: boolean, spell: Spell) => {
    if (!character) return;

    if (isCantrip(spell)) {
      // Casting a cantrip doesn't change any spells state
      return;
    }

    if (props.type === 'PREPARED' && props.source) {
      setCharacter((c) => {
        if (!c) return c;
        const newUpdatedSlots = collectCharacterSpellcasting(c).slots.map((slot) => {
          if (slot.spell_id === spell.id && slot.rank === spell.rank && slot.source === props.source!.name) {
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

    if (props.type === 'SPONTANEOUS' && props.source) {
      setCharacter((c) => {
        if (!c) return c;
        let added = false;
        const newUpdatedSlots = collectCharacterSpellcasting(c).slots.map((slot) => {
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
      setCharacter((c) => {
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
      setCharacter((c) => {
        if (!c) return c;

        const innates = collectCharacterSpellcasting(c).innate.map((innate) => {
          if (innate.spell_id === spell.id && innate.rank === spell.rank) {
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
  const spells = useMemo(() => {
    const filteredSpells = props.spellIds
      .map((id) => props.allSpells.find((spell) => spell.id === id))
      .filter((spell) => spell) as Spell[];
    return _.groupBy(filteredSpells, 'rank');
  }, [props.spellIds, props.allSpells]);

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
    return _.groupBy(mappedSlots, 'rank');
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
    return _.groupBy(filteredSpells, 'rank');
  }, [props.extra?.innates, props.allSpells]);

  if (props.type === 'PREPARED' && props.source) {
    // If there are no spells to display, and there are filters, return null
    if (
      props.hasFilters &&
      slots &&
      Object.keys(slots).filter((rank) => slots[rank].find((s) => s.spell)).length === 0
    ) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              {variableNameToLabel(props.source.name)} Spells
            </Text>
            <Box mr={10}>
              <BlurButton
                size='xs'
                fw={500}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  props.openManageSpells?.(
                    props.source!.name,
                    props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                  );
                }}
              >
                Manage
              </BlurButton>
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            {/* <Divider color='dark.6' /> */}
            <Accordion
              px={10}
              pb={5}
              variant='separated'
              multiple
              defaultValue={[]}
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
                  marginBottom: 5,
                },
              }}
            >
              {slots &&
                Object.keys(slots)
                  .filter((rank) =>
                    slots[rank].length > 0 && props.hasFilters ? slots[rank].find((s) => s.spell) : true
                  )
                  .map((rank, index) => (
                    <Accordion.Item key={index} value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Text c='gray.5' fw={700} fz='sm'>
                            {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                          </Text>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {props.hasFilters ? slots[rank].filter((s) => s.spell).length : slots[rank].length}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {slots[rank].map((slot, index) => (
                            <SpellListEntry
                              key={index}
                              spell={slot.spell}
                              exhausted={!!slot.exhausted}
                              tradition={props.source!.tradition}
                              attribute={props.source!.attribute}
                              onCastSpell={(cast: boolean) => {
                                if (slot.spell) castSpell(cast, slot.spell);
                              }}
                              onOpenManageSpells={() => {
                                props.openManageSpells?.(
                                  props.source!.name,
                                  props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                                );
                              }}
                              hasFilters={props.hasFilters}
                            />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'SPONTANEOUS' && props.source) {
    // If there are no spells to display, and there are filters, return null
    if (
      props.hasFilters &&
      slots &&
      Object.keys(slots).filter((rank) => slots[rank].find((s) => s.spell)).length === 0
    ) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              {variableNameToLabel(props.source.name)} Spells
            </Text>
            <Box mr={10}>
              <BlurButton
                size='xs'
                fw={500}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  props.openManageSpells?.(props.source!.name, 'LIST-ONLY');
                }}
              >
                Manage
              </BlurButton>
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            {/* <Divider color='dark.6' /> */}
            <Accordion
              px={10}
              pb={5}
              variant='separated'
              multiple
              defaultValue={[]}
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
                  marginBottom: 5,
                },
              }}
            >
              {slots &&
                Object.keys(slots)
                  .filter((rank) => slots[rank] && slots[rank].length > 0)
                  .map((rank, index) => (
                    <Accordion.Item value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Group wrap='nowrap'>
                            <Text c='gray.5' fw={700} fz='sm' w={70}>
                              {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                            </Text>
                            {rank !== '0' && (
                              <SpellSlotSelect
                                text='Spell Slots'
                                current={slots[rank].filter((slot) => `${slot.rank}` === rank && slot.exhausted).length}
                                max={slots[rank].filter((slot) => `${slot.rank}` === rank).length}
                                onChange={(v) => {
                                  setCharacter((c) => {
                                    if (!c) return c;

                                    let count = 0;
                                    const slots = collectCharacterSpellcasting(c).slots;
                                    for (const slot of slots) {
                                      if (slot.rank === parseInt(rank) && slot.source === props.source?.name) {
                                        slot.exhausted = count < v;
                                        count++;
                                      }
                                    }

                                    return {
                                      ...c,
                                      spells: {
                                        ...(c.spells ?? {
                                          slots: [],
                                          list: [],
                                          focus_point_current: 0,
                                          innate_casts: [],
                                        }),
                                        slots: slots,
                                      },
                                    };
                                  });
                                }}
                              />
                            )}
                          </Group>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {spells[rank]?.length ?? 0}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          <Divider color='dark.6' />
                          {spells[rank]?.map((spell, index) => (
                            <SpellListEntry
                              key={index}
                              spell={spell}
                              exhausted={!slots[rank].find((s) => !s.exhausted)}
                              tradition={props.source!.tradition}
                              attribute={props.source!.attribute}
                              onCastSpell={(cast: boolean) => {
                                castSpell(cast, spell);
                              }}
                              onOpenManageSpells={() => {
                                props.openManageSpells?.(
                                  props.source!.name,
                                  props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                                );
                              }}
                              hasFilters={props.hasFilters}
                            />
                          ))}
                          {(!spells[rank] || spells[rank].length === 0) && (
                            <Text c='gray.6' fz='sm' fs='italic' ta='center' py={5}>
                              No spells known
                            </Text>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'FOCUS' && props.source && character) {
    // If there are no spells to display, and there are filters, return null
    if (props.hasFilters && spells && !Object.keys(spells).find((rank) => spells[rank].length > 0)) {
      return null;
    }

    const focusPoints = getFocusPoints(character, _.flatMap(spells));

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              {variableNameToLabel(props.source.name)} Focus Spells
            </Text>
            <Box mr={10}>
              <SpellSlotSelect
                text='Focus Points'
                current={focusPoints.max - focusPoints.current}
                max={focusPoints.max}
                onChange={(v) => {
                  setCharacter((c) => {
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
                        focus_point_current: Math.max(focusPoints.max - v, 0),
                      },
                    };
                  });
                }}
              />
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            {/* <Divider color='dark.6' /> */}
            <Accordion
              px={10}
              pb={5}
              variant='separated'
              multiple
              defaultValue={[]}
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
                  marginBottom: 5,
                },
              }}
            >
              {spells &&
                Object.keys(spells)
                  .filter((rank) => spells[rank].length > 0)
                  .map((rank, index) => (
                    <Accordion.Item value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Text c='gray.5' fw={700} fz='sm'>
                            {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                          </Text>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {spells[rank].length}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {spells[rank].map((spell, index) => (
                            <SpellListEntry
                              key={index}
                              spell={{
                                ...spell,
                                // Add focus trait in case it doesn't have it
                                traits: _.uniq([...(spell.traits ?? []), getTraitIdByType('FOCUS')]),
                              }}
                              exhausted={
                                character?.spells?.focus_point_current === undefined
                                  ? false
                                  : character.spells.focus_point_current <= 0
                              }
                              tradition={props.source!.tradition}
                              attribute={props.source!.attribute}
                              onCastSpell={(cast: boolean) => {
                                castSpell(cast, spell);
                              }}
                              onOpenManageSpells={() => {
                                props.openManageSpells?.(
                                  props.source!.name,
                                  props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                                );
                              }}
                              hasFilters={props.hasFilters}
                            />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'INNATE' && props.extra?.innates) {
    // If there are no spells to display, and there are filters, return null
    if (
      props.hasFilters &&
      innateSpells &&
      Object.keys(innateSpells).filter((rank) => innateSpells[rank].find((s) => s.spell)).length === 0
    ) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Text c='gray.5' fw={700} fz='sm'>
              Innate Spells
            </Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
        >
          <Stack gap={0}>
            {/* <Divider color='dark.6' /> */}
            <Accordion
              px={10}
              pb={5}
              variant='separated'
              multiple
              defaultValue={[]}
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
                  marginBottom: 5,
                },
              }}
            >
              {innateSpells &&
                Object.keys(innateSpells)
                  .filter((rank) =>
                    innateSpells[rank].length > 0 && props.hasFilters ? innateSpells[rank].find((s) => s.spell) : true
                  )
                  .map((rank, index) => (
                    <Accordion.Item value={`rank-group-${index}`}>
                      <Accordion.Control>
                        <Group wrap='nowrap' justify='space-between' gap={0}>
                          <Text c='gray.5' fw={700} fz='sm'>
                            {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                          </Text>
                          <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                            <Text fz='sm' c='gray.5' span>
                              {props.hasFilters
                                ? innateSpells[rank].filter((s) => s.spell).length
                                : innateSpells[rank].length}
                            </Text>
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {innateSpells[rank].map((innate, index) => (
                            <SpellListEntry
                              key={index}
                              spell={innate.spell}
                              exhausted={innate.casts_current >= innate.casts_max}
                              tradition={innate.tradition}
                              attribute={'ATTRIBUTE_CHA'}
                              onCastSpell={(cast: boolean) => {
                                if (innate.spell) castSpell(cast, innate.spell);
                              }}
                              hasFilters={props.hasFilters}
                              leftSection={
                                <SpellSlotSelect
                                  text='Remaining Casts'
                                  current={innate.casts_current}
                                  max={innate.casts_max}
                                  onChange={(v) => {
                                    setCharacter((c) => {
                                      if (!c) return c;

                                      const innates = (props.extra?.innates ?? []).map((inn) => {
                                        if (inn.spell_id === innate.spell_id && inn.rank === innate.rank) {
                                          return {
                                            ...inn,
                                            casts_current: v,
                                          };
                                        }
                                        return inn;
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
                                  }}
                                />
                              }
                            />
                          ))}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  if (props.type === 'RITUAL') {
    // If there are no spells to display, and there are filters, return null
    if (props.hasFilters && spells && !Object.keys(spells).find((rank) => spells[rank].length > 0)) {
      return null;
    }

    return (
      <Accordion.Item value={props.index}>
        <Accordion.Control>
          <Group wrap='nowrap' justify='space-between' gap={0}>
            <Group gap={10}>
              <Text c='gray.5' fw={700} fz='sm'>
                Rituals
              </Text>
              <Badge variant='outline' color='gray.5' size='xs'>
                <Text fz='sm' c='gray.5' span>
                  {props.spellIds.length}
                </Text>
              </Badge>
            </Group>

            <Box mr={10}>
              <BlurButton
                size='xs'
                fw={500}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  props.openManageSpells?.('RITUALS', 'LIST-ONLY');
                }}
              >
                Manage
              </BlurButton>
            </Box>
          </Group>
        </Accordion.Control>
        <Accordion.Panel
          styles={{
            content: {
              padding: 0,
            },
          }}
          px={10}
          pb={10}
        >
          <Stack gap={5}>
            {/* <Divider color='dark.6' /> */}
            {spells &&
              Object.keys(spells)
                .reduce((acc, rank) => acc.concat(spells[rank]), [] as Spell[])
                .map((spell, index) => (
                  <SpellListEntry
                    key={index}
                    spell={spell}
                    exhausted={false}
                    tradition={'NONE'}
                    attribute={'ATTRIBUTE_CHA'}
                    onCastSpell={(cast: boolean) => {
                      castSpell(cast, spell);
                    }}
                    onOpenManageSpells={() => {
                      props.openManageSpells?.(
                        props.source!.name,
                        props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY'
                      );
                    }}
                    hasFilters={props.hasFilters}
                  />
                ))}

            {props.spellIds.length === 0 && (
              <Text c='gray.6' fz='sm' fs='italic' ta='center' py={5}>
                No rituals known
              </Text>
            )}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    );
  }

  return null;
}

function SpellListEntry(props: {
  spell?: Spell;
  exhausted: boolean;
  tradition: string;
  attribute: string;
  onCastSpell: (cast: boolean) => void;
  onOpenManageSpells?: () => void;
  hasFilters: boolean;
  leftSection?: React.ReactNode;
}) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const exhausted = props.spell && isCantrip(props.spell) ? false : props.exhausted;

  if (props.spell) {
    return (
      <StatButton
        onClick={() => {
          if (!props.spell) return;

          if (isRitual(props.spell)) {
            openDrawer({
              type: 'spell',
              data: {
                id: props.spell.id,
                spell: props.spell,
              },
              extra: { addToHistory: true },
            });
            return;
          }

          openDrawer({
            type: 'cast-spell',
            data: {
              id: props.spell.id,
              spell: props.spell,
              exhausted: exhausted,
              tradition: props.tradition,
              attribute: props.attribute,
              onCastSpell: (cast: boolean) => {
                props.onCastSpell(cast);
              },
            },
            extra: { addToHistory: true },
          });
        }}
      >
        <SpellSelectionOption
          noBackground
          hideRank
          exhausted={exhausted}
          showButton={false}
          spell={props.spell}
          leftSection={props.leftSection}
          px={0}
        />
      </StatButton>
    );
  }

  if (props.hasFilters) {
    return null;
  }

  return (
    <StatButton
      onClick={() => {
        props.onOpenManageSpells?.();
      }}
    >
      <Text fz='xs' fs='italic' c='dimmed' fw={500} pl={7}>
        No Spell Prepared
      </Text>
    </StatButton>
  );
}

function SpellSlotSelect(props: { current: number; max: number; onChange: (v: number) => void; text: string }) {
  const [displaySlots, refreshDisplaySlots] = useRefresh();

  useEffect(() => {
    refreshDisplaySlots();
  }, [props.current, props.max]);

  console.log('SpellSlotSelect', props.current, props.max, displaySlots);

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
