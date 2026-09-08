import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Group,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconAdjustmentsHorizontal, IconBook2, IconMenu2, IconSearch, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import LogoIcon from '../../../assets/images/LogoIcon';
import { SpellStudyDialog, type SpellStudyDialogState } from './SpellStudyDialog';
import {
  actionGlyph,
  actionLabel,
  entryName,
  entryResource,
  isPrepared,
  matchesCost,
  spellCatalog,
  type SampleEntry,
  type SampleSource,
  type SpellDesign,
  type SpellScenario,
} from './spell-study-data';

/** Two navigation compositions share exactly the same rows, samples and local resource interactions. */
export function SpellDesignPhone({ design, scenario }: { design: SpellDesign; scenario: SpellScenario }) {
  const [sources, setSources] = useState<SampleSource[]>(() => structuredClone(scenario.sources));
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? 'all');
  const [query, setQuery] = useState('');
  const [cost, setCost] = useState('all');
  const [filters, setFilters] = useState(false);
  const [rank, setRank] = useState('all');
  const [openSources, setOpenSources] = useState(sources.map((source) => source.id));
  const [dialog, setDialog] = useState<SpellStudyDialogState>(null);
  const searching = !!query.trim();
  const filtered = searching || cost !== 'all';
  const source = sources.find((item) => item.id === sourceId);
  const shownSources =
    design === 'sections' || searching || sourceId === 'all' ? sources : sources.filter((item) => item.id === sourceId);
  const matches = (entry: SampleEntry, item: SampleSource): boolean => {
    if (!entry.spell) return !filtered;
    const spell = spellCatalog[entry.spell];
    return (
      `${entryName(entry)} ${item.name} ${entry.origin ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      matchesCost(spell, cost) &&
      (design === 'sections' || searching || rank === 'all' || entry.rank === Number(rank))
    );
  };
  const visibleSources = shownSources.filter(
    (item) => !filtered || item.entries.some((entry) => entry.spell && matches(entry, item))
  );
  const resourceButton = (item: SampleSource, key: string): React.ReactNode => {
    const pool = item.pools[key];
    if (!pool) return null;
    return (
      <Button
        variant='subtle'
        className='spell-resource'
        size='compact-sm'
        aria-label={`${item.name} ${key}: ${pool.remaining} of ${pool.max} ${pool.unit} remaining`}
        onClick={() => setDialog({ kind: 'resource', sourceId: item.id, pool: key })}
      >
        {pool.remaining}
        <Text component='span' inherit className='spell-secondary'>
          {' '}
          / {pool.max} {pool.max === 1 ? pool.unit.replace(/s$/, '') : pool.unit} left
        </Text>
      </Button>
    );
  };
  const renderSource = (item: SampleSource): React.ReactNode => {
    const rows = item.entries.filter((entry) => matches(entry, item));
    const ranks = [...new Set(rows.map((entry) => entry.rank))].sort((a, b) => a - b);
    const editable = isPrepared(item) || item.kind === 'spontaneous' || item.kind === 'ritual';
    return (
      <Box className='spell-source-body'>
        <Group justify='space-between' align='center' wrap='nowrap' mb='xs' gap='xs'>
          <Box className='spell-source-context'>
            <Text className='spell-secondary' size='xs'>
              {item.detail}
            </Text>
            {item.dc !== undefined && (
              <Text size='xs' className='spell-source-stats'>
                Attack +{item.attack}{' '}
                <Text component='span' inherit className='spell-secondary'>
                  ·
                </Text>{' '}
                DC {item.dc}
              </Text>
            )}
          </Box>
          {editable && (
            <Button
              className='spell-manage'
              variant='subtle'
              size='compact-sm'
              onClick={() => setDialog({ kind: 'manage', sourceId: item.id })}
            >
              {isPrepared(item) ? 'Prepare' : 'Manage'}
            </Button>
          )}
          {['focus', 'staff', 'wand'].includes(item.kind) && resourceButton(item, Object.keys(item.pools)[0])}
        </Group>
        {ranks.map((currentRank) => {
          const entries = rows.filter((entry) => entry.rank === currentRank);
          const empty = entries.filter((entry) => !entry.spell && !entry.missing);
          const display = entries.filter((entry) => entry.spell || entry.missing);
          const ready = item.entries.filter((entry) => entry.rank === currentRank && entry.spell && !entry.used).length;
          return (
            <Box className='spell-rank' key={currentRank} data-rank={currentRank}>
              <Group className='spell-rank-heading' justify='space-between' gap='xs'>
                <Text size='xs' fw={600}>
                  {currentRank === 0 ? 'Cantrips' : `Rank ${currentRank}`}
                </Text>
                {item.kind === 'spontaneous' && currentRank > 0 ? (
                  resourceButton(item, `rank-${currentRank}`)
                ) : isPrepared(item) && currentRank > 0 ? (
                  <Text size='xs' className='spell-secondary'>
                    {ready} ready
                  </Text>
                ) : null}
              </Group>
              {display.map((entry) => {
                const spell = entry.spell ? spellCatalog[entry.spell] : undefined;
                const resource = entryResource(item, entry);
                const pool = resource ? item.pools[resource.key] : undefined;
                const used = isPrepared(item) && entry.rank > 0 && entry.used;
                return (
                  <Box key={entry.id} className='spell-row-wrap'>
                    <UnstyledButton
                      className='spell-row'
                      data-entry-id={entry.id}
                      data-used={used || undefined}
                      disabled={!spell}
                      onClick={() => setDialog({ kind: 'spell', sourceId: item.id, entryId: entry.id })}
                    >
                      <Box className='spell-row-copy'>
                        <Text component='span' className='spell-row-name'>
                          {entryName(entry)}
                        </Text>
                        {(entry.origin || used || entry.missing) && (
                          <Text component='span' className='spell-row-note'>
                            {entry.origin}
                            {entry.origin && used ? ' · ' : ''}
                            {used ? 'Used' : entry.missing ? 'Reference missing' : ''}
                          </Text>
                        )}
                      </Box>
                      {spell && (
                        <Text
                          component='span'
                          className={actionGlyph(spell.cast) ? 'sheet-actions spell-glyph' : 'spell-cast-time'}
                          aria-label={actionLabel(spell.cast)}
                        >
                          {actionGlyph(spell.cast) || actionLabel(spell.cast)}
                        </Text>
                      )}
                    </UnstyledButton>
                    {item.kind === 'innate' && (
                      <Box className='spell-inline-use'>
                        {pool && resource ? (
                          resourceButton(item, resource.key)
                        ) : (
                          <Text size='xs' className='spell-secondary'>
                            At will
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
              {!!empty.length && (
                <Button
                  className='spell-empty-preparation'
                  variant='subtle'
                  fullWidth
                  justify='start'
                  size='xs'
                  onClick={() => setDialog({ kind: 'manage', sourceId: item.id })}
                >
                  {empty.length} unprepared {empty.length === 1 ? 'slot' : 'slots'} · Prepare
                </Button>
              )}
            </Box>
          );
        })}
        {!ranks.length && <Text className='spell-empty'>No spells at this rank.</Text>}
      </Box>
    );
  };

  return (
    <Box className='glass-phone spell-phone' data-glass='smoked' data-tint='balanced' data-design={design}>
      <Box className='sheet-app-header'>
        <IconMenu2 size={22} aria-hidden />
        <LogoIcon size={29} color='var(--sheet-accent)' />
        <Text component='span'>Wanderer’s Guide</Text>
      </Box>
      <Box className='spell-page'>
        <Group justify='space-between' className='spell-page-heading'>
          <Text component='h3'>Spells</Text>
          <Text size='xs' className='spell-secondary'>
            {sources.length === 1 ? '' : `${sources.length} sources`}
          </Text>
        </Group>
        {design === 'switcher' && sources.length > 1 && (
          <Select
            className='spell-source-select'
            aria-label='Spell source'
            value={sourceId}
            disabled={searching}
            allowDeselect={false}
            data={[
              { value: 'all', label: 'All sources' },
              ...sources.map((item) => ({ value: item.id, label: item.name })),
            ]}
            onChange={(value) => {
              if (value) {
                setSourceId(value);
                setRank('all');
              }
            }}
            comboboxProps={{ withinPortal: false }}
          />
        )}
        <TextInput
          className='spell-search'
          aria-label='Search all spells'
          placeholder='Search all spells'
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          rightSectionWidth={query ? 74 : 40}
          rightSection={
            <Group gap={0} wrap='nowrap'>
              {query && (
                <ActionIcon variant='subtle' aria-label='Clear spell search' onClick={() => setQuery('')}>
                  <IconX size={16} />
                </ActionIcon>
              )}
              <ActionIcon
                variant={filters || cost !== 'all' ? 'light' : 'subtle'}
                aria-label='Spell filters'
                aria-expanded={filters}
                onClick={() => setFilters(!filters)}
              >
                <IconAdjustmentsHorizontal size={18} />
              </ActionIcon>
            </Group>
          }
        />
        {filters && (
          <Select
            className='spell-cost-select'
            label='Action cost'
            aria-label='Filter spell action cost'
            value={cost}
            allowDeselect={false}
            onChange={(value) => setCost(value ?? 'all')}
            data={[
              { value: 'all', label: 'Any action cost' },
              { value: '1', label: '1 action' },
              { value: '2', label: '2 actions' },
              { value: '3', label: '3 actions' },
              { value: '4', label: 'Free action' },
              { value: '5', label: 'Reaction' },
            ]}
            comboboxProps={{ withinPortal: false }}
          />
        )}
        {searching && (
          <Text size='xs' className='spell-search-scope'>
            Results from all sources
          </Text>
        )}
        {design === 'switcher' && source && !searching && (
          <Box className='spell-rank-nav'>
            <SegmentedControl
              aria-label='Spell rank'
              size='xs'
              fullWidth
              value={rank}
              onChange={setRank}
              data={[
                { value: 'all', label: 'All ranks' },
                ...[...new Set(source.entries.map((entry) => entry.rank))]
                  .sort((a, b) => a - b)
                  .map((value) => ({ value: String(value), label: value === 0 ? 'Cantrips' : String(value) })),
              ]}
            />
          </Box>
        )}
        <Box className='spell-list-scroll' tabIndex={0} aria-label='Scrollable spell list'>
          {sources.length === 0 ? (
            <Stack align='center' className='spell-empty-state' gap='xs'>
              <IconBook2 size={30} stroke={1.3} />
              <Text fw={500}>No spells yet</Text>
              <Text size='sm' className='spell-secondary'>
                Your spells will appear here.
              </Text>
            </Stack>
          ) : visibleSources.length === 0 ? (
            <Box className='spell-empty-state'>
              <Text>No matching spells.</Text>
              <Button
                variant='subtle'
                size='xs'
                mt='xs'
                onClick={() => {
                  setQuery('');
                  setCost('all');
                }}
              >
                Clear filters
              </Button>
            </Box>
          ) : design === 'sections' || sourceId === 'all' || searching ? (
            <Accordion
              className='spell-source-accordion'
              multiple
              value={filtered ? visibleSources.map((item) => item.id) : openSources}
              onChange={setOpenSources}
              transitionDuration={0}
            >
              {visibleSources.map((item) => (
                <Accordion.Item key={item.id} value={item.id} data-source={item.id}>
                  <Accordion.Control>
                    <Text fw={600} size='sm'>
                      {item.name}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>{renderSource(item)}</Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          ) : (
            visibleSources.map((item) => (
              <Box key={item.id} data-source={item.id}>
                {sources.length === 1 && (
                  <Text fw={600} size='sm' className='spell-solo-title'>
                    {item.name}
                  </Text>
                )}
                {renderSource(item)}
              </Box>
            ))
          )}
        </Box>
      </Box>
      <SpellStudyDialog dialog={dialog} sources={sources} onChange={setSources} onClose={() => setDialog(null)} />
    </Box>
  );
}
