import { SelectContentButton } from '@common/select/SelectContent';
import { Item, Trait } from '@typing/content';
import { OperationWrapper } from '../Operations';

export function GiveTraitOperation(props: {
  selectedId: number;
  onSelect: (option: Trait) => void;
  onRemove: () => void;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Trait'>
      <SelectContentButton<Trait>
        type='trait'
        onClick={(option) => {
          props.onSelect(option);
        }}
        options={{
          overrideLabel: 'Select a Trait',
          filterFn: (trait: Trait) =>
            !!(
              trait.meta_data?.creature_trait ||
              trait.meta_data?.ancestry_trait ||
              trait.meta_data?.class_trait ||
              trait.meta_data?.archetype_trait
            ),
        }}
        selectedId={props.selectedId}
      />
    </OperationWrapper>
  );
}
