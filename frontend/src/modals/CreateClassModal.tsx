import {
  LoadingOverlay,
  Box,
  Modal,
  Stack,
  Group,
  TextInput,
  Select,
  Button,
  Divider,
  Collapse,
  Switch,
  TagsInput,
  Textarea,
  Text,
  Anchor,
  HoverCard,
  Title,
  Badge,
  ScrollArea,
  Autocomplete,
  CloseButton,
  Tooltip,
  useMantineTheme,
  NumberInput,
} from '@mantine/core';
import _, { set } from 'lodash';
import { useState } from 'react';
import { AbilityBlock, AbilityBlockType, Class, Rarity, Spell, Trait } from '@typing/content';
import { useQuery } from '@tanstack/react-query';
import { getContent, getTraits } from '@content/content-controller';
import { useForm } from '@mantine/form';
import TraitsInput from '@common/TraitsInput';
import { useDisclosure } from '@mantine/hooks';
import { Operation } from '@typing/operations';
import ActionsInput from '@common/ActionsInput';
import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { JSONContent } from '@tiptap/react';
import { toHTML } from '@content/content-utils';
import { isValidImage } from '@utils/images';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import { toLabel } from '@utils/strings';

export function CreateClassModal(props: {
  opened: boolean;
  editId?: number;
  onComplete: (class_: Class) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();

  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`get-class-${props.editId}`, { editId: props.editId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId }] = queryKey;

      const class_ = await getContent<Class>('class', editId);
      if (!class_) return null;

      form.setInitialValues({
        ...class_,
      });
      form.reset();

      return class_;
    },
    enabled: props.editId !== undefined && props.editId !== -1,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [isValidImageURL, setIsValidImageURL] = useState(true);

  const form = useForm({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      rarity: 'COMMON' as Rarity,
      description: '',
      operations: [] as Operation[] | undefined,
      key_attribute: '',
      hp: 0,
      trait_id: -1,
      artwork_url: '',
      content_source_id: -1,
      version: '1.0',
    } satisfies Class,

    validate: {
      rarity: (value) =>
        ['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity',
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
          {' Class'}
        </Title>
      }
      styles={{
        body: {
          paddingRight: 2,
        },
      }}
      size={openedOperations ? 'xl' : 'md'}
      closeOnClickOutside={false}
      closeOnEscape={false}
      keepMounted={false}
    >
      <ScrollArea h={`min(80vh, ${EDIT_MODAL_HEIGHT}px)`} pr={14}>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group wrap='nowrap' justify='space-between'>
              <Group wrap='nowrap'>
                <TextInput label='Name' required {...form.getInputProps('name')} />
              </Group>
              <Select
                label='Key Attribute'
                required
                w={140}
                {...form.getInputProps('key_attribute')}
                data={[
                  'STR',
                  'DEX',
                  'CON',
                  'INT',
                  'WIS',
                  'CHA',
                  'STR/DEX',
                  'INT/WIS',
                  'WIS/CHA',
                  'VARIES',
                ]}
              />
            </Group>
            <Group wrap='nowrap' justify='space-between'>
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
              <NumberInput label='HP' required {...form.getInputProps('hp')} w={140} />
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

            {(description || form.values.description) && (
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

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button
                    variant={openedOperations ? 'light' : 'subtle'}
                    size='compact-sm'
                    color='gray.6'
                  >
                    Operations
                  </Button>
                  {form.values.operations && form.values.operations.length > 0 && (
                    <Badge variant='light' color={theme.primaryColor} size='xs'>
                      {form.values.operations.length}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition='left'
              onClick={toggleOperations}
            />
            <Collapse in={openedOperations}>
              <Stack gap={10}>
                <OperationSection
                  title={
                    <HoverCard openDelay={250} width={260} shadow='md' withinPortal>
                      <HoverCard.Target>
                        <Anchor target='_blank' underline='hover' fz='sm' fs='italic'>
                          How to Use Operations
                        </Anchor>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Text size='sm'>
                          Operations are used to make changes to a character. They can give feats,
                          spells, and more, as well as change stats, skills, and other values.
                        </Text>
                        <Text size='sm'>
                          Use conditionals to apply operations only when certain conditions are met
                          and selections whenever a choice needs to be made.
                        </Text>
                        <Text size='xs' fs='italic'>
                          For more help, see{' '}
                          <Anchor
                            href='https://discord.gg/kxCpa6G'
                            target='_blank'
                            underline='hover'
                          >
                            our Discord server
                          </Anchor>
                          .
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  }
                  value={form.values.operations}
                  onChange={(operations) => form.setValues({ ...form.values, operations })}
                />
                <Divider />
              </Stack>
            </Collapse>

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
