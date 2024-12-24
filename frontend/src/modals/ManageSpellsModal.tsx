import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { SelectContentButton, SpellSelectionOption, selectContent } from '@common/select/SelectContent';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import { collectEntitySpellcasting } from '@content/collect-content';
import { isSpellVisible } from '@content/content-hidden';
import { fetchContentAll } from '@content/content-store';
import {
  Box,
  Button,
  Divider,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { isCantrip, isNormalSpell, isRitual } from '@spells/spell-utils';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Spell, SpellSlot, SpellSlotRecord } from '@typing/content';
import { rankNumber } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import useRefresh from '@utils/use-refresh';
import * as JsSearch from 'js-search';
import _ from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';

export default function ManageSpellsModal(props: {
  opened: boolean;
  onClose: () => void;
  source: string;
  type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY';
  filter?: {
    traditions?: string[];
    ranks?: string[];
  };
  zIndex?: number;
}) {
  const isRituals = props.source === 'RITUALS';

  const theme = useMantineTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  const { data: allRawSpells, isFetching } = useQuery({
    queryKey: [`find-spells`],
    queryFn: async () => {
      return (await fetchContentAll<Spell>('spell')).filter((spell) => isSpellVisible('CHARACTER', spell));
    },
  });

  // Filter options based on search query
  const search = useRef(new JsSearch.Search('id'));
  useEffect(() => {
    if (!allRawSpells) return;
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
    search.current.addDocuments(allRawSpells);
  }, [allRawSpells]);

  const charData = useMemo(() => {
    if (!character) return null;
    return collectEntitySpellcasting('CHARACTER', character);
  }, [character]);

  const allFilteredSpells =
    (searchQuery.trim() ? (search.current?.search(searchQuery.trim()) as Spell[] | undefined) : allRawSpells ?? []) ??
    [];

  const spells = useMemo(() => {
    const filteredSpells = charData?.list
      .map((entry) => {
        const foundSpell = allFilteredSpells.find(
          (spell) => spell.id === entry.spell_id && entry.source === props.source
        );
        if (!foundSpell) return null;
        return {
          ...foundSpell,
          rank: entry.rank,
        } as Spell;
      })
      .filter((spell) => spell)
      .filter((spell) => (isRituals ? isRitual(spell!) : isNormalSpell(spell!)))
      .sort((a, b) => {
        if (a!.rank === 0 && b!.rank === 0) {
          return a!.name.localeCompare(b!.name);
        } else if (a!.rank === 0) {
          return -1;
        } else if (b!.rank === 0) {
          return 1;
        } else {
          return a!.rank - b!.rank;
        }
      }) as Spell[] | undefined;
    return filteredSpells;
  }, [charData, allFilteredSpells]);

  const slots = useMemo(() => {
    return _.groupBy(charData?.slots, 'rank');
  }, [charData]);

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={<Title order={3}>Manage {isRituals ? 'Rituals' : `Spells - ${toLabel(props.source)}`}</Title>}
      styles={{
        body: {
          paddingRight: 2,
        },
      }}
      size={props.type === 'SLOTS-AND-LIST' ? 'xl' : 'md'}
      keepMounted={false}
      zIndex={props.zIndex}
    >
      <Stack style={{ position: 'relative' }} mx={10}>
        {props.type === 'LIST-ONLY' ? (
          <ListSection
            selectRank
            spells={spells ?? []}
            source={props.source}
            searchQuery={searchQuery}
            filter={props.filter}
            setSearchQuery={(val) => {
              setSearchQuery(val);
            }}
          />
        ) : props.type === 'SLOTS-AND-LIST' ? (
          <Grid>
            <Grid.Col span={6}>
              <ListSection
                spells={spells ?? []}
                source={props.source}
                searchQuery={searchQuery}
                filter={props.filter}
                setSearchQuery={(val) => {
                  setSearchQuery(val);
                }}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <LoadingOverlay visible={isFetching} />
              <SlotsSection filter={props.filter} slots={slots} spells={spells ?? []} source={props.source} />
            </Grid.Col>
          </Grid>
        ) : (
          <>
            <LoadingOverlay visible={isFetching} />
            <SlotsSection filter={props.filter} slots={slots} source={props.source} />
          </>
        )}
      </Stack>
    </Modal>
  );
}

