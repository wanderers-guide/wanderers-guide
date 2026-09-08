import { Box, Button, Group, Modal, NumberInput, Radio, Select, Stack, Tabs, Text } from '@mantine/core';
import { useState } from 'react';
import { entryName, isPrepared, spellCatalog, type SampleSource, type SpellScenario } from './spell-study-data';
import { type CastingSourceOptions } from './casting-model-data';
import { type WireframeSheet } from './SpellWireframePhone';

/** The model-specific dialogs illustrate resource choices and preparation without simulating saves. */
export function CastingModelDialog({
  sheet,
  scenario,
  options,
  onClose,
  onChange,
  onFinish,
}: {
  sheet: WireframeSheet;
  scenario: SpellScenario;
  options: Record<string, CastingSourceOptions>;
  onClose: () => void;
  onChange: (sheet: WireframeSheet) => void;
  onFinish: (action: string) => void;
}) {
  const source =
    sheet?.kind === 'spell' ? sheet.location.source : sheet && 'source' in sheet ? sheet.source : undefined;
  const entry = sheet?.kind === 'spell' ? sheet.location.entry : undefined;
  const settings = source ? (options[source.id] ?? {}) : {};
  const [payment, setPayment] = useState<string>('charges');
  const [slot, setSlot] = useState<string | null>(null);
  const [rank, setRank] = useState<string | null>(entry ? String(entry.rank) : null);
  const [wandStep, setWandStep] = useState<'detail' | 'confirm' | 'outcome'>('detail');
  const [tab, setTab] = useState<string | null>('prepare');
  const [draftSlots, setDraftSlots] = useState<Record<string, string | null>>({});
  const poolKey = sheet?.kind === 'resource' ? sheet.pool : entry?.pool;
  const pool = source && poolKey ? source.pools[poolKey] : undefined;
  const selectedRank = Number(rank ?? entry?.rank ?? 0);
  const signature = !!entry && settings.signatures?.includes(entry.id);
  const eligibleSlots = (settings.slotChoices ?? []).filter((choice) => choice.rank >= (entry?.rank ?? 0));
  const title = entry
    ? entryName(entry)
    : sheet?.kind === 'resource'
      ? 'Adjust remaining uses'
      : sheet?.kind === 'manage'
        ? source
          ? isPrepared(source)
            ? `Prepare ${source.name}`
            : source.kind === 'staff'
              ? 'Staff preparation'
              : source.name
          : 'Manage spells'
        : 'Resources';

  /** Simple availability gates keep the diagram from implying that broken or empty items can cast. */
  function unavailableReason(): string | null {
    if (!entry || !source) return null;
    if (settings.itemBroken) return 'Item is broken';
    if (source.kind === 'spellheart' && settings.affixedTo === null) return 'Affix this spellheart first';
    if (source.kind === 'staff' && settings.staffPrepared === false) return 'Prepare this staff first';
    if (source.kind === 'wand') {
      if (settings.wandState === 'broken') return 'Wand is broken';
      if (settings.wandState === 'destroyed') return 'Wand is destroyed';
      if (settings.wandState === 'overcharged') return 'Already overcharged today';
    }
    if (entry.rank === 0) return null;
    if (source.kind === 'staff') {
      const cost = payment === 'slot' ? 1 : entry.rank;
      if (source.pools.charges.remaining < cost) return 'Not enough charges';
      if (payment === 'slot' && !slot) return 'Choose a spell slot';
    }
    if (source.kind === 'spontaneous' && !source.pools[`rank-${selectedRank}`]?.remaining)
      return 'No slots left at this rank';
    if (source.kind === 'focus' && !source.pools.focus.remaining) return 'No focus points left';
    if (pool && !pool.remaining) return 'No uses left today';
    return null;
  }

  /** Prepared entries retain unique slot IDs while the selection control remains a local draft. */
  function preparationEditor(preparedSource: SampleSource) {
    return (
      <Stack gap='sm'>
        {preparedSource.entries.map((preparedEntry, index) => (
          <Select
            key={preparedEntry.id}
            label={`${preparedEntry.rank === 0 ? 'Cantrip' : `Rank ${preparedEntry.rank}`} · Slot ${preparedSource.entries.slice(0, index + 1).filter((item) => item.rank === preparedEntry.rank).length}`}
            description={settings.restrictions?.[preparedEntry.id]}
            placeholder={preparedEntry.missing ? 'Missing spell reference' : 'Choose a spell'}
            value={preparedEntry.id in draftSlots ? draftSlots[preparedEntry.id] : preparedEntry.spell}
            onChange={(value) => setDraftSlots((previous) => ({ ...previous, [preparedEntry.id]: value }))}
            data={preparedSource.known.filter((name) =>
              preparedEntry.rank === 0
                ? spellCatalog[name]?.rank === 0
                : spellCatalog[name]?.rank > 0 && spellCatalog[name]?.rank <= preparedEntry.rank
            )}
            searchable
            clearable
            clearButtonProps={{ 'aria-label': `Clear preparation ${index + 1}` }}
            comboboxProps={{ withinPortal: false }}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Modal
      opened={sheet !== null}
      onClose={onClose}
      title={title}
      withinPortal={false}
      lockScroll={false}
      transitionProps={{ duration: 0 }}
      className='wire-modal'
      data-sheet-kind={sheet?.kind}
      closeButtonProps={{ 'aria-label': 'Close casting preview' }}
    >
      {source && entry && (
        <Stack gap='sm'>
          <Text size='xs' className='wire-muted'>
            {entry.origin ?? source.name} ·{' '}
            {entry.rank === 0 ? 'Cantrip' : `Rank ${source.kind === 'spontaneous' ? selectedRank : entry.rank}`}
          </Text>
          <Box className='wire-dashed wire-detail-shape'>
            <Text size='sm'>Spell description</Text>
            <Box className='wire-text-line' />
            <Box className='wire-text-line wire-short-line' />
          </Box>
          {source.attack !== undefined && (
            <Text size='xs'>
              Attack +{source.attack} · DC {source.dc}
            </Text>
          )}
          {source.kind === 'focus' && (
            <Box className='wire-dashed' p='xs'>
              <Text size='xs'>Casting stats for {entry.origin}</Text>
            </Box>
          )}
          {source.kind === 'ritual' ? (
            <Box className='wire-dashed' p='sm'>
              <Text size='sm'>Ritual requirements</Text>
              <Text size='xs' className='wire-muted' mt='xs'>
                Casting time · cost · primary check · secondary casters
              </Text>
            </Box>
          ) : (
            <>
              {source.kind === 'spontaneous' && entry.rank > 0 && (
                <>
                  {signature && (
                    <Select
                      label='Cast at rank'
                      value={rank}
                      onChange={setRank}
                      allowDeselect={false}
                      data={Object.entries(source.pools)
                        .filter(([key]) => key.startsWith('rank-'))
                        .map(([key, value]) => ({
                          value: key.slice(5),
                          label: `Rank ${key.slice(5)} · ${value.remaining} slots left`,
                        }))}
                      comboboxProps={{ withinPortal: false }}
                    />
                  )}
                  <Text size='sm'>
                    Uses 1 {source.name} rank {selectedRank} slot.
                  </Text>
                </>
              )}
              {isPrepared(source) && entry.rank > 0 && (
                <Text size='sm'>{entry.used ? 'This preparation has been used.' : 'Uses this preparation only.'}</Text>
              )}
              {source.kind === 'focus' && (
                <Text size='sm'>
                  {entry.rank === 0
                    ? 'No focus points needed.'
                    : `Uses 1 focus point · ${source.pools.focus.remaining} left`}
                </Text>
              )}
              {source.kind === 'staff' && entry.rank > 0 && (
                <>
                  <Text size='sm'>{source.pools.charges.remaining} charges left</Text>
                  {settings.staffCaster === 'spontaneous' || settings.staffCaster === 'both' ? (
                    <>
                      <Radio.Group label='Pay with' value={payment} onChange={setPayment}>
                        <Stack gap='xs' mt='xs'>
                          <Radio value='charges' label={`${entry.rank} ${entry.rank === 1 ? 'charge' : 'charges'}`} />
                          <Radio value='slot' label='1 charge + a spell slot' disabled={!eligibleSlots.length} />
                        </Stack>
                      </Radio.Group>
                      {payment === 'slot' && (
                        <Select
                          label='Spell slot'
                          placeholder='Choose source and rank'
                          value={slot}
                          onChange={setSlot}
                          data={eligibleSlots.map(({ value, label }) => ({ value, label }))}
                          comboboxProps={{ withinPortal: false }}
                        />
                      )}
                    </>
                  ) : (
                    <Text size='sm'>
                      Uses {entry.rank} {entry.rank === 1 ? 'charge' : 'charges'}.
                    </Text>
                  )}
                </>
              )}
              {source.kind === 'staff' && entry.rank === 0 && <Text size='sm'>No charges needed.</Text>}
              {(source.kind === 'innate' || source.kind === 'spellheart') && (
                <Text size='sm'>{pool ? `${pool.remaining} / ${pool.max} uses left today` : 'At will'}</Text>
              )}
              {source.kind === 'spellheart' && (
                <Box className='wire-dashed' p='xs'>
                  <Text size='xs'>
                    {entry.rank === 0
                      ? 'Cantrip: item stats or higher personal stats'
                      : 'Casting stats for this item activation'}
                  </Text>
                </Box>
              )}
              {source.kind === 'wand' && (
                <Text size='sm'>
                  {source.pools.uses.remaining ? '1 use left today. No spell slot needed.' : 'Daily use spent.'}
                </Text>
              )}
              {source.kind === 'wand' && !source.pools.uses.remaining && !unavailableReason() ? (
                <>
                  {wandStep === 'detail' && (
                    <Button variant='default' onClick={() => setWandStep('confirm')}>
                      Overcharge
                    </Button>
                  )}
                  {wandStep === 'confirm' && (
                    <Stack gap='sm'>
                      <Text size='sm'>
                        Cast again, then make a DC 10 flat check. Success breaks the wand; failure destroys it.
                      </Text>
                      <Button variant='default' onClick={() => setWandStep('outcome')}>
                        Cast and resolve overcharge
                      </Button>
                      <Button variant='subtle' color='gray' onClick={() => setWandStep('detail')}>
                        Cancel
                      </Button>
                    </Stack>
                  )}
                  {wandStep === 'outcome' && (
                    <Stack gap='xs'>
                      <Text size='sm'>Flat check outcome</Text>
                      <Button variant='default' onClick={() => onFinish('Overcharge succeeded; wand becomes broken')}>
                        Success: broken
                      </Button>
                      <Button variant='default' onClick={() => onFinish('Overcharge failed; wand is destroyed')}>
                        Failure: destroyed
                      </Button>
                    </Stack>
                  )}
                </>
              ) : (
                <Button
                  variant='default'
                  disabled={!!unavailableReason()}
                  onClick={() =>
                    onFinish(
                      isPrepared(source) && entry.used
                        ? `Recover preparation: ${entryName(entry)}`
                        : `Cast ${entryName(entry)} from ${source.name}`
                    )
                  }
                >
                  {unavailableReason() ?? (isPrepared(source) && entry.used ? 'Recover preparation' : 'Cast')}
                </Button>
              )}
            </>
          )}
        </Stack>
      )}

      {sheet?.kind === 'resource' && source && pool && (
        <Stack>
          <Text size='sm'>{source.name}</Text>
          <NumberInput
            label={`${pool.unit} remaining`}
            defaultValue={pool.remaining}
            min={0}
            max={pool.max}
            allowDecimal={false}
          />
          <Button variant='default' onClick={() => onFinish(`Resource adjustment for ${source.name}`)}>
            Done
          </Button>
        </Stack>
      )}

      {sheet?.kind === 'manage' && source && (
        <Stack gap='md'>
          {isPrepared(source) &&
            (source.kind === 'prepared-book' ? (
              <Tabs value={tab} onChange={setTab} color='gray'>
                <Tabs.List grow>
                  <Tabs.Tab value='prepare'>Prepare</Tabs.Tab>
                  <Tabs.Tab value='book'>Spellbook</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value='prepare' pt='sm'>
                  {preparationEditor(source)}
                </Tabs.Panel>
                <Tabs.Panel value='book' pt='sm'>
                  <Stack gap='xs'>
                    {source.known.map((name) => (
                      <Text key={name} size='sm'>
                        {name}
                      </Text>
                    ))}
                    <Box className='wire-dashed' p='sm'>
                      Learn or remove spells
                    </Box>
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            ) : (
              preparationEditor(source)
            ))}
          {source.kind === 'spontaneous' && (
            <Stack gap='sm'>
              {source.entries.map((knownEntry) => (
                <Group key={knownEntry.id} justify='space-between'>
                  <Text size='sm'>{entryName(knownEntry)}</Text>
                  <Text size='xs' className='wire-muted'>
                    {settings.signatures?.includes(knownEntry.id)
                      ? 'Signature'
                      : knownEntry.rank === 0
                        ? 'Cantrip'
                        : `Rank ${knownEntry.rank}`}
                  </Text>
                </Group>
              ))}
              <Box className='wire-dashed' p='sm'>
                Add spells / select signature spells
              </Box>
            </Stack>
          )}
          {source.kind === 'staff' && (
            <>
              <Text size='sm'>
                {settings.staffPrepared === false
                  ? 'Prepare this staff for today.'
                  : 'This staff is prepared for today.'}
              </Text>
              <Box className='wire-dashed' p='sm'>
                Base charges from highest spell-slot rank
              </Box>
              {(settings.staffCaster === 'prepared' || settings.staffCaster === 'both') && (
                <Select
                  label='Optional extra charges during preparation'
                  placeholder='Keep all spell slots'
                  data={['Wizard · Rank 2 · Slot 1', 'Wizard · Rank 1 · Slot 2']}
                  value={slot}
                  onChange={setSlot}
                  clearable
                  disabled={settings.staffPrepared !== false}
                  clearButtonProps={{ 'aria-label': 'Keep the extra spell slot' }}
                  comboboxProps={{ withinPortal: false }}
                  description='Expend one eligible slot. Gain charges equal to its rank.'
                />
              )}
              <Text size='xs' className='wire-muted'>
                One staff per day. Repreparing replaces stored charges.
              </Text>
            </>
          )}
          {source.kind === 'spellheart' && (
            <>
              <Text size='sm'>Affixed to: {settings.affixedTo ?? 'not affixed'}</Text>
              <Box className='wire-dashed' p='sm'>
                Equipment attachment / passive benefits
              </Box>
              <Text size='xs' className='wire-muted'>
                Each activation keeps its own frequency.
              </Text>
            </>
          )}
          {source.kind === 'wand' && (
            <>
              <Text size='sm'>
                {source.name} · {settings.wandState ?? 'Ready'}
              </Text>
              <Box className='wire-dashed' p='sm'>
                Item description / specialty effects / condition
              </Box>
              <Text size='xs' className='wire-muted'>
                Repair and daily use are separate.
              </Text>
            </>
          )}
          {['focus', 'innate', 'ritual'].includes(source.kind) && (
            <Box className='wire-dashed' p='md'>
              Collection / source settings
            </Box>
          )}
          <Button variant='default' onClick={() => onFinish(`Manage ${source.name}`)}>
            Done
          </Button>
        </Stack>
      )}
      {(sheet?.kind === 'resources' || (sheet?.kind === 'manage' && !source)) && (
        <Stack gap='xs'>
          {scenario.sources.map((item) => (
            <Button key={item.id} variant='default' onClick={() => onChange({ kind: 'manage', source: item })}>
              {item.name}
            </Button>
          ))}
          {!scenario.sources.length && (
            <Box className='wire-dashed' p='md'>
              Spell source setup
            </Box>
          )}
        </Stack>
      )}
    </Modal>
  );
}
