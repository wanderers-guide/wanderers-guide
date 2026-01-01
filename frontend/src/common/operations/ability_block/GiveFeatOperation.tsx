import { characterState } from '@atoms/characterAtoms';
import { SelectContentButton } from '@common/select/SelectContent';
import { AbilityBlock } from '@typing/content';
import { useRecoilValue } from 'recoil';
import { OperationWrapper } from '../Operations';
import { getDefaultSources } from '@content/content-store';

export function GiveFeatOperation(props: {
  selectedId: number;
  onSelect: (option: AbilityBlock) => void;
  onRemove: () => void;
}) {
  const character = useRecoilValue(characterState);
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
          // advancedPresetFilters: {
          //   type: 'ability-block',
          //   ab_type: 'feat',
          //   content_sources: character ? character.content_sources?.enabled : undefined,
          //   level_max: character ? character.level : undefined,
          //   level_min: 1,
          // },
        }}
      />
    </OperationWrapper>
  );
}
