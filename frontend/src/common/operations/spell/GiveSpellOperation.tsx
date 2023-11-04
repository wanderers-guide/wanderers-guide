import { SelectContentButton } from "@common/select/SelectContent";
import { Spell } from "@typing/content";
import { OperationWrapper } from "../Operations";


export function GiveSpellOperation(props: { selectedId: number; onSelect: (option: Spell) => void; onRemove: () => void }) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Spell'>
      <SelectContentButton<Spell>
        type='spell'
        onClick={(option) => {
          props.onSelect(option);
        }}
        selectedId={props.selectedId}
      />
    </OperationWrapper>
  );
}
