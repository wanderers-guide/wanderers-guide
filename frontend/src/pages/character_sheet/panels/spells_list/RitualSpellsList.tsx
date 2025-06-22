import BlurButton from '@common/BlurButton';
import { Accordion, Badge, Box, Group, Stack, Text } from '@mantine/core';
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
import { Dictionary } from 'node_modules/cypress/types/lodash';
import SpellListEntrySection from './SpellListEntrySection';
import { StoreID } from '@typing/variables';
import { SetterOrUpdater } from 'recoil';

export default function RitualSpellsList(props: {
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
  openManageSpells?: (source: string, type: 'SLOTS-ONLY' | 'SLOTS-AND-LIST' | 'LIST-ONLY') => void;
  castSpell: (cast: boolean, spell: Spell) => void;
  spells: Dictionary<Spell[]>;
}) {
  const { spells, castSpell } = props;

  // If there are no spells to display, and there are filters, return null
  if (props.hasFilters && spells && !Object.keys(spells).find((rank) => spells[rank].length > 0)) {
    return null;
  }

  return (
    <Accordion.Item value={props.index}>
      <Accordion.Control h={40}>
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
      >
        <Stack gap={5} pb={10}>
          {/* <Divider color='dark.6' /> */}
          {spells &&
            Object.keys(spells)
              .reduce((acc, rank) => acc.concat(spells[rank]), [] as Spell[])
              .map((spell, index) => (
                <SpellListEntrySection
                  key={index}
                  id={props.id}
                  entity={props.entity}
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
