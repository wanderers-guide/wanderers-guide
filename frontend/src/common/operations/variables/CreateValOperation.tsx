import { OperationWrapper } from '../Operations';
import { AttributeValue, ProficiencyType, ProficiencyValue, VariableType, VariableValue } from '@typing/variables';
import { Group, JsonInput, NumberInput, SegmentedControl, Select, TextInput } from '@mantine/core';
import { SetValueInput } from './SetValOperation';
import { labelToVariable } from '@variables/variable-utils';

export function CreateValOperation(props: {
  variable: string;
  onNameChange: (variable: string) => void;
  variableType: VariableType;
  onTypeChange: (variable: VariableType) => void;
  value: VariableValue;
  onValueChange: (value: VariableValue) => void;
  onRemove: () => void;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Create Value'>
      <Group align='start'>
        <Select
          placeholder='Value Type'
          size='xs'
          w={110}
          value={props.variableType}
          onChange={(value) => {
            if (!value) return;
            props.onTypeChange(value as VariableType);
          }}
          data={[
            {
              label: 'Number',
              value: 'num',
            },
            {
              label: 'Text',
              value: 'str',
            },
            {
              label: 'Boolean',
              value: 'bool',
            },
            {
              label: 'Proficiency',
              value: 'prof',
            },
            {
              label: 'Attribute',
              value: 'attr',
            },
            {
              label: 'List of Text',
              value: 'list-str',
            },
          ]}
        />
        <TextInput
          ff='Ubuntu Mono, monospace'
          size='xs'
          placeholder='Value Name'
          w={190}
          value={props.variable}
          onChange={(e) => {
            props.onNameChange(labelToVariable(e.target.value, false));
          }}
        />
        <SetValueInput
          variableType={props.variableType}
          value={props.value}
          onChange={(value) => {
            props.onValueChange(value);
          }}
        />
      </Group>
    </OperationWrapper>
  );
}
