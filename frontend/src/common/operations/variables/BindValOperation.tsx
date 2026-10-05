import { OperationWrapper } from '../Operations';
import VariableSelect from '@common/VariableSelect';
import { StoreID } from '@schemas/variables';
import { TextInput, Group } from '@mantine/core';

/** Keep saved binding fields editable even when the destination belongs to a companion store. */
export function BindValOperation(props: {
  variable: string;
  value: { storeId: StoreID; variable: string };
  onSelect: (variable: string) => void;
  onValueChange: (value: { storeId: StoreID; variable: string }) => void;
  onRemove: () => void;
  overrideTitle?: string;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title={props.overrideTitle ? props.overrideTitle : 'Bind Value'}>
      <VariableSelect value={props.variable} onChange={props.onSelect} />
      <Group>
        <TextInput
          size='xs'
          placeholder='→ Store ID'
          value={props.value.storeId}
          onChange={(e) => {
            props.onValueChange({ ...props.value, storeId: e.currentTarget.value });
          }}
        />
        <VariableSelect
          value={props.value.variable}
          storeId={props.value.storeId || 'CHARACTER'}
          onChange={(variable) => {
            props.onValueChange({ ...props.value, variable });
          }}
        />
      </Group>
    </OperationWrapper>
  );
}
