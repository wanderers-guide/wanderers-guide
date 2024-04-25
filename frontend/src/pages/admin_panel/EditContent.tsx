import BlurBox from '@common/BlurBox';
import { defineDefaultSources, fetchContentSources } from '@content/content-store';
import { Center, Group, Select, Title } from '@mantine/core';
import { CreateContentSourceModal } from '@modals/CreateContentSourceModal';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function EditContent() {
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);

  const { data, isFetching } = useQuery({
    queryKey: [`get-content-sources`],
    queryFn: async () => {
      const sources = await fetchContentSources({ homebrew: false, ids: 'all' });
      defineDefaultSources(sources.map((source) => source.id));
      return sources;
    },
    refetchInterval: 1000,
  });

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Group>
            <Title order={3}>Edit Content</Title>
            <Select
              placeholder='Select content source'
              data={(data ?? []).map((source) => ({
                value: source.id + '',
                label: source.name,
              }))}
              searchable
              value=''
              onChange={async (value) => {
                if (!value) return;
                setSourceId(parseInt(value));
              }}
            />
          </Group>
        </Center>
      </BlurBox>
      {sourceId && (
        <CreateContentSourceModal opened={true} sourceId={sourceId} onClose={() => setSourceId(undefined)} />
      )}
    </>
  );
}
