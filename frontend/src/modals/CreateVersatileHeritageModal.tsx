import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { SelectContentButton } from '@common/select/SelectContent';
import { DISCORD_URL, EDIT_MODAL_HEIGHT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Anchor,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  HoverCard,
  LoadingOverlay,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { AbilityBlock, VersatileHeritage, Rarity } from '@typing/content';
import { Operation } from '@typing/operations';
import { isValidImage } from '@utils/images';
import { hasTraitType } from '@utils/traits';
import useRefresh from '@utils/use-refresh';
import { useState } from 'react';

export function CreateVersatileHeritageModal(props: {
  opened: boolean;
  editId?: number;
  onComplete: (versatileHeritage: VersatileHeritage) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();

  const { data, isFetching } = useQuery({
    queryKey: [`get-versatile-heritage-${props.editId}`, { editId: props.editId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId }] = queryKey;

      const versatileHeritage = await fetchContentById<VersatileHeritage>('versatile-heritage', editId);
      if (!versatileHeritage) return null;

      form.setInitialValues({
        ...versatileHeritage,
      });
      form.reset();
      refreshDisplayDescription();

      return versatileHeritage;
    },
    enabled: props.editId !== undefined && props.editId !== -1,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [isValidImageURL, setIsValidImageURL] = useState(true);
  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const form = useForm<VersatileHeritage>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      rarity: 'COMMON' as Rarity,
      description: '',
      trait_id: -1,
      heritage_id: -1,
      artwork_url: '',
      content_source_id: -1,
      version: '1.0',
    },

    validate: {
      rarity: (value) => (['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity'),
      heritage_id: (value) => (value === -1 ? 'Heritage is required' : null),
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
      title={
        <Title order={3}>
          {props.editId === undefined || props.editId === -1 ? 'Create' : 'Edit'}
          {' Versatile Heritage'}
        </Title>
      }
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
      <ScrollArea h={`min(80vh, ${EDIT_MODAL_HEIGHT}px)`} pr={14} scrollbars='y'>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group wrap='nowrap' justify='space-between'>
              <Group wrap='nowrap'>
                <TextInput label='Name' required {...form.getInputProps('name')} />
              </Group>
              <Select
                label='Rarity'
                required
                data={[
                  { value: 'COMMON', label: 'Common' },
                  { value: 'UNCOMMON', label: 'Uncommon' },
                  { value: 'RARE', label: 'Rare' },
                  { value: 'UNIQUE', label: 'Unique' },
                ]}
                w={170}
                {...form.getInputProps('rarity')}
              />
            </Group>

            <TextInput
              defaultValue={form.values.artwork_url ?? ''}
              label='Image URL'
              onChange={async (e) => {
                setIsValidImageURL(!e.target?.value ? true : await isValidImage(e.target?.value));
                form.setFieldValue('artwork_url', e.target?.value);
              }}
              error={isValidImageURL ? false : 'Invalid URL'}
            />

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

            <SelectContentButton<AbilityBlock>
              type='ability-block'
              onClick={(feat) => {
                form.setFieldValue('heritage_id', feat.id);
              }}
              options={{
                overrideLabel: 'Select a Heritage',
                abilityBlockType: 'heritage',
              }}
              selectedId={form.values.heritage_id}
            />

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
              <Button type='submit'>{props.editId === undefined || props.editId === -1 ? 'Create' : 'Update'}</Button>
            </Group>
          </Stack>
        </form>
      </ScrollArea>
    </Modal>
  );
}
