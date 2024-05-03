import { drawerState } from '@atoms/navAtoms';
import { getPublicUser } from '@auth/user-manager';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { DISCORD_URL } from '@constants/data';
import { fetchContent, fetchContentSources } from '@content/content-store';
import { findContentUpdate, findContentUpdates } from '@content/content-update';
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
  SegmentedControl,
  TextInput,
  useMantineTheme,
  Button,
  LoadingOverlay,
} from '@mantine/core';
import { IconArrowBigRightLine, IconThumbUp, IconThumbDown, IconSearch, IconExternalLink } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { setPageTitle } from '@utils/document-change';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import _ from 'lodash-es';
import { useMemo, useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { DonutChart } from '@mantine/charts';
import Paginator from '@common/Paginator';

export function Component(props: {}) {
  setPageTitle(`Content Updates Overview`);

  const { data, isFetching } = useQuery({
    queryKey: [`find-content-update-overview`],
    queryFn: async () => {
      const updates = await findContentUpdates();

      const contributors = _.groupBy(updates, (update) => update.user_id);
      const contributorCounts = _.map(contributors, (contributor) => ({
        user_id: contributor[0].user_id,
        count: contributor.length,
      }));

      const topContributors = await Promise.all(
        _.orderBy(contributorCounts, 'count', 'desc')
          .slice(0, 5)
          .map(async (contributor) => {
            return {
              user: await getPublicUser(contributor.user_id),
              count: contributor.count,
            };
          })
      );

      const updateDisplay =
        updates
          ?.filter((update) => update.discord_msg_id)
          ?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          ?.map((update) => {
            return {
              title: `${update.action === 'UPDATE' ? 'Update:' : update.action === 'CREATE' ? 'Add:' : 'Remove:'} ${update.data.name}`,
              state: update.status.state,
              updateId: update.id,
              discordMsgId: update.discord_msg_id,
            };
          }) ?? [];

      return {
        updates,
        updateDisplay,
        topContributors,
      };
    },
    refetchOnWindowFocus: false,
  });

  const theme = useMantineTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState('PENDING');

  return (
    <Center>
      <LoadingOverlay visible={isFetching} />
      <Box maw={500} w='100%'>
        <BlurBox w={'100%'} p='md'>
          <Stack gap={0} pb={10}>
            <Title order={2} ta='center'>
              Content Update Overview
            </Title>
            <Divider color='gray.6' />
          </Stack>
          <Group wrap='nowrap' grow>
            <DonutChart
              chartLabel='Total Updates'
              data={[
                {
                  name: 'Approved',
                  value: data?.updates?.filter((c) => c.status.state === 'APPROVED').length ?? 0,
                  color: 'green.5',
                },
                {
                  name: 'Pending',
                  value: data?.updates?.filter((c) => c.status.state === 'PENDING').length ?? 0,
                  color: 'yellow.5',
                },
                {
                  name: 'Rejected',
                  value: data?.updates?.filter((c) => c.status.state === 'REJECTED').length ?? 0,
                  color: 'red.5',
                },
              ]}
            />
            <Stack gap={0}>
              <Title order={4}>Top Contributors</Title>
              <Stack gap={5}>
                {data?.topContributors.map((contributor, index) => (
                  <Group key={index} gap={10}>
                    <Badge variant='light'>{contributor.count.toLocaleString()}</Badge>
                    <Text>{contributor.user?.display_name ?? 'Unknown'}</Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Group>

          <Stack pt={20} gap={0}>
            <Group>
              <TextInput
                style={{ flex: 1 }}
                leftSection={<IconSearch size='0.9rem' />}
                placeholder={`Search updates`}
                onChange={(event) => setSearchQuery(event.target.value)}
                styles={{
                  input: {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
                  },
                }}
              />
              <SegmentedControl
                value={searchState}
                onChange={setSearchState}
                data={[
                  { label: 'Pending', value: 'PENDING' },
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Rejected', value: 'REJECTED' },
                ]}
              />
            </Group>
            <Stack gap={0}>
              <Paginator
                h={300}
                records={
                  data?.updateDisplay
                    ?.filter((c) => {
                      if (searchState !== c.state) return false;

                      if (searchQuery.trim().length > 0) {
                        return c.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
                      } else {
                        return true;
                      }
                    })
                    .map((c, index) => (
                      <Stack gap={0}>
                        <Group key={index} wrap='nowrap' px='xs' py={5} justify='space-between'>
                          <Anchor href={`/content-update/${c.updateId}`} target='_blank'>
                            {c.title}
                          </Anchor>
                          {c.discordMsgId && (
                            <Button
                              size='compact-xs'
                              variant='light'
                              rightSection={<IconExternalLink size='0.8rem' />}
                              component='a'
                              href={`https://discord.com/channels/735260060682289254/1220411970654830743/${c.discordMsgId}`}
                              target='_blank'
                            >
                              Open Discord Message
                            </Button>
                          )}
                        </Group>
                        <Divider />
                      </Stack>
                    )) ?? []
                }
              />
            </Stack>
          </Stack>
        </BlurBox>
      </Box>
    </Center>
  );
}
