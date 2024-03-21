import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock, Trait } from '@typing/content';
import { Operation } from '@typing/operations';

export function TraitDrawerTitle(props: { data: { id?: number; trait?: Trait } }) {
  const id = props.data.id;

  const { data: _trait } = useQuery({
    queryKey: [`find-trait-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Trait>('trait', id);
    },
    enabled: !!id,
  });
  const trait = props.data.trait ?? _trait;

  return (
    <>
      {trait && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{trait.name}</Title>
            </Box>
            <Box></Box>
          </Group>
        </Group>
      )}
    </>
  );
}

export function TraitDrawerContent(props: { data: { id?: number; trait?: Trait } }) {
  const id = props.data.id;

  const { data: _trait } = useQuery({
    queryKey: [`find-trait-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Trait>('trait', id);
    },
    enabled: !!id,
  });
  const trait = props.data.trait ?? _trait;

  if (!trait) {
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
      <Box>
        <RichText ta='justify'>{trait.description || 'No description given.'}</RichText>
      </Box>
    </Box>
  );
}
