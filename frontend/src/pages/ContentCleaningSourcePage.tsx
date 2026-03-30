import { CleaningLogPanel } from '@ai/cleaning/CleaningLogPanel';
import {
  cleanContent,
  clearCleaningSession,
  getCleaningResult,
  getCleaningStatus,
} from '@ai/cleaning/cleaning-manager';
import { upsertContent } from '@content/content-creation';
import { showNotification } from '@mantine/notifications';
import BlurBox from '@common/BlurBox';
import { fetchContentSources, defineDefaultSources } from '@content/content-store';
import { makeRequest } from '@requests/request-manager';
import {
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { ContentType } from '@schemas/content';
import { RequestType } from '@schemas/requests';
import { setPageTitle } from '@utils/document-change';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconAlertCircle,
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconRotate,
} from '@tabler/icons-react';
import { CleaningStatus } from '@ai/cleaning/cleaning-manager';

const AUTO_UPSERT = false;

setPageTitle('Content Cleaning Source');

// Content types that have a corresponding find-* request
const CLEANABLE_TYPES: { value: ContentType; label: string; request: RequestType }[] = [
  { value: 'item', label: 'Items', request: 'find-item' },
  { value: 'spell', label: 'Spells', request: 'find-spell' },
  { value: 'ability-block', label: 'Ability Blocks', request: 'find-ability-block' },
  { value: 'ancestry', label: 'Ancestries', request: 'find-ancestry' },
  { value: 'background', label: 'Backgrounds', request: 'find-background' },
  { value: 'class', label: 'Classes', request: 'find-class' },
  { value: 'archetype', label: 'Archetypes', request: 'find-archetype' },
  { value: 'creature', label: 'Creatures', request: 'find-creature' },
  { value: 'language', label: 'Languages', request: 'find-language' },
  { value: 'trait', label: 'Traits', request: 'find-trait' },
];

type RecordEntry = { id: number; name: string; [key: string]: any };
type CleaningEntry = { cleaningRecordId: string; status: CleaningStatus };

function StatusCell({ entry }: { entry: CleaningEntry | undefined }) {
  if (!entry)
    return (
      <Text size='xs' c='dimmed'>
        —
      </Text>
    );
  if (entry.status === 'running')
    return (
      <Group gap={4}>
        <Loader size='xs' color='yellow' />
        <Badge color='yellow' variant='light' size='xs'>
          Running
        </Badge>
      </Group>
    );
  if (entry.status === 'done')
    return (
      <Badge color='green' variant='light' size='xs' leftSection={<IconCheck size='0.65rem' />}>
        Done
      </Badge>
    );
  return (
    <Badge color='red' variant='light' size='xs' leftSection={<IconAlertCircle size='0.65rem' />}>
      Error
    </Badge>
  );
}

