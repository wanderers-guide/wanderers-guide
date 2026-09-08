import { Box, Button, Group, Modal, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import {
  entryName,
  entryResource,
  isPrepared,
  type SampleEntry,
  type SampleSource,
  type SpellScenario,
} from './spell-study-data';

export type WireframeLayout = 'list' | 'resources' | 'quick';
type SpellLocation = { source: SampleSource; entry: SampleEntry };
type WireframeSheet =
  | { kind: 'spell'; location: SpellLocation }
  | { kind: 'pool'; source: SampleSource; rank?: number }
  | { kind: 'manage'; source?: SampleSource }
  | { kind: 'resources' }
  | null;

/** Describe the existing fixture's resources without implementing another casting engine. */
function remainingLabel({ source, entry }: SpellLocation): string {
  if (entry.missing) return 'Unavailable';
  if (source.kind === 'ritual') return 'Ritual';
  if (entry.rank === 0) return 'Cantrip';
  if (isPrepared(source)) return entry.used ? 'Used' : 'Prepared';
  const resource = entryResource(source, entry);
  const pool = resource ? source.pools[resource.key] : undefined;
  return pool ? `${pool.remaining} / ${pool.max} ${pool.unit}` : 'At will';
}

/** Neutral labeled rectangles show three different tap paths using the same sample loadout. */
export function SpellWireframePhone({ layout, scenario }: { layout: WireframeLayout; scenario: SpellScenario }) {
  const [sheet, setSheet] = useState<WireframeSheet>(null);
  const [query, setQuery] = useState<string>('');
  const [showLibrary, setShowLibrary] = useState<boolean>(false);
  const locations: SpellLocation[] = scenario.sources.flatMap((source) =>
    source.entries.filter((entry) => !!entry.spell || entry.missing).map((entry) => ({ source, entry }))
  );
  const [pinned, setPinned] = useState<string[]>(
    locations
      .filter(({ entry }) => !entry.used && !entry.missing)
      .slice(0, 3)
      .map(({ entry }) => entry.id)
  );
  const [flowNote, setFlowNote] = useState<string>('Tap the outlined areas to explore.');
  const filtered = locations.filter(({ entry, source }) =>
    `${entryName(entry)} ${source.name} ${entry.origin ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const ranks = [...new Set(filtered.map(({ entry }) => entry.rank))].sort((a, b) => a - b);
  const selectedSpell = sheet?.kind === 'spell' ? sheet.location : undefined;
  const hasSpells = locations.length > 0;

  /** The prototype stops at the proposed action location; it never writes or spends resources. */
  function finishPreview(action: string): void {
    setFlowNote(`${action} previewed. No sample resources changed.`);
    setSheet(null);
  }

  /** Keep prepared duplicates and item copies separate even in the rough diagram. */
  function openSpell(location: SpellLocation): void {
    setSheet({ kind: 'spell', location });
  }

  /** A compact row keeps source identity alongside the spell instead of in a large header. */
  function renderRow(location: SpellLocation, canPin: boolean = false) {
    const { entry, source } = location;
    return (
      <Group key={entry.id} className='wire-row-wrap' gap={0} wrap='nowrap'>
        <UnstyledButton
          className='wire-spell-row'
          onClick={() => openSpell(location)}
          disabled={entry.missing}
          aria-label={`${entryName(entry)}, ${source.name}, ${remainingLabel(location)}`}
        >
          <Box className='wire-row-copy'>
            <Text size='sm'>{entryName(entry)}</Text>
            <Text size='xs' className='wire-muted'>
              {entry.origin ?? source.name} · {remainingLabel(location)}
            </Text>
          </Box>
          <Text size='xs' className='wire-muted' aria-hidden='true'>
            ›
          </Text>
        </UnstyledButton>
        {canPin && (
          <Button
            size='compact-xs'
            variant='subtle'
            color='gray'
            className='wire-pin'
            aria-label={`${pinned.includes(entry.id) ? 'Unpin' : 'Pin'} ${entryName(entry)} from ${source.name}`}
            onClick={() =>
              setPinned((previous) =>
                previous.includes(entry.id) ? previous.filter((id) => id !== entry.id) : [...previous, entry.id]
              )
            }
            disabled={entry.missing}
          >
            {pinned.includes(entry.id) ? 'Unpin' : 'Pin'}
          </Button>
        )}
      </Group>
    );
  }

  /** Resource cards expose pools; a prepared card exposes each actual slot directly. */
  function renderSource(source: SampleSource) {
    const sourceRanks = [...new Set(source.entries.map((entry) => entry.rank))].sort((a, b) => a - b);
    return (
      <Box key={source.id} className='wire-source-block'>
        <Text size='sm' fw={600} mb='xs'>
          {source.name}
        </Text>
        {isPrepared(source) ? (
          sourceRanks.map((rank) => (
            <Box key={rank} mb='sm'>
              <Text size='xs' className='wire-muted' mb={4}>
                {rank === 0 ? 'Cantrips' : `Rank ${rank} slots`}
              </Text>
              <Box className='wire-slot-grid'>
                {source.entries
                  .filter((entry) => entry.rank === rank)
                  .map((entry) => (
                    <UnstyledButton
                      key={entry.id}
                      className='wire-slot'
                      disabled={entry.missing}
                      onClick={() =>
                        entry.spell ? openSpell({ source, entry }) : setSheet({ kind: 'manage', source })
                      }
                    >
                      <Text size='xs'>{entry.spell || entry.missing ? entryName(entry) : '+ Prepare'}</Text>
                      <Text size='xs' className='wire-muted'>
                        {entry.missing ? 'Unavailable' : entry.used ? 'Used' : entry.spell ? 'Ready' : 'Empty slot'}
                      </Text>
                    </UnstyledButton>
                  ))}
              </Box>
            </Box>
          ))
        ) : source.kind === 'spontaneous' ? (
          sourceRanks.map((rank) => (
            <UnstyledButton
              key={rank}
              className='wire-resource'
              onClick={() => setSheet({ kind: 'pool', source, rank })}
            >
              <Text size='sm'>{rank === 0 ? 'Cantrips' : `Rank ${rank}`}</Text>
              <Text size='xs' className='wire-muted'>
                {rank === 0
                  ? 'Choose a spell ›'
                  : `${source.pools[`rank-${rank}`]?.remaining ?? 0} slots left · Choose ›`}
              </Text>
            </UnstyledButton>
          ))
        ) : (
          <UnstyledButton className='wire-resource' onClick={() => setSheet({ kind: 'pool', source })}>
            <Text size='sm'>{source.kind === 'ritual' ? 'Ritual collection' : 'Spells & uses'}</Text>
            <Text size='xs' className='wire-muted'>
              {Object.values(source.pools)
                .map((pool) => `${pool.remaining} / ${pool.max} ${pool.unit}`)
                .join(' · ') || 'Open list'}{' '}
              ›
            </Text>
          </UnstyledButton>
        )}
      </Box>
    );
  }

  return (
    <>
      <Box className='wire-phone' data-layout={layout}>
        <Box className='wire-existing'>Character header / sheet navigation</Box>
        <Group className='wire-title-row' justify='space-between' wrap='nowrap'>
          <Text fw={600}>{layout === 'quick' && showLibrary ? 'All spells' : 'Spells'}</Text>
          <Button color='gray' variant='subtle' size='compact-sm' onClick={() => setSheet({ kind: 'manage' })}>
            Manage
          </Button>
        </Group>

        {layout === 'list' || (layout === 'quick' && showLibrary) ? (
          <Box className='wire-search'>
            {showLibrary && (
              <Button
                color='gray'
                variant='subtle'
                size='compact-sm'
                mb='xs'
                onClick={() => {
                  setShowLibrary(false);
                  setQuery('');
                }}
              >
                ‹ Quick spells
              </Button>
            )}
            <TextInput
              aria-label='Search wireframe spells'
              placeholder='Search spells or sources'
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </Box>
        ) : null}

        <Box className='wire-content' role='region' aria-label='Spell layout content'>
          {!hasSpells && (
            <Text size='sm' className='wire-placeholder'>
              No spells yet. Manage opens the setup area.
            </Text>
          )}
          {(layout === 'list' || (layout === 'quick' && showLibrary)) && (
            <>
              {ranks.map((rank) => (
                <Box key={rank}>
                  <Text className='wire-rank'>{rank === 0 ? 'Cantrips' : `Rank ${rank}`}</Text>
                  {filtered
                    .filter(({ entry }) => entry.rank === rank)
                    .map((location) => renderRow(location, layout === 'quick'))}
                </Box>
              ))}
              {hasSpells && filtered.length === 0 && (
                <Text size='sm' className='wire-placeholder'>
                  No matching spells.
                </Text>
              )}
            </>
          )}
          {layout === 'resources' && scenario.sources.map(renderSource)}
          {layout === 'quick' && !showLibrary && (
            <>
              <Text className='wire-rank'>Pinned spells</Text>
              <Box className='wire-quick-grid'>
                {locations
                  .filter(({ entry }) => pinned.includes(entry.id))
                  .map((location) => (
                    <UnstyledButton
                      key={location.entry.id}
                      className='wire-quick-tile'
                      onClick={() => openSpell(location)}
                    >
                      <Text size='sm'>{entryName(location.entry)}</Text>
                      <Text size='xs' className='wire-muted'>
                        {location.entry.origin ?? location.source.name}
                      </Text>
                      <Text size='xs' className='wire-muted'>
                        {remainingLabel(location)}
                      </Text>
                    </UnstyledButton>
                  ))}
                <UnstyledButton className='wire-quick-tile wire-add' onClick={() => setShowLibrary(true)}>
                  <Text size='sm'>+ Choose pins</Text>
                </UnstyledButton>
              </Box>
              <Box className='wire-dashed wire-blank-area'>
                <Text size='xs' className='wire-muted'>
                  Room for your chosen spells
                </Text>
              </Box>
            </>
          )}
        </Box>

        <Group className='wire-bottom' grow gap='xs'>
          {layout === 'quick' && (
            <Button
              variant='default'
              onClick={() => {
                setShowLibrary(!showLibrary);
                setQuery('');
              }}
            >
              {showLibrary ? 'Quick spells' : 'All spells'}
            </Button>
          )}
          <Button variant='default' onClick={() => setSheet({ kind: 'resources' })}>
            Resources
          </Button>
        </Group>

        <Modal
          opened={sheet !== null}
          onClose={() => setSheet(null)}
          title={
            sheet?.kind === 'spell'
              ? entryName(sheet.location.entry)
              : sheet?.kind === 'pool'
                ? sheet.source.name
                : sheet?.kind === 'manage'
                  ? 'Manage spells'
                  : 'Resources'
          }
          withinPortal={false}
          lockScroll={false}
          transitionProps={{ duration: 0 }}
          className='wire-modal'
          data-sheet-kind={sheet?.kind}
          closeButtonProps={{ 'aria-label': 'Close wireframe panel' }}
        >
          {selectedSpell && (
            <Stack gap='md'>
              <Text size='xs' className='wire-muted'>
                {selectedSpell.entry.origin ?? selectedSpell.source.name} ·{' '}
                {selectedSpell.entry.rank === 0 ? 'Cantrip' : `Rank ${selectedSpell.entry.rank}`}
              </Text>
              <Box className='wire-dashed wire-detail-shape'>
                <Text size='sm'>Spell description</Text>
                <Box className='wire-text-line' />
                <Box className='wire-text-line' />
                <Box className='wire-text-line wire-short-line' />
              </Box>
              <Box className='wire-dashed' p='sm'>
                <Text size='xs'>Casting stats / rank choices</Text>
                <Text size='xs' className='wire-muted' mt={4}>
                  {selectedSpell.source.name} · {remainingLabel(selectedSpell)}
                </Text>
              </Box>
              {selectedSpell.source.kind !== 'ritual' && (
                <Button
                  variant='default'
                  fullWidth
                  onClick={() =>
                    finishPreview(`Cast ${entryName(selectedSpell.entry)} from ${selectedSpell.source.name}`)
                  }
                >
                  Cast
                </Button>
              )}
              {selectedSpell.source.kind === 'ritual' && (
                <Text size='xs' className='wire-muted'>
                  Ritual reference, without a spell-slot control.
                </Text>
              )}
            </Stack>
          )}
          {sheet?.kind === 'pool' && (
            <Stack gap='xs'>
              <Text size='xs' className='wire-muted'>
                Choose a spell for this source.
              </Text>
              {locations
                .filter(
                  ({ source, entry }) =>
                    source.id === sheet.source.id && (sheet.rank === undefined || entry.rank === sheet.rank)
                )
                .map((location) => renderRow(location))}
            </Stack>
          )}
          {sheet?.kind === 'resources' && (
            <Stack gap='sm'>
              {scenario.sources.map((source) => (
                <Box key={source.id} className='wire-dashed' p='sm'>
                  <Text size='sm'>{source.name}</Text>
                  <Text size='xs' className='wire-muted'>
                    {isPrepared(source)
                      ? 'Prepared slots and recovery controls'
                      : Object.values(source.pools)
                          .map((pool) => `${pool.remaining} / ${pool.max} ${pool.unit}`)
                          .join(' · ') || 'No shared pool'}
                  </Text>
                  <Text size='xs' className='wire-muted' mt='xs'>
                    [ Resource adjustment controls ]
                  </Text>
                </Box>
              ))}
              {!scenario.sources.length && <Text size='sm'>No spell resources.</Text>}
            </Stack>
          )}
          {sheet?.kind === 'manage' && (
            <Stack gap='sm'>
              {(sheet.source ? [sheet.source] : scenario.sources).map((source) => (
                <Box key={source.id} className='wire-dashed' p='sm'>
                  <Text size='sm'>{source.name}</Text>
                  <Text size='xs' className='wire-muted' mt='xs'>
                    {isPrepared(source)
                      ? 'Prepared slots / spell selection'
                      : source.kind === 'spontaneous'
                        ? 'Repertoire / learned ranks'
                        : source.kind === 'ritual'
                          ? 'Ritual collection'
                          : 'Source or item settings'}
                  </Text>
                  {source.kind === 'prepared-book' && (
                    <Text size='xs' className='wire-muted' mt='xs'>
                      Spellbook editing
                    </Text>
                  )}
                  <Box className='wire-text-line' />
                  <Box className='wire-text-line wire-short-line' />
                </Box>
              ))}
              {!scenario.sources.length && (
                <Box className='wire-dashed' p='md'>
                  Spell source setup
                </Box>
              )}
              <Button variant='default' onClick={() => finishPreview('Preparation or collection editing')}>
                Done
              </Button>
            </Stack>
          )}
        </Modal>
      </Box>
      <Text size='xs' className='wire-flow-note' role='status'>
        {flowNote}
      </Text>
    </>
  );
}
