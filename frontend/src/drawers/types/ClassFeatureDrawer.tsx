import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';

export function ClassFeatureDrawerTitle(props: { data: { id?: number; classFeature?: AbilityBlock } }) {
  const id = props.data.id;

  const { data: _classFeature } = useQuery({
    queryKey: [`find-class-feature-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<AbilityBlock>('ability-block', id);
    },
    enabled: !!id,
  });
  const classFeature = props.data.classFeature ?? _classFeature;

  return (
    <>
      {classFeature && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{classFeature.name}</Title>
            </Box>
            <Box>
              <ActionSymbol cost={classFeature.actions} size={'2.1rem'} />
            </Box>
          </Group>
          {classFeature.level && <Text style={{ textWrap: 'nowrap' }}>Class Feature {classFeature.level}</Text>}
        </Group>
      )}
    </>
  );
}

export function ClassFeatureDrawerContent(props: {
  data: { id?: number; classFeature?: AbilityBlock; showOperations?: boolean };
}) {
  const id = props.data.id;

  const { data: _classFeature } = useQuery({
    queryKey: [`find-class-feature-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<AbilityBlock>('ability-block', id);
    },
    enabled: !!id,
  });
  const classFeature = props.data.classFeature ?? _classFeature;

  if (!classFeature) {
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
    (classFeature.prerequisites && classFeature.prerequisites.length > 0) ||
    classFeature.frequency ||
    classFeature.trigger ||
    classFeature.cost ||
    classFeature.requirements ||
    classFeature.access;

  return (
    <Box>
      {classFeature.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={classFeature.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay traitIds={classFeature.traits ?? []} rarity={classFeature.rarity} interactable />
        </Box>
        {classFeature.prerequisites && classFeature.prerequisites.length > 0 && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Prerequisites
            </Text>{' '}
            {classFeature.prerequisites.join(', ')}
          </IndentedText>
        )}
        {classFeature.frequency && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Frequency
            </Text>{' '}
            {classFeature.frequency}
          </IndentedText>
        )}
        {classFeature.trigger && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Trigger
            </Text>{' '}
            {classFeature.trigger}
          </IndentedText>
        )}
        {classFeature.cost && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Cost
            </Text>{' '}
            {classFeature.cost}
          </IndentedText>
        )}
        {classFeature.requirements && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Requirements
            </Text>{' '}
            {classFeature.requirements}
          </IndentedText>
        )}
        {classFeature.access && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Access
            </Text>{' '}
            {classFeature.access}
          </IndentedText>
        )}
        {hasTopSection && <Divider />}
        <RichText ta='justify'>{classFeature.description}</RichText>
        {classFeature.special && (
          <Text ta='justify' style={{ textIndent: TEXT_INDENT_AMOUNT }}>
            <Text fw={600} c='gray.5' span>
              Special
            </Text>{' '}
            <RichText span>{classFeature.special}</RichText>
          </Text>
        )}
      </Box>
      {props.data.showOperations && (
        <ShowOperationsButton name={classFeature.name} operations={classFeature.operations} />
      )}
    </Box>
  );
}
