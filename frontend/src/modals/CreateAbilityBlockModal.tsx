import ActionsInput from '@common/ActionsInput';
import TraitsInput from '@common/TraitsInput';
import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { DISCORD_URL, EDIT_MODAL_HEIGHT } from '@constants/data';
import { fetchContentById, fetchTraits } from '@content/content-store';
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
  ScrollArea,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { AbilityBlock, AbilityBlockType, ActionCost, Rarity, Trait } from '@typing/content';
import { Operation } from '@typing/operations';
import { isValidImage } from '@utils/images';
import { startCase, toLabel } from '@utils/strings';
import useRefresh from '@utils/use-refresh';
import _ from 'lodash';
import { useState } from 'react';

/**
 * Modal for creating or editing an ability block
 * @param props.opened - Whether the modal is opened
 * @param props.editId - The id of the ability block being edited
 * @param props.editAbilityBlock - The ability block being edited (alternative to editId)
 * @param props.type - The type of ability block, to give context to the modal
 * @param props.onComplete - Callback when the modal is completed
 * @param props.onCancel - Callback when the modal is cancelled
 * Notes:
 * - Either supply editId or editAbilityBlock to be in editing mode
 * - If editId is supplied, the ability block with that id will be fetched
 * - If editAbilityBlock is supplied, it will be used instead of fetching
 */
