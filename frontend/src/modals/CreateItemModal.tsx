import { ItemMultiSelect, ItemSelect } from '@common/ItemSelect';
import TraitsInput from '@common/TraitsInput';
import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { EDIT_MODAL_HEIGHT } from '@constants/data';
import { fetchContentById, fetchTraits } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Accordion,
  Anchor,
  Badge,
  Button,
  Checkbox,
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
import { Item, ItemGroup, Trait } from '@typing/content';
import { isValidImage } from '@utils/images';
import useRefresh from '@utils/use-refresh';
import { useState } from 'react';

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

  const [armorCategory, setArmorCategory] = useState('');
  const [armorGroup, setArmorGroup] = useState('');

  const [weaponCategory, setWeaponCategory] = useState('');
  const [weaponGroup, setWeaponGroup] = useState('');

  const [strikingRune, setStrikingRune] = useState<number | undefined>(0);
  const [potencyRune, setPotencyRune] = useState<number | undefined>(0);
  const [propertyRunes, setPropertyRunes] = useState<string[] | undefined>([]);

  const [baseItem, setBaseItem] = useState<string | undefined>();

  const [materialType, setMaterialType] = useState<string | undefined>();

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
          extra: '',
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
        runes: {
          striking: undefined,
          potency: undefined,
          property: [],
        },
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
      meta_data: {
        ...values.meta_data!,
        base_item: baseItem,
        material: {
          ...values.meta_data?.material,
          type: materialType,
        },
        runes: {
          striking: strikingRune,
          potency: potencyRune,
          property: propertyRunes,
        },
        category: values.group === 'WEAPON' ? weaponCategory : armorCategory,
        group: values.group === 'WEAPON' ? weaponGroup : armorGroup,
      },
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
                    { value: 'RUNE', label: 'Rune' },
                    { value: 'MATERIAL', label: 'Material' },
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
                <ItemSelect
                  label='Base Item'
                  placeholder='(for proficiencies)'
                  valueName={baseItem}
                  filter={(item) => {
                    return (
                      !item.meta_data?.base_item ||
                      item.meta_data?.base_item ===
                        item.name.trim().replace(/\s/g, '-').toLowerCase()
                    );
                  }}
                  onChange={(item, name) => {
                    setBaseItem(name);
                  }}
                />

                <Accordion variant='separated'>
                  <Accordion.Item value={'weapon'}>
                    <Accordion.Control>
                      <Text fz='sm'>Weapon</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        <Select
                          label='Damage Die'
                          data={[
                            { value: 'd2', label: 'd2' },
                            { value: 'd4', label: 'd4' },
                            { value: 'd6', label: 'd6' },
                            { value: 'd8', label: 'd8' },
                            { value: 'd10', label: 'd10' },
                            { value: 'd12', label: 'd12' },
                            { value: 'd20', label: 'd20' },
                          ]}
                          {...form.getInputProps('meta_data?.damage?.die')}
                        />

                        <TextInput
                          label='Damage Type'
                          placeholder='ex. slashing'
                          {...form.getInputProps('meta_data?.damage?.damageType')}
                        />

                        <TextInput
                          label='Extra Damage'
                          placeholder='ex. 1d4 fire'
                          {...form.getInputProps('meta_data?.damage?.extra')}
                        />

                        <Select
                          label='Category'
                          data={[
                            { value: 'simple', label: 'Simple' },
                            { value: 'martial', label: 'Martial' },
                            { value: 'advanced', label: 'Advanced' },
                            { value: 'unarmed_attack', label: 'Unarmed' },
                          ]}
                          value={weaponCategory}
                          onChange={(value) => setWeaponCategory(value ?? '')}
                        />

                        <Select
                          label='Group'
                          data={[
                            { value: 'axe', label: 'Axe' },
                            { value: 'bomb', label: 'Bomb' },
                            { value: 'bow', label: 'Bow' },
                            { value: 'brawling', label: 'Brawling' },
                            { value: 'club', label: 'Club' },
                            { value: 'crossbow', label: 'Crossbow' },
                            { value: 'dart', label: 'Dart' },
                            { value: 'flail', label: 'Flail' },
                            { value: 'hammer', label: 'Hammer' },
                            { value: 'knife', label: 'Knife' },
                            { value: 'pick', label: 'Pick' },
                            { value: 'polearm', label: 'Polearm' },
                            { value: 'shield', label: 'Shield' },
                            { value: 'sling', label: 'Sling' },
                            { value: 'spear', label: 'Spear' },
                            { value: 'sword', label: 'Sword' },
                          ]}
                          value={weaponGroup}
                          onChange={(value) => setWeaponGroup(value ?? '')}
                        />

                        <NumberInput
                          label='Range'
                          placeholder='Range'
                          min={0}
                          {...form.getInputProps('meta_data?.range')}
                        />

                        <TextInput
                          label='Reload'
                          placeholder='Reload'
                          {...form.getInputProps('meta_data?.reload')}
                        />
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'armor-shield'}>
                    <Accordion.Control>
                      <Text fz='sm'>Armor / Shield</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        <NumberInput
                          label='AC Bonus'
                          placeholder='AC Bonus'
                          {...form.getInputProps('meta_data?.ac_bonus')}
                        />

                        <Select
                          label='Category'
                          data={[
                            { value: 'light', label: 'Light' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'heavy', label: 'Heavy' },
                            { value: 'unarmored_defense', label: 'Unarmored' },
                          ]}
                          value={armorCategory}
                          onChange={(value) => setArmorCategory(value ?? '')}
                        />

                        <Select
                          label='Group'
                          data={[
                            { value: 'leather', label: 'Leather' },
                            { value: 'composite', label: 'Composite' },
                            { value: 'chain', label: 'Chain' },
                            { value: 'plate', label: 'Plate' },
                          ]}
                          value={armorGroup}
                          onChange={(value) => setArmorGroup(value ?? '')}
                        />

                        <NumberInput
                          label='Check Penalty'
                          placeholder='Check Penalty'
                          max={0}
                          {...form.getInputProps('meta_data?.check_penalty')}
                        />

                        <NumberInput
                          label='Speed Penalty'
                          placeholder='Speed Penalty'
                          max={0}
                          {...form.getInputProps('meta_data?.speed_penalty')}
                        />

                        <NumberInput
                          label='Dexterity Cap'
                          placeholder='Dexterity Cap'
                          min={0}
                          {...form.getInputProps('meta_data?.dex_cap')}
                        />

                        <NumberInput
                          label='Min Strength'
                          placeholder='Min Strength'
                          min={0}
                          {...form.getInputProps('meta_data?.strength')}
                        />
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'container'}>
                    <Accordion.Control>
                      <Text fz='sm'>Container</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        <NumberInput
                          label='Bulk Capacity'
                          placeholder='Bulk Capacity'
                          min={0}
                          {...form.getInputProps('meta_data?.bulk?.capacity')}
                        />

                        <NumberInput
                          label='Bulk Ignored'
                          placeholder='Bulk Ignored'
                          min={0}
                          {...form.getInputProps('meta_data?.bulk?.ignored')}
                        />
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'runes'}>
                    <Accordion.Control>
                      <Text fz='sm'>Runes</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        <Select
                          label='Striking Rune'
                          data={[
                            { value: '1', label: 'Striking' },
                            { value: '2', label: 'Greater Striking' },
                            { value: '3', label: 'Major Striking' },
                          ]}
                          value={strikingRune !== undefined ? `${strikingRune}` : undefined}
                          onChange={(value) => {
                            setStrikingRune(value ? +value : undefined);
                          }}
                        />

                        <Select
                          label='Potency Rune'
                          data={[
                            { value: '1', label: '+1 Potency' },
                            { value: '2', label: '+2 Potency' },
                            { value: '3', label: '+3 Potency' },
                            { value: '4', label: '+4 Potency' },
                          ]}
                          value={potencyRune !== undefined ? `${potencyRune}` : undefined}
                          onChange={(value) => {
                            setPotencyRune(value ? +value : undefined);
                          }}
                        />

                        <ItemMultiSelect
                          label='Property Runes'
                          placeholder='(limited to potency rune #)'
                          valueName={propertyRunes}
                          filter={(item) => {
                            return item.group === 'RUNE';
                          }}
                          onChange={(items, names) => {
                            setPropertyRunes(names);
                          }}
                        />
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'hp'}>
                    <Accordion.Control>
                      <Text fz='sm'>Hit Points</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        <NumberInput
                          label='Hardness'
                          placeholder='Hardness'
                          min={0}
                          {...form.getInputProps('meta_data?.hardness')}
                        />

                        <NumberInput
                          label='Max HP'
                          placeholder='Max HP'
                          min={0}
                          {...form.getInputProps('meta_data?.hp_max')}
                        />

                        <NumberInput
                          label='Broken Threshold'
                          placeholder='(typically 1/2 max HP)'
                          min={0}
                          {...form.getInputProps('meta_data?.broken_threshold')}
                        />
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={'material'}>
                    <Accordion.Control>
                      <Text fz='sm'>Material</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={10}>
                        <ItemSelect
                          label='Type'
                          placeholder='Type'
                          valueName={materialType}
                          filter={(item) => {
                            return item.group === 'MATERIAL';
                          }}
                          onChange={(item, name) => {
                            setMaterialType(name);
                          }}
                        />

                        <Select
                          label='Grade'
                          data={[
                            { value: 'low', label: 'Low' },
                            { value: 'standard', label: 'Standard' },
                            { value: 'high', label: 'High' },
                          ]}
                          {...form.getInputProps('meta_data?.material?.grade')}
                        />
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
                          {...form.getInputProps('meta_data?.is_shoddy', {
                            type: 'checkbox',
                          })}
                        />

                        <NumberInput
                          label='Quantity'
                          placeholder='Quantity'
                          min={0}
                          {...form.getInputProps('meta_data?.quantity')}
                        />

                        <NumberInput
                          label='Bulk (when held or stowed)'
                          placeholder='Bulk (when held or stowed)'
                          min={0}
                          {...form.getInputProps('meta_data?.bulk?.held_or_stowed')}
                        />

                        <TextInput
                          defaultValue={form.values.meta_data?.image_url ?? ''}
                          label='Image URL'
                          onChange={async (e) => {
                            setIsValidImageURL(
                              e.target?.value.trim() ? await isValidImage(e.target?.value) : true
                            );
                            form.setFieldValue('meta_data?.image_url', e.target?.value ?? '');
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
