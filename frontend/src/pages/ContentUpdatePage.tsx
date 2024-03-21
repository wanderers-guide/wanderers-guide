import { getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { fetchContent, fetchContentSources } from '@content/content-store';
import { findContentUpdate } from '@content/content-update';
import importFromGUIDECHAR from '@import/guidechar/import-from-guidechar';
import importFromJSON from '@import/json/import-from-json';
import {
  Center,
  Group,
  Title,
  Tooltip,
  ActionIcon,
  Menu,
  rem,
  VisuallyHidden,
  FileButton,
  Button,
  Text,
  Divider,
  Loader,
  Box,
  Code,
  Stack,
  Container,
  List,
  Anchor,
} from '@mantine/core';
import { IconUserPlus, IconUpload, IconCodeDots, IconArchive, IconArrowBigRightLine } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { setPageTitle } from '@utils/document-change';
import { hashData } from '@utils/numbers';
import _ from 'lodash-es';
import { useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';

export function Component(props: {}) {
  const { updateId } = useLoaderData() as {
    updateId: number;
  };
  setPageTitle(`Content Update #${updateId}`);

  const { data, isFetching } = useQuery({
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
        : null;

      return {
        contentUpdate,
        user,
        source: sources[0],
        originalContent,
      };
    },
    refetchOnWindowFocus: false,
  });

  console.log(data);

  const changedFields = useMemo(() => {
    if (!data || !data.originalContent) return [];
    const original = data.originalContent;
    const updated = data.contentUpdate.data;

    // Compare all fields in the original and updated content, and check all fields in meta_data if it exists
    const changedFields = [];
    for (const key of Object.keys(updated)) {
      if (key === 'meta_data') {
        for (const metaKey of Object.keys(updated.meta_data)) {
          if (original.meta_data[metaKey] !== updated.meta_data[metaKey]) {
            changedFields.push(metaKey);
          }
        }
      } else {
        if (original[key] !== updated[key]) {
          changedFields.push(key);
        }
      }
    }
    return changedFields;
  }, [data]);

  return (
    <Center>
      <Box maw={875} w='100%'>
        <Box>
          <Group wrap='nowrap' align='center' justify='center' gap={10}>
            <Title order={1} c='gray.0'>
              {isFetching || !data ? 'Loading Update Request...' : `Content Update by ${data?.user.display_name}`}
            </Title>
            <Text fz='xl' fw={500} c='gray.2' span>
              {isFetching || !data ? `` : `(#${data?.user.id})`}
            </Text>
          </Group>

          <Divider color='gray.2' />
        </Box>
        <Group pt='sm'>
          {isFetching || !data ? (
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
                <Text fz='lg' ta='center'>
                  {_.startCase(data.contentUpdate.action.toLowerCase())} <b>{data.originalContent?.name}</b> from the{' '}
                  <b>{data.source.name}</b>.
                </Text>
                <Group wrap='nowrap' align='center' justify='center'>
                  <Box>
                    <BlurButton size='compact-md' fw={500}>
                      View Original
                    </BlurButton>
                  </Box>
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
                  <Box>
                    <BlurButton size='compact-md' fw={500}>
                      View Updated
                    </BlurButton>
                  </Box>
                </Group>
                {/* <Container w={`min(450px, 50vw)`}>
                  <Group>
                    <Box>
                      <Text>Changed Fields:</Text>
                      <List>
                        {changedFields.map((field, index) => (
                          <List.Item key={index}>{field}</List.Item>
                        ))}
                      </List>
                    </Box>
                    <Box>
                      <Text ta='center'>See Discord to approve / vote on this change.</Text>
                    </Box>
                  </Group>
                </Container> */}
                <Text ta='center' fz='sm' fs='italic' pt={20}>
                  See{' '}
                  <Anchor fz='sm' fs='italic' href='https://discord.gg/FxsFZVvedr' target='_blank'>
                    Discord
                  </Anchor>{' '}
                  to approve / vote on this change.
                </Text>
              </Stack>
            </BlurBox>
          )}
        </Group>
      </Box>
    </Center>
  );
}
