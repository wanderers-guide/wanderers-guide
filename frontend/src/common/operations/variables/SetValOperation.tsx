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
import _ from 'lodash';

export function SetValOperation(props: {
  variable: string;
  value: VariableValue;
  onSelect: (variable: string) => void;
  onValueChange: (value: VariableValue) => void;
  onRemove: () => void;
  showTotalVars?: boolean;
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
        showTotalVars={props.showTotalVars}
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
            value={value.partial ? 'TRUE' : 'FALSE'}
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
    const value = _.isNumber(props.value) ? props.value : undefined;

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
    const value = _.isBoolean(props.value) ? props.value : false;
    return (
      <SegmentedControl
        size='xs'
        value={value ? 'TRUE' : 'FALSE'}
        onChange={props.onChange}
        defaultValue='TRUE'
        data={[
          { label: 'True', value: 'TRUE' },
          { label: 'False', value: 'FALSE' },
        ]}
      />
    );
  } else if (props.variableType === 'str') {
    const value = _.isString(props.value) ? props.value : '';
    return (
      <TextInput
        size='xs'
        placeholder='Text'
        value={value}
        onChange={(event) => props.onChange(event.target.value.toLowerCase())}
      />
    );
  } else if (props.variableType === 'prof') {
    const value = props.value as ProficiencyValue;

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
    const value = _.isString(props.value) ? props.value : '';
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
