import BlurButton from "@common/BlurButton";
import { Accordion, Badge, Box, Divider, Group, Stack, Text } from "@mantine/core";
import { CastingSource, Spell, SpellInnateEntry, SpellListEntry, SpellSlot } from "@typing/content";
import { rankNumber } from "@utils/numbers";
import { toLabel } from "@utils/strings";
import { Dictionary } from "node_modules/cypress/types/lodash";
import SpellListEntrySection from "./SpellListEntrySection";

export default function PreparedSpellsList(props: {
  index: string;
  source?: CastingSource;
  spellIds: number[];
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
    slots?: SpellSlot[];
    innates?: SpellInnateEntry[];
  };
  hasFilters: boolean;
  openManageSpells?: (source: string, type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY') => void;
  slots: Dictionary<{
    spell: Spell | undefined;
    rank: number;
    source: string;
    spell_id?: number;
    exhausted?: boolean;
    color?: string;
  }[]> | null;
  castSpell: (cast: boolean, spell: Spell) => void;
}) {
  const { slots, castSpell } = props;
  // If there are no spells to display, and there are filters, return null
  if (
    props.hasFilters &&
    slots &&
    Object.keys(slots).filter((rank) => slots[rank].find((s) => s.spell)).length === 0
  ) {
    return null;
  }

  return (
    <Accordion.Item value={props.index} data-wg-name={props.index.toLowerCase()}>
      <Accordion.Control>
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
                  <div key={index} data-wg-name={`rank-group-${index}`}>
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
                    <Divider my="md" />
                    <Stack gap={5} mb="md">
                      {slots[rank].map((slot, index) => (
                        <SpellListEntrySection
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
                  </div>
                ))}
          </Accordion>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}