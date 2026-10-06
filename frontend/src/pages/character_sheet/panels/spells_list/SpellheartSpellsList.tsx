import { Accordion, Badge, Group, Stack, Text } from '@mantine/core';
import {
  CastingSource,
  ContentSource,
  InventoryItem,
  Item,
  LivingEntity,
  Spell,
  SpellInnateEntry,
  SpellListEntry,
  SpellSlot,
} from '@schemas/content';
import { SetterOrUpdater } from '@utils/type-fixing';
import SpellListEntrySection from './SpellListEntrySection';
import { useMemo } from 'react';
import { detectSpellheartSpells } from '@spells/spell-utils';
import { isItemBroken } from '@items/inv-utils';
import { StoreID } from '@schemas/variables';
import { getDefaultSourcesKey } from '@content/content-store';
import { resolveSpellheartCasting } from '@spells/spell-handler';
import { SourceValueSchema } from '@schemas/shared';

/** Display saved Spellheart activations, with printed values from the enabled official catalog when needed. */
export default function SpellheartSpellsList(props: {
  id: StoreID;
  entity: LivingEntity;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  //
  index: string;
  spellhearts: InventoryItem[];
  canonicalItems?: Item[];
  contentSources?: ContentSource[];
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
  const sourceKey = getDefaultSourcesKey('PAGE');
  const processedSpellhearts = useMemo(() => {
    // Numeric fingerprints restrict books; symbolic source modes retain official-header filtering.
    const sourceIds = sourceKey.split(',').map(Number);
    const hasExplicitSources = !SourceValueSchema.safeParse(sourceKey).success;
    const processed = [];
    const canonicalItems = new Map(
      (props.canonicalItems ?? [])
        .filter(
          (item) =>
            (!hasExplicitSources || sourceIds.includes(item.content_source_id)) &&
            props.contentSources?.some(
              (source) =>
                source.id === item.content_source_id && source.user_id === null && source.is_published === true
            )
        )
        .map((item) => [item.id, item])
    );
    for (const spellheart of props.spellhearts) {
      const detectedSpells = detectSpellheartSpells(spellheart.item.description, props.allSpells);
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

      for (const spell of detectedSpells) {
        processed.push({
          item: spellheart,
          spell,
          casting: resolveSpellheartCasting(spellheart.item, canonicalItems.get(spellheart.item.id)),
        });
      }
    }

    return processed;
  }, [props.spellhearts, props.allSpells, props.canonicalItems, props.contentSources, sourceKey]);

  // If there are no spellhearts to display, and there are filters, return null
  if (props.hasFilters && props.spellhearts.length === 0) {
    return null;
  }

  return (
    <Accordion.Item value={props.index}>
      <Accordion.Control h={40}>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Group gap={10}>
            <Text c='gray.2' fw={700} fz='sm'>
              Spellhearts
            </Text>
            <Badge variant='outline' color='gray.5' size='xs'>
              <Text c='gray.2' span inherit>
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
            {processedSpellhearts.map((spellheart) => (
              <SpellListEntrySection
                key={`${spellheart.item.id}-${spellheart.spell.spell.id}-${spellheart.spell.rank}`}
                id={props.id}
                entity={props.entity}
                spell={spellheart.spell.spell}
                prefix={`${spellheart.item.item.name} — `}
                exhausted={isItemBroken(spellheart.item.item)}
                tradition={'NONE'}
                attribute={'ATTRIBUTE_CHA'}
                spellheartCasting={spellheart.casting}
                onCastSpell={(cast: boolean) => {
                  console.log('Cast spell from spellheart:', cast);
                }}
                hasFilters={props.hasFilters}
              />
            ))}
          </Accordion>
        </Stack>

        {processedSpellhearts.length === 0 && (
          <Text c='gray.3' fz='sm' fs='italic' ta='center' py={5}>
            No spells detected in spellhearts
          </Text>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
