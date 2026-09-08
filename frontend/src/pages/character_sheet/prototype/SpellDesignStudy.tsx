import { Box, Button, Group, SegmentedControl, Select, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SpellDesignPhone } from './SpellDesignPhone';
import { spellScenarios, type SpellDesign } from './spell-study-data';
import './spell-study.css';

const designs: { id: SpellDesign; title: string; description: string; tradeoff: string }[] = [
  {
    id: 'sections',
    title: 'Source sections',
    description: 'One list, with compact groups for each source.',
    tradeoff: 'See your different spell sources together. More scrolling as the list grows.',
  },
  {
    id: 'switcher',
    title: 'Source switcher',
    description: 'Choose a source, then jump to a spell rank.',
    tradeoff: 'Less on screen at once. An extra step to move between spell sources.',
  },
];

/** Review chrome stays outside the phone; both concepts use the same scenario and local-only interactions. */
export function SpellDesignStudy() {
  const [params, setParams] = useSearchParams();
  const scenario = spellScenarios.find((item) => item.id === params.get('scenario')) ?? spellScenarios[0];
  const requestedDesign = params.get('design') ?? 'compare';
  const design = ['compare', 'sections', 'switcher'].includes(requestedDesign) ? requestedDesign : 'compare';
  const [width, setWidth] = useState('390');
  const [reset, setReset] = useState(0);
  const update = (name: string, value: string): void =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(name, value);
      return next;
    });
  return (
    <Box className='glass-study spell-study'>
      <Box component='header' className='study-header'>
        <Group justify='space-between' gap='md' align='flex-start'>
          <Stack gap={5}>
            <Text className='study-eyebrow'>Wanderer’s Guide / Spells</Text>
            <Title order={1}>Spells, two layouts.</Title>
            <Text size='sm' c='dimmed'>
              Compare the navigation, then try casting and preparing.
            </Text>
          </Stack>
          <Button variant='subtle' size='xs' onClick={() => setParams({ view: 'current', screen: 'spells' })}>
            Current spells
          </Button>
        </Group>
      </Box>
      <Group className='study-controls' align='flex-end' justify='space-between' gap='md'>
        <Group gap='md' align='flex-end'>
          <Select
            label='Character scenario'
            aria-label='Character scenario'
            value={scenario.id}
            allowDeselect={false}
            searchable
            data={spellScenarios.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(value) => {
              if (value) update('scenario', value);
            }}
            w={245}
          />
          <Stack gap={5}>
            <Text size='xs' c='dimmed'>
              View
            </Text>
            <SegmentedControl
              aria-label='Design view'
              value={design}
              onChange={(value) => update('design', value)}
              data={[
                { value: 'compare', label: 'Compare' },
                { value: 'sections', label: 'Sections' },
                { value: 'switcher', label: 'Switcher' },
              ]}
            />
          </Stack>
          <Stack gap={5}>
            <Text size='xs' c='dimmed'>
              Phone width
            </Text>
            <SegmentedControl aria-label='Study phone width' value={width} onChange={setWidth} data={['390', '430']} />
          </Stack>
        </Group>
        <Button variant='subtle' size='xs' onClick={() => setReset((value) => value + 1)}>
          Reset samples
        </Button>
      </Group>
      <Text className='study-change' size='sm'>
        {scenario.note}
      </Text>
      <Box className='study-concepts' style={{ '--study-width': `${width}px` }}>
        {designs
          .filter((item) => design === 'compare' || item.id === design)
          .map((item) => (
            <Box component='section' className='study-concept' aria-label={item.title} key={item.id}>
              <Title order={2} size='lg'>
                {item.title}
              </Title>
              <Text size='sm' c='dimmed' className='study-description'>
                {item.description}
              </Text>
              <SpellDesignPhone key={`${scenario.id}-${reset}`} design={item.id} scenario={scenario} />
              <Text size='sm' c='dimmed' mt='md'>
                {item.tradeoff}
              </Text>
            </Box>
          ))}
      </Box>
      <Box component='footer' className='study-footer'>
        <Text size='sm'>Try a spell row, a resource count, or Prepare.</Text>
        <Text size='xs' c='dimmed' mt='xs'>
          Panel-only prototypes; the character header is omitted in both. Sample loadouts and edits are temporary. Staff
          preparation, wand overcharge and the complete casting rules are outside this mock. Nothing is saved to a
          character or merged.
        </Text>
      </Box>
    </Box>
  );
}
