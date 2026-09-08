import { Box, Button, Group, Select, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { castingModelCases, castingModelGroups } from './casting-model-data';
import { SpellWireframePhone } from './SpellWireframePhone';
import './spell-wireframes.css';

/** Compare casting models with a common visual language and visibly different resource ownership. */
export function SpellCastingStudy() {
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState<number>(0);
  const group = castingModelGroups.find((item) => item.value === params.get('group')) ?? castingModelGroups[0];
  const examples = castingModelCases.filter((item) => group.cases.includes(item.id));
  return (
    <Box className='wire-study casting-study'>
      <Group justify='space-between' align='flex-start' mb='lg'>
        <Box>
          <Title order={1} size='h2'>
            Spells, by casting model
          </Title>
          <Text size='sm' c='dimmed' mt='xs'>
            Same visual language. Different slots, pools, and item controls.
          </Text>
        </Box>
        <Button variant='subtle' color='gray' onClick={() => setRevision((value) => value + 1)}>
          Reset previews
        </Button>
      </Group>
      <Group gap='md' align='flex-end' mb='xl'>
        <Select
          label='Compare'
          aria-label='Compare casting models'
          value={group.value}
          data={castingModelGroups.map(({ value, label }) => ({ value, label }))}
          allowDeselect={false}
          w={280}
          onChange={(value) => setParams({ view: 'spell-models', group: value ?? 'casting' })}
        />
        <Text c='dimmed' size='xs'>
          Tap spells, counters, Prepare, and item controls.
        </Text>
      </Group>
      <Box className='wire-grid' data-single={examples.length === 1 || undefined}>
        {examples.map((example) => (
          <Box component='section' key={example.id} aria-label={example.title}>
            <Title order={2} size='h4'>
              {example.title}
            </Title>
            <Text className='casting-example-note' size='sm' c='dimmed' mt='xs' mb='md'>
              {example.note}
            </Text>
            <SpellWireframePhone
              key={`${example.id}-${revision}`}
              layout='casting'
              scenario={example.scenario}
              sourceOptions={example.options}
            />
          </Box>
        ))}
      </Box>
      <Text component='footer' size='xs' c='dimmed' mt='xl'>
        Rough layout review. Quantities and item loadouts are illustrative. Cast, recovery, and preparation controls
        preview a path without changing resources or character data. No production changes or merge.
      </Text>
    </Box>
  );
}
