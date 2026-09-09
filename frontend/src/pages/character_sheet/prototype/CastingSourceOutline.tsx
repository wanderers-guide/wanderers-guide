import { Box, Button, Group, Text, UnstyledButton } from '@mantine/core';
import {
  actionGlyph,
  actionLabel,
  entryName,
  isPrepared,
  sourceKindLabel,
  spellCatalog,
  type SampleEntry,
  type SampleSource,
} from './spell-study-data';
import { type CastingSourceOptions } from './casting-model-data';

/** Each kind places its resource beside the entity that owns it: preparation, rank, pool, or item. */
export function CastingSourceOutline({
  source,
  options,
  query,
  onSpell,
  onManage,
  onResource,
  finished = false,
}: {
  source: SampleSource;
  options: CastingSourceOptions;
  query: string;
  onSpell: (entry: SampleEntry) => void;
  onManage: () => void;
  onResource: (pool: string) => void;
  finished?: boolean;
}) {
  const matches = (entry: SampleEntry): boolean =>
    `${entryName(entry)} ${source.name} ${entry.origin ?? ''}`.toLowerCase().includes(query.toLowerCase());
  const visible = source.entries.filter(matches);
  const ranks = [...new Set(visible.map((entry) => entry.rank))].sort((a, b) => a - b);
  if (query && visible.length === 0) return null;

  /** Resource controls show remaining quantities explicitly, including on touch screens. */
  function counter(poolKey: string) {
    const pool = source.pools[poolKey];
    if (!pool) return null;
    return (
      <Button
        size='compact-xs'
        variant='subtle'
        color='gray'
        className='casting-counter'
        onClick={() => onResource(poolKey)}
        aria-label={`${source.name}: ${pool.remaining} of ${pool.max} ${pool.unit} remaining`}
      >
        {pool.remaining} / {pool.max} {pool.unit} left
      </Button>
    );
  }

  /** Availability stays on prepared/innate/item rows, while shared pools stay in their headers. */
  function row(entry: SampleEntry) {
    const spell = entry.spell ? spellCatalog[entry.spell] : undefined;
    const pool = entry.pool ? source.pools[entry.pool] : undefined;
    const isEmpty = !entry.spell && !entry.missing;
    let status: string | undefined;
    if (entry.missing) status = 'Unavailable';
    else if (isEmpty) status = options.restrictions?.[entry.id] ?? 'Empty slot';
    else if (isPrepared(source) && entry.rank > 0) status = entry.used ? 'Used' : 'Ready';
    else if (source.kind === 'staff')
      status = entry.rank === 0 ? 'Free' : `${entry.rank} ${entry.rank === 1 ? 'charge' : 'charges'}`;
    else if (source.kind === 'innate' || source.kind === 'spellheart')
      status = pool ? `${pool.remaining} / ${pool.max} left today` : 'At will';
    else if (source.kind === 'wand')
      status =
        options.wandState === 'broken'
          ? 'Broken'
          : options.wandState === 'destroyed'
            ? 'Destroyed'
            : options.wandState === 'overcharged'
              ? 'Overcharged today'
              : source.pools.uses.remaining
                ? 'Ready'
                : 'Used today';
    if (options.itemBroken) status = 'Broken';
    if (source.kind === 'spellheart' && options.affixedTo === null) status = 'Not affixed';
    return (
      <UnstyledButton
        key={entry.id}
        className='casting-spell-row'
        data-used={entry.used || undefined}
        onClick={() => (isEmpty ? onManage() : onSpell(entry))}
        disabled={entry.missing}
      >
        <Box className='wire-row-copy'>
          <Text size='sm'>
            {finished && source.kind === 'wand' ? source.name : isEmpty ? '+ Prepare spell' : entryName(entry)}
          </Text>
          {(entry.origin ||
            options.signatures?.includes(entry.id) ||
            ['wand', 'spellheart', 'innate', 'ritual'].includes(source.kind)) && (
            <Text size='xs' className='wire-muted'>
              {finished && source.kind === 'wand'
                ? `${entryName(entry)} · Rank ${entry.rank}`
                : (entry.origin ??
                  (options.signatures?.includes(entry.id)
                    ? 'Signature spell'
                    : entry.rank === 0
                      ? 'Cantrip'
                      : `Rank ${entry.rank}`))}
            </Text>
          )}
        </Box>
        <Box className='casting-row-tail'>
          {finished && spell && (
            <Text
              className={actionGlyph(spell.cast) ? 'sheet-actions' : ''}
              size='xs'
              aria-label={actionLabel(spell.cast)}
            >
              {actionGlyph(spell.cast) || actionLabel(spell.cast)}
            </Text>
          )}
          {(!finished || status) && (
            <Text className='casting-row-state' data-ready={status === 'Ready' || undefined} size='xs'>
              {status ?? '›'}
            </Text>
          )}
        </Box>
      </UnstyledButton>
    );
  }

  const managementLabel = isPrepared(source)
    ? 'Prepare'
    : source.kind === 'spontaneous'
      ? 'Repertoire'
      : source.kind === 'staff'
        ? 'Preparation'
        : ['wand', 'spellheart'].includes(source.kind)
          ? 'Item'
          : 'Manage';
  return (
    <Box className='casting-source' data-kind={source.kind}>
      {!(finished && source.kind === 'wand') && (
        <>
          <Group justify='space-between' gap='xs' wrap='nowrap' className='casting-source-heading'>
            <Box className='wire-row-copy'>
              <Text fw={600} size='sm'>
                {source.name}
              </Text>
              {!finished && !source.name.toLowerCase().includes(sourceKindLabel[source.kind].toLowerCase()) && (
                <Text size='xs' className='wire-muted'>
                  {sourceKindLabel[source.kind]}
                </Text>
              )}
            </Box>
            {finished && source.kind === 'focus'
              ? counter('focus')
              : (!finished || !['innate', 'ritual'].includes(source.kind)) && (
                  <Button variant='subtle' color='gray' size='compact-xs' onClick={onManage}>
                    {managementLabel}
                  </Button>
                )}
          </Group>
          {source.attack !== undefined && (
            <Text size='xs' className='wire-muted' mb='xs'>
              Attack +{source.attack} · DC {source.dc}
            </Text>
          )}
          {source.kind === 'focus' && !finished && (
            <Group justify='space-between' mb='xs'>
              <Text size='xs'>Focus points</Text>
              {counter('focus')}
            </Group>
          )}
          {source.kind === 'staff' && (
            <Group justify='space-between' mb='xs'>
              <Text size='xs'>{options.staffPrepared === false ? 'Not prepared today' : 'Prepared today'}</Text>
              {options.staffPrepared !== false && counter('charges')}
            </Group>
          )}
          {source.kind === 'spellheart' && (
            <Text size='xs' className='wire-muted' mb='xs'>
              {options.affixedTo === null ? 'Not affixed' : `Affixed to ${options.affixedTo ?? 'equipment'}`}
            </Text>
          )}
        </>
      )}
      {source.kind === 'wand' || source.kind === 'spellheart' || source.kind === 'innate' || source.kind === 'ritual'
        ? visible.map(row)
        : ranks.map((rank) => (
            <Box key={rank}>
              <Group justify='space-between' className='casting-rank' gap='xs'>
                <Text size='xs' className='wire-muted'>
                  {rank === 0 ? 'Cantrips' : source.kind === 'focus' ? 'Uses focus points' : `Rank ${rank}`}
                </Text>
                {source.kind === 'spontaneous' && rank > 0 && counter(`rank-${rank}`)}
              </Group>
              {visible.filter((entry) => entry.rank === rank && (!finished || entry.spell || entry.missing)).map(row)}
              {finished &&
                isPrepared(source) &&
                visible.some((entry) => entry.rank === rank && !entry.spell && !entry.missing) && (
                  <Button
                    variant='subtle'
                    color='gray'
                    size='compact-xs'
                    className='finished-empty-slot'
                    onClick={onManage}
                  >
                    {visible.filter((entry) => entry.rank === rank && !entry.spell && !entry.missing).length} unprepared
                    · Prepare
                  </Button>
                )}
            </Box>
          ))}
    </Box>
  );
}
