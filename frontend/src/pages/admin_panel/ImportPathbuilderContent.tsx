import BlurBox from '@common/BlurBox';
import { fetchContentSources, defineDefaultSources } from '@content/content-store';
import { importFromCustomPack } from '@homebrew/import/pathbuilder-custom-packs';
import { Center, Group, Title, Select, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { showNotification } from '@mantine/notifications';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function ImportPathbuilderContent() {
  const [uploading, setUploading] = useState(false);
  const [sourceId, setSourceId] = useState<number | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: [`get-content-sources`],
    queryFn: async () => {
      const sources = await fetchContentSources({ homebrew: false, ids: 'all' });
      defineDefaultSources(sources.map((source) => source.id));
      return sources;
    },
    refetchInterval: 1000,
  });

  const startUpload = async (files: FileWithPath[]) => {
    if (!sourceId) return;
    if (uploading) return;
    setTimeout(async () => {
      setUploading(true);
      for (const file of files) {
        await importFromCustomPack(sourceId, file);
      }
      setUploading(false);
      showNotification({
        title: 'Import Complete',
        message: 'Files have been imported.',
        autoClose: 3000,
      });
    }, 1000);
  };

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Group>
            <Title order={3}>Import Custom Pack</Title>
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
                const sourceId = parseInt(value);
                setSourceId(sourceId);
              }}
            />
          </Group>
        </Center>
      </BlurBox>

      {sourceId ? (
        <Dropzone
          onDrop={(files) => startUpload(files)}
          onReject={(files) => console.log('rejected files', files)}
          maxSize={3 * 1024 ** 2}
          accept={['application/json']}
        >
          <Group justify='center' gap='xl' mih={220} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload
                style={{
                  width: rem(52),
                  height: rem(52),
                  color: 'var(--mantine-color-blue-6)',
                }}
                stroke={1.5}
              />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX
                style={{
                  width: rem(52),
                  height: rem(52),
                  color: 'var(--mantine-color-red-6)',
                }}
                stroke={1.5}
              />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconPhoto
                style={{
                  width: rem(52),
                  height: rem(52),
                  color: 'var(--mantine-color-dimmed)',
                }}
                stroke={1.5}
              />
            </Dropzone.Idle>

            <div>
              <Text size='xl' inline>
                Drag JSON files here or click to select files
              </Text>
              <Text size='sm' c='dimmed' inline mt={7}>
                Attach as many files as you like, each file should not exceed 5mb
              </Text>
            </div>
          </Group>
        </Dropzone>
      ) : (
        <></>
      )}
    </>
  );
}
