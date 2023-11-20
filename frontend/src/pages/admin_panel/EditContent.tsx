import { generateEmbeddings } from '@ai/vector-db/generate-embeddings';
import BlurBox from '@common/BlurBox';
import { selectContent } from '@common/select/SelectContent';
import { findAllContentSources } from '@content/content-controller';
import { upsertAbilityBlock, upsertSpell } from '@content/content-creation';
import { convertToContentType, isAbilityBlockType } from '@content/content-utils';
import { Center, Group, Title, Select } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CreateAbilityBlockModal } from '@modals/CreateAbilityBlockModal';
import { CreateContentSourceModal } from '@modals/CreateContentSourceModal';
import { CreateSpellModal } from '@modals/CreateSpellModal';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlockType, ContentType, Spell } from '@typing/content';
import { set } from 'lodash';
import { useState } from 'react';

export default function EditContent() {

  const [sourceId, setSourceId] = useState<number | undefined>(undefined);

  const { data, isFetching } = useQuery({
    queryKey: [`get-content-sources`],
    queryFn: async () => {
      return await findAllContentSources({ homebrew: false });
    },
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
              value=''
              searchValue=''
              onChange={async (value) => {
                if (!value) return;
                setSourceId(parseInt(value));
              }}
            />
          </Group>
        </Center>
      </BlurBox>
      <CreateContentSourceModal
        opened={!!sourceId}
        editId={sourceId}
        onComplete={(source) => {
          // Update logic

          setSourceId(undefined);
        }}
        onCancel={() => setSourceId(undefined)}
      />
    </>
  );
}
