import {
  Stack,
  Group,
  Autocomplete,
  Select,
  ScrollArea,
  NumberInput,
  SegmentedControl,
  Text,
  TextInput,
  JsonInput,
  Badge,
  ActionIcon,
  Divider,
  Tooltip,
} from '@mantine/core';
import { Variable, VariableType } from '@typing/variables';
import { useEffect, useState } from 'react';
import { OperationSection, OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import * as _ from 'lodash-es';
import { IconCaretRightFilled, IconCircleMinus, IconCirclePlus } from '@tabler/icons-react';
import { ConditionCheckData, ConditionOperator, Operation } from '@typing/operations';
import { useDidUpdate } from '@mantine/hooks';

export default function ConditionalOperation(props: {
  conditions?: ConditionCheckData[];
  trueOperations?: Operation[];
  falseOperations?: Operation[];
  onChange: (conditions: ConditionCheckData[], trueOperations: Operation[], falseOperations: Operation[]) => void;
  onRemove: () => void;
}) {
  const getDefaultCondition = (): ConditionCheckData => {
    return {
      id: crypto.randomUUID(),
      name: '',
      data: undefined,
      operator: '',
      value: '',
    } satisfies ConditionCheckData;
  };

  const checks = props.conditions && props.conditions.length > 0 ? props.conditions : [getDefaultCondition()];

  const routeChange = (data: {
    checks?: ConditionCheckData[];
    trueOperations?: Operation[];
    falseOperations?: Operation[];
  }) => {
    props.onChange(data.checks ?? [], data.trueOperations ?? [], data.falseOperations ?? []);
  };

  return (
    <OperationWrapper onRemove={props.onRemove} title='Conditional'>
      <Stack w='100%'>
        <>
          {checks.map((check, index) => (
            <ConditionalCheck
              key={index}
              id={check.id}
              defaultName={check.name}
              defaultData={check.data}
              defaultType={check.type}
              defaultOperator={check.operator}
              defaultValue={check.value}
              onChange={(data) => {
                let newChecks = _.cloneDeep(checks);
                newChecks[index] = data;
                console.log(newChecks);
                routeChange({
                  checks: newChecks,
                  trueOperations: props.trueOperations,
                  falseOperations: props.falseOperations,
                });
              }}
              includeAnd={index !== 0}
              includeAdd={index === checks.length - 1}
              onAdd={() => {
                routeChange({
                  checks: [...checks, getDefaultCondition()],
                  trueOperations: props.trueOperations,
                  falseOperations: props.falseOperations,
                });
              }}
              onRemove={(id) => {
                routeChange({
                  checks: checks.filter((p_op) => p_op.id !== id),
                  trueOperations: props.trueOperations,
                  falseOperations: props.falseOperations,
                });
              }}
            />
          ))}
        </>
        <Divider />
        <>
          {
            <ScrollArea scrollbars='y'>
              <Stack>
                <OperationSection
                  title={
                    <Group gap={8} wrap='nowrap'>
                      <IconCaretRightFilled size='1.1rem' />
                      <Text fz='sm' c='gray.0'>
                        If
                      </Text>
                      <Badge
                        variant='dot'
                        size='sm'
                        styles={{
                          root: {
                            // @ts-ignore
                            '--badge-dot-size': 0,
                            textTransform: 'initial',
                          },
                        }}
                      >
                        True
                      </Badge>
                    </Group>
                  }
                  operations={props.trueOperations ?? []}
                  onChange={(operations) => {
                    routeChange({
                      checks: props.conditions,
                      trueOperations: operations,
                      falseOperations: props.falseOperations,
                    });
                  }}
                  /* Don't allow nested conditionals and allowing creating new variables 
                      under a condition would be a mess to support 
                  */
                  blacklist={['conditional', 'createValue']}
                />
                <OperationSection
                  title={
                    <Group gap={8} wrap='nowrap'>
                      <IconCaretRightFilled size='1.1rem' />
                      <Text fz='sm' c='gray.0'>
                        If
                      </Text>
                      <Badge
                        variant='dot'
                        size='sm'
                        styles={{
                          root: {
                            // @ts-ignore
                            '--badge-dot-size': 0,
                            textTransform: 'initial',
                          },
                        }}
                      >
                        False
                      </Badge>
                    </Group>
                  }
                  operations={props.falseOperations ?? []}
                  onChange={(operations) => {
                    routeChange({
                      checks: props.conditions,
                      trueOperations: props.trueOperations,
                      falseOperations: operations,
                    });
                  }}
                  /* Don't allow nested conditionals and allowing creating new variables 
                      under a condition would be a mess to support 
                  */
                  blacklist={['conditional', 'createValue']}
                />
              </Stack>
            </ScrollArea>
          }
        </>
      </Stack>
    </OperationWrapper>
  );
}

export function ConditionalCheck(props: {
  id: string;
  defaultName: string;
  defaultData?: Variable;
  defaultType?: VariableType;
  defaultOperator: ConditionOperator;
  defaultValue: string;
  onChange: (data: ConditionCheckData) => void;
  includeAnd?: boolean;
  includeAdd?: boolean;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
}) {
  const [variableName, setVariableName] = useState(props.defaultName);
  const [variableData, setVariableData] = useState<Variable | undefined>(props.defaultData);
  const [variableType, setVariableType] = useState<VariableType | undefined>(props.defaultType);

  const [operator, setOperator] = useState(props.defaultOperator);
  const [value, setValue] = useState(props.defaultValue);

  useEffect(() => {
    props.onChange({
      id: props.id,
      name: variableName,
      data: variableData,
      type: variableType,
      operator: operator,
      value: value,
    });
  }, [variableName, variableData, variableType, operator, value]);

  let operatorOptions: { value: ConditionOperator; label: string }[] = [];
  const varType = variableData?.type || variableType;
  if (varType === 'attr' || varType === 'num' || varType === 'prof') {
    operatorOptions = [
      { value: 'LESS_THAN', label: '<' },
      { value: 'LESS_THAN_OR_EQUALS', label: '≤' },
      { value: 'GREATER_THAN', label: '>' },
      { value: 'GREATER_THAN_OR_EQUALS', label: '≥' },
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }
  if (varType === 'bool') {
    operatorOptions = [
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }
  if (varType === 'str' || varType === 'list-str') {
    operatorOptions = [
      { value: 'INCLUDES', label: 'includes' },
      { value: 'NOT_INCLUDES', label: 'not includes' },
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }
  if (!varType) {
    operatorOptions = [
      { value: 'INCLUDES', label: 'includes' },
      { value: 'NOT_INCLUDES', label: 'not includes' },
      { value: 'LESS_THAN', label: '<' },
      { value: 'LESS_THAN_OR_EQUALS', label: '≤' },
      { value: 'GREATER_THAN', label: '>' },
      { value: 'GREATER_THAN_OR_EQUALS', label: '≥' },
      { value: 'EQUALS', label: '=' },
      { value: 'NOT_EQUALS', label: '≠' },
    ];
  }

  return (
    <Group wrap='nowrap' style={{ position: 'relative' }} align='flex-start'>
      {props.includeAnd && (
        <>
          <Text
            style={{
              position: 'absolute',
              top: 6,
              left: -35,
            }}
            c='dimmed'
            fs='italic'
            fz='sm'
          >
            &&
          </Text>
          {props.includeAdd && (
            <Tooltip label='Remove Condition' position='right' withArrow withinPortal>
              <ActionIcon
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -28,
                }}
                size='sm'
                variant='subtle'
                color='gray'
                onClick={() => props.onRemove?.(props.id)}
              >
                <IconCircleMinus size='0.9rem' />
              </ActionIcon>
            </Tooltip>
          )}
        </>
      )}
      {props.includeAdd && (
        <Tooltip label='Add Condition' position='right' withArrow withinPortal>
          <ActionIcon
            style={{
              position: 'absolute',
              top: 23,
              right: -28,
            }}
            size='sm'
            variant='subtle'
            color='gray'
            onClick={props.onAdd}
          >
            <IconCirclePlus size='0.9rem' />
          </ActionIcon>
        </Tooltip>
      )}
      <VariableSelect
        value={variableName}
        onChange={(value, variable) => {
          setVariableName(value);
          setVariableData(variable);
          setVariableType(variable?.type);
          setOperator('');
          setValue('');
        }}
      />
      {!variableData && (
        <Select
          size='xs'
          placeholder='Value Type'
          w={100}
          value={varType}
          onChange={(value) => {
            if (!value) return;
            setVariableType(value as VariableType);
          }}
          data={[
            { value: 'attr', label: 'Attr' },
            { value: 'num', label: 'Number' },
            { value: 'bool', label: 'Bool' },
            { value: 'str', label: 'Text' },
            { value: 'list-str', label: 'Text Array' },
            { value: 'prof', label: 'Prof' },
          ]}
        />
      )}
      {variableName && (
        <Select
          size='xs'
          placeholder='Operator'
          w={100}
          value={operator}
          searchValue={operatorOptions.find((op) => op.value === operator)?.label || ''}
          onChange={(value) => {
            if (!value) return;
            setOperator(value as ConditionOperator);
          }}
          data={operatorOptions}
        />
      )}
      {variableName && operator && varType && (
        <ConditionalValueSelect variableType={varType} operationType={operator} value={value} onChange={setValue} />
      )}
    </Group>
  );
}

function ConditionalValueSelect(props: {
  variableType: VariableType;
  operationType: string;
  value: any;
  onChange: (value: any) => void;
}) {
  if (props.variableType === 'attr' || props.variableType === 'num') {
    return (
      <NumberInput
        size='xs'
        placeholder='Number'
        value={props.value}
        onChange={(value) => props.onChange(parseInt(`${value}`))}
        allowDecimal={false}
      />
    );
  } else if (props.variableType === 'bool') {
    return (
      <SegmentedControl
        size='xs'
        value={props.value === 'TRUE' ? 'TRUE' : props.value === 'FALSE' ? 'FALSE' : undefined}
        onChange={props.onChange}
        defaultValue='TRUE'
        data={[
          { label: 'True', value: 'TRUE' },
          { label: 'False', value: 'FALSE' },
        ]}
      />
    );
  } else if (
    props.variableType === 'str' ||
    (props.variableType === 'list-str' &&
      (props.operationType === 'INCLUDES' || props.operationType === 'NOT_INCLUDES'))
  ) {
    return (
      <TextInput
        size='xs'
        placeholder='Text (case insensitive)'
        value={props.value}
        onChange={(event) => props.onChange(event.target.value.toLowerCase())}
      />
    );
  } else if (props.variableType === 'prof') {
    return (
      <SegmentedControl
        size='xs'
        value={props.value || undefined}
        onChange={props.onChange}
        data={[
          { label: 'U', value: 'U' },
          { label: 'T', value: 'T' },
          { label: 'E', value: 'E' },
          { label: 'M', value: 'M' },
          { label: 'L', value: 'L' },
        ]}
      />
    );
  } else if (props.variableType === 'list-str' && props.operationType === 'EQUALS') {
    return (
      <JsonInput
        size='xs'
        value={props.value}
        onChange={props.onChange}
        placeholder='Array contents as JSON'
        validationError={undefined}
        formatOnBlur
        autosize
        minRows={4}
      />
    );
  }
  return null;
}
