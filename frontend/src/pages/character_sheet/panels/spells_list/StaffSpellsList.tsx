import { Accordion, Badge, Box, Button, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { getSpellStats } from '@spells/spell-handler';
import {
  CastingSource,
  Character,
  InventoryItem,
  Item,
  LivingEntity,
  Spell,
  SpellInnateEntry,
  SpellListEntry,
  SpellSlot,
  SpellSlotRecord,
} from '@typing/content';
import { rankNumber, sign } from '@utils/numbers';
import { Dictionary } from 'node_modules/cypress/types/lodash';
import { SetterOrUpdater } from 'recoil';
import { SpellSlotSelect } from '../SpellsPanel';
import SpellListEntrySection from './SpellListEntrySection';
import { detectSpells, getSpellcastingType } from '@spells/spell-utils';
import _ from 'lodash-es';
import { use } from 'chai';
import { useEffect } from 'react';
import BlurButton from '@common/BlurButton';
import { openContextModal } from '@mantine/modals';
import { collectEntitySpellcasting } from '@content/collect-content';
import { handleUpdateItemCharges } from '@items/inv-utils';
import { StoreID } from '@typing/variables';

export default function StaffSpellsList(props: {
  id: StoreID;
  entity: LivingEntity;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  //
  index: string;
  staff: InventoryItem;
  allSpells: Spell[];
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
  };
  hasFilters: boolean;
}) {
  const detectedSpells = _.groupBy(detectSpells(props.staff.item.description, props.allSpells), 'rank');

  // Calculated values (could put in useMemo)
  const maxCharges = props.staff.item.meta_data?.charges?.max ?? 0;
  const currentCharges = props.staff.item.meta_data?.charges?.current ?? 0;
  let greatestSlotRank = 0;
  for (const slot of props.extra.charData.slots) {
    if (slot.rank > greatestSlotRank) {
      greatestSlotRank = slot.rank;
    }
  }
  const castingType = getSpellcastingType(props.id, props.entity);
  const canAddPreparedExtraCharges = castingType === 'PREPARED' && maxCharges <= greatestSlotRank;

  // On init,
  useEffect(() => {
    if (greatestSlotRank > maxCharges) {
      // Update item to have max charges equal to greatest slot rank
      handleUpdateItemCharges(props.setEntity, props.staff, { max: greatestSlotRank });
    }
  }, []);

  // If there are no spells to display, and there are filters, return null
  if (
    props.hasFilters &&
    detectedSpells &&
    Object.keys(detectedSpells).filter((rank) => detectedSpells[rank].find((s) => s.spell)).length === 0
  ) {
    return null;
  }

  return (
    <Accordion.Item value={props.index}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {props.staff.item.name}
          </Text>

          <Box mr={10}>
            <Group wrap='nowrap' gap={10}>
              {canAddPreparedExtraCharges && (
                <BlurButton
                  size='compact-xs'
                  fw={500}
                  fz={10}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    openContextModal({
                      modal: 'selectSpellSlot',
                      title: <Title order={3}>Expend a Spell Slot</Title>,
                      innerProps: {
                        text: 'Select a spell slot to expend it and add a number of charges equal to its rank to your staff.',
                        allSpells: props.allSpells,
                        onSelect: (slot: SpellSlotRecord) => {
                          // Expend the selected slot
                          props.setEntity((c) => {
                            if (!c) return c;
                            const slots = collectEntitySpellcasting(props.id, c).slots;

                            let newSlots = _.cloneDeep(slots ?? []);
                            newSlots = newSlots.map((s) => {
                              if (s.id === slot.id) {
                                return {
                                  ...s,
                                  exhausted: true,
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
                                slots: newSlots,
                              },
                            };
                          });

                          // Update the staff charges, delay it prevent race condition with slot expending
                          // TODO: Just combine into one update call
                          setTimeout(() => {
                            handleUpdateItemCharges(props.setEntity, props.staff, {
                              max: props.staff.item.meta_data!.charges!.max! + slot.rank,
                            });
                          }, 250);
                        },
                      },
                    });
                  }}
                >
                  Add Charges
                </BlurButton>
              )}
              <SpellSlotSelect
                text='Staff Charges'
                current={props.staff.item.meta_data?.charges?.current ?? 0}
                max={props.staff.item.meta_data?.charges?.max ?? 0}
                onChange={(v) => {
                  handleUpdateItemCharges(props.setEntity, props.staff, {
                    current: v,
                  });
                }}
              />
            </Group>
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
            {detectedSpells &&
              Object.keys(detectedSpells)
                .filter((rank) =>
                  detectedSpells[rank].length > 0 && props.hasFilters ? detectedSpells[rank].find((s) => s.spell) : true
                )
                .map((rank, index) => (
                  <div key={index} data-wg-name={`rank-group-${index}`}>
                    <Group wrap='nowrap' justify='space-between' gap={0}>
                      <Text c='gray.5' fw={700} fz='sm'>
                        {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                      </Text>
                      <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                        <Text fz='sm' c='gray.5' span>
                          {props.hasFilters
                            ? detectedSpells[rank].filter((s) => s.spell).length
                            : detectedSpells[rank].length}
                        </Text>
                      </Badge>
                    </Group>
                    <Divider my={5} />
                    <Stack gap={5} mb='md'>
                      {detectedSpells[rank].map((record, index) => (
                        <SpellListEntrySection
                          key={index}
                          spell={record.spell}
                          exhausted={
                            record.spell.rank > 0 &&
                            (castingType === 'SPONTANEOUS'
                              ? currentCharges + 1 > maxCharges
                              : currentCharges + record.spell.rank > maxCharges)
                          }
                          tradition={'NONE'}
                          attribute={'ATTRIBUTE_CHA'}
                          onCastSpell={(cast: boolean) => {
                            const castWithCharges = () => {
                              handleUpdateItemCharges(props.setEntity, props.staff, {
                                current: Math.max(
                                  Math.min(
                                    currentCharges + (cast ? record.spell.rank : -record.spell.rank),
                                    maxCharges
                                  ),
                                  0
                                ),
                              });
                            };

                            if (record.spell) {
                              // If is spontaneous casting, open choice modal
                              if (cast === true && castingType === 'SPONTANEOUS') {
                                if (record.spell.rank > 0) {
                                  openContextModal({
                                    modal: 'selectStaffCasting',
                                    title: <Title order={3}>Cast Spell Choice</Title>,
                                    innerProps: {
                                      canCastNormally: currentCharges + record.spell.rank <= maxCharges,
                                      spell: record.spell,
                                      onSelect: (option: 'NORMAL' | 'SLOT-CONSUME', slotRank?: number) => {
                                        if (option === 'NORMAL') {
                                          castWithCharges();
                                        } else if (option === 'SLOT-CONSUME') {
                                          // Consume 1 charge
                                          handleUpdateItemCharges(props.setEntity, props.staff, {
                                            current: Math.min(currentCharges + 1, maxCharges),
                                          });
                                          // Consume slot
                                          props.setEntity((c) => {
                                            if (!c) return c;
                                            let added = false;
                                            const newUpdatedSlots = collectEntitySpellcasting(props.id, c).slots.map(
                                              (slot) => {
                                                if (!added && slot.rank === slotRank && slot.exhausted !== true) {
                                                  added = true;
                                                  return {
                                                    ...slot,
                                                    exhausted: true,
                                                  };
                                                }
                                                return slot;
                                              }
                                            );

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
                                      },
                                    },
                                  });
                                }
                              } else {
                                // Else just cast
                                castWithCharges();
                              }
                            }
                          }}
                          hasFilters={props.hasFilters}
                        />
                      ))}
                    </Stack>
                  </div>
                ))}
          </Accordion>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
