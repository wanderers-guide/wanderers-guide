import RichTextInput from '@common/rich_text_input/RichTextInput';
import { fetchContentById } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Button,
  Collapse,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Stack,
  Switch,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { Trait } from '@typing/content';
import useRefresh from '@utils/use-refresh';
import { useState } from 'react';

export function CreateTraitModal(props: {
  opened: boolean;
  editId?: number;
  onComplete: (trait: Trait) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();

  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`get-trait-${props.editId}`, { editId: props.editId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId }] = queryKey;

      const trait = await fetchContentById<Trait>('trait', editId);
      if (!trait) return null;

      form.setInitialValues({
        ...trait,
      });
      form.reset();
      if (trait.meta_data) {
        setMetaData({
          important: trait.meta_data.important ?? false,
          creature_trait: trait.meta_data.creature_trait ?? false,
          unselectable: trait.meta_data.unselectable ?? false,
          class_trait: trait.meta_data.class_trait ?? false,
          ancestry_trait: trait.meta_data.ancestry_trait ?? false,
        });
      }
      refreshDisplayDescription();

      return trait;
    },
    enabled: props.editId !== undefined && props.editId !== -1,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [metaData, setMetaData] = useState({
    important: false,
    creature_trait: false,
    unselectable: false,
    class_trait: false,
    ancestry_trait: false,
  });

  const form = useForm<Trait>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      description: '',
      meta_data: {
        important: false,
        creature_trait: false,
        unselectable: false,
        class_trait: false,
        ancestry_trait: false,
      },
      content_source_id: -1,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
      meta_data: metaData,
    });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    form.reset();
    setMetaData({
      important: false,
      creature_trait: false,
      unselectable: false,
      class_trait: false,
      ancestry_trait: false,
    });
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
          {props.editId === undefined || props.editId === -1 ? 'Create' : 'Edit'} Trait
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
      <ScrollArea pr={14} scrollbars='y'>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group wrap='nowrap' justify='space-between'>
              <Group wrap='nowrap'>
                <TextInput label='Name' required {...form.getInputProps('name')} />
              </Group>
            </Group>

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button
                    variant={openedAdditional ? 'light' : 'subtle'}
                    size='compact-sm'
                    color='gray.6'
                  >
                    Misc. Sections
                  </Button>
                </Group>
              }
              labelPosition='left'
              onClick={toggleAdditional}
            />
            <Collapse in={openedAdditional}>
              <Stack gap={10}>
                <Switch
                  label='Important'
                  labelPosition='left'
                  checked={metaData.important}
                  onChange={(event) =>
                    setMetaData({
                      ...metaData,
                      important: event.currentTarget.checked,
                    })
                  }
                />

                <Switch
                  label='Unselectable'
                  labelPosition='left'
                  checked={metaData.unselectable}
                  onChange={(event) =>
                    setMetaData({
                      ...metaData,
                      unselectable: event.currentTarget.checked,
                    })
                  }
                />

                <Switch
                  label='Creature Trait'
                  labelPosition='left'
                  checked={metaData.creature_trait}
                  onChange={(event) =>
                    setMetaData({
                      ...metaData,
                      creature_trait: event.currentTarget.checked,
                    })
                  }
                />

                <Switch
                  label='Ancestry Trait'
                  labelPosition='left'
                  checked={metaData.ancestry_trait}
                  onChange={(event) =>
                    setMetaData({
                      ...metaData,
                      ancestry_trait: event.currentTarget.checked,
                    })
                  }
                />

                <Switch
                  label='Class Trait'
                  labelPosition='left'
                  checked={metaData.class_trait}
                  onChange={(event) =>
                    setMetaData({
                      ...metaData,
                      class_trait: event.currentTarget.checked,
                    })
                  }
                />

                <Divider />
              </Stack>
            </Collapse>

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
              <Button type='submit'>
                {props.editId === undefined || props.editId === -1 ? 'Create' : 'Update'}
              </Button>
            </Group>
          </Stack>
        </form>
      </ScrollArea>
    </Modal>
  );
}
