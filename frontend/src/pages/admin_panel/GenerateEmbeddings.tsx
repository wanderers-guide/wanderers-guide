import { generateEmbeddings } from '@ai/vector-db/generate-embeddings';
import BlurBox from '@common/BlurBox';
import { selectContent } from '@common/select/SelectContent';
import { upsertAbilityBlock } from '@content/content-creation';
import { fetchContentSources } from '@content/content-store';
import { Center, Group, Title, Select } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CreateAbilityBlockModal } from '@modals/CreateAbilityBlockModal';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlockType, ContentType } from '@typing/content';
import { useState } from 'react';

export default function GenerateEmbeddings() {
  const { data, isFetching } = useQuery({
    queryKey: [`get-content-sources`],
    queryFn: async () => {
      return await fetchContentSources({ homebrew: false });
    },
  });

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Group>
            <Title order={3}>Generate Embeddings</Title>
            <Select
              placeholder='Select content source'
              data={(data ?? []).map((source) => ({
                value: source.id + '',
                label: source.name,
              }))}
              value=''
              searchValue=''
              onChange={async (value) => {
                if (!value) return;
                await generateEmbeddings(parseInt(value));
              }}
            />
          </Group>
        </Center>
      </BlurBox>
    </>
  );
}
