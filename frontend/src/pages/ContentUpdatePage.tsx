import { creatureDrawerState, drawerState } from '@atoms/navAtoms';
import { getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { defineDefaultSources, fetchContent, fetchContentSources } from '@content/content-store';
import { findContentUpdate } from '@content/content-update';
import { getContentUpdateChangedFields } from '@content/content-update-review';
import { fetchHazardById } from '@content/hazards';
import { mapToDrawerData } from '@drawers/drawer-utils';
import { Center, Group, Title, ActionIcon, Text, Divider, Loader, Box, Stack, Anchor, Badge } from '@mantine/core';
import { IconArrowBigRightLine, IconThumbUp, IconThumbDown } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Creature, Hazard, HazardSchema } from '@schemas/content';
import { setPageTitle } from '@utils/document-change';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useAtom } from 'jotai';
import ContentUpdateDetails from './content-update/ContentUpdateDetails';

/** Displays a content submission, its review details, previews, and moderation status. */
export function Component() {
  const { updateId } = useLoaderData() as {
    updateId: string;
  };
  setPageTitle(`Content Update #${updateId}`);

  const [_drawer, openDrawer] = useAtom(drawerState);
  const [_creatureDrawer, openCreatureDrawer] = useAtom(creatureDrawerState);

  const { data } = useQuery({
    queryKey: [`find-content-update-${updateId}`],
    queryFn: async () => {
      const contentUpdate = await findContentUpdate(parseInt(updateId));
      if (!contentUpdate) {
        return null;
      }

      const user = (await getPublicUser(contentUpdate.user_id))!;

      const sources = await fetchContentSources(defineDefaultSources('PAGE', [contentUpdate.content_source_id]));
      if (sources.length === 0) {
        return null;
      }

      const isHazardUpdate = contentUpdate.type === 'creature' && contentUpdate.data?.type === 'hazard';
      const proposedHazardResult = isHazardUpdate ? HazardSchema.safeParse(contentUpdate.data) : null;
      const proposedHazard = proposedHazardResult?.success ? proposedHazardResult.data : null;
      let originalContent: Hazard | Record<string, any> | null = null;
      if (contentUpdate.ref_id) {
        if (isHazardUpdate) {
          originalContent = await fetchHazardById(contentUpdate.ref_id, [contentUpdate.content_source_id]);
        } else {
          const originalResults = await fetchContent(contentUpdate.type, {
            id: contentUpdate.ref_id,
            content_sources: sources.map((s) => s.id),
          });
          originalContent = originalResults[0] ?? null;
        }
      }

      return {
        contentUpdate,
        user,
        source: sources.find((s) => s.id === contentUpdate.content_source_id)!,
        originalContent,
        isHazardUpdate,
        proposedHazard,
      };
    },
    refetchInterval: 1000,
  });

  const changedFields = useMemo(() => {
    if (!data || !data.originalContent) return [];
    return getContentUpdateChangedFields(data.originalContent, data.contentUpdate.data);
  }, [data]);

  const sizeDiff = useMemo(() => {
    if (!data || !data.originalContent) return 0;

    const byteDiff = JSON.stringify(data.contentUpdate.data ?? {}).length - JSON.stringify(data.originalContent).length;

    if (byteDiff > 300) {
      return sign((byteDiff / 1000).toFixed(2)) + ' kb';
    } else {
      return sign(byteDiff) + ' bytes';
    }
  }, [data]);

  return (
    <Center>
      <Box maw={875} w='100%'>
        <Group pt='sm'>
          {!data ? (
            <Loader
              size='lg'
              type='bars'
              style={{
                position: 'absolute',
                top: '30%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ) : (
            <BlurBox w={'100%'} p='md'>
              <Stack gap={10}>
                <Group align='center' justify='center' gap='xs'>
                  <Title order={1} size='h2' ta='center'>
                    Content Update by {data.user.display_name}
                  </Title>
                  <Text size='sm' c='dimmed'>
                    (#{data.user.id})
                  </Text>
                </Group>
                <Divider />
                {data.contentUpdate.action === 'UPDATE' && (
                  <Stack gap={10}>
                    <Text fz='lg' ta='center'>
                      {toLabel(data.contentUpdate.action)}{' '}
                      <b>{data.originalContent?.name ?? data.contentUpdate.data.name}</b> from <b>{data.source.name}</b>
                      .
                    </Text>
                    <Group wrap='nowrap' align='center' justify='center'>
                      <Box>
                        <BlurButton
                          size='compact-md'
                          fw={500}
                          onClick={() => {
                            if (!data.contentUpdate.ref_id) return;

                            const type = data.contentUpdate.data?.type ?? data.contentUpdate.type;
                            if (data.isHazardUpdate) {
                              openDrawer(
                                mapToDrawerData('hazard', data.contentUpdate.ref_id, { sourceId: data.source.id })
                              );
                            } else if (type === 'creature') {
                              openCreatureDrawer({
                                data: {
                                  id: data.contentUpdate.ref_id,
                                  showOperations: true,
                                },
                              });
                            } else {
                              openDrawer(mapToDrawerData(type, data.contentUpdate.ref_id, { showOperations: true }));
                            }
                          }}
                        >
                          View Original
                        </BlurButton>
                      </Box>
                      <Box style={{ position: 'relative' }}>
                        <ActionIcon
                          variant='transparent'
                          color='gray.5'
                          style={{ cursor: 'default' }}
                          aria-label='Arrow Right'
                          aria-readonly
                          size='lg'
                        >
                          <IconArrowBigRightLine size='1.5rem' stroke={1.5} />
                        </ActionIcon>
                        <Text
                          fz={10}
                          ta='center'
                          fs='italic'
                          style={{
                            position: 'absolute',
                            bottom: -20,
                            whiteSpace: 'nowrap',

                            left: '40%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {sizeDiff}
                        </Text>
                      </Box>
                      <Box>
                        <BlurButton
                          size='compact-md'
                          fw={500}
                          disabled={data.isHazardUpdate && !data.proposedHazard}
                          onClick={() => {
                            if (data.isHazardUpdate) {
                              if (!data.proposedHazard) return;
                              openDrawer(
                                mapToDrawerData('hazard', data.proposedHazard, {
                                  noFeedback: true,
                                })
                              );
                            } else if (data.contentUpdate.type === 'creature') {
                              openCreatureDrawer({
                                data: {
                                  creature: data.contentUpdate.data as Creature | undefined,
                                },
                              });
                            } else {
                              openDrawer(
                                mapToDrawerData(data.contentUpdate.type, data.contentUpdate.data ?? {}, {
                                  noFeedback: true,
                                  showOperations: true,
                                })
                              );
                            }
                          }}
                        >
                          View Updated
                        </BlurButton>
                      </Box>
                    </Group>
                  </Stack>
                )}

                {data.contentUpdate.action === 'CREATE' && (
                  <Stack gap={10}>
                    <Text fz='lg' ta='center'>
                      Add <b>{data.contentUpdate.data?.name}</b> to the <b>{data.source.name}</b>.
                    </Text>
                    <Group wrap='nowrap' align='center' justify='center'>
                      <Box>
                        <BlurButton
                          size='compact-md'
                          fw={500}
                          disabled={data.isHazardUpdate && !data.proposedHazard}
                          onClick={() => {
                            if (data.isHazardUpdate) {
                              if (!data.proposedHazard) return;
                              openDrawer(
                                mapToDrawerData('hazard', data.proposedHazard, {
                                  noFeedback: true,
                                })
                              );
                            } else if (data.contentUpdate.type === 'creature') {
                              openCreatureDrawer({
                                data: {
                                  creature: data.contentUpdate.data as Creature | undefined,
                                },
                              });
                            } else {
                              openDrawer(
                                mapToDrawerData(data.contentUpdate.type, data.contentUpdate.data ?? {}, {
                                  noFeedback: true,
                                  showOperations: true,
                                })
                              );
                            }
                          }}
                        >
                          View {toLabel((data.contentUpdate.data?.type ?? data.contentUpdate.type).replace(/-/g, ' '))}
                        </BlurButton>
                      </Box>
                    </Group>
                  </Stack>
                )}

                <ContentUpdateDetails update={data.contentUpdate} original={data.originalContent} />

                {data.contentUpdate.action === 'UPDATE' && (
                  <Stack gap='xs' mt='sm'>
                    <Text size='sm' fw={600}>
                      Detected Field Changes
                    </Text>
                    <Group gap='xs'>
                      {changedFields.map((field) => (
                        <Badge key={field} variant='light' color='gray' tt='initial'>
                          {toLabel(field)}
                        </Badge>
                      ))}
                    </Group>
                    {changedFields.length === 0 && (
                      <Text size='xs' fs='italic' c='dimmed'>
                        {data.originalContent
                          ? 'No changes detected.'
                          : 'Original content is unavailable for comparison.'}
                      </Text>
                    )}
                  </Stack>
                )}

                <Stack pt={10} gap={0}>
                  <Group wrap='nowrap' justify='center' align='center' gap={10}>
                    <Badge
                      size='sm'
                      variant='light'
                      color={
                        data.contentUpdate.status.state === 'PENDING'
                          ? 'yellow'
                          : data.contentUpdate.status.state === 'APPROVED'
                            ? 'green'
                            : 'red'
                      }
                    >
                      {data.contentUpdate.status.state}
                    </Badge>
                    <Group wrap='nowrap' gap={10}>
                      <Group wrap='nowrap' gap={0}>
                        <ActionIcon
                          variant='transparent'
                          style={{ cursor: 'default' }}
                          color='gray.5'
                          aria-label='Upvote'
                          size='sm'
                        >
                          <IconThumbUp style={{ width: '85%', height: '85%' }} stroke={1.5} />
                        </ActionIcon>
                        <Text fz='sm' fw={600}>
                          {data.contentUpdate.upvotes.length.toLocaleString()}
                        </Text>
                      </Group>
                      <Group wrap='nowrap' gap={0}>
                        <ActionIcon
                          variant='transparent'
                          style={{ cursor: 'default' }}
                          color='gray.5'
                          aria-label='Downvote'
                          size='sm'
                        >
                          <IconThumbDown style={{ width: '85%', height: '85%' }} stroke={1.5} />
                        </ActionIcon>
                        <Text fz='sm' fw={600}>
                          {data.contentUpdate.downvotes.length.toLocaleString()}
                        </Text>
                      </Group>
                    </Group>
                  </Group>
                  <Text ta='center' fz='xs' fs='italic'>
                    See{' '}
                    <Anchor
                      fz='sm'
                      fs='italic'
                      href={`https://discord.com/channels/735260060682289254/1220411970654830743/${data.contentUpdate.discord_msg_id}`}
                      target='_blank'
                    >
                      Discord
                    </Anchor>{' '}
                    to approve / vote on this change.
                  </Text>
                </Stack>
              </Stack>
            </BlurBox>
          )}
        </Group>
      </Box>
    </Center>
  );
}
