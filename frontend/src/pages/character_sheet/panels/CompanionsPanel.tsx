import { characterState } from '@atoms/characterAtoms';
import { LEGACY_URL } from '@constants/data';
import { fetchContentAll } from '@content/content-store';
import { Center, Stack, Title, Anchor, Text, Box, Group, Select } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Creature, Trait } from '@typing/content';
import { findCreatureTraits } from '@utils/creature';
import { use } from 'chai';
import { useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';

export default function CompanionsPanel(props: { panelHeight: number; panelWidth: number }) {
  const [character, setCharacter] = useRecoilState(characterState);
  const [selectedType, setSelectedType] = useState<number | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: [`get-companions-data`],
    queryFn: async () => {
      const traits = await fetchContentAll<Trait>('trait');
      const creatures = await fetchContentAll<Creature>('creature');

      return {
        traits,
        creatures,
      };
    },
  });

  const selectionTypes = useMemo(() => {
    return data?.traits?.filter((t) => t.meta_data?.companion_type_trait) ?? [];
  }, [data]);

  const creatureOptions = useMemo(() => {
    return data?.creatures?.filter((c) => findCreatureTraits(c).includes(selectedType ?? -1)) ?? [];
  }, [data, selectedType]);

  return (
    <Box h={props.panelHeight}>
      <Center pt={50}>
        <Stack>
          <Title ta='center' fs='italic' order={2}>
            Coming soon!
          </Title>
          <Text c='dimmed' ta='center' fz='sm' maw={500}>
            Companions will be added in future update. You can expect to see support for animal companions, familiars,
            pets, condition tracking, inventory management, in-depth stat breakdowns, and more! 🎉
          </Text>
          <Text c='dimmed' ta='center' fz='xs' maw={500} fs='italic'>
            If you <b>really</b> want companions, you can still use the{' '}
            <Anchor fz='xs' fs='italic' target='_blank' href={LEGACY_URL}>
              legacy site
            </Anchor>{' '}
            :)
          </Text>
        </Stack>
      </Center>

      {/* <Stack>{character?.companions?.list?.map((c) => <Text key={c.id}>{c.name}</Text>)}</Stack>

      <Group gap={0} align='center' justify='center'>
        <Text pr={10}>Add</Text>
        <Select
          placeholder='Companion'
          data={selectionTypes.map((t) => ({ value: `${t.id}`, label: t.name }))}
          value={selectedType?.toString()}
          onChange={(value) => setSelectedType(parseInt(`${value ?? -1}`))}
          w={200}
          styles={{
            input: {
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            },
          }}
        />
        <Select
          placeholder='Selection'
          disabled={!selectedType || selectedType === -1}
          data={creatureOptions.map((c) => ({ value: `${c.id}`, label: c.name }))}
          w={200}
          styles={{
            input: {
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            },
          }}
        />
      </Group> */}
    </Box>
  );
}
