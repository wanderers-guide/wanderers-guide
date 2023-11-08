import {
  Badge,
  Text,
  Box,
  CloseButton,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  useMantineTheme,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { createDefaultOperation } from '@operations/operation-runner';
import { AbilityBlockType, Spell } from '@typing/content';
import {
  Operation,
  OperationAdjValue,
  OperationConditional,
  OperationCreateValue,
  OperationGiveAbilityBlock,
  OperationGiveSpell,
  OperationSetValue,
  OperationType,
} from '@typing/operations';
import _ from 'lodash';
import { ReactNode, useEffect, useRef, useState } from 'react';
import ConditionalOperation from './conditional/ConditionalOperation';
import { GiveActionOperation } from './ability_block/GiveActionOperation';
import { GiveClassFeatureOperation } from './ability_block/GiveClassFeatureOperation';
import { GiveFeatOperation } from './ability_block/GiveFeatOperation';
import { GiveSpellOperation } from './spell/GiveSpellOperation';
import { AdjValOperation } from './variables/AdjValOperation';
import { SetValOperation } from './variables/SetValOperation';
import { CreateValOperation } from './variables/CreateValOperation';
import { useDidUpdate } from '@mantine/hooks';

export function OperationWrapper(props: {
  children: React.ReactNode;
  title: string;
  onRemove: () => void;
}) {
  const theme = useMantineTheme();

  const openConfirmModal = () =>
    modals.openConfirmModal({
      title: <Title order={4}>Remove Operation</Title>,
      children: <Text size='sm'>Are you sure you want to remove this operation?</Text>,
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => props.onRemove(),
    });

  return (
    <Container w={'min(700px, 100%)'}>
      <Paper
        py='xs'
        pl='xs'
        pr={40}
        radius='xl'
        style={{
          position: 'relative',
        }}
      >
        <Group wrap='nowrap' align='flex-start'>
          <Group align='flex-start'>
            <Badge
              variant='dot'
              size='lg'
              styles={{
                root: {
                  // @ts-ignore
                  '--badge-dot-size': 0,
                  textTransform: 'initial',
                },
              }}
              style={{
                borderRadius: 0,
                borderTopLeftRadius: theme.radius.xl,
                borderBottomLeftRadius: theme.radius.xl,
                borderTopRightRadius: 11,
                borderBottomRightRadius: 11,
              }}
            >
              {props.title}
            </Badge>
          </Group>

          {props.children}
        </Group>
        <Box
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 100,
          }}
        >
          <Tooltip label='Remove Operation' position='right' withArrow withinPortal>
            <CloseButton
              size='sm'
              radius='xl'
              onClick={() => {
                openConfirmModal();
              }}
            />
          </Tooltip>
        </Box>
      </Paper>
    </Container>
  );
}

