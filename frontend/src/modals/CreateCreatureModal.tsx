import TraitsInput from '@common/TraitsInput';
import { OperationSection } from '@common/operations/Operations';
import { AddBonusToValOperation } from '@common/operations/variables/AddBonusToValOperation';
import { SetValOperation } from '@common/operations/variables/SetValOperation';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { DISCORD_URL } from '@constants/data';
import { fetchContentById, fetchTraits } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  Anchor,
  Autocomplete,
  Badge,
  Box,
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
  Text,
  TextInput,
  Textarea,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { createDefaultOperation } from '@operations/operation-utils';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { AbilityBlock, Creature, Trait } from '@typing/content';
import { Operation, OperationAddBonusToValue, OperationSetValue } from '@typing/operations';
import { isValidImage } from '@utils/images';
import useRefresh from '@utils/use-refresh';
import _ from 'lodash-es';
import { useState } from 'react';
import { json } from 'react-router-dom';
import { CreateAbilityBlockModal } from './CreateAbilityBlockModal';
import { ActionSymbol } from '@common/Actions';
import { startCase } from '@utils/strings';

/**
 * Modal for creating or editing a creature
 * @param props.opened - Whether the modal is opened
 * @param props.editId - The id of the creature being edited
 * @param props.editCreature - The creature being edited (alternative to editId)
 * @param props.onComplete - Callback when the modal is completed
 * @param props.onCancel - Callback when the modal is cancelled
 * Notes:
 * - Either supply editId or editCreature to be in editing mode
 * - If editId is supplied, the creature with that id will be fetched
 * - If editCreature is supplied, it will be used instead of fetching
 */