const SlotsSection = (props: {
  slots: Record<string, SpellSlotRecord[]>;
  spells?: Spell[];
  source: string;
  filter?: {
    traditions?: string[];
    ranks?: string[];
  };
}) => {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);
  const [displaySlots, refreshSlots] = useRefresh();

  props.slots;

  const { slots } = props;
  // Filter the slots to only show the slots for the source
  const slotsForSource = Object.keys(slots).reduce(
    (acc, key) => {
      const slots = props.slots[key].filter((slot) => slot.source === props.source);
      if (slots.length > 0) {
        acc[key] = slots;
      }
      return acc;
    },
    {} as Record<string, SpellSlotRecord[]>
  );

  return (
    <ScrollArea pr={14} h={`calc(min(80dvh, ${EDIT_MODAL_HEIGHT}px))`} scrollbars='y'>
      <Stack gap={10}>
        {Object.keys(slotsForSource).map((rank, index) => (
          <Box key={index} data-wg-name={`rank-${rank}`}>
            <Text size='md' pl={5}>
              {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
            </Text>
            <Divider pt={0} pb={10} />
            {displaySlots && (
              <Group key={index} gap={10}>
                {slotsForSource[rank].map((slot, index) => (
                  <Box key={index}>
                    <SelectContentButton
                      type='spell'
                      onClick={(spell) => {
                        setCharacter((c) => {
                          if (!c) return c;
                          let slots = collectEntitySpellcasting('CHARACTER', c).slots;
                          slots = slots.map((s) => {
                            if (s.id === slot.id) {
                              return {
                                ...s,
                                spell_id: spell.id,
                              };
                            } else {
                              return s;
                            }
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
                              slots: slots,
                            },
                          };
                        });
                        //refreshSlots();
                      }}
                      onClear={() => {
                        setCharacter((c) => {
                          if (!c) return c;
                          let slots = collectEntitySpellcasting('CHARACTER', c).slots;
                          slots = slots.map((s) => {
                            if (s.id === slot.id) {
                              return {
                                ...s,
                                spell_id: undefined,
                              };
                            } else {
                              return s;
                            }
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
                              slots: slots,
                            },
                          };
                        });
                        //refreshSlots();
                      }}
                      selectedId={slot.spell_id === -1 ? undefined : slot.spell_id}
                      options={{
                        showButton: true,
                        overrideOptions: props.spells,
                        filterFn: (spell: Spell) => {
                          // const foundSpell =
                          //   props.spells !== undefined
                          //     ? props.spells.find((s) => s.id === spell.id)
                          //     : undefined;
                          // if (props.spells !== undefined && !foundSpell) return false;

                          if (rank === '0') {
                            return isNormalSpell(spell) && isCantrip(spell);
                          } else {
                            return isNormalSpell(spell) && spell.rank <= parseInt(rank) && !isCantrip(spell);
                          }
                        },
                        filterOptions: {
                          options: [
                            {
                              title: 'Tradition',
                              type: 'MULTI-SELECT',
                              options: [
                                { label: 'Arcane', value: 'arcane' },
                                { label: 'Divine', value: 'divine' },
                                { label: 'Occult', value: 'occult' },
                                { label: 'Primal', value: 'primal' },
                              ],
                              key: 'traditions',
                              default: props.filter?.traditions,
                            },
                            {
                              title: 'Rank',
                              type: 'MULTI-SELECT',
                              default: Array.from({ length: parseInt(rank) + 1 }, (_, i) => i.toString()),
                              options: [
                                { label: 'Cantrip', value: '0' },
                                { label: '1st', value: '1' },
                                { label: '2nd', value: '2' },
                                { label: '3rd', value: '3' },
                                { label: '4th', value: '4' },
                                { label: '5th', value: '5' },
                                { label: '6th', value: '6' },
                                { label: '7th', value: '7' },
                                { label: '8th', value: '8' },
                                { label: '9th', value: '9' },
                                { label: '10th', value: '10' },
                              ],
                              key: 'rank',
                            },
                          ],
                        },
                      }}
                    />
                  </Box>
                ))}
              </Group>
            )}
          </Box>
        ))}
      </Stack>
    </ScrollArea>
  );
};

