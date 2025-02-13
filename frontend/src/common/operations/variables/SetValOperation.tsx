import { OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import { useState } from 'react';
import {
  AttributeValue,
  ProficiencyType,
  ProficiencyValue,
  Variable,
  VariableType,
  VariableValue,
} from '@typing/variables';
import { Box, JsonInput, NumberInput, SegmentedControl, TextInput, Text } from '@mantine/core';
import { getVariable } from '@variables/variable-manager';
import { useDidUpdate } from '@mantine/hooks';
import { isNumber, isString, isBoolean } from 'lodash-es';

export function SetValOperation(props: {
  variable: string;
  value: VariableValue;
  onSelect: (variable: string) => void;
  onValueChange: (value: VariableValue) => void;
  onRemove: () => void;
  overrideTitle?: string;
}) {
  const [variableName, setVariableName] = useState(props.variable);
  const [variableData, setVariableData] = useState<Variable | undefined>(
    getVariable('CHARACTER', props.variable) ?? undefined
  );
  const [value, setValue] = useState<VariableValue>(props.value);

  useDidUpdate(() => {
    setVariableName(props.variable);
    setVariableData(getVariable('CHARACTER', props.variable) ?? undefined);
    setValue(props.value);
  }, [props.value, props.variable]);

  return (
    <OperationWrapper onRemove={props.onRemove} title={props.overrideTitle ? props.overrideTitle : 'Override Value'}>
      <VariableSelect
        value={variableName}
        onChange={(value, variable) => {
          setVariableName(value);
          setVariableData(variable);
          props.onSelect(value);
          setValue('');
        }}
      />
      {variableData && (
        <SetValueInput
          variableType={variableData.type}
          value={value}
          onChange={(value) => {
            setValue(value);
            props.onValueChange(value);
          }}
        />
      )}
    </OperationWrapper>
  );
}

export function SetValueInput(props: {
  variableType: VariableType;
  value: VariableValue;
  onChange: (value: VariableValue) => void;
}) {
  if (props.variableType === 'attr') {
    const value = props.value as AttributeValue;
    return (
      <>
        <NumberInput
          size='xs'
          placeholder='Number'
          value={value.value}
          onChange={(val) => props.onChange({ value: parseInt(`${val}`), partial: value.partial } as AttributeValue)}
          allowDecimal={false}
        />
        <Box>
          <Text fz={10}>Is Partial</Text>
          <SegmentedControl
            size='xs'
            value={value.partial === true ? 'TRUE' : value.partial === false ? 'FALSE' : undefined}
            onChange={(val) =>
              props.onChange({
                value: value.value,
                partial: val === 'TRUE' ? true : false,
              } as AttributeValue)
            }
            defaultValue='FALSE'
            data={[
              { label: 'True', value: 'TRUE' },
              { label: 'False', value: 'FALSE' },
            ]}
          />
        </Box>
      </>
    );
  } else if (props.variableType === 'num') {
    const value = isNumber(props.value) ? props.value : undefined;

    return (
      <NumberInput
        size='xs'
        placeholder='Number'
        value={value}
        onChange={(value) => props.onChange(parseInt(`${value}`))}
        allowDecimal={false}
      />
    );
  } else if (props.variableType === 'bool') {
    const value = isBoolean(props.value) ? props.value : false;
    return (
      <SegmentedControl
        size='xs'
        value={value === true ? 'TRUE' : value === false ? 'FALSE' : undefined}
        onChange={(val) => props.onChange(val === 'TRUE' ? true : false)}
        defaultValue='TRUE'
        data={[
          { label: 'True', value: 'TRUE' },
          { label: 'False', value: 'FALSE' },
        ]}
      />
    );
  } else if (props.variableType === 'str') {
    const value = isString(props.value) ? props.value : '';
    return (
      <TextInput
        size='xs'
        placeholder='Text'
        value={value}
        onChange={(event) => props.onChange(event.target.value.toLowerCase())}
      />
    );
  } else if (props.variableType === 'prof') {
    const value = (props.value || { value: 'U' }) as ProficiencyValue;
    if (!value.value) {
      value.value = 'U';
    }

    return (
      <>
        <SegmentedControl
          size='xs'
          value={value.value}
          onChange={(val) => props.onChange({ value: val, attribute: value.attribute } as ProficiencyValue)}
          data={[
            { label: 'U', value: 'U' },
            { label: 'T', value: 'T' },
            { label: 'E', value: 'E' },
            { label: 'M', value: 'M' },
            { label: 'L', value: 'L' },
          ]}
        />
        <VariableSelect
          value={value.attribute ?? ''}
          onChange={(val, variable) =>
            props.onChange({
              value: value.value,
              attribute: variable?.name,
            } as ProficiencyValue)
          }
          variableType='attr'
        />
      </>
    );
  } else if (props.variableType === 'list-str') {
    const value = isString(props.value) ? props.value : '';
    return (
      <JsonInput
        size='xs'
        value={value}
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
