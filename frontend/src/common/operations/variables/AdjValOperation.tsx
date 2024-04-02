import { OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import { useState } from 'react';
import {
  AttributeValue,
  ExtendedProficiencyValue,
  ProficiencyType,
  ProficiencyValue,
  Variable,
  VariableType,
  VariableValue,
} from '@typing/variables';
import { Box, NumberInput, SegmentedControl, TextInput, Text } from '@mantine/core';
import { getVariable } from '@variables/variable-manager';
import * as _ from 'lodash-es';
import { useDidUpdate } from '@mantine/hooks';

export function AdjValOperation(props: {
  variable: string;
  value: VariableValue;
  onSelect: (variable: string) => void;
  onValueChange: (value: VariableValue) => void;
  onRemove: () => void;
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
  value: VariableValue | ExtendedProficiencyValue;
  onChange: (value: VariableValue) => void;
  options?: {
    profExtended?: boolean;
  };
}) {
  if (props.variableType === 'attr') {
    const value = props.value as AttributeValue;
    return (
      <>
        <NumberInput
          size='xs'
          prefix={value.value >= 0 ? '+' : undefined}
          placeholder='Number to Add'
          value={value.value}
          onChange={(val) =>
            props.onChange({
              value: parseInt(`${val}`),
              partial: value.partial,
            } as AttributeValue)
          }
          allowDecimal={false}
        />
        {/* <Box>
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
        </Box> */}
      </>
    );
  } else if (props.variableType === 'num') {
    const value = props.value as number;
    return (
      <NumberInput
        size='xs'
        prefix={value >= 0 ? '+' : undefined}
        placeholder='Number to Add'
        value={value}
        onChange={(value) => props.onChange(parseInt(`${value}`))}
        allowDecimal={false}
      />
    );
  } else if (props.variableType === 'bool') {
    const value = props.value as boolean;
    return (
      <SegmentedControl
        size='xs'
        value={value ? 'TRUE' : 'FALSE'}
        onChange={(val) => props.onChange(val === 'TRUE' ? true : false)}
        defaultValue='TRUE'
        data={[
          { label: 'True', value: 'TRUE' },
          { label: 'False', value: 'FALSE' },
        ]}
      />
    );
  } else if (props.variableType === 'str' || props.variableType === 'list-str') {
    const value = props.value as string;
    return (
      <TextInput
        size='xs'
        placeholder='Text to Append'
        value={value}
        onChange={(event) => props.onChange(event.target.value.toLowerCase())}
      />
    );
  } else if (props.variableType === 'prof') {
    const value = props.value as ProficiencyValue;

    return (
      <>
        {props.options?.profExtended ? (
          <SegmentedControl
            size='xs'
            value={value.value}
            onChange={(val) =>
              // @ts-ignore
              props.onChange({
                value: val,
                attribute: value.attribute,
              } as ExtendedProficiencyValue)
            }
            data={[
              { label: 'U', value: 'U' },
              { label: 'T', value: 'T' },
              { label: 'E', value: 'E' },
              { label: 'M', value: 'M' },
              { label: 'L', value: 'L' },
              { label: '+1', value: '1' },
              { label: '-1', value: '-1' },
            ]}
          />
        ) : (
          <SegmentedControl
            size='xs'
            value={value.value}
            onChange={(val) =>
              props.onChange({
                value: val,
                attribute: value.attribute,
              } as ProficiencyValue)
            }
            data={[
              { label: 'U', value: 'U' },
              { label: 'T', value: 'T' },
              { label: 'E', value: 'E' },
              { label: 'M', value: 'M' },
              { label: 'L', value: 'L' },
            ]}
          />
        )}
        {/* <VariableSelect
          value={value.attribute ?? ''}
          onChange={(val, variable) =>
            props.onChange({
              value: value.value,
              attribute: variable?.name,
            } as ProficiencyValue)
          }
          variableType='attr'
        /> */}
      </>
    );
  }
  return null;
}
