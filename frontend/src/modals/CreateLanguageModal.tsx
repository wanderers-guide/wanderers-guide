import RichTextInput from '@common/rich_text_input/RichTextInput';
import { fetchContentById } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Button,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Stack,
  Select,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { Availability, Language, Rarity } from '@typing/content';
import useRefresh from '@utils/use-refresh';
import { useState } from 'react';

export function CreateLanguageModal(props: {
  opened: boolean;
  editId?: number;
  editLanguage?: Language;
  onComplete: (language: Language) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();
  const editing = (props.editId !== undefined && props.editId !== -1) || props.editLanguage !== undefined;

  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const { data, isFetching } = useQuery({
    queryKey: [`get-language-${props.editId}`, { editId: props.editId, editLanguage: props.editLanguage }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId, editLanguage }] = queryKey as [string, { editId?: number; editLanguage?: Language }];

      const language = editId ? await fetchContentById<Language>('language', editId) : editLanguage;
      if (!language) return null;

      form.setInitialValues({
        ...language,
      });
      form.reset();
      refreshDisplayDescription();

      return language;
    },
    enabled: editing,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();

  const form = useForm<Language>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      speakers: '',
      script: '',
      description: '',
      rarity: 'COMMON' as Rarity,
      availability: undefined as Availability | undefined,
      content_source_id: -1,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
    });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    form.reset();
    setDescription(undefined);
  };

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onCancel();
        onReset();
      }}
      title={<Title order={3}>{editing ? 'Edit' : 'Create'} Language</Title>}
      styles={{
        body: {
          paddingRight: 2,
        },
      }}
      size={'md'}
      closeOnClickOutside={false}
      closeOnEscape={false}
      keepMounted={false}
    >
      <ScrollArea pr={14} scrollbars='y'>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group wrap='nowrap'>
              <TextInput label='Name' required {...form.getInputProps('name')} />
              <TextInput label='Speakers' {...form.getInputProps('speakers')} />
            </Group>
            <Group>
              <TextInput label='Script' {...form.getInputProps('script')} />
              <Select
                label='Rarity'
                required
                data={[
                  { value: 'COMMON', label: 'Common' },
                  { value: 'UNCOMMON', label: 'Uncommon' },
                  { value: 'RARE', label: 'Rare' },
                  { value: 'UNIQUE', label: 'Unique' },
                ]}
                w={140}
                {...form.getInputProps('rarity')}
              />
              <Select
                label='Availability'
                data={[
                  { value: 'STANDARD', label: 'Standard' },
                  { value: 'LIMITED', label: 'Limited' },
                  { value: 'RESTRICTED', label: 'Restricted' },
                ]}
                w={140}
                {...form.getInputProps('availability')}
              />
            </Group>

            {displayDescription && (
              <RichTextInput
                label='Description'
                required
                value={description ?? toHTML(form.values.description)}
                onChange={(text, json) => {
                  setDescription(json);
                  form.setFieldValue('description', text);
                }}
              />
            )}

            <Group justify='flex-end'>
              <Button
                variant='default'
                onClick={() => {
                  props.onCancel();
                  onReset();
                }}
              >
                Cancel
              </Button>
              <Button type='submit'>{editing ? 'Update' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </ScrollArea>
    </Modal>
  );
}
