import { SelectContentButton } from "@common/select/SelectContent";
import { AbilityBlock } from "@typing/content";
import { OperationWrapper } from "../Operations";


export function GiveActionOperation(props: {
  selectedId: number;
  onSelect: (option: AbilityBlock) => void;
  onRemove: () => void;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Action'>
      <SelectContentButton<AbilityBlock>
        type='ability-block'
        onClick={(option) => {
          props.onSelect(option);
        }}
        abilityBlockType='action'
        selectedId={props.selectedId}
      />
    </OperationWrapper>
  );
}