export function CreateAbilityBlockModal(props: {
  opened: boolean;
  editId?: number;
  editAbilityBlock?: AbilityBlock;
  type: AbilityBlockType;
  onComplete: (abilityBlock: AbilityBlock) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();
  const editing = (props.editId !== undefined && props.editId !== -1) || props.editAbilityBlock !== undefined;

  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`get-ability-block-${props.editId}`, { editId: props.editId, editAbilityBlock: props.editAbilityBlock }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId, editAbilityBlock }] = queryKey as [
        string,
        { editId: number | undefined; editAbilityBlock: AbilityBlock | undefined },
      ];

      const abilityBlock = editId ? await fetchContentById<AbilityBlock>('ability-block', editId) : editAbilityBlock;
      if (abilityBlock && abilityBlock.type !== props.type) return null;
      if (!abilityBlock) return null;

      form.setInitialValues({
        ...abilityBlock,
        prerequisites: abilityBlock.prerequisites ?? [],
        traits: abilityBlock.traits ?? [],
        // @ts-ignore
        level: `${abilityBlock.level}`,
      });
      form.reset();
      setTraits(await fetchTraits(abilityBlock.traits));
      setMetaData(abilityBlock.meta_data ?? {});
      refreshDisplayDescription();

      return abilityBlock;
    },
    enabled: editing,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [traits, setTraits] = useState<Trait[]>([]);
  const [metaData, setMetaData] = useState<Record<string, any>>({});
  const [isValidImageURL, setIsValidImageURL] = useState(true);

  const form = useForm<AbilityBlock>({
    initialValues: {
      id: -1,
      created_at: '',
      operations: [] as Operation[] | undefined,
      name: '',
      actions: null as ActionCost,
      level: undefined as number | undefined,
      rarity: 'COMMON' as Rarity,
      prerequisites: [] as string[],
      frequency: '' as string | undefined,
      cost: '',
      trigger: '',
      requirements: '',
      access: '',
      description: '',
      special: '',
      type: props.type,
      meta_data: {},
      traits: [] as number[],
      content_source_id: -1,
      version: '1.0',
    },

    validate: {
      // level:
      // props.type === 'feat' || props.type === 'class-feature'
      //   ? // @ts-ignore
      //     (value) => (value !== undefined && value !== '' && !isNaN(+value) ? null : 'Invalid level')
      //   : undefined,
      rarity: (value) => (['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity'),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    let unselectable = metaData?.unselectable;
    let level = values.level;
    if (values.level && !isNaN(+values.level)) {
      level = +values.level;
    } else {
      level = 1;
      unselectable = true;
    }

    props.onComplete({
      ...values,
      name: values.name.trim(),
      level: level,
      traits: traits.map((trait) => trait.id),
      prerequisites: (values.prerequisites ?? []).map((prereq) => prereq.trim()),
      meta_data: {
        ...metaData,
        unselectable,
      },
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

  const miscSectionCount =
    (form.values.frequency && form.values.frequency.length > 0 ? 1 : 0) +
    (form.values.cost && form.values.cost.length > 0 ? 1 : 0) +
    (form.values.trigger && form.values.trigger.length > 0 ? 1 : 0) +
    (form.values.requirements && form.values.requirements.length > 0 ? 1 : 0) +
    (form.values.access && form.values.access.length > 0 ? 1 : 0);

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onCancel();
        onReset();
      }}
      title={
        <Title order={3}>
          {editing ? 'Edit' : 'Create'} {toLabel(props.type)}
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
      <ScrollArea h={`min(80vh, ${EDIT_MODAL_HEIGHT}px)`} pr={14} scrollbars='y'>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group wrap='nowrap' justify='space-between'>
              <Group wrap='nowrap'>
                <TextInput
                  label='Name'
                  required
                  {...form.getInputProps('name')}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text/plain');
                    if (text.toUpperCase() === text) {
                      e.preventDefault();
                      form.setFieldValue('name', startCase(text));
                    }
                  }}
                />
                {(props.type === 'action' || props.type === 'feat' || props.type === 'physical-feature') && (
                  <ActionsInput label='Actions' w={100} {...form.getInputProps('actions')} />
                )}
              </Group>

              {(props.type === 'feat' || props.type === 'class-feature') && !metaData?.unselectable && (
                <Select
                  label='Level'
                  required
                  data={Array.from({ length: 20 }, (_, i) => (i + 1).toString())}
                  w={70}
                  {...form.getInputProps('level')}
                />
              )}
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

            {props.type === 'feat' && (
              <TagsInput label='Prerequisites' splitChars={[',', ';', '|']} {...form.getInputProps('prerequisites')} />
            )}

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button variant={openedAdditional ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                    Misc. Sections
                  </Button>
                  {miscSectionCount && miscSectionCount > 0 && (
                    <Badge variant='light' color={theme.primaryColor} size='xs'>
                      {miscSectionCount}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition='left'
              onClick={toggleAdditional}
            />
            <Collapse in={openedAdditional}>
              <Stack gap={10}>
                <Textarea label='Frequency' minRows={1} maxRows={4} autosize {...form.getInputProps('frequency')} />

                <Textarea label='Cost' minRows={1} maxRows={4} autosize {...form.getInputProps('cost')} />

                <Textarea label='Trigger' minRows={1} maxRows={4} autosize {...form.getInputProps('trigger')} />

                <Textarea
                  label='Requirements'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('requirements')}
                />

                <Textarea label='Access' minRows={1} maxRows={4} autosize {...form.getInputProps('access')} />

                <Divider mx='lg' label='Advanced' labelPosition='center' />

                <TextInput
                  defaultValue={metaData.image_url ?? ''}
                  label='Image URL'
                  onChange={async (e) => {
                    setIsValidImageURL(!e.target?.value ? true : await isValidImage(e.target?.value));
                    setMetaData({
                      ...metaData,
                      image_url: e.target?.value,
                    });
                  }}
                  error={isValidImageURL ? false : 'Invalid URL'}
                />

                {props.type === 'action' && (
                  <TagsInput
                    label='Skills'
                    splitChars={[',', ';', '|']}
                    value={
                      metaData.skill
                        ? Array.isArray(metaData.skill)
                          ? metaData.skill.map((s) => _.startCase(s.toLowerCase()))
                          : [_.startCase(metaData.skill.toLowerCase())]
                        : []
                    }
                    onChange={(value) =>
                      setMetaData({
                        ...metaData,
                        skill: value,
                      })
                    }
                  />
                )}

                <Stack py='xs'>
                  {props.type === 'feat' && (
                    <Switch
                      label='Can Select Multiple Times'
                      labelPosition='left'
                      checked={metaData.can_select_multiple_times}
                      onChange={(event) =>
                        setMetaData({
                          ...metaData,
                          can_select_multiple_times: event.currentTarget.checked,
                        })
                      }
                    />
                  )}
                  <Switch
                    label='Hidden'
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

            <Textarea label='Special' minRows={1} maxRows={4} autosize {...form.getInputProps('special')} />

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button variant={openedOperations ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
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
                          Operations are used to make changes to a character. They can give feats, spells, and more, as
                          well as change stats, skills, and other values.
                        </Text>
                        <Text size='sm'>
                          Use conditionals to apply operations only when certain conditions are met and selections
                          whenever a choice needs to be made.
                        </Text>
                        <Text size='xs' fs='italic'>
                          For more help, see{' '}
                          <Anchor href={DISCORD_URL} target='_blank' underline='hover'>
                            our Discord server
                          </Anchor>
                          .
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  }
                  operations={form.values.operations}
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
              <Button type='submit'>{editing ? 'Update' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </ScrollArea>
    </Modal>
  );
}
