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
} from '@mantine/core';
import _, { set } from 'lodash';
import { useState } from 'react';
import { AbilityBlock, AbilityBlockType, Rarity, Trait } from '@typing/content';
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

export function CreateAbilityBlockModal(props: {
  opened: boolean;
  editId?: number;
  type: AbilityBlockType;
  onComplete: (abilityBlock: AbilityBlock) => void;
  onCancel: () => void;
  options?: {
    changeSource?: boolean;
  };
}) {
  const [loading, setLoading] = useState(false);

  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);
  const [openedAdvanced, { toggle: toggleAdvanced }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`get-ability-block-${props.editId}`],
    queryFn: async () => {
      const abilityBlock = await getContent<AbilityBlock>('ability-block', props.editId!);
      if (abilityBlock && abilityBlock.type !== props.type) return null;
      if (!abilityBlock) return null;

      form.setInitialValues({
        ...abilityBlock,
        // @ts-ignore
        level: abilityBlock.level.toString(),
      });
      form.reset();
      setTraits(await getTraits(abilityBlock.traits));
      setMetaData(abilityBlock.meta_data);

      return abilityBlock;
    },
    enabled: props.editId !== undefined,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [traits, setTraits] = useState<Trait[]>([]);
  const [metaData, setMetaData] = useState<Record<string, any>>({});

  const form = useForm({
    initialValues: {
      id: -1,
      created_at: '',
      operations: [] as Operation[] | undefined,
      name: '',
      actions: null,
      level: undefined as number | undefined,
      rarity: 'COMMON',
      prerequisites: [],
      frequency: '',
      cost: '',
      trigger: '',
      requirements: '',
      access: '',
      description: '',
      special: '',
      type: 'feat',
      meta_data: {},
      traits: [],
      content_source_id: -1,
      version: '1.0',
    } satisfies AbilityBlock,

    validate: {
      level: (value) => (value !== undefined && !isNaN(+value) ? null : 'Invalid level'),
      rarity: (value) =>
        ['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
      level: values.level ? +values.level : undefined,
      traits: traits.map((trait) => trait.id),
      meta_data: metaData,
    });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    form.reset();
    setTraits([]);
    setMetaData({});
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
          {props.editId === undefined ? 'Create' : 'Edit'}{' '}
          {_.startCase(props.type.replace('-', ' '))}
        </Title>
      }
      size={openedAdvanced ? 'xl' : 'md'}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Box>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group wrap='nowrap' justify='space-between'>
              <Group wrap='nowrap'>
                <TextInput label='Name' required {...form.getInputProps('name')} />
                <ActionsInput label='Actions' w={100} {...form.getInputProps('actions')} />
              </Group>

              <Select
                label='Level'
                required
                data={Array.from({ length: 20 }, (_, i) => (i + 1).toString())}
                w={70}
                {...form.getInputProps('level')}
              />
            </Group>

            <Group wrap='nowrap' align='flex-start'>
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
              <TraitsInput
                label='Other Traits'
                value={traits.map((trait) => trait.name)}
                onTraitChange={(traits) => setTraits(traits)}
                style={{ flex: 1 }}
              />
            </Group>

            <TagsInput
              label='Prerequisites'
              splitChars={[',', ';', '|']}
              {...form.getInputProps('prerequisites')}
            />

            <Divider
              my='xs'
              label={
                <Button
                  variant={openedAdditional ? 'light' : 'subtle'}
                  size='compact-sm'
                  color='gray.6'
                >
                  Misc. Sections
                </Button>
              }
              labelPosition='left'
              onClick={toggleAdditional}
            />
            <Collapse in={openedAdditional}>
              <Stack gap={10}>
                <Textarea
                  label='Frequency'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('frequency')}
                />

                <Textarea
                  label='Cost'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('cost')}
                />

                <Textarea
                  label='Trigger'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('trigger')}
                />

                <Textarea
                  label='Requirements'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('requirements')}
                />

                <Textarea
                  label='Access'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('access')}
                />

                <Stack py='xs'>
                  <Switch
                    label='Can Select Multiple Times'
                    labelPosition='left'
                    checked={metaData.canSelectMultipleTimes}
                    onChange={(event) =>
                      setMetaData({
                        ...metaData,
                        canSelectMultipleTimes: event.currentTarget.checked,
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
                </Stack>

                <Divider />
              </Stack>
            </Collapse>

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

            <Textarea
              label='Special'
              minRows={1}
              maxRows={4}
              autosize
              {...form.getInputProps('special')}
            />

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button
                    variant={openedAdvanced ? 'light' : 'subtle'}
                    size='compact-sm'
                    color='gray.6'
                  >
                    Operations
                  </Button>
                  {form.values.operations && form.values.operations.length > 0 && (
                    <Badge variant='light' color='blue' size='xs'>
                      {form.values.operations.length}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition='left'
              onClick={toggleAdvanced}
            />
            <Collapse in={openedAdvanced}>
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
              <Button type='submit'>{props.editId === undefined ? 'Create' : 'Update'}</Button>
            </Group>
          </Stack>
        </form>
      </Box>
    </Modal>
  );
}
