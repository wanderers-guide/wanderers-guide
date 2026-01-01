import BlurBox from '@common/BlurBox';
import { findContentUpdates, submitContentUpdate } from '@content/content-update';
import { Center, Group, Title, Select, Button, Text, Stack, Anchor } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { ContentUpdate } from '@typing/content';
import { useState } from 'react';

const ENABLED = true;

export default function ContentUpdateRetrigger() {
  const { data, isFetching } = useQuery({
    queryKey: [`find-all-content-updates`],
    queryFn: async () => {
      return (await findContentUpdates('30')) ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const [updateId, setUpdateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Stack>
            <Group>
              <Title order={3}>Content Update Resubmit</Title>
              <Select
                placeholder='Select content update'
                searchable
                data={data?.map((update) => ({
                  value: `${update.id}`,
                  label: `${update.data?.name} - ${update.id}`,
                }))}
                onChange={async (value) => {
                  if (!value) return;
                  setUpdateId(parseInt(value));
                }}
              />

              <Button
                disabled={!updateId}
                loading={loading}
                onClick={async () => {
                  const update = data?.find((update) => update.id === updateId);
                  if (update && ENABLED) {
                    setLoading(true);
                    await retriggerUpdate(update);
                    setLoading(false);
                  }
                }}
              >
                Resubmit
              </Button>
            </Group>
          </Stack>
        </Center>
      </BlurBox>
    </>
  );
}

async function retriggerUpdate(update: ContentUpdate) {
  const result = await submitContentUpdate(
    update.type,
    update.action,
    update.data,
    update.content_source_id,
    update.ref_id
  );

  console.log(result);
  showNotification({
    id: 'submit-content-update-admin',
    title: (
      <Anchor
        href='/content-update-overview'
        target='_blank'
        variant='gradient'
        gradient={{ from: 'green', to: 'guide' }}
      >
        Content Update Resubmitted 🎉
      </Anchor>
    ),
    message: (
      <Text fz='sm'>
        Content update has been resubmitted! Check{' '}
        <Anchor
          fz='sm'
          href={`https://discord.com/channels/735260060682289254/1220411970654830743/${result?.discord_msg_id}`}
          target='_blank'
        >
          Discord
        </Anchor>{' '}
        for updates.
      </Text>
    ),
    color: 'green',
    autoClose: 5000,
  });
  return true;
}
