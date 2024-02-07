import { SelectContentButton } from '@common/select/SelectContent';
import { Spell } from '@typing/content';
import { OperationWrapper } from '../Operations';
import { Group, NumberInput, SegmentedControl, Stack, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useDidUpdate } from '@mantine/hooks';
import { GiveSpellData } from '@typing/operations';
import { labelToVariable } from '@variables/variable-utils';

export function GiveSpellOperation(props: {
  data: GiveSpellData;
  onSelect: (data: GiveSpellData) => void;
  onRemove: () => void;
}) {
  const [spellId, setSpellId] = useState(props.data.spellId);
  const [type, setType] = useState(props.data.type);
  const [castingSource, setCastingSource] = useState(props.data.castingSource);
  const [level, setLevel] = useState(props.data.level);
  const [tradition, setTradition] = useState(props.data.tradition);
  const [casts, setCasts] = useState(props.data.casts);

  useDidUpdate(() => {
    props.onSelect({
      spellId,
      type,
      castingSource,
      level,
      tradition,
      casts,
    });
  }, [spellId, type, castingSource, level, tradition, casts]);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Give Spell'>
      <Stack w='100%'>
        <Group>
          <SelectContentButton<Spell>
            type='spell'
            onClick={(option) => {
              setSpellId(option.id);
            }}
            selectedId={props.data.spellId}
          />
          <SegmentedControl
            value={type}
            size='xs'
            onChange={(v) => setType(v as 'NORMAL' | 'FOCUS' | 'INNATE')}
            data={[
              { label: 'Normal', value: 'NORMAL' },
              { label: 'Focus', value: 'FOCUS' },
              { label: 'Innate', value: 'INNATE' },
            ]}
          />
        </Group>
        {type === 'NORMAL' && (
          <Group>
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
            <NumberInput
              size='xs'
              placeholder='Level'
              min={0}
              max={10}
              w={70}
              value={level}
              onChange={(val) => setLevel(parseInt(`${val}`))}
              allowDecimal={false}
            />
          </Group>
        )}
        {type === 'FOCUS' && (
          <Group>
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
          </Group>
        )}
        {type === 'INNATE' && (
          <Group>
            <SegmentedControl
              value={tradition}
              size='xs'
              onChange={(v) => setTradition(v as 'ARCANE' | 'OCCULT' | 'PRIMAL' | 'DIVINE')}
              data={[
                { label: 'Arcane', value: 'ARCANE' },
                { label: 'Occult', value: 'OCCULT' },
                { label: 'Primal', value: 'PRIMAL' },
                { label: 'Divine', value: 'DIVINE' },
              ]}
            />
            <NumberInput
              size='xs'
              placeholder='Level'
              min={0}
              max={10}
              w={70}
              value={level}
              onChange={(val) => setLevel(parseInt(`${val}`))}
              allowDecimal={false}
            />
            <NumberInput
              size='xs'
              placeholder='Casts/day'
              min={0}
              max={10}
              w={90}
              value={casts}
              onChange={(val) => setCasts(parseInt(`${val}`))}
              allowDecimal={false}
            />
          </Group>
        )}
      </Stack>
    </OperationWrapper>
  );
}
