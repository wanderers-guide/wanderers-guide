import BlurBox from '@common/BlurBox';
import { deleteContent, upsertAbilityBlock, upsertCreature, upsertItem, upsertSpell } from '@content/content-creation';
import { fetchContentSources, defineDefaultSources, fetchContentPackage } from '@content/content-store';
import { Center, Group, Title, Select, Button, List, Stack } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { ContentPackage, Trait } from '@typing/content';
import { useMemo, useState } from 'react';

const ENABLED = false;

export default function TraitMerger() {
  const { data, isFetching } = useQuery({
    queryKey: [`get-traits`],
    queryFn: async () => {
      const sources = await fetchContentSources({ homebrew: false, ids: 'all' });
      defineDefaultSources(sources.map((source) => source.id));
      const content = await fetchContentPackage();

      return {
        sources,
        content,
      };
    },
  });

  const [loading, setLoading] = useState(false);
  const [removeTrait, setRemoveTrait] = useState<number | null>(null);
  const [mergeTrait, setMergeTrait] = useState<number | null>(null);

  const duplicateTraits = useMemo(() => {
    if (!data) return [];
    const duplicates: Trait[] = [];
    for (const trait of data.content.traits) {
      const dupes = data.content.traits.filter((t) => t.name === trait.name && t.id !== trait.id);
      if (dupes.length > 0) {
        duplicates.push(trait);
      }
    }
    return duplicates;
  }, [data]);

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Stack>
            <Group>
              <Title order={3}>Trait Merger</Title>
              <Select
                placeholder='Select trait to remove'
                searchable
                data={data?.content.traits.map((trait) => ({
                  value: `${trait.id}`,
                  label: `${trait.name} - ${data.sources.find((source) => source.id === trait.content_source_id)?.name}`,
                }))}
                onChange={async (value) => {
                  if (!value) return;
                  setRemoveTrait(parseInt(value));
                }}
              />
              {'→'}
              <Select
                placeholder='Select trait to merge with'
                searchable
                data={data?.content.traits.map((trait) => ({
                  value: `${trait.id}`,
                  label: `${trait.name} - ${data.sources.find((source) => source.id === trait.content_source_id)?.name}`,
                }))}
                onChange={async (value) => {
                  if (!value) return;
                  setMergeTrait(parseInt(value));
                }}
              />

              <Button
                disabled={!removeTrait || !mergeTrait}
                loading={loading}
                onClick={async () => {
                  if (removeTrait && mergeTrait && data) {
                    setLoading(true);
                    await mergeTraits(removeTrait, mergeTrait, data.content);
                    setLoading(false);
                  }
                }}
              >
                Merge
              </Button>
            </Group>
            <List>
              {duplicateTraits
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((trait) => (
                  <List.Item key={trait.id}>
                    {trait.name} - {data?.sources.find((source) => source.id === trait.content_source_id)?.name}
                  </List.Item>
                ))}
            </List>
          </Stack>
        </Center>
      </BlurBox>
    </>
  );
}

async function mergeTraits(removeTraitId: number, mergeTraitId: number, content: ContentPackage) {
  if (!ENABLED) {
    showNotification({
      title: 'Trait Merger Disabled',
      message: 'This tool is currently disabled.',
      color: 'red',
      icon: null,
    });
    return;
  }

  for (const ab of content.abilityBlocks) {
    if (ab.traits?.includes(removeTraitId)) {
      ab.traits = ab.traits.filter((id) => id !== removeTraitId);
      if (!ab.traits.includes(mergeTraitId)) {
        ab.traits.push(mergeTraitId);
      }
      console.log('Updating ability block', ab.id, ab.name, ab.traits);
      await upsertAbilityBlock(ab);
    }
  }

  for (const creature of content.creatures) {
    if (creature.traits?.includes(removeTraitId)) {
      creature.traits = creature.traits.filter((id) => id !== removeTraitId);
      if (!creature.traits.includes(mergeTraitId)) {
        creature.traits.push(mergeTraitId);
      }
      console.log('Updating creature', creature.id, creature.name, creature.traits);
      await upsertCreature(creature);
    }
  }

  for (const item of content.items) {
    if (item.traits?.includes(removeTraitId)) {
      item.traits = item.traits.filter((id) => id !== removeTraitId);
      if (!item.traits.includes(mergeTraitId)) {
        item.traits.push(mergeTraitId);
      }
      console.log('Updating item', item.id, item.name, item.traits);
      await upsertItem(item);
    }
  }

  for (const spell of content.spells) {
    if (spell.traits?.includes(removeTraitId)) {
      spell.traits = spell.traits.filter((id) => id !== removeTraitId);
      if (!spell.traits.includes(mergeTraitId)) {
        spell.traits.push(mergeTraitId);
      }
      console.log('Updating spell', spell.id, spell.name, spell.traits);
      await upsertSpell(spell);
    }
  }

  await deleteContent('trait', removeTraitId);

  setTimeout(() => {
    location.reload();
  }, 1000);

  showNotification({
    title: 'Complete',
    message: 'Traits merged successfully.',
    icon: null,
  });
  return true;
}
