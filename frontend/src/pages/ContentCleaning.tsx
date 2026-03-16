import {
  CleaningLog,
  CleaningStatus,
  cleanContent,
  fetchCleaningInput,
  getCleaningLogs,
  getCleaningResult,
  getCleaningStatus,
} from '@ai/cleaning/cleaning-manager';
import { creatureDrawerState, drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { upsertContent } from '@content/content-creation';
import { submitContentUpdate } from '@content/content-update';
import { convertToContentType } from '@content/content-utils';
import { mapToDrawerData } from '@drawers/drawer-utils';
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Center,
  Code,
  Collapse,
  Divider,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useInterval } from '@mantine/hooks';
import { hideNotification, showNotification } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCloudUp,
  IconDatabase,
  IconInfoCircle,
  IconTool,
  IconUpload,
  IconZoomPan,
} from '@tabler/icons-react';
import { ContentType } from '@typing/content';
import { setPageTitle } from '@utils/document-change';
import { displayError } from '@utils/notifications';
import { useEffect, useRef, useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useRecoilState } from 'recoil';

const LOG_CONFIG: Record<string, { color: string; icon: React.FC<any>; label: string }> = {
  thought: { color: 'indigo', icon: IconBrain, label: 'Thought' },
  tool: { color: 'yellow', icon: IconTool, label: 'Tool Call' },
  error: { color: 'red', icon: IconAlertCircle, label: 'Error' },
  done: { color: 'green', icon: IconCheck, label: 'Done' },
  info: { color: 'blue', icon: IconInfoCircle, label: 'Info' },
};

function LogEntry({
  entry,
  onOpenDrawer,
  onOpenCreatureDrawer,
}: {
  entry: CleaningLog;
  onOpenDrawer: (data: any) => void;
  onOpenCreatureDrawer: (data: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const config = LOG_CONFIG[entry.type] ?? LOG_CONFIG.info;
  const Icon = config.icon;

  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Box py={6} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Group gap={8} wrap='nowrap' align='flex-start'>
        <ThemeIcon color={config.color} variant='light' size='sm' style={{ flexShrink: 0, marginTop: 1 }}>
          <Icon size='0.75rem' />
        </ThemeIcon>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} wrap='nowrap'>
            <Badge color={config.color} variant='dot' size='xs' style={{ flexShrink: 0 }}>
              {config.label}
            </Badge>
            <Text size='xs' c='dimmed' style={{ flexShrink: 0 }}>
              {time}
            </Text>
            {entry.detail && (
              <ActionIcon
                size='xs'
                variant='subtle'
                color='gray'
                onClick={() => setOpen((o) => !o)}
                ml='auto'
                style={{ flexShrink: 0 }}
              >
                {open ? <IconChevronDown size='0.75rem' /> : <IconChevronRight size='0.75rem' />}
              </ActionIcon>
            )}
          </Group>

          <Text size='sm' style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {entry.message}
          </Text>

          {/* Plain text result for non-fetch tool calls */}
          {entry.resultText && (
            <Text size='xs' c='dimmed' style={{ wordBreak: 'break-word' }}>
              ↳ {entry.resultText}
            </Text>
          )}

          {/* Drawer buttons for fetched content */}
          {entry.contentResults && entry.contentResults.records.length > 0 && (
            <Group gap={4} mt={2} wrap='wrap'>
              {entry.contentResults.records.map((record, i) => (
                <BlurButton
                  key={i}
                  size='compact-xs'
                  fw={400}
                  onClick={() => {
                    if (entry.contentResults!.contentType === 'creature') {
                      onOpenCreatureDrawer({ data: { creature: record } });
                    } else {
                      onOpenDrawer(
                        mapToDrawerData(entry.contentResults!.contentType as ContentType, record, {
                          noFeedback: true,
                          showOperations: true,
                        })
                      );
                    }
                  }}
                >
                  {record.name ?? `#${record.id}`}
                </BlurButton>
              ))}
            </Group>
          )}

          {entry.detail && (
            <Collapse in={open}>
              <Code
                block
                mt={2}
                style={{
                  fontSize: '0.7rem',
                  maxHeight: 240,
                  overflow: 'auto',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                }}
              >
                {entry.detail}
              </Code>
            </Collapse>
          )}
        </Stack>
      </Group>
    </Box>
  );
}

