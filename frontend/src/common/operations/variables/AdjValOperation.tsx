import { OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import { useState } from 'react';
import {
  AttributeValue,
  ProficiencyType,
  Variable,
  VariableType,
  VariableValue,
} from '@typing/variables';
import { NumberInput, SegmentedControl, TextInput } from '@mantine/core';
import { getVariable } from '@variables/variable-manager';

export function AdjValOperation(props: {
  variable: string;
  value: VariableValue;
  onSelect: (variable: string) => void;
  onValueChange: (value: number | string | boolean) => void;
  onRemove: () => void;
}) {
  const [variableName, setVariableName] = useState(props.variable);
  const [variableData, setVariableData] = useState<Variable | undefined>(
    getVariable(props.variable) ?? undefined
  );
  const [value, setValue] = useState<VariableValue>(props.value);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Adjust Value'>
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
        <AdjustValueInput
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

export function AdjustValueInput(props: {
  variableType: VariableType;
  value: any;
  onChange: (value: number | string | boolean) => void;
  options?: {
    profExtended?: boolean;
  };
}) {
  if (props.variableType === 'attr' || props.variableType === 'num') {
    return (
      <NumberInput
        size='xs'
        prefix={props.value >= 0 ? '+' : undefined}
        placeholder='Number to Add'
        value={props.value}
        onChange={(value) => props.onChange(parseInt(`${value}`))}
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
  } else if (props.variableType === 'str' || props.variableType === 'list-str') {
    return (
      <TextInput
        size='xs'
        placeholder='Text to Append'
        value={props.value}
        onChange={(event) => props.onChange(event.target.value.toLowerCase())}
      />
    );
  } else if (props.variableType === 'prof') {
    if (props.options?.profExtended) {
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
            { label: '1', value: '1' },
            { label: '-1', value: '-1' },
          ]}
        />
      );
    } else {
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
    }
  }
  return null;
}
