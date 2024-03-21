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

export function ActionDrawerTitle(props: { data: { id?: number; action?: AbilityBlock } }) {
  const id = props.data.id;

  const { data: _action } = useQuery({
    queryKey: [`find-action-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<AbilityBlock>('ability-block', id);
    },
    enabled: !!id,
  });
  const action = props.data.action ?? _action;

  return (
    <>
      {action && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{action.name}</Title>
            </Box>
            <Box>
              <ActionSymbol cost={action.actions} size={'2.1rem'} />
            </Box>
          </Group>
        </Group>
      )}
    </>
  );
}

export function ActionDrawerContent(props: { data: { id?: number; action?: AbilityBlock; showOperations?: boolean } }) {
  const id = props.data.id;

  const { data: _action } = useQuery({
    queryKey: [`find-action-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<AbilityBlock>('ability-block', id);
    },
    enabled: !!id,
  });
  const action = props.data.action ?? _action;

  if (!action) {
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
    (action.prerequisites && action.prerequisites.length > 0) ||
    action.frequency ||
    action.trigger ||
    action.cost ||
    action.requirements ||
    action.access;

  return (
    <Box>
      {action.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={action.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay
            traitIds={action.traits ?? []}
            rarity={action.rarity}
            skill={action.meta_data?.skill}
            interactable
          />
        </Box>
        {action.prerequisites && action.prerequisites.length > 0 && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Prerequisites
            </Text>{' '}
            {action.prerequisites.join(', ')}
          </IndentedText>
        )}
        {action.frequency && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Frequency
            </Text>{' '}
            {action.frequency}
          </IndentedText>
        )}
        {action.trigger && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Trigger
            </Text>{' '}
            {action.trigger}
          </IndentedText>
        )}
        {action.cost && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Cost
            </Text>{' '}
            {action.cost}
          </IndentedText>
        )}
        {action.requirements && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Requirements
            </Text>{' '}
            {action.requirements}
          </IndentedText>
        )}
        {action.access && (
          <IndentedText ta='justify'>
            <Text fw={600} c='gray.5' span>
              Access
            </Text>{' '}
            {action.access}
          </IndentedText>
        )}
        {hasTopSection && <Divider />}
        <RichText ta='justify'>{action.description}</RichText>
        {action.special && (
          <Text ta='justify' style={{ textIndent: TEXT_INDENT_AMOUNT }}>
            <Text fw={600} c='gray.5' span>
              Special
            </Text>{' '}
            <RichText span>{action.special}</RichText>
          </Text>
        )}
      </Box>
      {props.data.showOperations && <ShowOperationsButton name={action.name} operations={action.operations} />}
    </Box>
  );
}
