import { SelectContentButton } from '@common/select/SelectContent';
import { AbilityBlock } from '@typing/content';
import { OperationWrapper } from '../Operations';

export function GivePhysicalFeatureOperation(props: {
  selectedId: number;
  onSelect: (option: AbilityBlock) => void;
  onRemove: () => void;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Physical Feature'>
      <SelectContentButton<AbilityBlock>
        type='ability-block'
        onClick={(option) => {
          props.onSelect(option);
        }}
        selectedId={props.selectedId}
        options={{
          abilityBlockType: 'physical-feature',
          showButton: false,
        }}
      />
    </OperationWrapper>
  );
}
