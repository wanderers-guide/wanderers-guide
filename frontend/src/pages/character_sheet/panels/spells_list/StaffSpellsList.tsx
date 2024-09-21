import { Accordion, Badge, Box, Button, Divider, Group, Paper, Stack, Text } from '@mantine/core';
import { getSpellStats } from '@spells/spell-handler';
import {
  CastingSource,
  Character,
  InventoryItem,
  Item,
  Spell,
  SpellInnateEntry,
  SpellListEntry,
  SpellSlot,
} from '@typing/content';
import { rankNumber, sign } from '@utils/numbers';
import { Dictionary } from 'node_modules/cypress/types/lodash';
import { SetterOrUpdater } from 'recoil';
import { SpellSlotSelect } from '../SpellsPanel';
import SpellListEntrySection from './SpellListEntrySection';
import { detectSpells } from '@spells/spell-utils';
import _ from 'lodash-es';
import { use } from 'chai';
import { useEffect } from 'react';
import BlurButton from '@common/BlurButton';

export default function StaffSpellsList(props: {
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
  castSpell: (cast: boolean, spell: Spell) => void;
  setCharacter: SetterOrUpdater<Character | null>;
}) {
  const { castSpell, setCharacter } = props;

  const detectedSpells = _.groupBy(detectSpells(props.staff.item.description, props.allSpells), 'rank');

  useEffect(() => {
    const maxCharges = props.staff.item.meta_data?.charges?.max ?? 0;
    //const currentCharges = props.staff.item.meta_data?.charges?.current ?? 0;
    let greatestSlotRank = 0;
    for (const slot of props.extra.charData.slots) {
      if (slot.rank > greatestSlotRank) {
        greatestSlotRank = slot.rank;
      }
    }

    if (greatestSlotRank > maxCharges) {
      // Update item to have max charges equal to greatest slot rank
      setCharacter((char) => {
        if (!char || !char.inventory) return null;

        return {
          ...char,
          inventory: {
            ...char.inventory,
            items: char.inventory.items.map((i) => {
              if (i.id !== props.staff.id) return i;

              // If it's the staff item, update the charges
              return {
                ...i,
                item: {
                  ...i.item,
                  meta_data: {
                    ...i.item.meta_data!,
                    charges: {
                      ...i.item.meta_data?.charges,
                      max: greatestSlotRank,
                    },
                  },
                },
              };
            }),
          },
        };
      });
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
              <BlurButton
                size='compact-xs'
                fw={500}
                fz={10}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                Add Charges
              </BlurButton>
              <SpellSlotSelect
                text='Staff Charges'
                current={props.staff.item.meta_data?.charges?.current ?? 0}
                max={props.staff.item.meta_data?.charges?.max ?? 0}
                onChange={(v) => {}}
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
                          exhausted={false}
                          tradition={'NONE'}
                          attribute={'ATTRIBUTE_CHA'}
                          onCastSpell={(cast: boolean) => {
                            if (record.spell) castSpell(cast, record.spell);
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
