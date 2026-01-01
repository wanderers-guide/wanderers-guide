import BlurButton from '@common/BlurButton';
import { collectEntitySpellcasting } from '@content/collect-content';
import { Accordion, Badge, Box, Divider, Group, Paper, Stack, Text } from '@mantine/core';
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
import { toLabel } from '@utils/strings';
import { Dictionary } from 'node_modules/cypress/types/lodash';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { SpellSlotSelect } from '../SpellsPanel';
import SpellListEntrySection from './SpellListEntrySection';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { drawerState } from '@atoms/navAtoms';
import { StoreID } from '@typing/variables';
import { useMediaQuery } from '@mantine/hooks';
import { phoneQuery } from '@utils/mobile-responsive';

export default function SpontaneousSpellsList(props: {
  id: StoreID;
  entity: LivingEntity | null;
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
  openManageSpells?: (
    source: string,
    type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY',
    filter?: {
      traditions?: string[];
      rank_min?: number;
      rank_max?: number;
    }
  ) => void;
  slots: Dictionary<
    {
      spell: Spell | undefined;
      rank: number;
      source: string;
      spell_id?: number;
      exhausted?: boolean;
      color?: string;
    }[]
  > | null;
  castSpell: (cast: boolean, spell: Spell) => void;
  spells: Dictionary<Spell[]>;
}) {
  const isPhone = useMediaQuery(phoneQuery());

  const { slots, castSpell, spells, setEntity } = props;
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const highestRank = Object.keys(slots || {}).reduce((acc, rank) => (parseInt(rank) > acc ? parseInt(rank) : acc), 0);
  // If there are no spells to display, and there are filters, return null
  if (props.hasFilters && slots && Object.keys(slots).filter((rank) => slots[rank].find((s) => s.spell)).length === 0) {
    return null;
  }

  const spellStats = getSpellStats(props.id, null, props.source!.tradition, props.source!.attribute);

  return (
    <Accordion.Item value={props.index} data-wg-name={props.index.toLowerCase()}>
      <Accordion.Control h={40}>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {toLabel(props.source!.name)} Spells
          </Text>

          <Box mr={10}>
            <BlurButton
              size='xs'
              fw={500}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.openManageSpells?.(props.source!.name, 'LIST-ONLY', {
                  traditions: [props.source!.tradition.toLowerCase()],
                  rank_min: 0,
                  rank_max: highestRank,
                });
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
            <Group wrap='nowrap' mb='sm'>
              <StatButton
                onClick={() => {
                  openDrawer({
                    type: 'stat-prof',
                    data: { id: props.id, variableName: 'SPELL_ATTACK' },
                    extra: { addToHistory: true },
                  });
                }}
              >
                <Group wrap='nowrap' gap={10}>
                  <Text fw={600} c='gray.5' fz='sm' span>
                    Spell Attack
                  </Text>
                  <Text c='gray.5' fz='sm' span>
                    {sign(spellStats.spell_attack.total[0])}
                    {!isPhone &&
                      ` / ${sign(spellStats.spell_attack.total[1])} /
                    ${sign(spellStats.spell_attack.total[2])}`}
                  </Text>
                </Group>
              </StatButton>
              <StatButton
                onClick={() => {
                  openDrawer({
                    type: 'stat-prof',
                    data: { id: props.id, variableName: 'SPELL_DC', isDC: true },
                    extra: { addToHistory: true },
                  });
                }}
              >
                <Group wrap='nowrap' gap={10}>
                  <Text fw={600} c='gray.5' fz='sm' span>
                    Spell DC
                  </Text>
                  <Text c='gray.5' fz='sm' span>
                    {spellStats.spell_dc.total}
                  </Text>
                </Group>
              </StatButton>
            </Group>
            {slots &&
              Object.keys(slots)
                .filter((rank) => slots[rank] && slots[rank].length > 0)
                .map((rank, index) => (
                  <div key={index} data-wg-name={`rank-group-${index}`}>
                    <Group wrap='nowrap' justify='space-between' gap={0}>
                      <Group wrap='nowrap'>
                        <Text c='gray.5' fw={700} fz='sm' miw={30}>
                          {rank === '0' ? 'Cantrips' : `${rankNumber(parseInt(rank))}`}
                        </Text>
                        {rank !== '0' && (
                          <SpellSlotSelect
                            text='Spell Slots'
                            current={slots[rank].filter((slot) => `${slot.rank}` === rank && slot.exhausted).length}
                            max={slots[rank].filter((slot) => `${slot.rank}` === rank).length}
                            onChange={(v) => {
                              props.setEntity((c) => {
                                if (!c) return c;

                                let count = 0;
                                const slots = collectEntitySpellcasting(props.id, c).slots;
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
                    <Divider my={5} />
                    <Stack gap={5} mb={5}>
                      {spells[rank]?.map((spell, index) => (
                        <SpellListEntrySection
                          key={index}
                          id={props.id}
                          entity={props.entity}
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
                              props.source!.type === 'PREPARED-LIST' ? 'SLOTS-AND-LIST' : 'SLOTS-ONLY',
                              {
                                traditions: [props.source!.tradition.toLowerCase()],
                              }
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
                  </div>
                ))}
          </Accordion>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
