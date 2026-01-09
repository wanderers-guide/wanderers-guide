import { Accordion, Badge, Group, Stack, Text } from '@mantine/core';
import {
  CastingSource,
  InventoryItem,
  LivingEntity,
  Spell,
  SpellInnateEntry,
  SpellListEntry,
  SpellSlot,
} from '@typing/content';
import { SetterOrUpdater } from 'recoil';
import SpellListEntrySection from './SpellListEntrySection';
import { useMemo } from 'react';
import { detectSpells } from '@spells/spell-utils';
import { isItemBroken } from '@items/inv-utils';
import { StoreID } from '@typing/variables';

export default function SpellheartSpellsList(props: {
  id: StoreID;
  entity: LivingEntity;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  //
  index: string;
  spellhearts: InventoryItem[];
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
  const processedSpellhearts = useMemo(() => {
    const processed = [];
    for (const spellheart of props.spellhearts) {
      const detectedSpells = detectSpells(spellheart.item.description, props.allSpells, true);
      if (detectedSpells.length === 0) {
        continue;
      }

      // Set rank to detected spell rank
      const rankMatches = [...spellheart.item.name.matchAll(/(\d)..-rank/gi)];
      if (rankMatches.length > 0) {
        const rankStr = rankMatches[0][1];
        if (rankStr) {
          const rank = parseInt(rankStr);
          for (const spell of detectedSpells) {
            spell.spell.rank = rank;
          }
        }
      }

      processed.push({
        item: spellheart,
        spell: detectedSpells[0],
        detectedSpells: detectedSpells,
      });
    }

    return processed;
  }, [props.spellhearts, props.allSpells]);

  // If there are no spellhearts to display, and there are filters, return null
  if (props.hasFilters && props.spellhearts.length === 0) {
    return null;
  }

  return (
    <Accordion.Item value={props.index}>
      <Accordion.Control h={40}>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Group gap={10}>
            <Text c='gray.5' fw={700} fz='sm'>
              Spellhearts
            </Text>
            <Badge variant='outline' color='gray.5' size='xs'>
              <Text fz='sm' c='gray.5' span>
                {props.spellhearts.length}
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
      >
        <Stack gap={0} pb={10}>
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
            {processedSpellhearts.map((spellheart, index) => (
              <SpellListEntrySection
                key={index}
                id={props.id}
                entity={props.entity}
                spell={spellheart.spell.spell}
                prefix={`${spellheart.item.item.name} — `}
                exhausted={isItemBroken(spellheart.item.item)}
                tradition={'NONE'}
                attribute={'ATTRIBUTE_CHA'}
                onCastSpell={(cast: boolean) => {
                  console.log('Cast spell from spellheart:', cast);
                }}
                hasFilters={props.hasFilters}
              />
            ))}
          </Accordion>
        </Stack>

        {processedSpellhearts.length === 0 && (
          <Text c='gray.6' fz='sm' fs='italic' ta='center' py={5}>
            No spells detected in spellhearts
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
