import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { DISCORD_URL } from '@constants/data';
import { fetchContentAll, fetchContentById } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  FocusTrap,
  Group,
  HoverCard,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Tabs,
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
import { AbilityBlock, Creature } from '@typing/content';
import { Operation } from '@typing/operations';
import useRefresh from '@utils/use-refresh';
import { useState } from 'react';
import { CreateAbilityBlockModal } from './CreateAbilityBlockModal';
import { ActionSymbol } from '@common/Actions';
import { toLabel } from '@utils/strings';
import { SelectIcon } from '@common/IconDisplay';
import { isTruthy } from '@utils/type-fixing';
import { drawerState } from '@atoms/navAtoms';
import { useRecoilState } from 'recoil';
import { selectContent } from '@common/select/SelectContent';
import { IconBracketsAngle, IconCornerUpRight, IconTransform, IconX } from '@tabler/icons-react';
import StatBlockSection from '@common/StatBlockSection';
import { extractCreatureInfo } from '@utils/creature';
import { uniq } from 'lodash-es';
import { hashData } from '@utils/numbers';
import { modals } from '@mantine/modals';

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
  onNameBlur?: (name: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();
  const editing = (props.editId !== undefined && props.editId !== -1) || props.editCreature !== undefined;

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const [openedBaseAbilities, { toggle: toggleBaseAbilities }] = useDisclosure(false);
  const [openedAddedAbilities, { toggle: toggleAddedAbilities }] = useDisclosure(false);

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
      const operations: Operation[] = creature.operations ?? [];

      form.setInitialValues({
        ...creature,
        operations: operations,
        // @ts-ignore
        level: creature.level.toString(),
      });
      // setTraits(await fetchTraits(creature.traits));

      form.reset();
      refreshDisplayDescription();

      return creature;
    },
    enabled: editing,
    refetchOnWindowFocus: false,
  });

  // Get all ability blocks
  const { data: abilityBlocks } = useQuery({
    queryKey: [`get-all-ability-blocks`],
    queryFn: async () => {
      return await fetchContentAll<AbilityBlock>('ability-block');
    },
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();

  const [loadingProcess, setLoadingProcess] = useState(false);
  const [inputStatBlockActive, { toggle: toggleInputStatBlockActive }] = useDisclosure(false);
  const [inputStatBlock, setInputStatBlock] = useState('');

  // Initialize form
  const form = useForm<Creature>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      level: -1,
      experience: 0,
      hp_current: 0,
      hp_temp: 0,
      stamina_current: 0,
      resolve_current: 0,
      rarity: 'COMMON',
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
      abilities_base: [],
      abilities_added: [],
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
      level: parseInt(`${values.level}`),
      // Just in case ids are overwritten
      id: editing ? props.editId ?? props.editCreature?.id ?? -1 : -1,
      content_source_id: editing ? props.editCreature?.content_source_id ?? -1 : -1,
    });
    setTimeout(() => {
      onReset();
    }, 1000);
  };

  const onReset = () => {
    form.reset();
    setDescription(undefined);
  };

  const isEmpty =
    form.values.operations?.length === 0 &&
    form.values.abilities_base?.length === 0 &&
    form.values.abilities_added?.length === 0;

  const addedAbilities = (form.values.abilities_added ?? [])
    .map((id) => abilityBlocks?.find((ab) => ab.id === id))
    .filter(isTruthy);

  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onCancel();
        onReset();
      }}
      title={
        <Group wrap='nowrap' gap={10} justify='space-between'>
          <Group wrap='nowrap' gap={10}>
            <Title order={3}>{editing ? 'Edit' : 'Create'} Creature</Title>
          </Group>
          <Group wrap='nowrap' justify='space-between' pr='lg'>
            <Group wrap='nowrap'>
              <TextInput
                label='Name'
                size='xs'
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
                size='xs'
                required
                data={[...Array.from({ length: 32 }, (_, i) => (i - 1).toString()), { value: '-100', label: 'Char.' }]}
                w={70}
                {...form.getInputProps('level')}
              />
              <Select
                label='Rarity'
                size='xs'
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
            </Group>
          </Group>
        </Group>
      }
      styles={{
        title: {
          width: '100%',
        },
        body: {
          paddingRight: 2,
        },
      }}
      size={'xl'}
      closeOnClickOutside={false}
      closeOnEscape={false}
      keepMounted={false}
    >
      <ScrollArea pr={14} scrollbars='y'>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={5}>
            <Tabs defaultValue={editing ? 'manual' : 'builder'}>
              <Tabs.List>
                <Tabs.Tab value='manual' leftSection={<IconBracketsAngle size='1rem' />}>
                  Manual
                </Tabs.Tab>
                <Tabs.Tab value='builder' leftSection={<IconTransform size='1rem' />}>
                  Auto Builder
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value='builder'>
                <Group wrap='nowrap' gap={5} align='flex-start' grow>
                  <Stack gap={0}>
                    <Group wrap='nowrap' justify='space-between' py={5}>
                      <Text fz='md'>Input Stat Block</Text>
                      <Button
                        variant='filled'
                        size='compact-xs'
                        rightSection={<IconCornerUpRight size='1rem' />}
                        onClick={async () => {
                          const handleProcess = async () => {
                            //
                            setLoadingProcess(true);
                            // Use player core source for now
                            const result = await extractCreatureInfo(1, inputStatBlock);
                            if (result) {
                              console.log('Granular', result.granular);
                              console.log('Final', result.creature);
                              form.setValues(result.creature);
                              // @ts-expect-error
                              form.setFieldValue('level', `${result.creature.level}`);
                            }
                            setLoadingProcess(false);
                            //
                          };

                          if (form.values.operations && form.values.operations.length > 0) {
                            modals.openConfirmModal({
                              title: <Title order={3}>Override Existing Creature</Title>,
                              children: (
                                <Text size='sm'>
                                  This will override the existing creature. Are you sure you want to proceed?
                                </Text>
                              ),
                              labels: { confirm: 'Confirm', cancel: 'Cancel' },
                              onCancel: () => {},
                              onConfirm: handleProcess,
                            });
                          } else {
                            await handleProcess();
                          }
                        }}
                        loading={loadingProcess}
                      >
                        Process
                      </Button>
                    </Group>
                    <Box onClick={toggleInputStatBlockActive}>
                      <ScrollArea
                        h={450}
                        scrollbars='y'
                        px='sm'
                        style={{
                          backgroundColor: theme.colors.dark[6],
                          border: `1px solid ${theme.colors.dark[4]}`,
                          borderRadius: theme.radius.md,
                        }}
                      >
                        <FocusTrap active={inputStatBlockActive}>
                          <Textarea
                            variant='unstyled'
                            placeholder='Paste creature stat block'
                            autosize
                            value={inputStatBlock}
                            onChange={(e) => {
                              setInputStatBlock(e.currentTarget.value);
                            }}
                          />
                        </FocusTrap>
                      </ScrollArea>
                    </Box>
                  </Stack>
                  <Stack gap={0}>
                    <Group wrap='nowrap' justify='space-between' py={5}>
                      <Text fz='md'>Resulting Stat Block</Text>
                    </Group>
                    <ScrollArea
                      h={450}
                      scrollbars='y'
                      p='sm'
                      style={{
                        backgroundColor: theme.colors.dark[6],
                        border: `1px solid ${theme.colors.dark[4]}`,
                        borderRadius: theme.radius.md,
                      }}
                    >
                      {!isEmpty && (
                        <StatBlockSection
                          entity={form.values}
                          options={{
                            hideName: true,
                            hideImage: true,
                          }}
                        />
                      )}
                    </ScrollArea>
                  </Stack>
                </Group>
                <Text fz='xs' ta='center' fs='italic' pt={5}>
                  Properly format the input stat block until the result looks the same!
                </Text>
              </Tabs.Panel>

              <Tabs.Panel value='manual'>
                <Divider
                  my='xs'
                  label={
                    <Group gap={3} wrap='nowrap'>
                      <Button variant={openedBaseAbilities ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                        Base Abilities
                      </Button>
                      {form.values.abilities_base && form.values.abilities_base.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.abilities_base.length}
                        </Badge>
                      )}
                    </Group>
                  }
                  labelPosition='left'
                  onClick={toggleBaseAbilities}
                />
                <Collapse in={openedBaseAbilities}>
                  <Stack gap={10}>
                    <Button
                      size='sm'
                      variant='light'
                      fullWidth
                      onClick={() => {
                        setOpenedModal(-1);
                      }}
                    >
                      Create Custom Ability
                    </Button>

                    {form.values.abilities_base?.map((ability, i) => (
                      <Box key={i} style={{ position: 'relative' }}>
                        <Button
                          variant='subtle'
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
                        <ActionIcon
                          size='xs'
                          variant='light'
                          radius={100}
                          color='gray'
                          aria-label='Remove Ability'
                          onClick={() => {
                            form.setValues({
                              ...form.values,
                              abilities_base: form.values.abilities_base?.filter((ab) => ab.id !== ability.id),
                            });
                          }}
                          style={{
                            position: 'absolute',
                            top: '50%',
                            right: 0,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <IconX size='1.5rem' stroke={2} />
                        </ActionIcon>
                      </Box>
                    ))}

                    <Divider />
                  </Stack>
                </Collapse>

                <Divider
                  my='xs'
                  label={
                    <Group gap={3} wrap='nowrap'>
                      <Button variant={openedAddedAbilities ? 'light' : 'subtle'} size='compact-sm' color='gray.6'>
                        Added Abilities
                      </Button>
                      {form.values.abilities_added && form.values.abilities_added.length > 0 && (
                        <Badge variant='light' color={theme.primaryColor} size='xs'>
                          {form.values.abilities_added.length}
                        </Badge>
                      )}
                    </Group>
                  }
                  labelPosition='left'
                  onClick={toggleAddedAbilities}
                />
                <Collapse in={openedAddedAbilities}>
                  <Stack gap={10}>
                    <Button
                      size='sm'
                      variant='light'
                      fullWidth
                      onClick={() => {
                        selectContent<AbilityBlock>(
                          'ability-block',
                          (option) => {
                            form.setValues({
                              ...form.values,
                              abilities_added: uniq([...(form.values.abilities_added ?? []), option.id]),
                            });
                          },
                          {
                            overrideLabel: 'Select an Ability',
                            abilityBlockType: 'feat',
                          }
                        );
                      }}
                    >
                      Add an Ability
                    </Button>

                    {addedAbilities.map((ability, i) => (
                      <Box key={i} style={{ position: 'relative' }}>
                        <Button
                          variant='subtle'
                          size='compact-sm'
                          fullWidth
                          onClick={() => {
                            openDrawer({
                              type: 'action',
                              data: { id: ability.id },
                              extra: { addToHistory: true },
                            });
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
                        <ActionIcon
                          size='xs'
                          variant='light'
                          radius={100}
                          color='gray'
                          aria-label='Remove Ability'
                          onClick={() => {
                            form.setValues({
                              ...form.values,
                              abilities_added: form.values.abilities_added?.filter((id) => id !== ability.id),
                            });
                          }}
                          style={{
                            position: 'absolute',
                            top: '50%',
                            right: 0,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <IconX size='1.5rem' stroke={2} />
                        </ActionIcon>
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
                              Operations are used to make changes to a character. They can give feats, spells, and more,
                              as well as change stats, skills, and other values.
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
                    <SelectIcon
                      strValue={form.values.details.image_url ?? ''}
                      setValue={(strValue) => {
                        form.setFieldValue('details.image_url', strValue);
                      }}
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
              </Tabs.Panel>
            </Tabs>

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
              // Create
              form.setValues({
                ...form.values,
                abilities_base: [
                  ...(form.values.abilities_base ?? []),
                  {
                    ...abilityBlock,
                    id: hashData({ data: crypto.randomUUID() }),
                  },
                ],
              });
            } else {
              // Update
              form.setValues({
                ...form.values,
                abilities_base: form.values.abilities_base?.map((ability) =>
                  ability.id === abilityBlock.id ? abilityBlock : ability
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