const ListSection = (props: {
  selectRank?: boolean;
  spells: Spell[];
  source: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filter?: {
    traditions?: string[];
    ranks?: string[];
  };
}) => {
  const isRituals = props.source === 'RITUALS';

  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  const [rankSelectSpell, setRankSelectSpell] = useState<Spell | null>(null);

  const addSpell = (option: Spell, rank: number) => {
    setCharacter((c) => {
      if (!c) return c;

      const list = [
        ...(c.spells?.list ?? []),
        {
          spell_id: option.id,
          rank: rank, //option.rank,
          source: props.source,
        },
      ];

      return {
        ...c,
        spells: {
          ...(c.spells ?? {
            slots: [],
            list: [],
            focus_point_current: 0,
            innate_casts: [],
          }),
          list: list,
        },
      };
    });
  };

  return (
    <Box>
      <SelectSpellRankModal
        spell={rankSelectSpell}
        onConfirm={(spell, rank) => {
          if (spell && rank) {
            addSpell(spell, rank);
          }
          setRankSelectSpell(null);
        }}
      />
      <Group>
        <TextInput
          style={{ flex: 1 }}
          leftSection={<IconSearch size='0.9rem' />}
          placeholder={`Search ${isRituals ? 'ritual' : 'spell'} list`}
          defaultValue={props.searchQuery}
          onChange={(e) => props.setSearchQuery(e.target.value)}
          styles={{
            input: {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderColor: props.searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
            },
          }}
        />
        <Button
          color='dark.6'
          style={{ borderColor: theme.colors.dark[4] }}
          radius='md'
          fw={500}
          rightSection={<IconPlus size='1.0rem' />}
          onClick={() => {
            selectContent<Spell>(
              'spell',
              (option) => {
                if (option.rank === 0 || option.rank === 10 || isRitual(option)) {
                  addSpell(option, option.rank);
                } else {
                  if (props.selectRank) {
                    setRankSelectSpell(option);
                  } else {
                    addSpell(option, option.rank);
                  }
                }
              },
              {
                showButton: true,
                groupBySource: true,
                overrideLabel: `Add ${isRituals ? 'Ritual' : 'Spell'}`,

                filterFn: (spellRec: Record<string, any>) => {
                  const s = spellRec as Spell;
                  if (isRituals) {
                    return isRitual(s);
                  } else {
                    return isNormalSpell(s);
                  }
                },

                filterOptions: {
                  options: [
                    {
                      title: 'Tradition',
                      type: 'MULTI-SELECT',
                      default: props.filter?.traditions,
                      options: [
                        { label: 'Arcane', value: 'arcane' },
                        { label: 'Divine', value: 'divine' },
                        { label: 'Occult', value: 'occult' },
                        { label: 'Primal', value: 'primal' },
                      ],
                      key: 'traditions',
                    },
                    {
                      title: 'Rank',
                      type: 'MULTI-SELECT',
                      default: props.filter?.ranks,
                      options: [
                        { label: 'Cantrip', value: '0' },
                        { label: '1st', value: '1' },
                        { label: '2nd', value: '2' },
                        { label: '3rd', value: '3' },
                        { label: '4th', value: '4' },
                        { label: '5th', value: '5' },
                        { label: '6th', value: '6' },
                        { label: '7th', value: '7' },
                        { label: '8th', value: '8' },
                        { label: '9th', value: '9' },
                        { label: '10th', value: '10' },
                      ],
                      key: 'rank',
                    },
                  ],
                },
              }
            );
          }}
        >
          Add {isRituals ? 'Ritual' : 'Spell'}
        </Button>
      </Group>
      <ScrollArea h={`calc(min(70dvh, ${EDIT_MODAL_HEIGHT - 100}px))`} scrollbars='y'>
        <Stack gap={0}>
          {props.spells.map((spell, index) => (
            <SpellSelectionOption
              key={index}
              spell={spell}
              onClick={(spell) => {
                openDrawer({ type: 'spell', data: { spell: spell } });
              }}
              onDelete={(spellId) => {
                setCharacter((c) => {
                  if (!c) return c;

                  const list = (c.spells?.list ?? []).filter((entry) => {
                    return !(entry.spell_id === spellId && entry.rank === spell.rank && entry.source === props.source);
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
                      list: list,
                    },
                  };
                });
              }}
              showButton={false}
              hideTraits={true}
              includeOptions={true}
            />
          ))}
          {props.spells.length === 0 && (
            <Text c='gray.6' fz='sm' fs='italic' ta='center' pt={20}>
              No {isRituals ? 'rituals' : 'spells'} found
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
};

const SelectSpellRankModal = (props: {
  spell: Spell | null;
  onConfirm: (spell: Spell | null, rank: number | null) => void;
}) => {
  const getRankOptions = (X: number): number[] => Array.from({ length: 11 - X }, (_, i) => X + i);

  return (
    <Modal
      opened={!!props.spell}
      onClose={() => props.onConfirm(null, null)}
      title={<Title order={3}>Select {props.spell?.name}'s Rank</Title>}
    >
      <Stack gap={10}>
        {props.spell &&
          getRankOptions(props.spell.rank).map((rank) => (
            <Button
              key={rank}
              onClick={() => {
                props.onConfirm(props.spell, rank);
              }}
              variant='light'
              fullWidth
            >
              {rankNumber(rank)}
            </Button>
          ))}
      </Stack>
    </Modal>
  );
};
