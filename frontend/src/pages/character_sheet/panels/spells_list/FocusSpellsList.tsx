import { getFocusPoints } from '@content/collect-content';
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
import { getTraitIdByType } from '@utils/traits';
import { Dictionary } from 'node_modules/cypress/types/lodash';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { SpellSlotSelect } from '../SpellsPanel';
import SpellListEntrySection from './SpellListEntrySection';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { drawerState } from '@atoms/navAtoms';
import { useMemo } from 'react';
import { StoreID } from '@typing/variables';
import { isTruthy } from '@utils/type-fixing';
import { uniq } from 'lodash-es';

export default function FocusSpellsList(props: {
  id: StoreID;
  entity: LivingEntity;
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
  spells: Dictionary<Spell[]>;
}) {
  const { castSpell, spells, entity, setEntity } = props;
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Finds all the character's focus spells, regardless of source
  const allFocusSpells = useMemo(() => {
    return props.extra.charData.focus
      .filter((f) => props.extra.charData.sources.map((s) => s.name).includes(f.source))
      .map((f) => props.allSpells.find((s) => s.id === f.spell_id))
      .filter(isTruthy);
  }, [props.extra.charData, props.allSpells]);

  // If there are no spells to display, and there are filters, return null
  if (props.hasFilters && spells && !Object.keys(spells).find((rank) => spells[rank].length > 0)) {
    return null;
  }

  const focusPoints = getFocusPoints(props.id, entity, allFocusSpells);

  const spellStats = getSpellStats(props.id, null, props.source!.tradition, props.source!.attribute);

  return (
    <Accordion.Item value={props.index}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {toLabel(props.source!.name)} Focus Spells
          </Text>

          <Box mr={10}>
            <SpellSlotSelect
              text='Focus Points'
              current={focusPoints.max - focusPoints.current}
              max={focusPoints.max}
              onChange={(v) => {
                setEntity((c) => {
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
                    {sign(spellStats.spell_attack.total[0])} / {sign(spellStats.spell_attack.total[1])} /{' '}
                    {sign(spellStats.spell_attack.total[2])}
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
            {spells &&
              Object.keys(spells)
                .filter((rank) => spells[rank].length > 0)
                .map((rank, index) => (
                  <div key={index} data-wg-name={`rank-group-${index}`}>
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
                    <Divider my={5} />
                    <Stack gap={5} mb='md'>
                      {spells[rank].map((spell, index) => (
                        <SpellListEntrySection
                          key={index}
                          id={props.id}
                          entity={props.entity}
                          spell={{
                            ...spell,
                            // Add focus trait in case it doesn't have it
                            traits: uniq([...(spell.traits ?? []), getTraitIdByType('FOCUS')]),
                          }}
                          exhausted={
                            entity?.spells?.focus_point_current === undefined
                              ? false
                              : entity.spells.focus_point_current <= 0
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
                  </div>
                ))}
          </Accordion>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
