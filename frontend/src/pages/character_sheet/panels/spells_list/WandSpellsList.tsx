import { Accordion, Badge, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { getSpellStats } from '@spells/spell-handler';
import {
  CastingSource,
  Character,
  InventoryItem,
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
import { useEffect, useMemo } from 'react';
import { detectSpells } from '@spells/spell-utils';
import { handleUpdateItemCharges, isItemBroken } from '@items/inv-utils';
import { modals } from '@mantine/modals';
import { convertToHardcodedLink } from '@content/hardcoded-links';
import RichText from '@common/RichText';

const DEFAULT_WAND_HP = 2;

export default function WandSpellsList(props: {
  index: string;
  wands: InventoryItem[];
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
  character: Character;
  setCharacter: SetterOrUpdater<Character | null>;
}) {
  const { setCharacter } = props;

  const processedWands = useMemo(() => {
    const processed = [];
    for (const wand of props.wands) {
      const detectedSpells = detectSpells(wand.item.description, props.allSpells, true);
      if (detectedSpells.length === 0) {
        continue;
      }

      const maxCharges = wand.item.meta_data?.charges?.max ?? 0;
      const currentCharges = wand.item.meta_data?.charges?.current ?? 0;

      processed.push({
        item: wand,
        spell: detectedSpells[0],
        detectedSpells: detectedSpells,
        charges: { current: currentCharges, max: maxCharges },
      });
    }

    return processed;
  }, [props.wands, props.allSpells]);

  // On init, set max charges to 1 if wand has no max
  useEffect(() => {
    for (const wand of processedWands) {
      if (wand.charges.max === 0) {
        handleUpdateItemCharges(setCharacter, wand.item, { max: 1 });
      }
    }
  }, [processedWands, setCharacter]);

  // If there are no wands to display, and there are filters, return null
  if (props.hasFilters && props.wands.length === 0) {
    return null;
  }

  return (
    <Accordion.Item value={props.index}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Group gap={10}>
            <Text c='gray.5' fw={700} fz='sm'>
              Wands
            </Text>
            <Badge variant='outline' color='gray.5' size='xs'>
              <Text fz='sm' c='gray.5' span>
                {props.wands.length}
              </Text>
            </Badge>
          </Group>
        </Group>
      </Accordion.Control>
      <Accordion.Panel
        styles={{
          content: {
            padding: 0,
          },
        }}
        px={0}
        pb={10}
      >
        <Stack gap={0}>
          {/* <Divider color='dark.6' /> */}
          <Accordion
            px={10}
            pb={0}
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
            {processedWands.map((wand, index) => (
              <SpellListEntrySection
                key={index}
                spell={wand.spell.spell}
                exhausted={isItemBroken(wand.item.item)}
                tradition={'NONE'}
                attribute={'ATTRIBUTE_CHA'}
                onCastSpell={(cast: boolean) => {
                  if (cast) {
                    if (wand.charges.current >= wand.charges.max) {
                      modals.openConfirmModal({
                        id: 'overload-wand',
                        title: <Title order={4}>{`Overcharge Wand`}</Title>,
                        children: (
                          <RichText size='sm'>
                            You've already {convertToHardcodedLink('action', 'Cast a Spell')} on this wand today. You
                            can cast it again by overcharging the wand at the risk of destroying it. You{' '}
                            {convertToHardcodedLink('action', 'Cast a Spell', 'Cast the Spell')} again, then roll a DC
                            10 flat check. On a success, the wand is broken. On a failure, the wand is destroyed.
                          </RichText>
                        ),
                        labels: { confirm: 'Break Wand', cancel: 'Cancel' },
                        onCancel: () => {},
                        onConfirm: async () => {
                          setCharacter((char) => {
                            if (!char || !char.inventory) return null;

                            return {
                              ...char,
                              inventory: {
                                ...char.inventory,
                                items: char.inventory.items.map((i) => {
                                  if (i.id !== wand.item.id) return i;

                                  // If it's the item, update the charges
                                  return {
                                    ...i,
                                    item: {
                                      ...i.item,
                                      meta_data: {
                                        ...i.item.meta_data!,
                                        // Update charges
                                        charges: {
                                          ...i.item.meta_data?.charges,
                                          current: wand.charges.max,
                                          max: wand.charges.max,
                                        },
                                        // Make sure wand is broken
                                        hp_max: i.item.meta_data?.hp_max || DEFAULT_WAND_HP,
                                        hp: Math.floor((i.item.meta_data?.hp_max || DEFAULT_WAND_HP) / 2),
                                        broken_threshold: Math.floor((i.item.meta_data?.hp_max || DEFAULT_WAND_HP) / 2),
                                      },
                                    },
                                  };
                                }),
                              },
                            };
                          });
                        },
                      });
                    } else {
                      handleUpdateItemCharges(setCharacter, wand.item, { current: wand.charges.current + 1 });
                    }
                  } else {
                    // Reset wand
                    setCharacter((char) => {
                      if (!char || !char.inventory) return null;

                      return {
                        ...char,
                        inventory: {
                          ...char.inventory,
                          items: char.inventory.items.map((i) => {
                            if (i.id !== wand.item.id) return i;

                            // If it's the item, update the charges
                            return {
                              ...i,
                              item: {
                                ...i.item,
                                meta_data: {
                                  ...i.item.meta_data!,
                                  // Update charges
                                  charges: {
                                    ...i.item.meta_data?.charges,
                                    current: 0,
                                    max: wand.charges.max,
                                  },
                                  // Make sure wand is broken
                                  hp_max: i.item.meta_data?.hp_max || DEFAULT_WAND_HP,
                                  hp: i.item.meta_data?.hp_max || DEFAULT_WAND_HP,
                                  broken_threshold: Math.floor((i.item.meta_data?.hp_max || DEFAULT_WAND_HP) / 2),
                                },
                              },
                            };
                          }),
                        },
                      };
                    });
                  }
                }}
                hasFilters={props.hasFilters}
                leftSection={
                  <SpellSlotSelect
                    text='Remaining Casts'
                    current={wand.charges.current}
                    max={wand.charges.max}
                    onChange={(v) => {
                      handleUpdateItemCharges(setCharacter, wand.item, { current: v });
                    }}
                  />
                }
              />
            ))}
          </Accordion>
        </Stack>

        {processedWands.length === 0 && (
          <Text c='gray.6' fz='sm' fs='italic' ta='center' py={5}>
            No spells detected in wands
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
