import { OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import { useState } from 'react';
import {
  AttributeValue,
  ProficiencyType,
  ProficiencyValue,
  StoreID,
  Variable,
  VariableType,
  VariableValue,
} from '@typing/variables';
import { Box, JsonInput, NumberInput, SegmentedControl, TextInput, Text, Group } from '@mantine/core';
import { getVariable } from '@variables/variable-manager';
import { useDidUpdate } from '@mantine/hooks';
import { isNumber, isString, isBoolean } from 'lodash-es';

export function BindValOperation(props: {
  variable: string;
  value: { storeId: StoreID; variable: string };
  onSelect: (variable: string) => void;
  onValueChange: (value: { storeId: StoreID; variable: string }) => void;
  onRemove: () => void;
  overrideTitle?: string;
}) {
  const [variableName, setVariableName] = useState(props.variable);
  const [variableData, setVariableData] = useState<Variable | undefined>(
    getVariable('CHARACTER', props.variable) ?? undefined
  );
  const [value, setValue] = useState<{ storeId: StoreID; variable: string }>(props.value);

  useDidUpdate(() => {
    setVariableName(props.variable);
    setVariableData(getVariable('CHARACTER', props.variable) ?? undefined);
    setValue(props.value);
  }, [props.value, props.variable]);

  return (
    <OperationWrapper onRemove={props.onRemove} title={props.overrideTitle ? props.overrideTitle : 'Bind Value'}>
      <VariableSelect
        value={variableName}
        onChange={(value, variable) => {
          setVariableName(value);
          setVariableData(variable);
          props.onSelect(value);
          setValue({ storeId: '', variable: '' });
        }}
      />
      {variableData && (
        <Group>
          <TextInput
            size='xs'
            placeholder='→ Store ID'
            value={value.storeId}
            onChange={(e) => {
              setValue({ ...value, storeId: e.currentTarget.value });
              props.onValueChange({ ...value, storeId: e.currentTarget.value });
            }}
          />
          <VariableSelect
            value={value.variable}
            variableType={variableData.type}
            onChange={(val, variable) => {
              setValue({ ...value, variable: val });
              props.onValueChange({ ...value, variable: val });
            }}
          />
        </Group>
      )}
    </OperationWrapper>
  );
}
