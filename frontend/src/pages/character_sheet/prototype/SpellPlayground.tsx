import { ActionIcon, Anchor, Box, Button, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAdjustmentsHorizontal, IconArrowLeft, IconSearch, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LogoIcon from '../../../assets/images/LogoIcon';
import { CastingModelDialog } from './CastingModelDialog';
import { CastingSourceOutline } from './CastingSourceOutline';
import { castingModelCases, type CastingModelCase } from './casting-model-data';
import {
  createSpellPreview,
  previewOptions,
  updateSpellPreview,
  type SpellPreviewAction,
  type SpellPreviewState,
} from './spell-preview-state';
import { entryName, matchesCost, spellCatalog } from './spell-study-data';
import { type WireframeSheet } from './SpellWireframePhone';
import './spell-wireframes.css';
import './spell-playground.css';

/** A finished visual treatment uses the same casting-model dialogs and fixtures as the wireframe study. */
export function SpellPlayground() {
  const [params, setParams] = useSearchParams();
  const example = castingModelCases.find((item) => item.id === params.get('sample')) ?? castingModelCases[0];
  return (
    <Box className='spell-playground'>
      <Group justify='space-between' mb='lg'>
        <Anchor component={Link} to='/?view=spell-references' size='sm'>
          <IconArrowLeft size={14} /> Mobbin references
        </Anchor>
        <Text size='xs' c='dimmed'>
          UI exploration · Unmerged
        </Text>
      </Group>
      <Select
        className='finished-sample-picker'
        label='Sample character'
        aria-label='Sample casting setup'
        value={example.id}
        allowDeselect={false}
        searchable
        data={castingModelCases.map((item) => ({ value: item.id, label: item.title }))}
        onChange={(sample) => {
          if (sample) setParams({ view: 'spell-playground', sample });
        }}
        mb='lg'
      />
      <InteractiveSpellExample key={example.id} example={example} />
    </Box>
  );
}

/** All sample mutations stay in this component and reset when the scenario changes or the page reloads. */
function InteractiveSpellExample({ example }: { example: CastingModelCase }) {
  const [history, setHistory] = useState<SpellPreviewState[]>(() => [createSpellPreview(example)]);
  const state = history[history.length - 1];
  const options = previewOptions(state);
  const [sheet, setSheet] = useState<WireframeSheet>(null);
  const [query, setQuery] = useState<string>('');
  const [filters, setFilters] = useState<boolean>(false);
  const [cost, setCost] = useState<string>('all');
  const visible = state.sources
    .map((source) => ({
      ...source,
      entries: source.entries.filter((entry) => {
        const nameMatches = `${entryName(entry)} ${source.name} ${entry.origin ?? ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        return nameMatches && (cost === 'all' || (!!entry.spell && matchesCost(spellCatalog[entry.spell], cost)));
      }),
    }))
    .filter((source) => source.entries.length > 0);
  const source =
    sheet?.kind === 'spell' ? sheet.location.source : sheet && 'source' in sheet ? sheet.source : undefined;
  const dialogKey =
    sheet?.kind === 'spell'
      ? `spell:${source?.id}:${sheet.location.entry.id}`
      : `${sheet?.kind}:${source?.id}:${sheet?.kind === 'resource' ? sheet.pool : ''}`;

  /** The reducer rechecks availability against the latest snapshot before changing a resource. */
  function commit(action: SpellPreviewAction): void {
    setHistory((previous) => {
      const current = previous[previous.length - 1];
      const next = updateSpellPreview(current, action);
      return next === current ? previous : [...previous.slice(-9), next];
    });
    if (action.kind !== 'learn') setSheet(null);
  }

  return (
    <Box className='finished-study-layout'>
      <Box className='finished-phone-column'>
        <Box className='glass-phone finished-phone' data-glass='smoked' data-tint='balanced'>
          <Box className='sheet-app-header'>
            <LogoIcon size={27} color='var(--sheet-accent)' />
            <Text component='span'>Wanderer’s Guide</Text>
          </Box>
          <Box className='finished-panel'>
            <Group className='finished-page-heading' justify='space-between'>
              <Text className='finished-page-title'>Spells</Text>
              <Text className='finished-character-name'>Aster</Text>
            </Group>
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              aria-label='Search spells and sources'
              placeholder='Search spells'
              leftSection={<IconSearch size={18} />}
              rightSectionWidth={query ? 92 : 48}
              rightSection={
                <Group gap={0} wrap='nowrap'>
                  {query && (
                    <ActionIcon variant='subtle' size='lg' aria-label='Clear search' onClick={() => setQuery('')}>
                      <IconX size={17} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    variant={filters || cost !== 'all' ? 'light' : 'subtle'}
                    size='lg'
                    aria-label='Spell filters'
                    aria-expanded={filters}
                    onClick={() => setFilters((value) => !value)}
                  >
                    <IconAdjustmentsHorizontal size={19} />
                  </ActionIcon>
                </Group>
              }
            />
            {filters && (
              <Select
                label='Casting time'
                value={cost}
                onChange={(value) => setCost(value ?? 'all')}
                mt='sm'
                allowDeselect={false}
                data={[
                  { value: 'all', label: 'Any casting time' },
                  { value: '1', label: '1 action' },
                  { value: '2', label: '2 actions' },
                  { value: '3', label: '3 actions' },
                  { value: '5', label: 'Reaction' },
                  { value: '4', label: 'Free action' },
                ]}
                comboboxProps={{ withinPortal: false }}
              />
            )}
            <Box className='finished-list' role='region' aria-label='Spell list'>
              {visible.map((item, index) => (
                <Box key={item.id} className='finished-source-block'>
                  {item.kind === 'wand' && visible[index - 1]?.kind !== 'wand' && (
                    <Text className='finished-item-heading'>Wands</Text>
                  )}
                  <CastingSourceOutline
                    source={item}
                    options={options[item.id] ?? {}}
                    query=''
                    finished
                    onSpell={(entry) => setSheet({ kind: 'spell', location: { source: item, entry } })}
                    onManage={() => setSheet({ kind: 'manage', source: item })}
                    onResource={(pool) => setSheet({ kind: 'resource', source: item, pool })}
                  />
                </Box>
              ))}
              {!visible.length && (
                <Stack gap='xs' py='xl' align='center'>
                  <Text fw={600}>{state.sources.length ? 'No matching spells' : 'No spells yet'}</Text>
                  <Text size='sm' className='wire-muted' ta='center'>
                    {state.sources.length
                      ? 'Try another name or casting time.'
                      : 'Spells added in the builder appear here.'}
                  </Text>
                  {state.sources.length > 0 && (
                    <Button
                      variant='subtle'
                      onClick={() => {
                        setQuery('');
                        setCost('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          </Box>
          {sheet && (
            <CastingModelDialog
              key={dialogKey}
              sheet={sheet}
              scenario={{ ...example.scenario, sources: state.sources }}
              options={options}
              onClose={() => setSheet(null)}
              onChange={setSheet}
              onFinish={() => setSheet(null)}
              onCommit={commit}
            />
          )}
        </Box>
      </Box>
      <Stack className='finished-review' gap='xl'>
        <Box>
          <Text size='xs' c='dimmed' mb='xs'>
            INTERACTIVE STUDY
          </Text>
          <Title order={1} size='h2'>
            Spells, in use.
          </Title>
          <Text size='sm' c='gray.4' mt='sm'>
            Compact source groups with resources kept beside their spells.
          </Text>
        </Box>
        <Box>
          <Text fw={600} size='sm' mb='xs'>
            Try it
          </Text>
          <Text size='sm' c='gray.4'>
            Tap a spell to read and cast it. The list updates when a preparation, slot, charge, or daily use is spent.
          </Text>
          <Text size='sm' c='gray.4' mt='sm'>
            Open Prepare to change a slot. Tap a resource count to adjust it. Try a used wand to explore overcharging.
          </Text>
        </Box>
        <Group>
          <Button
            variant='light'
            disabled={history.length < 2}
            onClick={() => {
              setHistory((previous) => previous.slice(0, -1));
              setSheet(null);
            }}
          >
            Undo last change
          </Button>
          <Button
            variant='subtle'
            onClick={() => {
              setHistory([createSpellPreview(example)]);
              setSheet(null);
              setQuery('');
              setCost('all');
            }}
          >
            Reset sample
          </Button>
        </Group>
        <Text size='xs' c='dimmed'>
          Changes stay in this preview. Spell text is excerpted at its base rank; quantities and item loadouts are
          illustrative. Full rules, damage rolls, school eligibility, and character saves are not connected.
        </Text>
        <Anchor component={Link} to='/?view=spell-models&group=casting' size='sm'>
          Earlier casting diagrams →
        </Anchor>
      </Stack>
    </Box>
  );
}
