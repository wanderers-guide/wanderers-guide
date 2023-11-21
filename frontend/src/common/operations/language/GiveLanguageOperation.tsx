import { SelectContentButton } from "@common/select/SelectContent";
import { AbilityBlock, Language } from "@typing/content";
import { OperationWrapper } from "../Operations";


export function GiveLanguageOperation(props: {
  selectedId: number;
  onSelect: (option: Language) => void;
  onRemove: () => void;
}) {
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Language'>
      <SelectContentButton<Language>
        type='language'
        onClick={(option) => {
          props.onSelect(option);
        }}
        selectedId={props.selectedId}
      />
    </OperationWrapper>
  );
}
