import { Box, Button, Group, Modal, NumberInput, Select, Stack, Tabs, Text } from '@mantine/core';
import { useState } from 'react';
import {
  actionLabel,
  entryName,
  entryResource,
  isPrepared,
  sourceKindLabel,
  spellCatalog,
  type SampleSource,
} from './spell-study-data';

export type SpellStudyDialogState =
  | { kind: 'spell'; sourceId: string; entryId: string }
  | { kind: 'manage'; sourceId: string }
  | { kind: 'resource'; sourceId: string; pool: string }
  | null;

/** Contained Mantine dialog previews casting, resource correction and mobile preparation without API calls. */
export function SpellStudyDialog({
  dialog,
  sources,
  onChange,
  onClose,
}: {
  dialog: SpellStudyDialogState;
  sources: SampleSource[];
  onChange: (sources: SampleSource[]) => void;
  onClose: () => void;
}) {
  const source = sources.find((item) => item.id === dialog?.sourceId);
  const entry = dialog?.kind === 'spell' ? source?.entries.find((item) => item.id === dialog.entryId) : undefined;
  const spell = entry?.spell ? spellCatalog[entry.spell] : undefined;
  const resource = source && entry ? entryResource(source, entry) : null;
  const pool = resource ? source?.pools[resource.key] : undefined;
  const canCast =
    !!source &&
    !!entry &&
    !!spell &&
    (!isPrepared(source) || !entry.used || entry.rank === 0) &&
    (!pool || pool.remaining >= (resource?.cost ?? 0));
  const updateSource = (next: SampleSource): void =>
    onChange(sources.map((item) => (item.id === next.id ? next : item)));
  const title =
    dialog?.kind === 'manage'
      ? `Manage ${source?.name ?? 'spells'}`
      : dialog?.kind === 'resource'
        ? 'Remaining resources'
        : entry
          ? entryName(entry)
          : '';
  return (
    <Modal
      opened={!!dialog}
      onClose={onClose}
      title={title}
      withinPortal={false}
      lockScroll={false}
      transitionProps={{ duration: 0 }}
      closeButtonProps={{ 'aria-label': 'Close spell dialog' }}
      className='spell-dialog'
      data-kind={dialog?.kind}
    >
      {source && dialog?.kind === 'manage' && (
        <SpellManagement key={source.id} source={source} onChange={updateSource} />
      )}
      {source && dialog?.kind === 'resource' && source.pools[dialog.pool] && (
        <Stack>
          <Text className='spell-secondary'>{source.name}</Text>
          <NumberInput
            label={`${source.pools[dialog.pool].unit} remaining`}
            value={source.pools[dialog.pool].remaining}
            min={0}
            max={source.pools[dialog.pool].max}
            allowDecimal={false}
            onChange={(value) =>
              updateSource({
                ...source,
                pools: {
                  ...source.pools,
                  [dialog.pool]: {
                    ...source.pools[dialog.pool],
                    remaining: Math.min(source.pools[dialog.pool].max, Math.max(0, Number(value) || 0)),
                  },
                },
              })
            }
          />
          <Text size='sm' className='spell-secondary'>
            Maximum {source.pools[dialog.pool].max}
          </Text>
          <Button className='spell-primary' onClick={onClose}>
            Done
          </Button>
        </Stack>
      )}
      {source && entry && spell && dialog?.kind === 'spell' && (
        <Stack gap='md'>
          <Text className='spell-secondary'>
            {entry.origin ?? source.name} · {entry.rank === 0 ? 'Cantrip' : `Rank ${entry.rank}`}
          </Text>
          <Group className='spell-facts' gap='md'>
            <Text size='sm'>{actionLabel(spell.cast)}</Text>
            {spell.range && <Text size='sm'>{spell.range}</Text>}
            {spell.defense && <Text size='sm'>{spell.defense}</Text>}
          </Group>
          <Text className='spell-prose'>{spell.description}</Text>
          {source.kind !== 'ritual' && (
            <Box className='spell-cast-footer'>
              {pool && (
                <Text size='sm' mb='sm'>
                  {pool.remaining} / {pool.max} {pool.unit} remaining
                </Text>
              )}
              {isPrepared(source) && entry.used && entry.rank > 0 ? (
                <Button
                  fullWidth
                  variant='light'
                  onClick={() => {
                    updateSource({
                      ...source,
                      entries: source.entries.map((item) => (item.id === entry.id ? { ...item, used: false } : item)),
                    });
                    onClose();
                  }}
                >
                  Recover preparation
                </Button>
              ) : (
                <Button
                  className='spell-primary'
                  fullWidth
                  disabled={!canCast}
                  onClick={() => {
                    let next = { ...source };
                    if (isPrepared(source) && entry.rank > 0)
                      next = {
                        ...next,
                        entries: next.entries.map((item) => (item.id === entry.id ? { ...item, used: true } : item)),
                      };
                    if (resource && pool)
                      next = {
                        ...next,
                        pools: {
                          ...next.pools,
                          [resource.key]: { ...pool, remaining: pool.remaining - resource.cost },
                        },
                      };
                    updateSource(next);
                    onClose();
                  }}
                >
                  {entry.rank === 0
                    ? 'Cast cantrip'
                    : resource && pool
                      ? `Cast · ${resource.cost} ${resource.cost === 1 ? pool.unit.replace(/s$/, '') : pool.unit}`
                      : 'Cast spell'}
                </Button>
              )}
              {!canCast && !isPrepared(source) && (
                <Text className='spell-secondary' size='xs' mt='sm'>
                  No {pool?.unit ?? 'uses'} remaining.
                </Text>
              )}
            </Box>
          )}
        </Stack>
      )}
    </Modal>
  );
}

