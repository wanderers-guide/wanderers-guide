import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import { DisplayIcon } from '@common/IconDisplay';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import ShowInjectedText from '@drawers/ShowInjectedText';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex, List, Anchor, Button } from '@mantine/core';
import {
  determineFilteredSelectionList,
  getSelectedCustomOption,
  getSelectedOption,
  ObjectWithUUID,
  sortObjectByName,
} from '@operations/operation-utils';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';
import { Operation, OperationSelect, OperationSelectFilters, OperationSelectOptionCustom } from '@typing/operations';
import { toLabel } from '@utils/strings';
import { instanceOfOperationSelectOptionCustom } from '@utils/type-fixing';
import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';

const SELECTION_DISPLAY_LIMIT = 25;

export function ActionDrawerTitle(props: { data: { id?: number; action?: AbilityBlock; onSelect?: () => void } }) {
  const id = props.data.id;

  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
              <Title order={3}>{toLabel(action.name)}</Title>
            </Box>
            <Box>
              <ActionSymbol cost={action.actions} size={'2.1rem'} />
            </Box>
          </Group>
          {props.data.onSelect ? (
            <Button
              variant='filled'
              radius='xl'
              mb={5}
              size='compact-sm'
              onClick={() => {
                props.data.onSelect?.();
                openDrawer(null);
              }}
            >
              Select
            </Button>
          ) : (
            <Text style={{ textWrap: 'nowrap' }}>{action.type !== 'action' ? toLabel(action.type) : ''}</Text>
          )}
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
      <DisplayIcon strValue={action.meta_data?.image_url} />
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay
            traitIds={action.traits ?? []}
            rarity={action.rarity}
            availability={action.availability}
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
      <ShowInjectedText varId='CHARACTER' type='action' id={action.id} />
      <DisplayOperationSelectionOptions operations={action.operations} />
      {props.data.showOperations && <ShowOperationsButton name={action.name} operations={action.operations} />}
    </Box>
  );
}

export function DisplayOperationSelectionOptions(props: { operations?: Operation[] | undefined }) {
  const operations = (props.operations ?? []).filter(
    (op) => op.type === 'select' && ['CUSTOM', 'ABILITY_BLOCK'].includes(op.data.optionType)
  ) as OperationSelect[];
  if (operations.length === 0) return null;

  return (
    <Box>
      <Divider mt={5} />
      <Stack gap='sm'>{operations.map(DisplayOperationSelection)}</Stack>
    </Box>
  );
}

export function DisplayOperationSelection(op: OperationSelect) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const character = useRecoilValue(characterState);

  const [options, setOptions] = useState([] as OperationSelectOptionCustom[] | ObjectWithUUID[]);
  const [more, setMore] = useState(null as string | null);
  useEffect(() => {
    // React advises to declare the async function directly inside useEffect
    async function getOptions() {
      if (op.data.modeType === 'PREDEFINED') {
        setOptions((op.data.optionsPredefined ?? []) as OperationSelectOptionCustom[]);
      } else {
        const ops = await determineFilteredSelectionList(
          op.data.optionType,
          op.id,
          (op.data.optionsFilters ?? []) as OperationSelectFilters
        );
        ops.sort(sortObjectByName);
        if (ops.length > SELECTION_DISPLAY_LIMIT) {
          setMore(`and ${ops.length - SELECTION_DISPLAY_LIMIT} more...`);
          ops.length = SELECTION_DISPLAY_LIMIT;
        }
        setOptions(ops);
      }
    }
    getOptions();
  }, [op]);

  const [selectedOption, setSelectedOption] = useState(
    null as OperationSelectOptionCustom | Record<string, any> | null
  );
  useEffect(() => {
    async function getSelection() {
      setSelectedOption(await getSelectedOption(character, op));
    }
    getSelection();
  });

  return (
    <Box key={op.id} pt={5}>
      <Text fz='md' fw={600}>
        {op.data.title ?? 'Select an Option'}
      </Text>
      <List>
        {options.map((option) => (
          <List.Item key={option.id}>
            <Anchor
              onClick={() => {
                openDrawer({
                  type: instanceOfOperationSelectOptionCustom(option)
                    ? 'generic'
                    : option._content_type === 'ability-block'
                      ? option.type
                      : option._content_type,
                  data: instanceOfOperationSelectOptionCustom(option)
                    ? {
                        title: option.title,
                        description: option.description,
                        operations: option.operations,
                      }
                    : { id: option?.id, action: option },
                  extra: { addToHistory: true },
                });
              }}
            >
              {instanceOfOperationSelectOptionCustom(option) ? option.title : option.name}
            </Anchor>
            {selectedOption?.id === option.id ? ' (Selected)' : ''}
          </List.Item>
        ))}
        {more === null ? null : <List.Item key='more'>{more}</List.Item>}
      </List>
    </Box>
  );
}
