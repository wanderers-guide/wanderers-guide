import { Box, Button, Group, SegmentedControl, Stack, Tabs, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassSheet, type GlassScreen, type GlassVariant } from './GlassSheet';
import { MobileSheetPrototype } from './MobileSheetPrototype';
import './glass.css';

const concepts: { id: GlassVariant; letter: string; title: string; description: string; tradeoff: string }[] = [
  {
    id: 'smoked',
    letter: '01',
    title: 'Smoked glass',
    description: 'Familiar panels. Deeper tint, crisp text, quieter artwork.',
    tradeoff: 'The smallest visual change. Keeps the separate glass cards.',
  },
  {
    id: 'unified',
    letter: '02',
    title: 'Unified glass',
    description: 'One glass frame. Calm reading surfaces within it.',
    tradeoff: 'My preferred direction. Fewer competing edges and blurred layers.',
  },
  {
    id: 'frosted',
    letter: '03',
    title: 'Frosted light',
    description: 'Pale glass, dark ink, and a deeper green accent.',
    tradeoff: 'An optional light concept. A full light theme would be a separate project.',
  },
];

/** Local material study. The captured current UI remains a separate reference. */
export function GlassComparison() {
  const [params, setParams] = useSearchParams();
  const requestedView = params.get('view') ?? 'compare';
  const view = ['compare', 'current', ...concepts.map((concept) => concept.id)].includes(requestedView)
    ? requestedView
    : 'compare';
  const [screen, setScreen] = useState<GlassScreen>('overview');
  const [width, setWidth] = useState('390');
  const [backdrop, setBackdrop] = useState('art');
  const visibleConcepts = concepts.filter((concept) => view === 'compare' || view === concept.id);

  return (
    <Box className='glass-study'>
      <Box component='header' className='study-header'>
        <Text className='study-eyebrow'>Wanderer’s Guide / Material study</Text>
        <Group justify='space-between' align='flex-end' gap='md'>
          <Stack gap={6}>
            <Title order={1}>Glass, with room to read.</Title>
            <Text c='dimmed' size='sm'>
              Three treatments for the same character. Start with the surface, then the details.
            </Text>
          </Stack>
          <Text size='xs' c='dimmed'>
            UI exploration · Not merged
          </Text>
        </Group>
        <Tabs value={view} onChange={(value) => setParams({ view: value ?? 'compare' })} mt='xl'>
          <Tabs.List aria-label='Glass concepts'>
            <Tabs.Tab value='compare'>Compare all</Tabs.Tab>
            {concepts.map((concept) => (
              <Tabs.Tab key={concept.id} value={concept.id}>
                {concept.title}
              </Tabs.Tab>
            ))}
            <Tabs.Tab value='current'>Current UI</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Box>

      {view === 'current' ? (
        <MobileSheetPrototype />
      ) : (
        <>
          <Group className='study-controls' justify='space-between' align='flex-end' gap='lg'>
            <Group gap='lg'>
              <Stack gap={5}>
                <Text size='xs' c='dimmed'>
                  Sample screen
                </Text>
                <SegmentedControl
                  aria-label='Sample screen'
                  value={screen}
                  onChange={(value) => setScreen(value as GlassScreen)}
                  data={[
                    { value: 'overview', label: 'Overview' },
                    { value: 'skills', label: 'Skills' },
                    { value: 'spells', label: 'Spells' },
                  ]}
                />
              </Stack>
              <Stack gap={5}>
                <Text size='xs' c='dimmed'>
                  Phone width
                </Text>
                <SegmentedControl aria-label='Phone width' value={width} onChange={setWidth} data={['390', '430']} />
              </Stack>
              <Stack gap={5}>
                <Text size='xs' c='dimmed'>
                  Backdrop check
                </Text>
                <SegmentedControl
                  aria-label='Backdrop check'
                  value={backdrop}
                  onChange={setBackdrop}
                  data={[
                    { value: 'art', label: 'Artwork' },
                    { value: 'white', label: 'White' },
                    { value: 'black', label: 'Black' },
                  ]}
                />
              </Stack>
            </Group>
            <Text size='xs' c='dimmed' maw={280}>
              Try the grid menu, hero points, skill search and spell slots. Changes reset on reload.
            </Text>
          </Group>
          <Box
            className='study-concepts'
            data-single={view !== 'compare' || undefined}
            style={{ '--study-width': `${width}px` }}
          >
            {visibleConcepts.map((concept) => (
              <Box component='section' className='study-concept' key={concept.id} aria-label={concept.title}>
                <Group gap='xs' align='baseline'>
                  <Text className='study-number'>{concept.letter}</Text>
                  <Title order={2} size='lg'>
                    {concept.title}
                  </Title>
                </Group>
                <Text size='sm' c='dimmed' className='study-description'>
                  {concept.description}
                </Text>
                <GlassSheet variant={concept.id} screen={screen} onScreenChange={setScreen} backdrop={backdrop} />
                <Text size='sm' c='dimmed' mt='md'>
                  {concept.tradeoff}
                </Text>
                {view === 'compare' && (
                  <Button variant='subtle' size='xs' px={0} mt='xs' onClick={() => setParams({ view: concept.id })}>
                    Inspect {concept.title.toLowerCase()}
                  </Button>
                )}
              </Box>
            ))}
          </Box>
          <Box component='footer' className='study-footer'>
            <Text size='sm'>Keep glass at the edges. Give text a dependable background.</Text>
            <Text size='xs' c='dimmed' mt={5}>
              These are representative UI samples, not the full sheet or game engine. Artwork and portrait are the same
              as the current public Kip sheet.
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
