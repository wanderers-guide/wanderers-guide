import { Anchor, Box, Button, Group, Modal, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

import { extractBuildId } from './fetch-pathbuilder-share';
import type { PathbuilderInteractiveImportResult } from './import-from-pathbuilder';
import type {
  PathbuilderPreflightSnapshot,
  PathbuilderSelectionPreflightOutcome,
  PathbuilderSelectionPrompt,
} from './pathbuilder-share-importer';

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatTargetName(name: string): string {
  const known: Record<string, string> = {
    classDC: 'Class DC',
    acrobatics: 'Acrobatics',
    athletics: 'Athletics',
  };
  return known[name] ?? name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase());
}

function formatAttributeName(name: string): string {
  const names: Record<string, string> = {
    speed: 'Speed',
    speedBonus: 'Speed bonus',
    ancestryhp: 'Ancestry HP',
    classhp: 'Class HP',
    bonushp: 'Bonus HP',
    bonushpPerLevel: 'Bonus HP/level',
  };
  return names[name] ?? name;
}

export default function PathbuilderInputModal(props: {
  open: boolean;
  loading?: boolean;
  onConfirm: (
    pathbuilderInput: string,
    jsonExportId: string,
    selectionOverrides: Record<string, string>
  ) => Promise<PathbuilderInteractiveImportResult>;
  onPreview: (
    pathbuilderInput: string,
    jsonExportId: string,
    selectionOverrides: Record<string, string>
  ) => Promise<PathbuilderSelectionPreflightOutcome>;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [jsonExportId, setJsonExportId] = useState('');
  const [manualSelections, setManualSelections] = useState<Record<string, string>>({});
  const [selectionPrompt, setSelectionPrompt] = useState<PathbuilderSelectionPrompt | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectionSnapshot, setSelectionSnapshot] = useState<PathbuilderPreflightSnapshot | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<PathbuilderPreflightSnapshot | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestId = useRef(0);
  const buildId = extractBuildId(input);
  const validExportId = /^\d{1,12}$/.test(jsonExportId.trim());
  const selectedOption = selectionPrompt?.options.find((option) => option.value === selectedChoice);
  const displayedSnapshot = previewSnapshot ?? selectionSnapshot;

  useEffect(() => {
    if (!props.open) {
      setInput('');
      setJsonExportId('');
      setManualSelections({});
      setSelectionPrompt(null);
      setSelectedChoice(null);
      setSelectionSnapshot(null);
      setPreviewSnapshot(null);
      setPreviewLoading(false);
      setPreviewError(null);
      previewRequestId.current++;
    }
  }, [props.open]);

  const close = () => {
    if (props.loading) return;
    setInput('');
    setJsonExportId('');
    setManualSelections({});
    setSelectionPrompt(null);
    setSelectedChoice(null);
    setSelectionSnapshot(null);
    setPreviewSnapshot(null);
    setPreviewLoading(false);
    setPreviewError(null);
    previewRequestId.current++;
    props.onClose();
  };

  const confirm = async () => {
    if (!buildId || !validExportId) return;

    const answers = { ...manualSelections };
    if (selectionPrompt) {
      if (!selectedChoice || !selectionPrompt.options.some((option) => option.value === selectedChoice)) return;
      answers[selectionPrompt.key] = selectedChoice;
    }

    const result = await props.onConfirm(input.trim(), jsonExportId.trim(), answers);
    setManualSelections(answers);

    if (result.status === 'selection-required') {
      setSelectionPrompt(result.selection);
      setSelectionSnapshot(result.snapshot);
      setPreviewSnapshot(null);
      setPreviewError(null);
      const previousChoice = answers[result.selection.key];
      setSelectedChoice(
        previousChoice && result.selection.options.some((option) => option.value === previousChoice)
          ? previousChoice
          : null
      );
      return;
    }

    if (result.status === 'failed') {
      setSelectionPrompt(null);
      setSelectedChoice(null);
      setSelectionSnapshot(null);
      setPreviewSnapshot(null);
    }
  };

  const changeChoice = (value: string | null) => {
    setSelectedChoice(value);
    setPreviewSnapshot(null);
    setPreviewError(null);
    const requestId = ++previewRequestId.current;

    if (!value || !selectionPrompt || !buildId || !validExportId) {
      setPreviewLoading(false);
      return;
    }

    const answers = { ...manualSelections, [selectionPrompt.key]: value };
    setPreviewLoading(true);
    void props
      .onPreview(input.trim(), jsonExportId.trim(), answers)
      .then((result) => {
        if (requestId !== previewRequestId.current) return;
        if (result.status === 'error') {
          setPreviewError(result.error);
          return;
        }
        setPreviewSnapshot(result.snapshot);
      })
      .catch((error) => {
        if (requestId !== previewRequestId.current) return;
        setPreviewError(error instanceof Error ? error.message : 'Could not calculate this choice preview.');
      })
      .finally(() => {
        if (requestId === previewRequestId.current) setPreviewLoading(false);
      });
  };

  return (
    <Modal
      opened={props.open}
      onClose={close}
      title={<Title order={3}>Import from Pathbuilder 2e</Title>}
      zIndex={1000}
    >
      <Stack style={{ position: 'relative' }} gap={16}>
        <TextInput
          label='Pathbuilder share ID or link'
          placeholder='123456 or https://pathbuilder2e.com/launch.html?build=123456'
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          disabled={props.loading || Boolean(selectionPrompt)}
          error={input.trim() && !buildId ? 'Could not find a numeric share ID in that link' : undefined}
          description={buildId && input.trim() !== buildId ? `Share ID: ${buildId}` : undefined}
        />
        <TextInput
          label='Official JSON export ID'
          placeholder='The number shown after Export → Export JSON'
          value={jsonExportId}
          onChange={(event) => setJsonExportId(event.currentTarget.value)}
          disabled={props.loading || Boolean(selectionPrompt)}
          error={jsonExportId.trim() && !validExportId ? 'Enter the numeric export ID' : undefined}
        />
        {!selectionPrompt && (
          <>
            <Text fz='sm'>
              Open the same character in Pathbuilder, choose Export → Export JSON, and copy the numeric ID it generates.
              Enter that ID alongside the share ID. They are different identifiers.
            </Text>
            <Text fz='sm'>
              WG checks all required operation choices before creating the character. If a choice is missing from the
              shared build, it will ask you to select a valid option first.
            </Text>
            <Text fz='sm'>
              <Anchor href='https://www.pathbuilder2e.com/beta/app.html' target='_blank' rel='noreferrer'>
                Open Pathbuilder 2e
              </Anchor>
              {' · '}
              <Anchor
                href='https://github.com/EvelynLimaB/wanderers-guide/blob/feature/pathbuilder-1to1-import/docs/pathbuilder-browser-export-bridge.md'
                target='_blank'
                rel='noreferrer'
              >
                Import instructions
              </Anchor>
            </Text>
          </>
        )}
        {selectionPrompt && (
          <Stack gap={8}>
            <Text fw={700}>Required choice missing: {selectionPrompt.title}</Text>
            <Text size='sm'>
              Character level {selectionPrompt.level}. Choose an option to continue the pre-import checks. The character
              will not be created until all required choices have been resolved.
            </Text>
            {selectionPrompt.options.length > 0 ? (
              <>
                <Select
                  label='Choose an option'
                  placeholder='Select an option'
                  searchable
                  clearable
                  data={selectionPrompt.options.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={selectedChoice}
                  onChange={changeChoice}
                  disabled={props.loading || previewLoading}
                  // The parent Modal uses z-index 1000; keep the portaled dropdown above it.
                  comboboxProps={{ zIndex: 1001 }}
                />
                {selectedOption?.description && <Text size='sm'>{selectedOption.description}</Text>}
                {displayedSnapshot && (
                  <Box
                    p='sm'
                    style={{
                      border: '1px solid var(--mantine-color-dark-4)',
                      borderRadius: 'var(--mantine-radius-md)',
                      background: 'rgba(0, 0, 0, 0.14)',
                    }}
                  >
                    <Stack gap={7}>
                      <Text fw={700}>Live stat preview</Text>
                      {displayedSnapshot.target?.name || displayedSnapshot.target?.level !== undefined ? (
                        <Text size='sm' fw={600}>
                          Official JSON: {displayedSnapshot.target?.name ?? 'Unnamed character'}
                          {displayedSnapshot.target?.level !== undefined
                            ? ` · Level ${displayedSnapshot.target?.level}`
                            : ''}
                        </Text>
                      ) : null}
                      <Text size='xs' c='dimmed'>
                        Official Pathbuilder JSON targets compared with the Wanderer’s Guide calculation for the
                        currently selected option. This preview does not save a character.
                      </Text>
                      {previewLoading && <Text size='xs'>Recalculating preview…</Text>}
                      {previewError && <Text size='xs' c='red'>Preview unavailable: {previewError}</Text>}
                      <Group grow align='flex-start' gap='md'>
                        <Stack gap={2}>
                          <Text size='xs' c='dimmed'>Target AC · Pathbuilder</Text>
                          <Title order={3}>{displayedSnapshot.target?.ac?.total ?? '—'}</Title>
                          {displayedSnapshot.target?.ac && (
                            <Text size='xs' c='dimmed'>
                              {[
                                displayedSnapshot.target.ac.proficiency !== undefined
                                  ? `Prof ${formatSigned(displayedSnapshot.target.ac.proficiency)}`
                                  : null,
                                displayedSnapshot.target.ac.ability !== undefined
                                  ? `Ability ${formatSigned(displayedSnapshot.target.ac.ability)}`
                                  : null,
                                displayedSnapshot.target.ac.item !== undefined
                                  ? `Item ${formatSigned(displayedSnapshot.target.ac.item)}`
                                  : null,
                                displayedSnapshot.target.ac.shield !== undefined &&
                                displayedSnapshot.target.ac.shield !== null
                                  ? `Shield ${formatSigned(Number(displayedSnapshot.target.ac.shield))}`
                                  : null,
                              ].filter(Boolean).join(' · ')}
                            </Text>
                          )}
                        </Stack>
                        <Stack gap={2}>
                          <Text size='xs' c='dimmed'>Projected AC · Wanderer’s Guide</Text>
                          <Title order={3}>{displayedSnapshot.current.acTotal ?? '—'}</Title>
                          {displayedSnapshot.target?.ac?.total !== undefined &&
                            displayedSnapshot.current.acTotal !== null && (
                              <Text
                                size='xs'
                                c={displayedSnapshot.current.acTotal === displayedSnapshot.target.ac.total ? 'green' : 'orange'}
                              >
                                {displayedSnapshot.current.acTotal === displayedSnapshot.target.ac.total
                                  ? 'Matches target'
                                  : `${formatSigned(displayedSnapshot.current.acTotal - displayedSnapshot.target.ac.total)} vs target`}
                              </Text>
                            )}
                        </Stack>
                      </Group>
                      {displayedSnapshot.target?.ac?.total !== undefined &&
                        displayedSnapshot.current.acTotal !== null &&
                        displayedSnapshot.current.acTotal !== displayedSnapshot.target.ac.total && (
                          <Text size='xs' c='orange'>
                            AC mismatch: Pathbuilder JSON reports {displayedSnapshot.target.ac.total}; Wanderer’s Guide
                            calculates {displayedSnapshot.current.acTotal} (difference{' '}
                            {formatSigned(displayedSnapshot.current.acTotal - displayedSnapshot.target.ac.total)}).
                            A mismatch blocks character creation. Check the equipped armor, proficiency, Dexterity,
                            potency, and other item bonuses in Pathbuilder before continuing.
                          </Text>
                        )}
                      {displayedSnapshot.target?.abilities.length ? (
                        <Stack gap={4}>
                          <Text size='xs' fw={600} c='dimmed'>Ability targets vs current modifiers</Text>
                          <Group gap={6} wrap='wrap'>
                            {displayedSnapshot.target.abilities.map((ability) => {
                              const current = displayedSnapshot.current.abilities.find((item) => item.key === ability.key);
                              const matches = current?.modifier === ability.modifier;
                              return (
                                <Box
                                  key={ability.key}
                                  px={8}
                                  py={5}
                                  style={{
                                    border: '1px solid var(--mantine-color-dark-4)',
                                    borderRadius: 'var(--mantine-radius-sm)',
                                    minWidth: 88,
                                  }}
                                >
                                  <Text size='xs' fw={700}>{ability.label}</Text>
                                  <Text size='xs'>Target {ability.score} ({formatSigned(ability.modifier)})</Text>
                                  <Text size='xs' c={current ? (matches ? 'green' : 'orange') : 'dimmed'}>
                                    WG {current ? formatSigned(current.modifier) : '—'}
                                  </Text>
                                </Box>
                              );
                            })}
                          </Group>
                        </Stack>
                      ) : null}
                      {displayedSnapshot.target?.armor.length ? (
                        <Stack gap={2}>
                          <Text size='xs' fw={600} c='dimmed'>Armor and rune targets</Text>
                          {displayedSnapshot.target.armor.map((armor, index) => (
                            <Text size='xs' key={`${armor.name}-${index}`}>
                              {armor.display || armor.name}
                              {armor.worn === true ? ' · worn' : ''}
                              {armor.proficiency ? ` · ${armor.proficiency}` : ''}
                              {armor.potency ? ` · potency +${armor.potency}` : ''}
                              {armor.resilience ? ` · ${armor.resilience}` : ''}
                              {armor.runes.length ? ` · ${armor.runes.join(', ')}` : ''}
                            </Text>
                          ))}
                        </Stack>
                      ) : null}
                      {displayedSnapshot.target?.proficiencies.length ? (
                        <Stack gap={2}>
                          <Text size='xs' c='dimmed'>
                            Key proficiency targets:{' '}
                            {displayedSnapshot.target.proficiencies
                              .filter((entry) =>
                                ['perception', 'fortitude', 'reflex', 'will', 'classDC', 'light', 'medium', 'heavy', 'unarmored', 'simple', 'martial', 'advanced'].includes(entry.name)
                              )
                              .map((entry) => `${formatTargetName(entry.name)} ${entry.rank}`)
                              .join(' · ') || 'not present in export'}
                          </Text>
                          <details>
                            <summary style={{ cursor: 'pointer', fontSize: 'var(--mantine-font-size-xs)' }}>
                              All proficiency targets from JSON
                            </summary>
                            <Text size='xs' mt={4}>
                              {displayedSnapshot.target.proficiencies
                                .map((entry) => `${formatTargetName(entry.name)}: ${entry.rank}`)
                                .join(' · ')}
                            </Text>
                          </details>
                        </Stack>
                      ) : null}
                      {displayedSnapshot.target?.attributes.some((entry) =>
                        ['speed', 'speedBonus', 'ancestryhp', 'classhp', 'bonushp', 'bonushpPerLevel'].includes(entry.name)
                      ) ? (
                        <Text size='xs' c='dimmed'>
                          Other Pathbuilder targets: {displayedSnapshot.target.attributes
                            .filter((entry) => ['speed', 'speedBonus', 'ancestryhp', 'classhp', 'bonushp', 'bonushpPerLevel'].includes(entry.name))
                            .map((entry) => `${formatAttributeName(entry.name)} ${entry.value}`)
                            .join(' · ')}
                        </Text>
                      ) : null}
                      {displayedSnapshot.target?.resistances.length ? (
                        <Text size='xs' c='dimmed'>
                          Resistances: {displayedSnapshot.target.resistances.join(' · ')}
                        </Text>
                      ) : null}
                    </Stack>
                  </Box>
                )}
              </>
            ) : (
              <Text c='red' size='sm'>
                Wanderer’s Guide returned no eligible options for this required choice, and no compatible fallback
                choices were found in the loaded content. Import is blocked until the relevant content options are
                available; no value will be guessed.
              </Text>
            )}
          </Stack>
        )}
        <Group justify='flex-end' wrap='wrap'>
          <Button variant='default' disabled={props.loading} onClick={close}>
            Cancel
          </Button>
          <Button
            loading={props.loading}
            disabled={
              !buildId ||
              !validExportId ||
              Boolean(selectionPrompt && (!selectionPrompt.options.length || !selectedChoice)) ||
              previewLoading
            }
            onClick={() => void confirm()}
          >
            {selectionPrompt ? 'Confirm choice and continue' : 'Check choices and import'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
