import { drawerState } from '@atoms/navAtoms';
import { getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { DISCORD_URL } from '@constants/data';
import { fetchContent, fetchContentSources } from '@content/content-store';
import { findContentUpdate } from '@content/content-update';
import { mapToDrawerData } from '@drawers/drawer-utils';
import {
  Center,
  Group,
  Title,
  ActionIcon,
  Text,
  Divider,
  Loader,
  Box,
  Stack,
  Container,
  Anchor,
  Paper,
  Badge,
} from '@mantine/core';
import { IconArrowBigRightLine, IconThumbUp, IconThumbDown } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { setPageTitle } from '@utils/document-change';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import _ from 'lodash-es';
import { useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useRecoilState } from 'recoil';

export function Component(props: {}) {
  const { updateId } = useLoaderData() as {
    updateId: number;
  };
  setPageTitle(`Content Update #${updateId}`);

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data } = useQuery({
    queryKey: [`find-content-update-${updateId}`],
    queryFn: async () => {
      const contentUpdate = await findContentUpdate(updateId);
      if (!contentUpdate) {
        return null;
      }

      const user = (await getPublicUser(contentUpdate.user_id))!;

      const sources = await fetchContentSources({ ids: [contentUpdate.content_source_id] });
      if (sources.length === 0) {
        return null;
      }

      const originalContent = contentUpdate.ref_id
        ? await fetchContent(contentUpdate.type, {
            id: contentUpdate.ref_id,
          })
        : [];

      return {
        contentUpdate,
        user,
        source: sources[0],
        originalContent: originalContent.length > 0 ? originalContent[0] : null,
      };
    },
    refetchInterval: 1000,
  });

  const changedFields = useMemo(() => {
    if (!data || !data.originalContent) return [];
    const original = data.originalContent;
    const updated = data.contentUpdate.data;

    // Compare all fields in the original and updated content, and check all fields in meta_data if it exists
    const changedFields = [];
    for (const key of Object.keys(updated)) {
      if (key.toLowerCase() === 'uuid') continue;

      if (key === 'meta_data') {
        for (const metaKey of Object.keys(updated.meta_data)) {
          if (JSON.stringify(original.meta_data[metaKey] ?? '') !== JSON.stringify(updated.meta_data[metaKey] ?? '')) {
            changedFields.push(metaKey);
          }
        }
      } else {
        if (JSON.stringify(original[key] ?? '') !== JSON.stringify(updated[key] ?? '')) {
          changedFields.push(key);
        }
      }
    }
    return changedFields;
  }, [data]);

  const sizeDiff = useMemo(() => {
    if (!data || !data.originalContent) return 0;

    const byteDiff = JSON.stringify(data.contentUpdate.data).length - JSON.stringify(data.originalContent).length;

    if (byteDiff > 300) {
      return sign((byteDiff / 1000).toFixed(2)) + ' kb';
    } else {
      return sign(byteDiff) + ' bytes';
    }
  }, [data]);

  return (
    <Center>
      <Box maw={875} w='100%'>
        <Box>
          <Group wrap='nowrap' align='center' justify='center' gap={10}>
            <Title order={1} c='gray.0'>
              {!data ? 'Loading Update Request...' : `Content Update by ${data?.user.display_name}`}
            </Title>
            <Text fz='xl' fw={500} c='gray.2' span>
              {!data ? `` : `(#${data?.user.id})`}
            </Text>
          </Group>

          <Divider color='gray.2' />
        </Box>
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
                {data.contentUpdate.action === 'UPDATE' && (
                  <Stack gap={10}>
                    <Text fz='lg' ta='center'>
                      {toLabel(data.contentUpdate.action)} <b>{data.originalContent?.name}</b> from the{' '}
                      <b>{data.source.name}</b>.
                    </Text>
                    <Group wrap='nowrap' align='center' justify='center'>
                      <Box>
                        <BlurButton
                          size='compact-md'
                          fw={500}
                          onClick={() => {
                            if (!data.contentUpdate.ref_id) return;
                            openDrawer(
                              mapToDrawerData(
                                data.contentUpdate.data?.type ?? data.contentUpdate.type,
                                data.contentUpdate.ref_id,
                                { showOperations: true }
                              )
                            );
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
                          onClick={() => {
                            openDrawer(
                              mapToDrawerData(data.contentUpdate.type, data.contentUpdate.data, {
                                noFeedback: true,
                                showOperations: true,
                              })
                            );
                          }}
                        >
                          View Updated
                        </BlurButton>
                      </Box>
                    </Group>

                    <Container pt={15}>
                      <Paper w={`calc(min(450px, 50dvw))`} withBorder>
                        <Text ta='center'>Detected Field Changes</Text>

                        <Stack gap={8} pb={8}>
                          {changedFields.map((field, index) => (
                            <Box key={index} mx={8}>
                              <Badge
                                variant='light'
                                color='gray'
                                fullWidth
                                styles={{
                                  root: {
                                    textTransform: 'initial',
                                  },
                                }}
                              >
                                {toLabel(field)}
                              </Badge>
                            </Box>
                          ))}
                        </Stack>
                        {changedFields.length === 0 && (
                          <Text fz='xs' fs='italic' c='dimmed' ta='center'>
                            No changes detected?
                          </Text>
                        )}
                      </Paper>
                    </Container>
                  </Stack>
                )}

                {data.contentUpdate.action === 'CREATE' && (
                  <Stack gap={10}>
                    <Text fz='lg' ta='center'>
                      Add <b>{data.contentUpdate.data.name}</b> to the <b>{data.source.name}</b>.
                    </Text>
                    <Group wrap='nowrap' align='center' justify='center'>
                      <Box>
                        <BlurButton
                          size='compact-md'
                          fw={500}
                          onClick={() => {
                            openDrawer(
                              mapToDrawerData(data.contentUpdate.type, data.contentUpdate.data, {
                                noFeedback: true,
                                showOperations: true,
                              })
                            );
                          }}
                        >
                          View {toLabel((data.contentUpdate.data.type ?? data.contentUpdate.type).replace(/-/g, ' '))}
                        </BlurButton>
                      </Box>
                    </Group>
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
