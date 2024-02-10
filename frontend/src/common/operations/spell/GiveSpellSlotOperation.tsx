import { SelectContentButton } from '@common/select/SelectContent';
import { Spell } from '@typing/content';
import { OperationWrapper } from '../Operations';
import { Group, NumberInput, SegmentedControl, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useDidUpdate } from '@mantine/hooks';
import { GiveSpellData } from '@typing/operations';
import { labelToVariable } from '@variables/variable-utils';
import { SlotSelect } from '@common/SlotSelect';

export function GiveSpellSlotOperation(props: {
  castingSource: string;
  slots: { lvl: number; rank: number; amt: number }[];
  onSelect: (castingSource: string, slots: { lvl: number; rank: number; amt: number }[]) => void;
  onRemove: () => void;
}) {
  const [castingSource, setCastingSource] = useState(props.castingSource);
  const [slots, setSlots] = useState(props.slots);

  useDidUpdate(() => {
    props.onSelect(castingSource, slots);
  }, [castingSource, slots]);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Spell Slots'>
      <Stack w='100%'>
        <TextInput
          ff='Ubuntu Mono, monospace'
          size='xs'
          placeholder='Casting Source'
          w={190}
          value={castingSource}
          onChange={(e) => {
            setCastingSource(labelToVariable(e.target.value, false));
          }}
        />
        <SlotSelect value={slots} onChange={setSlots} />
      </Stack>
    </OperationWrapper>
  );
}