function StatusBadge({ status }: { status: CleaningStatus }) {
  if (status === 'running') {
    return (
      <Group gap={6}>
        <Loader size='xs' color='yellow' />
        <Badge color='yellow' variant='light'>
          Running
        </Badge>
      </Group>
    );
  }
  if (status === 'done') {
    return (
      <Badge color='green' variant='light' leftSection={<IconCheck size='0.75rem' />}>
        Complete
      </Badge>
    );
  }
  return (
    <Badge color='red' variant='light' leftSection={<IconAlertCircle size='0.75rem' />}>
      Error
    </Badge>
  );
}

export function Component() {
  const { recordId } = useLoaderData() as { recordId: string };

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [_creatureDrawer, openCreatureDrawer] = useRecoilState(creatureDrawerState);

  const [inputData, setInputData] = useState<ReturnType<typeof fetchCleaningInput>>(null);
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [status, setStatus] = useState<CleaningStatus>('running');
  const [result, setResult] = useState<ReturnType<typeof getCleaningResult>>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const viewportRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const contentName = (inputData?.content as any)?.name as string | undefined;
  setPageTitle(`Cleaning${contentName ? `: ${contentName}` : ''}`);

  // Kick off cleaning once on mount
  useEffect(() => {
    if (!firstLoad.current) return;
    firstLoad.current = false;

    const data = fetchCleaningInput(recordId);
    if (!data) return;
    setInputData(data);
    cleanContent(recordId, data.type, data.content);
  }, []);

  // Poll for log updates
  const { start, stop } = useInterval(() => {
    const newLogs = getCleaningLogs(recordId);
    setLogs([...newLogs]);

    const newStatus = getCleaningStatus(recordId);
    setStatus(newStatus);

    if (newStatus !== 'running') {
      stop();
      setResult(getCleaningResult(recordId));
    }
  }, 600);

  useEffect(() => {
    start();
    return stop;
  }, []);

  // Auto-scroll to bottom when logs grow
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [logs.length]);

  const thoughtCount = logs.filter((l) => l.type === 'thought').length;
  const toolCount = logs.filter((l) => l.type === 'tool').length;
  const fetchCount = logs.filter((l) => l.contentResults?.records.length).length;
  const errorCount = logs.filter((l) => l.type === 'error').length;

  return (
    <Center py='xl'>
      <Box w='100%' maw={760} px='md'>
        <BlurBox w='100%' p='md'>
          {/* Header */}
          <Stack gap={0} pb={10}>
            <Group wrap='nowrap' py='xs' justify='space-between'>
              <Stack gap={2}>
                <Group gap={8}>
                  <Title order={4}>Content Cleaning</Title>
                  {inputData && (
                    <Badge variant='outline' size='sm' color='guide'>
                      {inputData.type}
                    </Badge>
                  )}
                </Group>
                {contentName && (
                  <Text size='sm' c='dimmed'>
                    {contentName}
                  </Text>
                )}
              </Stack>
              <Stack gap={4} align='flex-end'>
                <StatusBadge status={status} />
                <Text size='xs' c='dimmed'>
                  #{recordId.slice(0, 8)}
                </Text>
              </Stack>
            </Group>
            <Divider color='gray.6' />
          </Stack>

          {/* Stats row */}
          <Group gap='xs' pb='sm'>
            <Badge color='indigo' variant='light' leftSection={<IconBrain size='0.7rem' />}>
              {thoughtCount} thought{thoughtCount !== 1 ? 's' : ''}
            </Badge>
            <Badge color='yellow' variant='light' leftSection={<IconTool size='0.7rem' />}>
              {toolCount} call{toolCount !== 1 ? 's' : ''}
            </Badge>
            <Badge color='teal' variant='light' leftSection={<IconDatabase size='0.7rem' />}>
              {fetchCount} fetch{fetchCount !== 1 ? 'es' : ''}
            </Badge>
            {errorCount > 0 && (
              <Badge color='red' variant='light' leftSection={<IconAlertCircle size='0.7rem' />}>
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge color='gray' variant='light' ml='auto'>
              {logs.length} total
            </Badge>
          </Group>

          {/* Log stream */}
          <ScrollArea h={460} viewportRef={viewportRef} scrollbarSize={6}>
            <Stack gap={0} px={4}>
              {logs.length === 0 ? (
                <Center py='xl'>
                  <Stack align='center' gap={8}>
                    <Loader size='sm' color='gray' />
                    <Text size='sm' c='dimmed'>
                      Waiting for agent to start…
                    </Text>
                  </Stack>
                </Center>
              ) : (
                logs.map((entry, i) => (
                  <LogEntry key={i} entry={entry} onOpenDrawer={openDrawer} onOpenCreatureDrawer={openCreatureDrawer} />
                ))
              )}
            </Stack>
          </ScrollArea>

          {/* Result — view + save buttons when done */}
          {result?.content && (
            <>
              <Divider color='gray.6' mt='md' mb='sm' label='Fixed Result' labelPosition='center' />
              <Group justify='center'>
                <BlurButton
                  size='md'
                  leftSection={<IconZoomPan size='0.9rem' />}
                  onClick={() => {
                    if (result.type === 'creature') {
                      openCreatureDrawer({ data: { creature: result.content } });
                    } else {
                      openDrawer(
                        mapToDrawerData(result.type as ContentType, result.content, {
                          noFeedback: true,
                          showOperations: true,
                        })
                      );
                    }
                  }}
                >
                  View Fixed {result.type}
                </BlurButton>
                <BlurButton
                  size='md'
                  leftSection={<IconCloudUp size='0.9rem' />}
                  onClick={async () => {
                    showNotification({
                      id: 'submit-content-update',
                      title: `Submitting Content Update...`,
                      message: `This may take a couple seconds, please wait.`,
                      autoClose: false,
                      loading: true,
                    });

                    const updateResult = await submitContentUpdate(
                      result.type,
                      'UPDATE',
                      result.content,
                      result.content.contentSourceId,
                      undefined
                    );

                    hideNotification('submit-content-update');
                    if (!updateResult) {
                      displayError('Sorry, something went wrong, please try again later :(');
                      return;
                    } else {
                      showNotification({
                        id: 'submit-content-update',
                        title: (
                          <Anchor
                            href='/content-update-overview'
                            target='_blank'
                            variant='gradient'
                            gradient={{ from: 'green', to: 'guide' }}
                          >
                            Content Update Submitted 🎉
                          </Anchor>
                        ),
                        message: (
                          <Text fz='sm'>
                            Thanks for helping improve the site, please check our{' '}
                            <Anchor
                              fz='sm'
                              href={`https://discord.com/channels/735260060682289254/1220411970654830743/${updateResult.discord_msg_id}`}
                              target='_blank'
                            >
                              Discord
                            </Anchor>{' '}
                            for updates on your submission :)
                          </Text>
                        ),
                        color: 'green',
                        autoClose: 8000,
                      });
                    }
                  }}
                >
                  Submit Update
                </BlurButton>
                <BlurButton
                  size='md'
                  leftSection={
                    saveState === 'saving' ? (
                      <Loader size='xs' color='gray' />
                    ) : saveState === 'saved' ? (
                      <IconCheck size='0.9rem' />
                    ) : (
                      <IconUpload size='0.9rem' />
                    )
                  }
                  disabled={saveState === 'saving' || saveState === 'saved'}
                  onClick={async () => {
                    setSaveState('saving');
                    try {
                      await upsertContent(result.type as ContentType, result.content);
                      setSaveState('saved');
                    } catch {
                      setSaveState('error');
                    }
                  }}
                >
                  {saveState === 'saved' ? 'Saved!' : saveState === 'error' ? 'Save Failed' : `Update Directly`}
                </BlurButton>
              </Group>
            </>
          )}
        </BlurBox>
      </Box>
    </Center>
  );
}
