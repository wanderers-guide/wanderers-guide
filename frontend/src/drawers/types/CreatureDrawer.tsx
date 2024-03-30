import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Creature } from '@typing/content';

export function CreatureDrawerTitle(props: { data: { id?: number; creature?: Creature } }) {
  const id = props.data.id;

  const { data: _creature } = useQuery({
    queryKey: [`find-creature-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Creature>('creature', id);
    },
    enabled: !!id,
  });
  const creature = props.data.creature ?? _creature;

  return (
    <>
      {creature && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{creature.name}</Title>
            </Box>
            <Box></Box>
          </Group>
        </Group>
      )}
    </>
  );
}

export function CreatureDrawerContent(props: { data: { id?: number; creature?: Creature; showOperations?: boolean } }) {
  const id = props.data.id;

  const { data: _creature } = useQuery({
    queryKey: [`find-creature-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Creature>('creature', id);
    },
    enabled: !!id,
  });
  const creature = props.data.creature ?? _creature;

  if (!creature) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  return (
    <Box>
      {creature.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={creature.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay traitIds={creature.traits ?? []} rarity={creature.rarity} interactable />
        </Box>

        <RichText ta='justify'>{creature.details.description}</RichText>
      </Box>
    </Box>
  );
}
