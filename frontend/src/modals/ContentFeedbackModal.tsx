import { Text, TextInput, Stack, Button, Group, Loader, Avatar } from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import { Character, ContentSource, ContentType } from '@typing/content';
import _ from 'lodash';
import { isValidImage } from '@utils/images';
import { useState } from 'react';
import { DrawerType } from '@typing/index';
import { useQuery } from '@tanstack/react-query';
import { IconBook2, IconHash, IconStar } from '@tabler/icons-react';
import { getIconFromContentType } from '@content/content-utils';
import { fetchContentById } from '@content/content-store';

export function ContentFeedbackModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  type: ContentType;
  data: any;
}>) {
  const contentId = innerProps.data.id as number | undefined;

  const { data, isFetching } = useQuery({
    queryKey: [`find-content-${innerProps.type}-${contentId}`],
    queryFn: async () => {
      const content = await fetchContentById(innerProps.type, contentId!);
      const source = content
        ? await fetchContentById<ContentSource>('content-source', content.content_source_id)
        : null;
      return {
        content,
        source,
      };
    },
    enabled: !!contentId,
  });

  if (!data || isFetching)
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );

  if (!data.content || !data.source) return <Text>Content not found</Text>;

  return (
    <Stack style={{ position: 'relative' }}>
      <div>
        <Group wrap='nowrap'>
          <Avatar size={94} radius='md' src={data.content?.meta_data?.image_url}>
            {getIconFromContentType(innerProps.type, '4.5rem')}
          </Avatar>
          <div>
            <Text fz='xs' tt='uppercase' fw={700} c='dimmed'>
              {data.content.type || innerProps.type}
            </Text>

            <Text fz='lg' fw={500}>
              {data.content.name}
            </Text>

            <Group wrap='nowrap' gap={10} mt={3}>
              <IconBook2 stroke={1.5} size='1rem' />
              <Text fz='xs' c='dimmed'>
                {data.source.name}
              </Text>
            </Group>

            <Group wrap='nowrap' gap={10} mt={5}>
              <IconHash stroke={1.5} size='1rem' />
              <Text fz='xs' c='dimmed'>
                {data.content.id}
              </Text>
            </Group>
          </div>
        </Group>
      </div>
      <Group justify='center'>
        <Button fullWidth variant='light' onClick={() => {
          
        }}>
          Submit Content Update
        </Button>
      </Group>
    </Stack>
  );
}
