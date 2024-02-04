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
  Checkbox,
  Accordion,
} from '@mantine/core';
import _, { set } from 'lodash';
import { useState } from 'react';
import { AbilityBlock, AbilityBlockType, Rarity, Item, Trait, ItemGroup } from '@typing/content';
import { useQuery } from '@tanstack/react-query';
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
import { fetchContentById, fetchTraits } from '@content/content-store';
import useRefresh from '@utils/use-refresh';

export function CreateItemModal(props: {
  opened: boolean;
  editId?: number;
  onComplete: (item: Item) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();

  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`get-item-${props.editId}`, { editId: props.editId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId }] = queryKey;

      const item = await fetchContentById<Item>('item', editId);
      if (!item) return null;

      form.setInitialValues({
        ...item,
        // @ts-ignore
        level: item.level.toString(),
      });
      form.reset();
      setTraits(await fetchTraits(item.traits));
      refreshDisplayDescription();

      return item;
    },
    enabled: props.editId !== undefined && props.editId !== -1,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [traits, setTraits] = useState<Trait[]>([]);
  const [isValidImageURL, setIsValidImageURL] = useState(true);

  const form = useForm<Item>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      price: {
        cp: undefined,
        sp: undefined,
        gp: undefined,
        pp: undefined,
      },
      bulk: undefined,
      level: 0,
      rarity: 'COMMON',
      traits: [],
      description: '',
      group: 'GENERAL',
      hands: undefined,
      size: 'MEDIUM',
      craft_requirements: '',
      usage: '',
      meta_data: {
        image_url: '',
        base_item: '',
        category: '',
        damage: {
          damageType: '',
          dice: 1,
          die: 'd6',
        },
        ac_bonus: undefined,
        check_penalty: undefined,
        speed_penalty: undefined,
        dex_cap: undefined,
        strength: undefined,
        bulk: {
          capacity: undefined,
          held_or_stowed: undefined,
          ignored: undefined,
        },
        group: '',
        hardness: undefined,
        hp: undefined,
        hp_max: undefined,
        broken_threshold: undefined,
        is_shoddy: false,
        quantity: 1,
        material: {
          grade: undefined,
          type: undefined,
        },
        range: undefined,
        reload: undefined,
        runes: undefined,
        foundry: {},
      },
      operations: [],
      content_source_id: -1,
      version: '1.0',
    },

    validate: {
      level: (value) => (value !== undefined && !isNaN(+value) ? null : 'Invalid level'),
      rarity: (value) =>
        ['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
      level: values.level ? +values.level : 0,
      traits: traits.map((trait) => trait.id),
    });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    form.reset();
    setTraits([]);
    setDescription(undefined);
  };

  const miscSectionCount = 0;
  // (form.values.cost && form.values.cost.length > 0 ? 1 : 0) +
  // (form.values.trigger && form.values.trigger.length > 0 ? 1 : 0) +
  // (form.values.requirements && form.values.requirements.length > 0 ? 1 : 0) +
  // (form.values.range && form.values.range.length > 0 ? 1 : 0) +
  // (form.values.area && form.values.area.length > 0 ? 1 : 0) +
  // (form.values.targets && form.values.targets.length > 0 ? 1 : 0) +
  // (form.values.duration && form.values.duration.length > 0 ? 1 : 0) +
  // (form.values.defense && form.values.defense.length > 0 ? 1 : 0);

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
          {' Item'}
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
                <Select
                  label='Level'
                  required
                  data={Array.from({ length: 31 }, (_, i) => i.toString())}
                  w={70}
                  {...form.getInputProps('level')}
                />
              </Group>
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
            <Group wrap='nowrap'>
              <NumberInput
                label='PP'
                placeholder='Price'
                min={0}
                {...form.getInputProps('price.pp')}
              />
              <NumberInput
                label='GP'
                placeholder='Price'
                min={0}
                {...form.getInputProps('price.gp')}
              />
              <NumberInput
                label='SP'
                placeholder='Price'
                min={0}
                {...form.getInputProps('price.sp')}
              />
              <NumberInput
                label='CP'
                placeholder='Price'
                min={0}
                {...form.getInputProps('price.cp')}
              />
            </Group>
            <Group wrap='nowrap'>
              <Select
                label='Size'
                required
                data={[
                  { value: 'TINY', label: 'Tiny' },
                  { value: 'SMALL', label: 'Small' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'LARGE', label: 'Large' },
                  { value: 'HUGE', label: 'Huge' },
                  { value: 'GARGANTUAN', label: 'Gargantuan' },
                ]}
                {...form.getInputProps('size')}
              />
              <TextInput
                type='number'
                label='Bulk'
                placeholder='Bulk'
                min={0}
                {...form.getInputProps('bulk')}
              />
            </Group>
            <Group wrap='nowrap'>
              <Select
                label='Group'
                required
                data={
                  [
                    { value: 'GENERAL', label: 'General' },
                    { value: 'ARMOR', label: 'Armor' },
                    { value: 'SHIELD', label: 'Shield' },
                    { value: 'WEAPON', label: 'Weapon' },
                  ] satisfies { value: ItemGroup; label: string }[]
                }
                {...form.getInputProps('group')}
              />
              <Select
                label='Hands'
                data={[
                  { value: '1', label: '1' },
                  { value: '1+', label: '1+' },
                  { value: '2', label: '2' },
                  { value: '2+', label: '2+' },
                ]}
                {...form.getInputProps('hands')}
              />
            </Group>
            <TextInput label='Usage' placeholder='Usage' {...form.getInputProps('usage')} />
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
                {/* TODO: Base Item */}

                <Accordion variant='filled'>
                  <Accordion.Item value={'weapon'}>
                    <Accordion.Control>
                      <Text fz='sm'>Weapon</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        {/* TODO: Damage Die */}

                        {/* TODO: Damage Type */}

                        {/* TODO: Extra Damage */}

                        {/* TODO: Reload */}

                        {/* TODO: Range */}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'armor-shield'}>
                    <Accordion.Control>
                      <Text fz='sm'>Armor / Shield</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        {/* TODO: AC Bonus */}

                        {/* TODO: Category */}

                        {/* TODO: Group */}

                        {/* TODO: Check penalty */}

                        {/* TODO: Speed penalty */}

                        {/* TODO: Dex cap */}

                        {/* TODO: Strength */}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'container'}>
                    <Accordion.Control>
                      <Text fz='sm'>Container</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        {/* TODO: bulk_capacity */}

                        {/* TODO: bulk_held_or_stowed */}

                        {/* TODO: bulk_ignored */}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'runes'}>
                    <Accordion.Control>
                      <Text fz='sm'>Runes</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        {/* TODO: Striking Rune */}

                        {/* TODO: Potency Rune */}

                        {/* TODO: Property Runes */}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'hp'}>
                    <Accordion.Control>
                      <Text fz='sm'>Hit Points</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        {/* TODO: Hardness */}

                        {/* TODO: Hp_max */}

                        {/* TODO: broken_threshold */}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'material'}>
                    <Accordion.Control>
                      <Text fz='sm'>Material</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        {/* TODO: Type */}

                        {/* TODO: Grade */}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'other'}>
                    <Accordion.Control>
                      <Text fz='sm'>Other</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        <Checkbox
                          label='Is Shoddy'
                          {...form.getInputProps('meta_data.is_shoddy', { type: 'checkbox' })}
                        />

                        <NumberInput
                          label='Quantity'
                          placeholder='Quantity'
                          min={0}
                          {...form.getInputProps('meta_data.quantity')}
                        />

                        <TextInput
                          defaultValue={form.values.meta_data?.image_url ?? ''}
                          label='Image URL'
                          onChange={async (e) => {
                            setIsValidImageURL(
                              !e.target?.value ? true : await isValidImage(e.target?.value)
                            );
                            form.setFieldValue('meta_data.image_url', e.target?.value);
                          }}
                          error={isValidImageURL ? false : 'Invalid URL'}
                        />
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
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

            <TextInput
              label='Craft Requirements'
              placeholder='Craft Requirements'
              {...form.getInputProps('craft_requirements')}
            />

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
