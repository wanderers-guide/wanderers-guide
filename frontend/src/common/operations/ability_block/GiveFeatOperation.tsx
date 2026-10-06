import { SelectContentButton } from '@common/select/SelectContent';
import { fetchContentById } from '@content/content-store';
import { Stack, TextInput } from '@mantine/core';
import { isAdditionalLore } from '@operations/granted-lore';
import { AbilityBlock } from '@schemas/content';
import { OperationGiveAbilityBlock } from '@schemas/operations';
import { useQuery } from '@tanstack/react-query';
import { OperationWrapper } from '../Operations';

/** Grant a feat, with an optional fixed subject for this instance of Additional Lore. */
export function GiveFeatOperation(props: {
  data: OperationGiveAbilityBlock['data'];
  onSelect: (data: OperationGiveAbilityBlock['data']) => void;
  onRemove: () => void;
}) {
  const { data: feat } = useQuery({
    queryKey: ['granted-feat', props.data.abilityBlockId],
    queryFn: () => fetchContentById<AbilityBlock>('ability-block', props.data.abilityBlockId),
    enabled: props.data.abilityBlockId !== -1,
  });
  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Feat'>
      <Stack w='100%'>
        <SelectContentButton<AbilityBlock>
          type='ability-block'
          onClick={(option) => {
            props.onSelect({
              ...props.data,
              abilityBlockId: option.id,
              grantedLore: isAdditionalLore(option) ? props.data.grantedLore : undefined,
            });
          }}
          selectedId={props.data.abilityBlockId}
          options={{
            abilityBlockType: 'feat',
            showButton: false,
          }}
        />
        {isAdditionalLore(feat) && (
          <TextInput
            label='Granted Lore (optional)'
            size='xs'
            maw={280}
            value={props.data.grantedLore ?? ''}
            onChange={(event) => props.onSelect({ ...props.data, grantedLore: event.currentTarget.value || undefined })}
          />
        )}
      </Stack>
    </OperationWrapper>
  );
}