/** Two full-width views replace the current half-width spellbook/preparation columns on phones. */
function SpellManagement({ source, onChange }: { source: SampleSource; onChange: (source: SampleSource) => void }) {
  const [tab, setTab] = useState<string | null>(isPrepared(source) ? 'prepare' : 'collection');
  const [addSpell, setAddSpell] = useState<string | null>(null);
  const hasBook = source.kind === 'prepared-book';
  const editable = isPrepared(source) || source.kind === 'spontaneous' || source.kind === 'ritual';
  const choices =
    source.kind === 'ritual'
      ? ['Resurrect']
      : [
          'Shield',
          'Light',
          'Guidance',
          'Charm',
          'Fear',
          'Befuddle',
          'Heal',
          'Bless',
          'Force Barrage',
          'Invisibility',
          'Fireball',
        ];
  if (!editable)
    return (
      <Stack>
        <Text className='spell-secondary'>{source.detail}</Text>
        <Text size='sm'>Manage this source through its character options or inventory.</Text>
      </Stack>
    );
  return (
    <Tabs value={tab} onChange={setTab}>
      {(hasBook || !isPrepared(source)) && (
        <Tabs.List mb='md'>
          {hasBook && <Tabs.Tab value='prepare'>Prepare</Tabs.Tab>}
          <Tabs.Tab value='collection'>{sourceKindLabel[source.kind]}</Tabs.Tab>
        </Tabs.List>
      )}
      <Tabs.Panel value='prepare'>
        <Text className='spell-secondary' size='sm' mb='md'>
          {hasBook ? 'Choose from your spellbook.' : 'Choose from your tradition.'}
        </Text>
        <Stack gap='md'>
          {source.entries.map((entry, index) => (
            <Box key={entry.id} className='spell-preparation'>
              <Select
                label={`${entry.rank === 0 ? 'Cantrip' : `Rank ${entry.rank}`} · Slot ${index + 1}`}
                aria-label={`Prepare slot ${index + 1}`}
                value={entry.spell}
                clearable
                clearButtonProps={{ 'aria-label': `Clear slot ${index + 1}` }}
                searchable
                placeholder='Choose a spell'
                comboboxProps={{ withinPortal: false }}
                data={source.known.filter((name) =>
                  entry.rank === 0
                    ? spellCatalog[name].rank === 0
                    : spellCatalog[name].rank > 0 && spellCatalog[name].rank <= entry.rank
                )}
                onChange={(spell) =>
                  onChange({
                    ...source,
                    entries: source.entries.map((item) =>
                      item.id === entry.id ? { ...item, spell, used: false, missing: false } : item
                    ),
                  })
                }
              />
              {entry.used && (
                <Text size='xs' className='spell-secondary' mt={4}>
                  Used
                </Text>
              )}
            </Box>
          ))}
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value='collection'>
        <Stack gap={0}>
          {source.known.map((name) => (
            <Group key={name} className='spell-collection-row' justify='space-between' wrap='nowrap'>
              <Text size='sm'>{name}</Text>
              <Text size='xs' className='spell-secondary'>
                {spellCatalog[name].rank === 0 ? 'Cantrip' : `Rank ${spellCatalog[name].rank}`}
              </Text>
            </Group>
          ))}
        </Stack>
        <Select
          label='Add spell'
          placeholder='Choose a spell'
          data={choices.filter((name) => !source.known.includes(name))}
          value={addSpell}
          searchable
          onChange={setAddSpell}
          comboboxProps={{ withinPortal: false }}
          mt='lg'
        />
        <Button
          mt='sm'
          variant='light'
          disabled={!addSpell}
          onClick={() => {
            if (!addSpell) return;
            onChange({
              ...source,
              known: [...source.known, addSpell],
              entries: hasBook
                ? source.entries
                : [
                    ...source.entries,
                    {
                      id: `${source.id}-added-${source.entries.length}`,
                      spell: addSpell,
                      rank: spellCatalog[addSpell].rank,
                    },
                  ],
            });
            setAddSpell(null);
          }}
        >
          Add to {hasBook ? 'spellbook' : source.kind === 'ritual' ? 'rituals' : 'repertoire'}
        </Button>
      </Tabs.Panel>
    </Tabs>
  );
}