export function OperationSection(props: {
  title: ReactNode;
  blacklist?: string[];
  onChange: (operations: Operation[]) => void;
}) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const selectRef = useRef<HTMLInputElement>(null);

  useDidUpdate(() => {
    props.onChange(operations);
  }, [operations]);

  return (
    <Stack gap={10}>
      <Group justify='space-between'>
        <Box>{props.title}</Box>
        <Select
          ref={selectRef}
          placeholder='Add Operation'
          data={[
            { value: 'giveAbilityBlock:::feat', label: 'Give Feat' },
            { value: 'giveAbilityBlock:::class-feature', label: 'Give Class Feature' },
            { value: 'giveSpell', label: 'Give Spell' },
            { value: 'giveLang', label: 'Give Language' },
            { value: 'giveSelectOption', label: 'Give Select Option' },
            { value: 'adjValue', label: 'Adjust Value' },
            { value: 'setValue', label: 'Set Value' },
            { value: 'createValue', label: 'Create Value' },
            { value: 'conditional', label: 'Conditional' },
            { value: 'select', label: 'Selection' },
            { value: 'RESO', label: 'RESO' },
          ].filter((option) => !(props.blacklist ?? []).includes(option.value))}
          searchValue={''}
          value={null}
          onChange={(value) => {
            if (value) {
              let abilBlockType = null;
              if (value.includes('giveAbilityBlock:::')) {
                abilBlockType = value.split(':::')[1];
                value = 'giveAbilityBlock';
              }

              const newOp = createDefaultOperation(value as OperationType);

              console.log(newOp, value);

              if (newOp) {
                if (abilBlockType) {
                  (newOp as OperationGiveAbilityBlock).data.type =
                    abilBlockType as AbilityBlockType;
                }

                setOperations((prev) => {
                  return [...prev, newOp];
                });
                selectRef.current?.blur();
              }
            }
          }}
        />
      </Group>

      <Stack gap={10}>
        {operations.map((op, index) => (
          <OperationDisplay
            key={index}
            operation={op}
            onChange={(option) => {
              const newOp = _.cloneDeep(op);
              newOp.data = option.data;
              setOperations((prev) => {
                return prev.map((p_op) => {
                  if (p_op.id === op.id) {
                    return newOp;
                  } else {
                    return p_op;
                  }
                });
              });
            }}
            onRemove={() => {
              setOperations((prev) => {
                return prev.filter((p_op) => p_op.id !== op.id);
              });
            }}
          />
        ))}
        {operations.length === 0 && (
          <Text size='sm' c='gray.7' ta='center' fs='italic'>
            No operations
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

export function OperationDisplay(props: {
  operation: Operation;
  onChange: (op: Operation) => void;
  onRemove: () => void;
}) {
  switch (props.operation.type) {
    case 'giveAbilityBlock':
      let opGiveAbilBlock = props.operation as OperationGiveAbilityBlock;
      switch (opGiveAbilBlock.data.type) {
        case 'feat':
          return (
            <GiveFeatOperation
              selectedId={opGiveAbilBlock.data.abilityBlockId}
              onSelect={(option) => {
                opGiveAbilBlock.data.abilityBlockId = option.id;
                props.onChange(_.cloneDeep(opGiveAbilBlock));
              }}
              onRemove={props.onRemove}
            />
          );
        case 'action':
          return (
            <GiveActionOperation
              selectedId={opGiveAbilBlock.data.abilityBlockId}
              onSelect={(option) => {
                opGiveAbilBlock.data.abilityBlockId = option.id;
                props.onChange(_.cloneDeep(opGiveAbilBlock));
              }}
              onRemove={props.onRemove}
            />
          );
        case 'class-feature':
          return (
            <GiveClassFeatureOperation
              selectedId={opGiveAbilBlock.data.abilityBlockId}
              onSelect={(option) => {
                opGiveAbilBlock.data.abilityBlockId = option.id;
                props.onChange(_.cloneDeep(opGiveAbilBlock));
              }}
              onRemove={props.onRemove}
            />
          );
        default:
          return null;
      }
    case 'giveSpell':
      let opGiveSpell = props.operation as OperationGiveSpell;
      return (
        <GiveSpellOperation
          selectedId={opGiveSpell.data.spellId}
          onSelect={(option) => {
            opGiveSpell.data.spellId = option.id;
            props.onChange(_.cloneDeep(opGiveSpell));
          }}
          onRemove={props.onRemove}
        />
      );
    case 'conditional':
      let opConditional = props.operation as OperationConditional;
      return (
        <ConditionalOperation
          onChange={(conditions, trueOperations, falseOperations) => {
            opConditional.data.conditions = conditions;
            opConditional.data.trueOperations = trueOperations;
            opConditional.data.falseOperations = falseOperations;
            props.onChange(_.cloneDeep(opConditional));
          }}
          onRemove={props.onRemove}
        />
      );
    case 'adjValue':
      let opAdjValue = props.operation as OperationAdjValue;
      return (
        <AdjValOperation
          variable={opAdjValue.data.variable}
          onSelect={(variable) => {
            opAdjValue.data.variable = variable;
            props.onChange(_.cloneDeep(opAdjValue));
          }}
          onValueChange={(value) => {
            opAdjValue.data.value = value;
            props.onChange(_.cloneDeep(opAdjValue));
          }}
          onRemove={props.onRemove}
        />
      );
    case 'setValue':
      let opSetValue = props.operation as OperationSetValue;
      return (
        // TODO: make it number | string | boolean | AttributeValue | ProficiencyType
        <SetValOperation
          variable={opSetValue.data.variable}
          onSelect={(variable) => {
            opSetValue.data.variable = variable;
            props.onChange(_.cloneDeep(opSetValue));
          }}
          onValueChange={(value) => {
            opSetValue.data.value = value;
            props.onChange(_.cloneDeep(opSetValue));
          }}
          onRemove={props.onRemove}
        />
      );
    case 'createValue':
      let opCreateValue = props.operation as OperationCreateValue;
      return (
        <CreateValOperation
          variable={opCreateValue.data.variable}
          onNameChange={(variable) => {
            opCreateValue.data.variable = variable;
            props.onChange(_.cloneDeep(opCreateValue));
          }}
          variableType={opCreateValue.data.type}
          onTypeChange={(variableType) => {
            opCreateValue.data.type = variableType;
            props.onChange(_.cloneDeep(opCreateValue));
          }}
          value={opCreateValue.data.value}
          onValueChange={(value) => {
            opCreateValue.data.value = value;
            props.onChange(_.cloneDeep(opCreateValue));
          }}
          onRemove={props.onRemove}
        />
      );
    default:
      return null;
  }
}