export function Component() {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [contentType, setContentType] = useState<ContentType>('item');
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [isFetchingRecords, setIsFetchingRecords] = useState(false);

  // cleaningMap: content record id → { cleaningRecordId, status }
  const [cleaningMap, setCleaningMap] = useState<Map<number, CleaningEntry>>(new Map());

  const [processing, setProcessing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);

  // Modal state — which cleaningRecordId to show
  const [modalRecordId, setModalRecordId] = useState<string | null>(null);
  const [modalContentId, setModalContentId] = useState<number | null>(null);
  const [modalInputData, setModalInputData] = useState<{ type: ContentType; content: RecordEntry } | null>(null);
  const [updatedIds, setUpdatedIds] = useState<Set<number>>(new Set());

  const { data: sources, isFetching: loadingSources } = useQuery({
    queryKey: ['get-content-sources-cleaning'],
    queryFn: async () => fetchContentSources(defineDefaultSources('PAGE', 'ALL-OFFICIAL-PUBLIC')),
  });

  const selectedType = CLEANABLE_TYPES.find((t) => t.value === contentType)!;

  async function fetchRecords() {
    if (!sourceId) return;
    setIsFetchingRecords(true);
    setRecords([]);
    setCleaningMap(new Map());
    setProcessing(false);
    setCurrentIdx(-1);

    const body: Record<string, any> = { content_sources: [sourceId] };
    // ability-block needs type=undefined to fetch all; pass nothing extra
    const result = await makeRequest<RecordEntry[]>(selectedType.request, body);
    setRecords((result ?? []).reverse());
    setIsFetchingRecords(false);
  }

  // Drive the batch processing: when currentIdx changes, kick off the next item
  const processingRef = useRef(false);
  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  const startCleaningRecord = useCallback(
    (record: RecordEntry, onDone?: (status: CleaningStatus) => void, retry = false) => {
      const cleaningRecordId = `${contentType}_${record.id}`;
      if (retry) clearCleaningSession(cleaningRecordId);

      // If records already exist for this ID, just restore them without re-running
      const existingStatus = getCleaningStatus(cleaningRecordId);
      if (!retry && existingStatus !== 'running' && localStorage.getItem(`cleaning-status-${cleaningRecordId}`)) {
        setCleaningMap((prev) => new Map(prev).set(record.id, { cleaningRecordId, status: existingStatus }));
        onDone?.(existingStatus);
        return () => {};
      }

      setCleaningMap((prev) => new Map(prev).set(record.id, { cleaningRecordId, status: 'running' }));
      localStorage.setItem(
        `cleaning-input-${cleaningRecordId}`,
        JSON.stringify({ type: contentType, content: record })
      );
      cleanContent(cleaningRecordId, contentType, record);

      const interval = setInterval(async () => {
        const status = getCleaningStatus(cleaningRecordId);
        if (status !== 'running') {
          clearInterval(interval);
          setCleaningMap((prev) => new Map(prev).set(record.id, { cleaningRecordId, status }));

          if (status === 'done') {
            const result = getCleaningResult(cleaningRecordId);
            if (result && AUTO_UPSERT) {
              try {
                await upsertContent(result.type as ContentType, result.content);
                showNotification({ title: 'Updated', message: record.name, color: 'green', autoClose: 3000 });
                setUpdatedIds((prev) => new Set(prev).add(record.id));
              } catch {
                showNotification({ title: 'Save failed', message: record.name, color: 'red', autoClose: 5000 });
              }
            }
          }

          onDone?.(status);
        }
      }, 800);

      return () => clearInterval(interval);
    },
    [contentType]
  );

  useEffect(() => {
    if (!processing || currentIdx < 0 || currentIdx >= records.length) return;

    const record = records[currentIdx];
    const cleanup = startCleaningRecord(record, () => {
      setCurrentIdx((idx) => {
        const next = idx + 1;
        if (next >= records.length) {
          setProcessing(false);
          return idx;
        }
        return next;
      });
    });

    return cleanup;
  }, [currentIdx, processing, records, startCleaningRecord]);

  const completedCount = [...cleaningMap.values()].filter((e) => e.status !== 'running').length;
  const runningEntry = processing && currentIdx >= 0 ? cleaningMap.get(records[currentIdx]?.id) : null;

  function openModal(record: RecordEntry) {
    const entry = cleaningMap.get(record.id);
    if (!entry) return;
    setModalRecordId(entry.cleaningRecordId);
    setModalContentId(record.id);
    setModalInputData({ type: contentType, content: record });
  }

  return (
    <Center py='xl'>
      <Box w='100%' maw={960} px='md'>
        <Stack gap='md'>
          {/* Controls */}
          <BlurBox p='md'>
            <Stack gap='sm'>
              <Title order={4}>Content Cleaning: Source Overview</Title>
              <Group gap='sm' wrap='wrap'>
                <Select
                  placeholder='Select content source'
                  data={(sources ?? []).map((s) => ({ value: s.id + '', label: s.name }))}
                  searchable
                  value={sourceId ? sourceId + '' : null}
                  onChange={(v) => v && setSourceId(parseInt(v))}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <Select
                  placeholder='Content type'
                  data={CLEANABLE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={contentType}
                  onChange={(v) => v && setContentType(v as ContentType)}
                  style={{ minWidth: 160 }}
                />
                <Button
                  leftSection={<IconRefresh size='0.9rem' />}
                  onClick={fetchRecords}
                  loading={isFetchingRecords}
                  disabled={!sourceId || loadingSources}
                >
                  Fetch
                </Button>
              </Group>
            </Stack>
          </BlurBox>

          {/* Results table */}
          {records.length > 0 && (
            <BlurBox p='md'>
              <Stack gap='sm'>
                {/* Table header + batch controls */}
                <Group justify='space-between'>
                  <Group gap='xs'>
                    <Text fw={600}>{records.length} records</Text>
                    {completedCount > 0 && (
                      <Badge color='green' variant='light'>
                        {completedCount} / {records.length} done
                      </Badge>
                    )}
                    {runningEntry && (
                      <Group gap={4}>
                        <Loader size='xs' color='yellow' />
                        <Text size='xs' c='dimmed'>
                          {records[currentIdx]?.name}
                        </Text>
                      </Group>
                    )}
                  </Group>
                  <Group gap='xs'>
                    {processing ? (
                      <Button
                        color='yellow'
                        variant='light'
                        leftSection={<IconPlayerPause size='0.9rem' />}
                        onClick={() => {
                          setProcessing(false);
                          setCurrentIdx(-1);
                        }}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        color='green'
                        variant='light'
                        leftSection={<IconPlayerPlay size='0.9rem' />}
                        disabled={records.length === 0}
                        onClick={() => {
                          setProcessing(true);
                          // Resume from first uncleaned record
                          const firstUncleaned = records.findIndex((r) => !cleaningMap.has(r.id));
                          setCurrentIdx(firstUncleaned >= 0 ? firstUncleaned : 0);
                        }}
                      >
                        {completedCount > 0 ? 'Resume' : 'Begin Cleaning'}
                      </Button>
                    )}
                  </Group>
                </Group>

                <ScrollArea h={480} scrollbarSize={6}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 60 }}>ID</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th style={{ width: 120 }}>Status</Table.Th>
                        <Table.Th style={{ width: 80 }}></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {records.map((record) => {
                        const entry = cleaningMap.get(record.id);
                        const isRunning = entry?.status === 'running';
                        return (
                          <Table.Tr key={record.id}>
                            <Table.Td>
                              <Text size='xs' c='dimmed'>
                                {record.id}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap='nowrap'>
                                <Text size='sm'>{record.name}</Text>
                                {updatedIds.has(record.id) && (
                                  <Tooltip label='Update submitted'>
                                    <IconCheck size='0.85rem' color='var(--mantine-color-green-5)' />
                                  </Tooltip>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <StatusCell entry={entry} />
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4} wrap='nowrap'>
                                {!entry ? (
                                  <Button
                                    size='compact-xs'
                                    variant='subtle'
                                    color='green'
                                    disabled={isRunning}
                                    onClick={() => startCleaningRecord(record)}
                                  >
                                    Start
                                  </Button>
                                ) : (
                                  <>
                                    <Tooltip label='View cleaning log'>
                                      <Button size='compact-xs' variant='subtle' onClick={() => openModal(record)}>
                                        View
                                      </Button>
                                    </Tooltip>
                                    <Tooltip label='Retry cleaning' disabled={isRunning}>
                                      <Button
                                        size='compact-xs'
                                        variant='subtle'
                                        color='orange'
                                        disabled={isRunning}
                                        onClick={() => startCleaningRecord(record, undefined, true)}
                                      >
                                        <IconRotate size='0.75rem' />
                                      </Button>
                                    </Tooltip>
                                  </>
                                )}
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Stack>
            </BlurBox>
          )}
        </Stack>
      </Box>

      {/* Cleaning log modal */}
      <Modal
        opened={!!modalRecordId}
        onClose={() => setModalRecordId(null)}
        title='Cleaning Log'
        size='xl'
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {modalRecordId && (
          <CleaningLogPanel
            cleaningRecordId={modalRecordId}
            inputData={modalInputData}
            onUpdated={() => {
              if (modalContentId !== null) setUpdatedIds((prev) => new Set(prev).add(modalContentId));
            }}
          />
        )}
      </Modal>
    </Center>
  );
}
