import { OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import { useState } from 'react';
import { AttributeValue, ProficiencyType, Variable, VariableType } from '@typing/variables';
import { JsonInput, NumberInput, SegmentedControl, TextInput } from '@mantine/core';
import { getVariable } from '@variables/variable-manager';

export function SetValOperation(props: {
  variable: string;
  value: string | number | boolean | AttributeValue | ProficiencyType;
  onSelect: (variable: string) => void;
  onValueChange: (value: number | string | boolean) => void;
  onRemove: () => void;
}) {
  const [variableName, setVariableName] = useState(props.variable);
    const [variableData, setVariableData] = useState<Variable | undefined>(
      getVariable(props.variable) ?? undefined
    );
  const [value, setValue] = useState<string | number | boolean | AttributeValue>(props.value);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Set Value'>
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

function SetValueInput(props: {
  variableType: VariableType;
  value: any;
  onChange: (value: number | string | boolean) => void;
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
        value={props.value || undefined}
        onChange={props.onChange}
        defaultValue='TRUE'
        data={[
          { label: 'True', value: 'TRUE' },
          { label: 'False', value: 'FALSE' },
        ]}
      />
    );
  } else if (props.variableType === 'str') {
    return (
      <TextInput
        size='xs'
        placeholder='Text'
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
  } else if (props.variableType === 'list-str') {
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
