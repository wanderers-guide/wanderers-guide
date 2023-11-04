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
} from '@mantine/core';
import { Variable, VariableType } from '@typing/variables';
import { useEffect, useState } from 'react';
import { OperationSection, OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import _ from 'lodash';

export default function ConditionalOperation(props: { onRemove: () => void }) {
  const [checks, setChecks] = useState<ConditionalCheckData[]>([
    {
      name: '',
      data: undefined,
      operation: '',
      value: '',
    },
  ]);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Conditional'>
      <Stack>
        <>
          {checks.map((check, index) => {
            <ConditionalCheck
              key={index}
              defaultName={check.name}
              defaultData={check.data}
              defaultOperation={check.operation}
              defaultValue={check.value}
              onChange={(data) => {
                setChecks((prev) => {
                  prev[index] = data;
                  return _.cloneDeep(prev);
                });
              }}
            />;
          })}
        </>
        <>
          {true && (
            <ScrollArea mah={400}>
              <Stack>
                <OperationSection
                  title={
                    <Text>
                      If{' '}
                      <Text fw={600} c='gray.4' span>
                        true
                      </Text>
                      :
                    </Text>
                  }
                  blacklist={['conditional', 'createValue']}
                />
                <OperationSection
                  title={
                    <Text>
                      If{' '}
                      <Text fw={600} c='gray.4' span>
                        false
                      </Text>
                      :
                    </Text>
                  }
                  blacklist={['conditional', 'createValue']}
                />
              </Stack>
            </ScrollArea>
          )}
        </>
      </Stack>
    </OperationWrapper>
  );
}

type ConditionalCheckData = {
  name: string;
  data?: Variable;
  operation: string;
  value: string;
};

export function ConditionalCheck(props: {
  defaultName: string;
  defaultData?: Variable;
  defaultOperation: string;
  defaultValue: string;
  onChange: (data: ConditionalCheckData) => void;
}) {
  const [variableName, setVariableName] = useState(props.defaultName);
  const [variableData, setVariableData] = useState<Variable | undefined>(props.defaultData);

  const [operation, setOperation] = useState(props.defaultOperation);
  const [value, setValue] = useState(props.defaultValue);

  useEffect(() => {
    props.onChange({
      name: variableName,
      data: variableData,
      operation: operation,
      value: value,
    });
  }, [variableName, variableData, operation, value]);

  let operationOptions: { value: string; label: string }[] = [];
  if (
    variableData?.type === 'attr' ||
    variableData?.type === 'num' ||
    variableData?.type === 'prof'
  ) {
    operationOptions = [
      { value: 'EQUALS', label: 'equals' },
      { value: 'LESS_THAN', label: 'less than' },
      { value: 'GREATER_THAN', label: 'greater than' },
      { value: 'NOT_EQUALS', label: 'not equals' },
    ];
  }
  if (variableData?.type === 'bool') {
    operationOptions = [
      { value: 'EQUALS', label: 'equals' },
      { value: 'NOT_EQUALS', label: 'not equals' },
    ];
  }
  if (variableData?.type === 'str' || variableData?.type === 'list-str') {
    operationOptions = [
      { value: 'INCLUDES', label: 'includes' },
      { value: 'EQUALS', label: 'equals' },
      { value: 'NOT_EQUALS', label: 'not equals' },
    ];
  }
  if (!variableData) {
    operationOptions = [
      { value: 'INCLUDES', label: 'includes' },
      { value: 'EQUALS', label: 'equals' },
      { value: 'NOT_EQUALS', label: 'not equals' },
      { value: 'LESS_THAN', label: 'less than' },
      { value: 'GREATER_THAN', label: 'greater than' },
    ];
  }

  return (
    <Group wrap='nowrap'>
      <VariableSelect
        value={variableName}
        onChange={(value, variable) => {
          setVariableName(value);
          setVariableData(variable);
          setOperation('');
          setValue('');
        }}
      />
      {variableName && (
        <Select
          size='xs'
          placeholder='Operator'
          w={100}
          value={operation}
          searchValue={operationOptions.find((op) => op.value === operation)?.label || ''}
          onChange={(value) => {
            if (!value) return;
            setOperation(value);
          }}
          data={operationOptions}
        />
      )}
      {variableName && operation && (
        <ConditionalValueSelect
          variableType={variableData?.type || 'str'}
          operationType={operation}
          value={value}
          onChange={setValue}
        />
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
        onChange={props.onChange}
        allowDecimal={false}
      />
    );
  } else if (props.variableType === 'bool') {
    return (
      <SegmentedControl
        size='xs'
        value={props.value || undefined}
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
    (props.variableType === 'list-str' && props.operationType === 'INCLUDES')
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
