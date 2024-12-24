import { Accordion, Badge, Divider, Group, Paper, Stack, Text } from '@mantine/core';
import { getSpellStats } from '@spells/spell-handler';
import {
  CastingSource,
  Character,
  LivingEntity,
  Spell,
  SpellInnateEntry,
  SpellListEntry,
  SpellSectionType,
  SpellSlot,
} from '@typing/content';
import { rankNumber, sign } from '@utils/numbers';
import { Dictionary } from 'node_modules/cypress/types/lodash';
import { SetterOrUpdater } from 'recoil';
import { SpellSlotSelect } from '../SpellsPanel';
import SpellListEntrySection from './SpellListEntrySection';
import { StoreID } from '@typing/variables';

export default function InnateSpellsList(props: {
  id: StoreID;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  //
  index: string;
  source?: CastingSource;
  spellIds: number[];
  allSpells: Spell[];
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
  openManageSpells?: (source: string, type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY') => void;
  castSpell: (cast: boolean, spell: Spell) => void;
  innateSpells: Dictionary<
    {
      spell: Spell | undefined;
      spell_id: number;
      rank: number;
      tradition: string;
      casts_max: number;
      casts_current: number;
    }[]
  > | null;
}) {
  const { castSpell, innateSpells } = props;

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
                  <div key={index} data-wg-name={`rank-group-${index}`}>
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
                    <Divider my={5} />
                    <Stack gap={5} mb='md'>
                      {innateSpells[rank].map((innate, index) => (
                        <SpellListEntrySection
                          key={index}
                          spell={innate.spell}
                          exhausted={innate.casts_current >= innate.casts_max && innate.casts_max !== 0}
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
                                props.setEntity((c) => {
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
                  </div>
                ))}
          </Accordion>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
