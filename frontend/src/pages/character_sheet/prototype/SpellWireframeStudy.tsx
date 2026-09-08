import { Box, Button, Group, SegmentedControl, Select, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SpellWireframePhone, type WireframeLayout } from './SpellWireframePhone';
import { spellScenarios } from './spell-study-data';
import './spell-wireframes.css';

const layouts: { id: WireframeLayout; title: string; premise: string; tradeoff: string; tryIt: string }[] = [
  {
    id: 'list',
    title: 'A. One spell list',
    premise: 'Start with the spell you want.',
    tradeoff: 'Easy to scan across sources. A large collection means more scrolling.',
    tryIt: 'Tap a spell, then inspect the casting area below the list.',
  },
  {
    id: 'resources',
    title: 'B. Resources first',
    premise: 'Start with what you can spend.',
    tradeoff: 'Slots and uses are easy to see. Shared pools add a step before choosing a spell.',
    tryIt: 'Tap a prepared slot or resource box to follow its casting path.',
  },
  {
    id: 'quick',
    title: 'C. Quick spells',
    premise: 'Start with a small set you choose.',
    tradeoff: 'Frequent spells stay close. Other spells take another tap, and pins need setup.',
    tryIt: 'Open All spells, pin one, then return to the quick view.',
  },
];

/** Three deliberately plain diagrams compare information placement and navigation only. */
export function SpellWireframeStudy() {
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState<number>(0);
  const scenario = spellScenarios.find((item) => item.id === params.get('scenario')) ?? spellScenarios[0];
  const requestedLayout = params.get('layout');
  const selectedLayout = layouts.find((item) => item.id === requestedLayout)?.id ?? 'all';

  /** Keep a review link shareable without storing any character state. */
  function updateParam(key: string, value: string): void {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('view', 'spell-wireframes');
      next.set(key, value);
      return next;
    });
  }

  return (
    <Box className='wire-study'>
      <Group justify='space-between' align='flex-start' mb='lg'>
        <Box>
          <Title order={1} size='h2'>
            Spells: three rough directions
          </Title>
          <Text size='sm' c='dimmed' mt='xs'>
            Boxes, placement, and tap paths. Visual styling comes later.
          </Text>
        </Box>
        <Button variant='subtle' color='gray' onClick={() => setRevision((value) => value + 1)}>
          Reset
        </Button>
      </Group>
      <Group mb='xl' gap='md' align='flex-end'>
        <Select
          label='Sample character'
          value={scenario.id}
          onChange={(value) => updateParam('scenario', value ?? 'mixed')}
          data={spellScenarios.map((item) => ({ value: item.id, label: item.label }))}
          allowDeselect={false}
          w={210}
        />
        <SegmentedControl
          aria-label='Wireframe view'
          value={selectedLayout}
          onChange={(value) => updateParam('layout', value)}
          data={[
            { value: 'all', label: 'All three' },
            { value: 'list', label: 'A' },
            { value: 'resources', label: 'B' },
            { value: 'quick', label: 'C' },
          ]}
        />
      </Group>
      <Box className='wire-grid' data-single={selectedLayout !== 'all' || undefined}>
        {layouts
          .filter((item) => selectedLayout === 'all' || selectedLayout === item.id)
          .map((layout) => (
            <Box component='section' aria-label={layout.title} key={layout.id}>
              <Title order={2} size='h4'>
                {layout.title}
              </Title>
              <Text size='sm' c='dimmed' mt={4} mb='md'>
                {layout.premise}
              </Text>
              <SpellWireframePhone
                key={`${layout.id}-${scenario.id}-${revision}`}
                layout={layout.id}
                scenario={scenario}
              />
              <Text size='sm' mt='md'>
                {layout.tradeoff}
              </Text>
              <Text size='xs' c='dimmed' mt='xs'>
                {layout.tryIt}
              </Text>
            </Box>
          ))}
      </Box>
      <Text component='footer' size='xs' c='dimmed' mt='xl'>
        Wireframes only. Spell names and quantities are sample context. Casting, preparation, and resource edits are
        placement previews, with no rules or saves. The character header and sheet navigation are placeholders. Dark
        glass remains a later styling option. This branch stays unmerged.
      </Text>
    </Box>
  );
}
