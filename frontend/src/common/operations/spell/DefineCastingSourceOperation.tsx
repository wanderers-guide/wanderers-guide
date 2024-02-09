import { SelectContentButton } from '@common/select/SelectContent';
import { Spell } from '@typing/content';
import { OperationWrapper } from '../Operations';
import { Group, NumberInput, SegmentedControl, Stack, TextInput, Text, Box } from '@mantine/core';
import { useState } from 'react';
import { useDidUpdate } from '@mantine/hooks';
import { GiveSpellData } from '@typing/operations';
import { labelToVariable, variableNameToLabel } from '@variables/variable-utils';
import { SlotSelect } from '@common/SlotSelect';
import { getAllAttributeVariables } from '@variables/variable-manager';

export function DefineCastingSourceOperation(props: {
  value: string;
  onSelect: (value: string) => void;
  onRemove: () => void;
}) {
  const parts = props.value.split(':::') || ['', '', '', ''];

  const [name, setName] = useState(parts[0]);
  const [type, setType] = useState(parts[1]);
  const [tradition, setTradition] = useState(parts[2]);
  const [attribute, setAttribute] = useState(parts[3]);

  useDidUpdate(() => {
    props.onSelect(`${name}:::${type}:::${tradition}:::${attribute}`);
  }, [name, type, tradition, attribute]);

  return (
    <OperationWrapper onRemove={props.onRemove} title='Define Casting Source'>
      <Stack w='100%'>
        <TextInput
          ff='Ubuntu Mono, monospace'
          size='xs'
          placeholder='Source Name'
          w={190}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <Group wrap='nowrap' align='flex-start'>
          <Box>
            <Text fz='xs' fw={600}>
              Casting Type:
            </Text>
            <SegmentedControl
              value={type}
              onChange={setType}
              orientation='vertical'
              size='xs'
              data={[
                { label: 'Spontaneous from Repertoire', value: 'SPONTANEOUS-REPERTOIRE' },
                { label: 'Prepared from Sublist', value: 'PREPARED-LIST' },
                { label: 'Prepared from Tradition', value: 'PREPARED-TRADITION' },
              ]}
            />
          </Box>
          <Box>
            <Text fz='xs' fw={600}>
              Tradition:
            </Text>
            <SegmentedControl
              value={tradition}
              size='xs'
              orientation='vertical'
              onChange={(v) => setTradition(v as 'ARCANE' | 'OCCULT' | 'PRIMAL' | 'DIVINE')}
              data={[
                { label: 'Arcane', value: 'ARCANE' },
                { label: 'Divine', value: 'DIVINE' },
                { label: 'Occult', value: 'OCCULT' },
                { label: 'Primal', value: 'PRIMAL' },
              ]}
            />
          </Box>
          <Box>
            <Text fz='xs' fw={600}>
              Key Attribute:
            </Text>
            <SegmentedControl
              value={attribute}
              size='xs'
              orientation='vertical'
              onChange={(v) => setAttribute(v)}
              data={getAllAttributeVariables('CHARACTER').map((v) => ({
                label: variableNameToLabel(v.name),
                value: v.name,
              }))}
            />
          </Box>
        </Group>
      </Stack>
    </OperationWrapper>
  );
}
