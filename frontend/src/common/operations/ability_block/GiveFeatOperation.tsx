import { characterState } from '@atoms/characterAtoms';
import { SelectContentButton } from '@common/select/SelectContent';
import { prereqFilterOption } from '@common/select/filters';
import { AbilityBlock } from '@typing/content';
import { useRecoilValue } from 'recoil';
import { OperationWrapper } from '../Operations';

export function GiveFeatOperation(props: {
  selectedId: number;
  onSelect: (option: AbilityBlock) => void;
  onRemove: () => void;
}) {
  const character = useRecoilValue(characterState);
  const DETECT_PREREQUS = character?.options?.auto_detect_prerequisites ?? false;
  const filterOptions = DETECT_PREREQUS ? {
    options: [
      prereqFilterOption,
    ],
  } : undefined;
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Feat'>
      <SelectContentButton<AbilityBlock>
        type='ability-block'
        onClick={(option) => {
          props.onSelect(option);
        }}
        selectedId={props.selectedId}
        options={{
          abilityBlockType: 'feat',
          showButton: false,
          filterOptions,
        }}
      />
    </OperationWrapper>
  );
}
