import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { getContent } from '@content/content-controller';
import { Title, Text, Loader, Group, Divider, Stack, Box } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';

export function FeatDrawerTitle(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<AbilityBlock>('ability-block', id);
    },
  });

  return (
    <>
      {feat && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{feat.name}</Title>
            </Box>
            <Box>
              <ActionSymbol cost={feat.actions} size={'2.1rem'} />
            </Box>
          </Group>
          {feat.level && <Text style={{ textWrap: 'nowrap' }}>Feat {feat.level}</Text>}
        </Group>
      )}
    </>
  );
}

export function FeatDrawerContent(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<AbilityBlock>('ability-block', id);
    },
  });

  if (!feat) {
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

  const hasTopSection =
    (feat.prerequisites && feat.prerequisites.length > 0) ||
    feat.frequency ||
    feat.trigger ||
    feat.cost ||
    feat.requirements ||
    feat.access;

  return (
    <Stack gap={5}>
      <TraitsDisplay traitIds={feat.traits ?? []} rarity={feat.rarity} interactable />
      {feat.prerequisites && feat.prerequisites.length > 0 && (
        <IndentedText ta='justify'>
          <Text fw={600} span>
            Prerequisites
          </Text>{' '}
          {feat.prerequisites.join(', ')}
        </IndentedText>
      )}
      {feat.frequency && (
        <IndentedText ta='justify'>
          <Text fw={600} span>
            Frequency
          </Text>{' '}
          {feat.frequency}
        </IndentedText>
      )}
      {feat.trigger && (
        <IndentedText ta='justify'>
          <Text fw={600} span>
            Trigger
          </Text>{' '}
          {feat.trigger}
        </IndentedText>
      )}
      {feat.cost && (
        <IndentedText ta='justify'>
          <Text fw={600} span>
            Cost
          </Text>{' '}
          {feat.cost}
        </IndentedText>
      )}
      {feat.requirements && (
        <IndentedText ta='justify'>
          <Text fw={600} span>
            Requirements
          </Text>{' '}
          {feat.requirements}
        </IndentedText>
      )}
      {feat.access && (
        <IndentedText ta='justify'>
          <Text fw={600} span>
            Access
          </Text>{' '}
          {feat.access}
        </IndentedText>
      )}
      {hasTopSection && <Divider />}
      <RichText ta='justify'>{feat.description}</RichText>
      {feat.special && (
        <Text ta='justify' style={{ textIndent: TEXT_INDENT_AMOUNT }}>
          <Text fw={600} span>
            Special
          </Text>{' '}
          <RichText span>{feat.special}</RichText>
        </Text>
      )}
    </Stack>
  );
}