export function CreateCreatureModal(props: {
  opened: boolean;
  editId?: number;
  editCreature?: Creature;
  onComplete: (creature: Creature) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();
  const editing = (props.editId !== undefined && props.editId !== -1) || props.editCreature !== undefined;

  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const [openedTotals, { toggle: toggleTotals }] = useDisclosure(false);
  const [openedAbilities, { toggle: toggleAbilities }] = useDisclosure(false);
  const [openedAdditional, { toggle: toggleAdditional }] = useDisclosure(false);
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const [openedModal, setOpenedModal] = useState<AbilityBlock | -1 | null>(null);

  // Fetch the creature if in editing mode
  const { data, isFetching } = useQuery({
    queryKey: [`get-creature-${props.editId}`, { editId: props.editId, editCreature: props.editCreature }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId, editCreature }] = queryKey as [string, { editId?: number; editCreature?: Creature }];

      const creature = editId ? await fetchContentById<Creature>('creature', editId) : editCreature;
      if (!creature) return null;

      // Set the initial values, track totaled operations separately
      const totaledOperations: Operation[] = [];
      const nonTotaledOperations: Operation[] = [];
      for (const op of creature.operations ?? []) {
        if (JSON.stringify(op.data).includes('_TOTAL')) {
          totaledOperations.push(op);
        } else {
          nonTotaledOperations.push(op);
        }
      }

      form.setInitialValues({
        ...creature,
        operations: nonTotaledOperations,
        // @ts-ignore
        level: creature.level.toString(),
      });
      setTraits(await fetchTraits(creature.traits));
      setTotaledOperations(totaledOperations);

      form.reset();
      refreshDisplayDescription();

      return creature;
    },
    enabled: editing,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [traits, setTraits] = useState<Trait[]>([]);
  const [isValidImageURL, setIsValidImageURL] = useState(true);
  const [totaledOperations, setTotaledOperations] = useState<Operation[]>([]);

  // Initialize form
  const form = useForm<Creature>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      level: -1,
      rarity: 'COMMON',
      size: 'MEDIUM',
      traits: [],
      inventory: undefined,
      notes: undefined,
      details: {
        image_url: undefined,
        background_image_url: undefined,
        conditions: undefined,
        description: '',
      },
      roll_history: undefined,
      operations: [],
      abilities: [],
      spells: undefined,
      meta_data: undefined,
      content_source_id: -1,
      version: '1.0',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    props.onComplete({
      ...values,
      name: values.name.trim(),
      traits: traits.map((trait) => trait.id),
      operations: [...(values.operations ?? []), ...totaledOperations],
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
      title={<Title order={3}>{editing ? 'Edit' : 'Create'} Creature</Title>}
      styles={{
        body: {
          paddingRight: 2,
        },
      }}
      size={openedOperations || openedTotals ? 'xl' : 'md'}
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
                <Select
                  label='Level'
                  required
                  data={Array.from({ length: 32 }, (_, i) => (i - 1).toString())}
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
            </Group>

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button variant={openedAbilities ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                    Abilities
                  </Button>
                  {form.values.abilities && form.values.abilities.length > 0 && (
                    <Badge variant='light' color={theme.primaryColor} size='xs'>
                      {form.values.abilities.length}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition='left'
              onClick={toggleAbilities}
            />
            <Collapse in={openedAbilities}>
              <Stack gap={10}>
                <Group justify='flex-end' wrap='nowrap'>
                  <Group wrap='nowrap' w={130}>
                    <Button
                      size='compact-sm'
                      variant='light'
                      fullWidth
                      onClick={() => {
                        setOpenedModal(-1);
                      }}
                    >
                      Create Ability
                    </Button>
                  </Group>
                </Group>

                {form.values.abilities?.map((ability, i) => (
                  <Box key={i}>
                    <Button
                      variant='outline'
                      size='compact-sm'
                      fullWidth
                      onClick={() => {
                        setOpenedModal(ability);
                      }}
                    >
                      {ability.name}{' '}
                      <ActionSymbol
                        pl={5}
                        gap={5}
                        textProps={{ size: 'xs', c: 'guide' }}
                        c='guide'
                        cost={ability.actions}
                        size={'1.2rem'}
                      />
                    </Button>
                  </Box>
                ))}

                <Divider />
              </Stack>
            </Collapse>

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button variant={openedTotals ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                    Stat. Totals
                  </Button>
                  {totaledOperations.length > 0 && (
                    <Badge variant='light' color={theme.primaryColor} size='xs'>
                      {totaledOperations.length}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition='left'
              onClick={toggleTotals}
            />
            <Collapse in={openedTotals}>
              <Stack gap={10}>
                <Group justify='flex-end' wrap='nowrap'>
                  <Group wrap='nowrap' w={280}>
                    <Button
                      size='compact-sm'
                      variant='light'
                      fullWidth
                      onClick={() => {
                        setTotaledOperations((prev) => [
                          ...prev,
                          createDefaultOperation<OperationSetValue>('setValue'),
                        ]);
                      }}
                    >
                      Set Stat
                    </Button>
                    <Button
                      size='compact-sm'
                      variant='light'
                      fullWidth
                      onClick={() => {
                        setTotaledOperations((prev) => [
                          ...prev,
                          createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
                        ]);
                      }}
                    >
                      Add Stat Bonus
                    </Button>
                  </Group>
                </Group>

                {totaledOperations.map((op, i) => (
                  <Box key={i}>
                    {op.type === 'setValue' ? (
                      <SetValOperation
                        showTotalVars
                        overrideTitle='Set Stat'
                        variable={op.data.variable}
                        value={op.data.value}
                        onSelect={(variable) => {
                          op.data.variable = variable;
                        }}
                        onValueChange={(value) => {
                          op.data.value = value;
                        }}
                        onRemove={() => {
                          setTotaledOperations((prev) => prev.filter((_, index) => index !== i));
                        }}
                      />
                    ) : op.type === 'addBonusToValue' ? (
                      <AddBonusToValOperation
                        showTotalVars
                        overrideTitle='Add Stat Bonus'
                        variable={op.data.variable}
                        bonusValue={op.data.value}
                        bonusType={op.data.type}
                        text={op.data.text}
                        onSelect={(variable) => {
                          op.data.variable = variable;
                        }}
                        onValueChange={(data) => {
                          op.data.value = data.bonusValue;
                          op.data.type = data.bonusType;
                          op.data.text = data.text;
                        }}
                        onRemove={() => {
                          setTotaledOperations((prev) => prev.filter((_, index) => index !== i));
                        }}
                      />
                    ) : null}
                  </Box>
                ))}

                <Divider />
              </Stack>
            </Collapse>

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button variant={openedOperations ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                    Misc. Operations
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

            <Divider
              my='xs'
              label={
                <Group gap={3} wrap='nowrap'>
                  <Button variant={openedAdditional ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                    Misc. Sections
                  </Button>
                </Group>
              }
              labelPosition='left'
              onClick={toggleAdditional}
            />
            <Collapse in={openedAdditional}>
              <Stack gap={10}>
                <TextInput
                  defaultValue={form.values.details.image_url ?? ''}
                  label='Image URL'
                  onBlur={async (e) => {
                    setIsValidImageURL(!e.target?.value ? true : await isValidImage(e.target?.value));
                    form.setFieldValue('details.image_url', e.target?.value);
                  }}
                  error={isValidImageURL ? false : 'Invalid URL'}
                />

                <Divider />
              </Stack>
            </Collapse>

            {displayDescription && (
              <RichTextInput
                label='Description'
                value={description ?? toHTML(form.values.details.description)}
                onChange={(text, json) => {
                  setDescription(json);
                  form.setFieldValue('details.description', text);
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
      {openedModal !== null && (
        <CreateAbilityBlockModal
          opened={true}
          type={'action'}
          editId={openedModal === -1 ? -1 : undefined}
          editAbilityBlock={openedModal === -1 ? undefined : openedModal}
          onComplete={async (abilityBlock) => {
            if (openedModal === -1) {
              form.setValues({
                ...form.values,
                abilities: [...(form.values.abilities ?? []), abilityBlock],
              });
            } else {
              form.setValues({
                ...form.values,
                abilities: form.values.abilities?.map((ability) =>
                  ability.name === abilityBlock.name ? abilityBlock : ability
                ),
              });
            }
            setOpenedModal(null);
          }}
          onCancel={() => setOpenedModal(null)}
        />
      )}
    </Modal>
  );
}
