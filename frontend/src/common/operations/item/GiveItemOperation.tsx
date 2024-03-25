import { SelectContentButton } from '@common/select/SelectContent';
import { Item } from '@typing/content';
import { OperationWrapper } from '../Operations';

export function GiveItemOperation(props: {
  selectedId: number;
  onSelect: (option: Item) => void;
  onRemove: () => void;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Item'>
      <SelectContentButton<Item>
        type='item'
        onClick={(option) => {
          props.onSelect(option);
        }}
        selectedId={props.selectedId}
      />
    </OperationWrapper>
  );
}
