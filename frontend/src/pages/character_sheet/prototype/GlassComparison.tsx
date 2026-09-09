import { Box, Button, Group, SegmentedControl, Select, Stack, Tabs, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassSheet, type GlassScreen, type GlassVariant } from './GlassSheet';
import { CurrentSheetImage, MobileSheetPrototype } from './MobileSheetPrototype';
import { isGlassScreen, studyScreens } from './sheet-study-data';
import { SpellDesignStudy } from './SpellDesignStudy';
import { SpellWireframeStudy } from './SpellWireframeStudy';
import { SpellCastingStudy } from './SpellCastingStudy';
import { SpellReferenceStudy } from './SpellReferenceStudy';
import './glass.css';
import './sheet-panels.css';

const concepts: { id: GlassVariant; letter: string; title: string; description: string; tradeoff: string }[] = [
  {
    id: 'smoked',
    letter: '01',
    title: 'Smoked glass',
    description: 'Separate cards, clearer text, and more visible artwork.',
    tradeoff: 'Earlier material reference. The expanded layout and controls were not selected.',
  },
  {
    id: 'unified',
    letter: '02',
    title: 'Unified glass',
    description: 'One glass frame. Calm reading surfaces within it.',
    tradeoff: 'An earlier alternative. Calmer edges, but fewer visual breaks between sections.',
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
  const requestedView = params.get('view') ?? 'spell-references';
  const view = ['compare', 'current', 'before-after', ...concepts.map((concept) => concept.id)].includes(requestedView)
    ? requestedView
    : 'compare';
  const requestedScreen = params.get('screen');
  const screen: GlassScreen = isGlassScreen(requestedScreen) ? requestedScreen : 'overview';
  const updateParam = (name: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(name, value);
      return next;
    });
  const setScreen = (value: GlassScreen) => updateParam('screen', value);
  const selectedScreen = studyScreens.find((option) => option.value === screen) ?? studyScreens[0];
  const [tint, setTint] = useState('balanced');
  const [width, setWidth] = useState('390');
  const [backdrop, setBackdrop] = useState('art');
  const visibleConcepts = concepts.filter(
    (concept) => view === 'compare' || view === concept.id || (view === 'before-after' && concept.id === 'smoked')
  );

  if (requestedView === 'spell-designs') return <SpellDesignStudy />;
  if (requestedView === 'spell-wireframes') return <SpellWireframeStudy />;
  if (requestedView === 'spell-models') return <SpellCastingStudy />;
  if (requestedView === 'spell-references') return <SpellReferenceStudy />;

  return (
    <Box className='glass-study'>
      <Box component='header' className='study-header'>
        <Text className='study-eyebrow'>Wanderer’s Guide / Mobile sheet</Text>
        <Group justify='space-between' align='flex-end' gap='md'>
          <Stack gap={6}>
            <Title order={1}>Earlier sheet studies.</Title>
            <Text c='dimmed' size='sm'>
              Review every panel, compare the current UI, and try the revised controls.
            </Text>
          </Stack>
          <Text size='xs' c='dimmed'>
            UI exploration · Not merged
          </Text>
        </Group>
        <Tabs value={view} onChange={(value) => updateParam('view', value ?? 'smoked')} mt='xl'>
          <Tabs.List aria-label='Glass concepts'>
            <Tabs.Tab value='spell-references'>Mobbin references</Tabs.Tab>
            <Tabs.Tab value='spell-models'>Casting models</Tabs.Tab>
            <Tabs.Tab value='spell-wireframes'>Spells wireframes</Tabs.Tab>
            <Tabs.Tab value='spell-designs'>Spells designs</Tabs.Tab>
            <Tabs.Tab value='before-after'>Before / After</Tabs.Tab>
            {concepts.map((concept) => (
              <Tabs.Tab key={concept.id} value={concept.id}>
                {concept.title}
              </Tabs.Tab>
            ))}
            <Tabs.Tab value='compare'>Compare all</Tabs.Tab>
            <Tabs.Tab value='current'>Current UI</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Box>

      {view === 'current' ? (
        <MobileSheetPrototype key={screen} initialScreen={screen} />
      ) : (
        <>
          <Group className='study-controls' justify='space-between' align='flex-end' gap='lg'>
            <Group gap='lg'>
              <Stack gap={5}>
                <Text size='xs' c='dimmed'>
                  Sample screen
                </Text>
                <Select
                  aria-label='Sample screen'
                  searchable
                  value={screen}
                  onChange={(value) => {
                    if (isGlassScreen(value)) setScreen(value);
                  }}
                  data={studyScreens.map(({ value, label }) => ({ value, label }))}
                  allowDeselect={false}
                  w={235}
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
                  Glass tint
                </Text>
                <SegmentedControl
                  aria-label='Glass tint'
                  value={tint}
                  onChange={setTint}
                  data={[
                    { value: 'balanced', label: 'More visible' },
                    { value: 'deep', label: 'Deeper' },
                  ]}
                />
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
              Local visual samples. Edits reset on reload. Character operations and saving are not connected.
            </Text>
          </Group>
          <Text className='study-change' size='sm'>
            {selectedScreen.change}
          </Text>
          <Box
            className='study-concepts'
            data-single={!['compare', 'before-after'].includes(view) || undefined}
            style={{ '--study-width': `${width}px` }}
          >
            {view === 'before-after' && (
              <Box component='section' className='study-concept' aria-label='Current screen reference'>
                <Title order={2} size='lg'>
                  Current UI
                </Title>
                <Text size='sm' c='dimmed' className='study-description'>
                  The captured {selectedScreen.label.toLowerCase()} screen.
                </Text>
                <CurrentSheetImage screen={screen} width={width} />
              </Box>
            )}
            {visibleConcepts.map((concept) => (
              <Box component='section' className='study-concept' key={concept.id} aria-label={concept.title}>
                <Group gap='xs' align='baseline'>
                  <Title order={2} size='lg'>
                    {concept.title}
                  </Title>
                </Group>
                <Text size='sm' c='dimmed' className='study-description'>
                  {concept.description}
                </Text>
                <GlassSheet
                  variant={concept.id}
                  screen={screen}
                  onScreenChange={setScreen}
                  backdrop={backdrop}
                  tint={tint}
                />
                <Text size='sm' c='dimmed' mt='md'>
                  {concept.tradeoff}
                </Text>
                {view === 'compare' && (
                  <Button variant='subtle' size='xs' px={0} mt='xs' onClick={() => updateParam('view', concept.id)}>
                    Inspect {concept.title.toLowerCase()}
                  </Button>
                )}
              </Box>
            ))}
          </Box>
          <Box component='footer' className='study-footer'>
            <Text size='sm'>Separate cards. Consistent surfaces. Clear controls.</Text>
            <Text size='xs' c='dimmed' mt={5}>
              Kip’s captured values and artwork anchor the study. Notes and some expanded lists are illustrative. Full
              item and feat descriptions are demonstrated by Bastard Sword and Impressive Performance.
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
