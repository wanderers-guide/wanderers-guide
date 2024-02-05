import TraitsInput from '@common/TraitsInput';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import { fetchContentById, fetchTraits } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Autocomplete,
  Badge,
  Button,
  CloseButton,
  Collapse,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Switch,
  TagsInput,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { Spell, Trait } from '@typing/content';
import { isValidImage } from '@utils/images';
import useRefresh from '@utils/use-refresh';
import _ from 'lodash-es';
import { useState } from 'react';

export function CreateSpellModal(props: {
  opened: boolean;
  editId?: number;
  editSpell?: Spell;
  onComplete: (spell: Spell) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();
  const editing =
    (props.editId !== undefined && props.editId !== -1) || props.editSpell !== undefined;

  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);
  const [openedHeightened, { toggle: toggleHeightened }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`get-spell-${props.editId}`, { editId: props.editId, editSpell: props.editSpell }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId, editSpell }] = queryKey as [
        string,
        { editId?: number; editSpell?: Spell }
      ];

      const spell = editId ? await fetchContentById<Spell>('spell', editId) : editSpell;
      if (!spell) return null;

      form.setInitialValues({
        ..._.merge(form.values, spell),
        // @ts-ignore
        rank: spell.rank.toString(),
      });
      form.reset();
      setTraits(await fetchTraits(spell.traits));
      setMetaData(spell.meta_data ?? {});
      refreshDisplayDescription();

      return spell;
    },
    enabled: editing,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [traits, setTraits] = useState<Trait[]>([]);
  const [metaData, setMetaData] = useState<Record<string, any>>({});
  const [isValidImageURL, setIsValidImageURL] = useState(true);

  const form = useForm<Spell>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      rank: 0,
      traditions: [],
      rarity: 'COMMON',
      cast: null,
      defense: '',
      cost: '',
      trigger: '',
      requirements: '',
      range: '',
      area: '',
      targets: '',
      duration: '',
      description: '',
      heightened: {
        text: [] as {
          amount: string;
          text: string;
        }[],
        data: {},
      },
      meta_data: {},
      traits: [],
      content_source_id: -1,
      version: '1.0',
    },

    validate: {
      rank: (value) => (value !== undefined && !isNaN(+value) ? null : 'Invalid rank'),
      rarity: (value) =>
        ['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
      rank: values.rank ? +values.rank : 0,
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

  const miscSectionCount =
    (form.values.cost && form.values.cost.length > 0 ? 1 : 0) +
    (form.values.trigger && form.values.trigger.length > 0 ? 1 : 0) +
    (form.values.requirements && form.values.requirements.length > 0 ? 1 : 0) +
    (form.values.range && form.values.range.length > 0 ? 1 : 0) +
    (form.values.area && form.values.area.length > 0 ? 1 : 0) +
    (form.values.targets && form.values.targets.length > 0 ? 1 : 0) +
    (form.values.duration && form.values.duration.length > 0 ? 1 : 0) +
    (form.values.defense && form.values.defense.length > 0 ? 1 : 0);

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onCancel();
        onReset();
      }}
      title={
        <Title order={3}>
          {editing ? 'Edit' : 'Create'}
          {' Spell'}
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
                <Select
                  label='Cast'
                  clearable
                  w={100}
                  data={[
                    { value: 'ONE-ACTION', label: '◆' },
                    { value: 'TWO-ACTIONS', label: '◆◆' },
                    { value: 'THREE-ACTIONS', label: '◆◆◆' },
                    { value: 'FREE-ACTION', label: '◇' },
                    { value: 'REACTION', label: '⤾' },
                    { value: 'ONE-TO-TWO-ACTIONS', label: '◆ - ◆◆' },
                    { value: 'ONE-TO-THREE-ACTIONS', label: '◆ - ◆◆◆' },
                    { value: 'TWO-TO-THREE-ACTIONS', label: '◆◆ - ◆◆◆' },
                    { value: 'TWO-TO-TWO-ROUNDS', label: '◆◆ - 2 rounds' },
                    { value: 'TWO-TO-THREE-ROUNDS', label: '◆◆ - 3 rounds' },
                    { value: 'THREE-TO-TWO-ROUNDS', label: '◆◆◆ - 2 rounds' },
                    { value: 'THREE-TO-THREE-ROUNDS', label: '◆◆◆ - 3 rounds' },
                    { value: '2 rounds', label: '2 rounds' },
                    { value: '3 rounds', label: '3 rounds' },
                    { value: '1 minute', label: '1 minute' },
                    { value: '5 minutes', label: '5 minutes' },
                    { value: '10 minutes', label: '10 minutes' },
                    { value: '30 minutes', label: '30 minutes' },
                    { value: '1 hour', label: '1 hour' },
                    { value: '8 hours', label: '8 hours' },
                    { value: '24 hours', label: '24 hours' },
                  ]}
                  {...form.getInputProps('cast')}
                />
              </Group>

              <Select
                label='Rank'
                required
                data={Array.from({ length: 10 }, (_, i) => (i + 1).toString())}
                w={70}
                {...form.getInputProps('rank')}
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
                label='Traits'
                value={traits.map((trait) => trait.name)}
                onTraitChange={(traits) => setTraits(traits)}
                style={{ flex: 1 }}
              />
            </Group>
            <TagsInput
              label='Traditions'
              splitChars={[',', ';', '|']}
              {...form.getInputProps('traditions')}
              data={['arcane', 'divine', 'occult', 'primal']}
            />
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
                  label='Range'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('range')}
                />

                <Textarea
                  label='Area'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('area')}
                />

                <Textarea
                  label='Targets'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('targets')}
                />

                <Autocomplete
                  label='Defense'
                  data={[
                    'AC',
                    'Fortitude',
                    'Reflex',
                    'Will',
                    'basic Fortitude',
                    'basic Reflex',
                    'basic Will',
                  ]}
                  {...form.getInputProps('defense')}
                />

                <Textarea
                  label='Duration'
                  minRows={1}
                  maxRows={4}
                  autosize
                  {...form.getInputProps('duration')}
                />

                <Divider mx='lg' label='Advanced' labelPosition='center' />

                <Stack py='xs'>
                  <Switch
                    label='Focus Spell'
                    labelPosition='left'
                    checked={metaData.unselectable}
                    onChange={(event) =>
                      setMetaData({
                        ...metaData,
                        focus: event.currentTarget.checked,
                      })
                    }
                  />
                </Stack>

                <TextInput
                  defaultValue={metaData.image_url ?? ''}
                  label='Image URL'
                  onChange={async (e) => {
                    setIsValidImageURL(
                      !e.target?.value ? true : await isValidImage(e.target?.value)
                    );
                    setMetaData({
                      ...metaData,
                      image_url: e.target?.value,
                    });
                  }}
                  error={isValidImageURL ? false : 'Invalid URL'}
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

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button
                    variant={openedHeightened ? 'light' : 'subtle'}
                    size='compact-sm'
                    color='gray.6'
                  >
                    Heightened
                  </Button>
                  {form.values.heightened?.text && form.values.heightened.text.length > 0 && (
                    <Badge variant='light' color={theme.primaryColor} size='xs'>
                      {form.values.heightened.text.length}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition='left'
              onClick={toggleHeightened}
            />
            <Collapse in={openedHeightened}>
              <Stack gap={10}>
                {(form.values.heightened?.text ?? []).map((option, index) => (
                  <Stack key={index}>
                    <Group justify='space-between'>
                      <Select
                        w={150}
                        label='Heighten Amount'
                        clearable
                        data={[
                          { label: '+1', value: '(+1)' },
                          { label: '+2', value: '(+2)' },
                          { label: '+3', value: '(+3)' },
                          { label: '+4', value: '(+4)' },
                          { label: '2nd', value: '(2nd)' },
                          { label: '3rd', value: '(3rd)' },
                          { label: '4th', value: '(4th)' },
                          { label: '5th', value: '(5th)' },
                          { label: '6th', value: '(6th)' },
                          { label: '7th', value: '(7th)' },
                          { label: '8th', value: '(8th)' },
                          { label: '9th', value: '(9th)' },
                          { label: '10th', value: '(10th)' },
                        ]}
                        value={option.amount}
                        onChange={(value) => {
                          if (!value) return;
                          let ops = [...(form.values.heightened?.text ?? [])];
                          ops[index].amount = value;
                          form.setFieldValue('heightened', {
                            text: ops,
                            data: form.values.heightened?.data ?? {},
                          });
                        }}
                      />
                      <Tooltip label='Remove Heighten'>
                        <CloseButton
                          mt={40}
                          mr={5}
                          onClick={() => {
                            const ops = [...(form.values.heightened?.text ?? [])].filter(
                              (op) => op.amount !== option.amount
                            );
                            form.setFieldValue('heightened', {
                              text: ops,
                              data: form.values.heightened?.data ?? {},
                            });
                          }}
                        />
                      </Tooltip>
                    </Group>
                    <RichTextInput
                      label='Heighten Description'
                      required
                      value={toHTML(option.text)}
                      onChange={(text, json) => {
                        let ops = [...(form.values.heightened?.text ?? [])];
                        ops[index].text = text;
                        form.setFieldValue('heightened', {
                          text: ops,
                          data: form.values.heightened?.data ?? {},
                        });
                      }}
                    />
                  </Stack>
                ))}
                <Button
                  onClick={() => {
                    const ops = [...(form.values.heightened?.text ?? [])];
                    ops.push({
                      amount: '',
                      text: '',
                    });
                    form.setFieldValue('heightened', {
                      text: ops,
                      data: form.values.heightened?.data ?? {},
                    });
                  }}
                  variant='light'
                  size='compact-sm'
                  fullWidth
                >
                  Add Heightening
                </Button>
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
