import { SelectIcon } from '@common/IconDisplay';
import { ItemMultiSelect, ItemSelect } from '@common/ItemSelect';
import TraitsInput from '@common/TraitsInput';
import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { selectContent } from '@common/select/SelectContent';
import { DISCORD_URL, EDIT_MODAL_HEIGHT } from '@constants/data';
import { fetchContentById, fetchTraits } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Accordion,
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  HoverCard,
  LoadingOverlay,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { getArmorSpecializations } from '@specializations/armor-specializations';
import { IconCirclePlus, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { Availability, Item, ItemGroup, Trait } from '@typing/content';
import { isValidImage } from '@utils/images';
import { toLabel } from '@utils/strings';
import useRefresh from '@utils/use-refresh';
import { labelToVariable } from '@variables/variable-utils';
import { merge, truncate } from 'lodash-es';
import { useState } from 'react';

/**
 * Modal for creating or editing an item
 * @param props.opened - Whether the modal is opened
 * @param props.editId - The id of the item being edited
 * @param props.editItem - The item being edited (alternative to editId)
 * @param props.onComplete - Callback when the modal is completed
 * @param props.onCancel - Callback when the modal is cancelled
 * Notes:
 * - Either supply editId or editItem to be in editing mode
 * - If editId is supplied, the item with that id will be fetched
 * - If editItem is supplied, it will be used instead of fetching
 */
export function CreateItemModal(props: {
  opened: boolean;
  editId?: number;
  editItem?: Item;
  zIndex?: number;
  onComplete: (item: Item) => void;
  onCancel: () => void;
  onNameBlur?: (name: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();
  const editing = (props.editId !== undefined && props.editId !== -1) || props.editItem !== undefined;

  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const { data, isFetching } = useQuery({
    queryKey: [`get-item-${props.editId}`, { editId: props.editId, editItem: props.editItem }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId, editItem }] = queryKey as [string, { editId?: number; editItem?: Item }];

      const item = editId ? await fetchContentById<Item>('item', editId) : editItem;
      if (!item) return null;

      // Remove base item if it's the same as the item being edited
      if (item.meta_data?.base_item && labelToVariable(item.name) === labelToVariable(item.meta_data.base_item)) {
        item.meta_data.base_item = undefined;
        item.meta_data.base_item_content = undefined;
      }

      const mergeData = merge(form.values, item);
      const damageData = merge(form.values.meta_data?.damage, item.meta_data?.damage);

      form.setInitialValues({
        ...mergeData,
        // @ts-ignore
        level: item.level.toString(),
        meta_data: {
          ...(mergeData.meta_data ?? {
            bulk: {},
            foundry: {},
          }),
          damage: damageData,
        },
      });
      form.reset();
      setTraits(await fetchTraits(item.traits));
      setArmorCategory(item.meta_data?.category ?? '');
      setArmorGroup(item.meta_data?.group ?? '');
      setWeaponCategory(item.meta_data?.category ?? '');
      setWeaponGroup(item.meta_data?.group ?? '');
      setStrikingRune(item.meta_data?.runes?.striking);
      setResilientRune(item.meta_data?.runes?.resilient);
      setPotencyRune(item.meta_data?.runes?.potency);
      setPropertyRunes(item.meta_data?.runes?.property);
      setBaseItem(item.meta_data?.base_item);
      setBaseItemContent(item.meta_data?.base_item_content);
      setMaterialType(item.meta_data?.material?.type);
      refreshDisplayDescription();

      return item;
    },
    enabled: editing,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [traits, setTraits] = useState<Trait[]>([]);

  const [armorCategory, setArmorCategory] = useState('');
  const [armorGroup, setArmorGroup] = useState('');

  const [weaponCategory, setWeaponCategory] = useState('');
  const [weaponGroup, setWeaponGroup] = useState('');

  const [strikingRune, setStrikingRune] = useState<number | undefined>(0);
  const [resilientRune, setResilientRune] = useState<number | undefined>(0);
  const [potencyRune, setPotencyRune] = useState<number | undefined>(0);
  const [propertyRunes, setPropertyRunes] = useState<{ name: string; id: number; rune?: Item }[] | undefined>([]);

  const [upgradeSlots, setUpgradeSlots] = useState<{ name: string; id: number; upgrade?: Item }[] | undefined>([]);

  const [baseItem, setBaseItem] = useState<string | undefined>();
  const [baseItemContent, setBaseItemContent] = useState<Item | undefined>();

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
      availability: undefined as Availability | undefined,
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
          die: '',
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
        unselectable: false,
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
        starfinder: {
          capacity: undefined,
          usage: undefined,
          grade: undefined,
          slots: [],
        },
        charges: {
          current: undefined,
          max: undefined,
        },
        foundry: {},
      },
      operations: [],
      content_source_id: -1,
      version: '1.0',
    },

    validate: {
      level: (value) => (value !== undefined && !isNaN(+value) ? null : 'Invalid level'),
      rarity: (value) => (['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity'),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    // Combine the form values with the controlled state values

    props.onComplete({
      ...values,
      name: values.name.trim(),
      level: values.level ? +values.level : 0,
      traits: traits.map((trait) => trait.id),
      meta_data: {
        ...values.meta_data!,
        base_item: baseItem,
        base_item_content: baseItemContent,
        material: {
          ...values.meta_data?.material,
          type: materialType,
        },
        runes: {
          striking: strikingRune,
          resilient: resilientRune,
          potency: potencyRune,
          property: propertyRunes,
        },
        category: weaponCategory ? weaponCategory : armorCategory,
        group: weaponGroup ? weaponGroup : armorGroup,
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

  // Count the number of misc. sections that are filled out
  const miscSectionCount =
    (baseItem && baseItem.length > 0 ? 1 : 0) +
    (form.values.meta_data?.damage?.die && form.values.meta_data.damage.die.length > 0 ? 1 : 0) +
    (form.values.meta_data?.damage?.damageType && form.values.meta_data.damage.damageType.length > 0 ? 1 : 0) +
    (form.values.meta_data?.damage?.extra && form.values.meta_data.damage.extra.length > 0 ? 1 : 0) +
    ((weaponCategory || armorCategory) && (weaponCategory.length > 0 || armorCategory.length > 0) ? 1 : 0) +
    ((weaponGroup || armorGroup) && (weaponGroup.length > 0 || armorGroup.length > 0) ? 1 : 0) +
    (form.values.meta_data?.range && form.values.meta_data.range > 0 ? 1 : 0) +
    (form.values.meta_data?.reload && form.values.meta_data.reload.length > 0 ? 1 : 0) +
    (form.values.meta_data?.starfinder?.capacity && form.values.meta_data.starfinder.capacity.length > 0 ? 1 : 0) +
    (form.values.meta_data?.starfinder?.usage && form.values.meta_data.starfinder.usage > 0 ? 1 : 0) +
    (form.values.meta_data?.damage?.dice && form.values.meta_data.damage?.dice > 0 ? 1 : 0) +
    (form.values.meta_data?.starfinder?.slots?.length && form.values.meta_data.starfinder.slots.length > 0 ? 1 : 0) +
    (form.values.meta_data?.attack_bonus && form.values.meta_data.attack_bonus !== 0 ? 1 : 0) +
    (form.values.meta_data?.ac_bonus && form.values.meta_data.ac_bonus > 0 ? 1 : 0) +
    (form.values.meta_data?.check_penalty && form.values.meta_data.check_penalty < 0 ? 1 : 0) +
    (form.values.meta_data?.speed_penalty && form.values.meta_data.speed_penalty < 0 ? 1 : 0) +
    (form.values.meta_data?.dex_cap && form.values.meta_data.dex_cap > 0 ? 1 : 0) +
    (form.values.meta_data?.strength && form.values.meta_data.strength > 0 ? 1 : 0) +
    (form.values.meta_data?.bulk?.capacity && form.values.meta_data.bulk.capacity > 0 ? 1 : 0) +
    (form.values.meta_data?.bulk?.held_or_stowed && form.values.meta_data.bulk.held_or_stowed > 0 ? 1 : 0) +
    (form.values.meta_data?.bulk?.ignored && form.values.meta_data.bulk.ignored > 0 ? 1 : 0) +
    (strikingRune && strikingRune > 0 ? 1 : 0) +
    (resilientRune && resilientRune > 0 ? 1 : 0) +
    (potencyRune && potencyRune > 0 ? 1 : 0) +
    (propertyRunes && propertyRunes.length > 0 ? 1 : 0) +
    (materialType && materialType.length > 0 ? 1 : 0) +
    (form.values.meta_data?.material?.grade && form.values.meta_data.material.grade.length > 0 ? 1 : 0) +
    (form.values.meta_data?.hardness && form.values.meta_data.hardness > 0 ? 1 : 0) +
    (form.values.meta_data?.hp_max && form.values.meta_data.hp_max > 0 ? 1 : 0) +
    (form.values.meta_data?.broken_threshold && form.values.meta_data.broken_threshold > 0 ? 1 : 0) +
    (form.values.meta_data?.is_shoddy ? 1 : 0) +
    (form.values.meta_data?.unselectable ? 1 : 0) +
    ((form.values.meta_data?.container_default_items ?? []).length > 0 ? 1 : 0) +
    (form.values.meta_data?.quantity && form.values.meta_data.quantity > 0 ? 1 : 0) +
    (form.values.meta_data?.image_url && form.values.meta_data.image_url.length > 0 ? 1 : 0);

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
      zIndex={props.zIndex}
    >
      <ScrollArea h={`calc(min(80dvh, ${EDIT_MODAL_HEIGHT}px))`} pr={14} scrollbars='y'>
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
                      form.setFieldValue('name', toLabel(text));
                    }
                  }}
                  onBlur={() => props.onNameBlur?.(form.values.name)}
                />
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
              <NumberInput label='PP' placeholder='Price' min={0} {...form.getInputProps('price.pp')} />
              <NumberInput label='GP' placeholder='Price' min={0} {...form.getInputProps('price.gp')} />
              <NumberInput label='SP/Credits' placeholder='Price' min={0} {...form.getInputProps('price.sp')} />
              <NumberInput label='CP' placeholder='Price' min={0} {...form.getInputProps('price.cp')} />
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
              <NumberInput label='Bulk' placeholder='Bulk' min={0} decimalScale={2} {...form.getInputProps('bulk')} />
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
                    { value: 'UPGRADE', label: 'Upgrade' },
                    { value: 'MATERIAL', label: 'Material' },
                  ] satisfies { value: ItemGroup; label: string }[]
                }
                {...form.getInputProps('group')}
              />
              <Select
                label='Hands'
                clearable
                data={[
                  { value: '1', label: '1' },
                  { value: '1+', label: '1+' },
                  { value: '2', label: '2' },
                  { value: '2+', label: '2+' },
                  { value: '1 or 2', label: '1 or 2' },
                ]}
                {...form.getInputProps('hands')}
              />
            </Group>
            <TextInput label='Usage' placeholder='Usage' {...form.getInputProps('usage')} />
            <Box>
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
                  <Box pb={5}>
                    <ItemSelect
                      label='Base Item'
                      placeholder='(for proficiency tracking)'
                      valueName={baseItem}
                      filter={(item) => {
                        return (
                          (!item.meta_data?.base_item &&
                            labelToVariable(item.name) !== labelToVariable(form.values.name)) ||
                          // To support old incorrect items
                          labelToVariable(item.name) === labelToVariable(item.meta_data?.base_item ?? '')
                        );
                      }}
                      onChange={(item, name) => {
                        setBaseItem(name);
                        setBaseItemContent(item);
                      }}
                    />
                  </Box>

                  <Accordion variant='separated'>
                    <Accordion.Item value={'weapon'}>
                      <Accordion.Control>
                        <Text fz='sm'>Weapon</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={10}>
                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Num. of Dice'
                              placeholder='(+ Striking)'
                              {...form.getInputProps('meta_data.damage.dice')}
                            />
                            <Select
                              label='Damage Die'
                              clearable
                              data={[
                                { value: 'd2', label: 'd2' },
                                { value: 'd4', label: 'd4' },
                                { value: 'd6', label: 'd6' },
                                { value: 'd8', label: 'd8' },
                                { value: 'd10', label: 'd10' },
                                { value: 'd12', label: 'd12' },
                                { value: 'd20', label: 'd20' },
                              ]}
                              {...form.getInputProps('meta_data.damage.die')}
                            />
                            <TextInput
                              label='Damage Type'
                              placeholder='ex. slashing'
                              {...form.getInputProps('meta_data.damage.damageType')}
                            />
                          </Group>

                          <Group wrap='nowrap'>
                            <Select
                              label='Category'
                              clearable
                              data={[
                                { value: 'simple', label: 'Simple' },
                                { value: 'martial', label: 'Martial' },
                                { value: 'advanced', label: 'Advanced' },
                                { value: 'unarmed_attack', label: 'Unarmed' },
                              ]}
                              value={weaponCategory}
                              onChange={(value) => {
                                setWeaponCategory(value ?? '');
                                setArmorCategory('');
                              }}
                            />

                            <Select
                              label='Group'
                              clearable
                              data={[
                                { value: 'axe', label: 'Axe' },
                                { value: 'bomb', label: 'Bomb' },
                                { value: 'bow', label: 'Bow' },
                                { value: 'brawling', label: 'Brawling' },
                                { value: 'club', label: 'Club' },
                                { value: 'crossbow', label: 'Crossbow' },
                                { value: 'dart', label: 'Dart' },
                                { value: 'firearm', label: 'Firearm' },
                                { value: 'flail', label: 'Flail' },
                                { value: 'hammer', label: 'Hammer' },
                                { value: 'knife', label: 'Knife' },
                                { value: 'pick', label: 'Pick' },
                                { value: 'polearm', label: 'Polearm' },
                                { value: 'projectile', label: 'Projectile' },
                                { value: 'shield', label: 'Shield' },
                                { value: 'sling', label: 'Sling' },
                                { value: 'spear', label: 'Spear' },
                                { value: 'sword', label: 'Sword' },
                                // Starfinder weapon groups
                                { value: 'corrosive', label: 'Corrosive' },
                                { value: 'cryo', label: 'Cryo' },
                                { value: 'flame', label: 'Flame' },
                                { value: 'grenade', label: 'Grenade' },
                                { value: 'laser', label: 'Laser' },
                                { value: 'mental', label: 'Mental' },
                                { value: 'missile', label: 'Missile' },
                                { value: 'plasma', label: 'Plasma' },
                                { value: 'poison', label: 'Poison' },
                                { value: 'shock', label: 'Shock' },
                                { value: 'sniper', label: 'Sniper' },
                                { value: 'sonic', label: 'Sonic' },
                              ]}
                              value={weaponGroup}
                              onChange={(value) => {
                                setWeaponGroup(value ?? '');
                                setArmorGroup('');
                              }}
                            />
                          </Group>

                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Range'
                              placeholder='Range'
                              min={0}
                              {...form.getInputProps('meta_data.range')}
                            />

                            <TextInput
                              label='Reload'
                              placeholder='Reload'
                              {...form.getInputProps('meta_data.reload')}
                            />
                          </Group>

                          <Divider mt={10} />

                          <Group wrap='nowrap'>
                            <TextInput
                              label='Capacity'
                              placeholder='Capacity'
                              {...form.getInputProps('meta_data.starfinder.capacity')}
                            />

                            <NumberInput
                              label='Amm. Usage'
                              placeholder='Amm. Usage'
                              min={0}
                              {...form.getInputProps('meta_data.starfinder.usage')}
                            />
                          </Group>
                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Max Upgrades'
                              placeholder='Max Upgrades'
                              {...form.getInputProps('meta_data.starfinder.upgrades')}
                            />
                          </Group>

                          <Divider mt={10} />

                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Extra Attack Bonus'
                              placeholder='(as item bonus)'
                              prefix={(form.values.meta_data?.attack_bonus ?? 0) >= 0 ? '+' : undefined}
                              // suffix={(form.values.meta_data?.attack_bonus ?? 0) >= 0 ? ' item bonus' : ' item penalty'}
                              allowDecimal={false}
                              {...form.getInputProps('meta_data.attack_bonus')}
                            />
                            <TextInput
                              label='Extra Damage'
                              placeholder='ex. 1d4 fire'
                              {...form.getInputProps('meta_data.damage.extra')}
                            />
                          </Group>
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
                            {...form.getInputProps('meta_data.ac_bonus')}
                          />

                          <Group wrap='nowrap'>
                            <Select
                              label='Category'
                              clearable
                              data={[
                                { value: 'light', label: 'Light' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'heavy', label: 'Heavy' },
                                { value: 'unarmored_defense', label: 'Unarmored' },
                              ]}
                              value={armorCategory}
                              onChange={(value) => {
                                setArmorCategory(value ?? '');
                                setWeaponCategory('');
                              }}
                            />

                            <Select
                              label='Group'
                              clearable
                              data={getArmorSpecializations(true).map((spec) => ({
                                value: spec.name.toLowerCase(),
                                label: spec.name,
                              }))}
                              value={armorGroup}
                              onChange={(value) => {
                                setArmorGroup(value ?? '');
                                setWeaponGroup('');
                              }}
                            />
                          </Group>

                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Check Penalty'
                              placeholder='Check Penalty'
                              max={0}
                              {...form.getInputProps('meta_data.check_penalty')}
                            />

                            <NumberInput
                              label='Speed Penalty'
                              placeholder='Speed Penalty'
                              max={0}
                              {...form.getInputProps('meta_data.speed_penalty')}
                            />
                          </Group>

                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Dexterity Cap'
                              placeholder='Dexterity Cap'
                              min={0}
                              {...form.getInputProps('meta_data.dex_cap')}
                            />

                            <NumberInput
                              label='Min Strength'
                              placeholder='Min Strength'
                              min={0}
                              {...form.getInputProps('meta_data.strength')}
                            />
                          </Group>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value={'Runes / Upgrades'}>
                      <Accordion.Control>
                        <Text fz='sm'>Runes / Upgrades</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={10}>
                          <Stack gap={10}>
                            <Group wrap='nowrap'>
                              <Select
                                label='Potency Rune'
                                clearable
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
                              <Select
                                label='Striking Rune'
                                clearable
                                data={[
                                  { value: '1', label: 'Striking' },
                                  { value: '2', label: 'Greater S.' },
                                  { value: '3', label: 'Major S.' },
                                ]}
                                value={strikingRune !== undefined ? `${strikingRune}` : undefined}
                                onChange={(value) => {
                                  setStrikingRune(value ? +value : undefined);
                                }}
                              />

                              <Select
                                label='Resilient Rune'
                                clearable
                                data={[
                                  { value: '1', label: 'Resilient' },
                                  { value: '2', label: 'Greater R.' },
                                  { value: '3', label: 'Major R.' },
                                ]}
                                value={resilientRune !== undefined ? `${resilientRune}` : undefined}
                                onChange={(value) => {
                                  setResilientRune(value ? +value : undefined);
                                }}
                              />
                            </Group>

                            <ItemMultiSelect
                              label='Property Runes'
                              placeholder='(limited to potency rune #)'
                              valueName={propertyRunes?.map((rune) => rune.name)}
                              filter={(item) => {
                                return item.group === 'RUNE';
                              }}
                              onChange={(items, names) => {
                                console.log('items', items, names);

                                if ((items ?? []).length > (potencyRune ?? 0)) {
                                  return;
                                }
                                setPropertyRunes(
                                  items?.map((item) => ({ name: item.name, id: item.id, rune: item })) ?? []
                                );
                              }}
                            />
                          </Stack>
                          <Divider mt={10} mb={5} />
                          <Stack gap={10}>
                            <Select
                              label='Grade'
                              clearable
                              data={[
                                { value: 'COMMERCIAL', label: 'Commercial' },
                                { value: 'TACTICAL', label: 'Tactical' },
                                { value: 'ADVANCED', label: 'Advanced' },
                                { value: 'SUPERIOR', label: 'Superior' },
                                { value: 'ELITE', label: 'Elite' },
                                { value: 'ULTIMATE', label: 'Ultimate' },
                                { value: 'PARAGON', label: 'Paragon' },
                              ]}
                              {...form.getInputProps('meta_data.starfinder.grade')}
                            />
                            <ItemMultiSelect
                              label='Upgrade Slots'
                              placeholder='(limited by grade)'
                              valueName={upgradeSlots?.map((slot) => slot.name)}
                              filter={(item) => {
                                return item.group === 'UPGRADE';
                              }}
                              onChange={(items, names) => {
                                console.log('items', items, names);

                                // if ((items ?? []).length > (grade ?? 0)) {
                                //   return;
                                // }
                                setUpgradeSlots(
                                  items?.map((item) => ({ name: item.name, id: item.id, upgrade: item })) ?? []
                                );
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value={'container'}>
                      <Accordion.Control>
                        <Text fz='sm'>Container</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={10}>
                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Bulk Capacity'
                              placeholder='Bulk Capacity'
                              min={0}
                              {...form.getInputProps('meta_data.bulk.capacity')}
                            />

                            <NumberInput
                              label='Bulk Ignored'
                              placeholder='Bulk Ignored'
                              min={0}
                              {...form.getInputProps('meta_data.bulk.ignored')}
                            />
                          </Group>

                          <Box>
                            <Group wrap='nowrap' justify='space-between'>
                              <Text fz='sm'>Default Item Contents</Text>
                              <ActionIcon
                                variant='subtle'
                                color='gray.5'
                                radius='lg'
                                aria-label='Add Item'
                                onClick={() => {
                                  selectContent<Item>(
                                    'item',
                                    (option) => {
                                      const contents = [
                                        ...(form.values.meta_data?.container_default_items ?? []),
                                        { id: option.id, name: option.name, quantity: option.meta_data?.quantity ?? 1 },
                                      ];
                                      form.setFieldValue('meta_data.container_default_items', contents);
                                    },
                                    {
                                      showButton: true,
                                      groupBySource: true,
                                    }
                                  );
                                }}
                              >
                                <IconCirclePlus style={{ width: '70%', height: '70%' }} stroke={1.5} />
                              </ActionIcon>
                            </Group>
                            <Paper withBorder p='xs'>
                              <ScrollArea h={100} scrollbars='y'>
                                <Group gap={8}>
                                  {(form.values.meta_data?.container_default_items ?? []).map((record, i) => (
                                    <Badge
                                      key={i}
                                      size='xs'
                                      variant='light'
                                      style={{ cursor: 'pointer' }}
                                      styles={{
                                        root: {
                                          textTransform: 'initial',
                                        },
                                      }}
                                      onClick={() => {
                                        // Bug where it closes the modal by closing the source drawer
                                        // openDrawer({
                                        //   type: 'item',
                                        //   data: { id: record.id },
                                        // });
                                      }}
                                      pr={0}
                                      rightSection={
                                        <ActionIcon
                                          variant='subtle'
                                          color='gray'
                                          size='xs'
                                          aria-label='Remove Item'
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const records =
                                              form.values.meta_data?.container_default_items?.filter(
                                                (i) => i.id !== record.id
                                              ) ?? [];
                                            form.setFieldValue('meta_data.container_default_items', records);
                                          }}
                                        >
                                          <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
                                        </ActionIcon>
                                      }
                                    >
                                      {truncate(`${record.name}`, { length: 22 })}
                                    </Badge>
                                  ))}
                                </Group>
                                {(form.values.meta_data?.container_default_items ?? []).length === 0 && (
                                  <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                                    No default item contents.
                                  </Text>
                                )}
                              </ScrollArea>
                            </Paper>
                          </Box>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value={'hp'}>
                      <Accordion.Control>
                        <Text fz='sm'>Hit Points</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={10}>
                          <Group>
                            <NumberInput
                              label='Hardness'
                              placeholder='Hardness'
                              min={0}
                              {...form.getInputProps('meta_data.hardness')}
                            />

                            <NumberInput
                              label='Max HP'
                              placeholder='Max HP'
                              min={0}
                              {...form.getInputProps('meta_data.hp_max')}
                            />

                            <NumberInput
                              label='Broken Threshold'
                              placeholder='(typically 1/2 max HP)'
                              min={0}
                              {...form.getInputProps('meta_data.broken_threshold')}
                            />
                          </Group>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value={'material'}>
                      <Accordion.Control>
                        <Text fz='sm'>Material</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={10}>
                          <Group wrap='nowrap'>
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
                              clearable
                              data={[
                                { value: 'low', label: 'Low' },
                                { value: 'standard', label: 'Standard' },
                                { value: 'high', label: 'High' },
                              ]}
                              {...form.getInputProps('meta_data.material.grade')}
                            />
                          </Group>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value={'other'}>
                      <Accordion.Control>
                        <Text fz='sm'>Other</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={10}>
                          <Switch
                            label='Hidden'
                            labelPosition='left'
                            {...form.getInputProps('meta_data.unselectable', {
                              type: 'checkbox',
                            })}
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

                          <Switch
                            label='Shoddy Item'
                            labelPosition='left'
                            {...form.getInputProps('meta_data.is_shoddy', {
                              type: 'checkbox',
                            })}
                          />

                          <Group wrap='nowrap'>
                            <NumberInput
                              label='Quantity'
                              placeholder='Quantity'
                              min={0}
                              {...form.getInputProps('meta_data.quantity')}
                            />

                            <NumberInput
                              label='Max Charges'
                              placeholder='Max Charges'
                              min={0}
                              {...form.getInputProps('meta_data.charges.max')}
                            />
                          </Group>

                          <NumberInput
                            label='Bulk (when held or stowed)'
                            placeholder='Bulk (when held or stowed)'
                            min={0}
                            {...form.getInputProps('meta_data.bulk.held_or_stowed')}
                          />

                          <SelectIcon
                            strValue={form.values.meta_data?.image_url ?? ''}
                            setValue={(strValue) => {
                              form.setFieldValue('meta_data.image_url', strValue);
                            }}
                          />
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                </Stack>
              </Collapse>
            </Box>
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
