import { OperationSection } from '@common/operations/Operations';
import RichTextInput from '@common/rich_text_input/RichTextInput';
import { SelectContentButton } from '@common/select/SelectContent';
import { DISCORD_URL, EDIT_MODAL_HEIGHT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { toHTML } from '@content/content-utils';
import {
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
  Menu,
  Modal,
  NumberInput,
  rem,
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
import { IconPlus, IconReplace, IconTrash, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { JSONContent } from '@tiptap/react';
import { AbilityBlock, Archetype, Class, ClassArchetype, Rarity } from '@typing/content';
import { Operation } from '@typing/operations';
import { isValidImage } from '@utils/images';
import { hasTraitType } from '@utils/traits';
import useRefresh from '@utils/use-refresh';
import { useRef, useState } from 'react';
import { CreateAbilityBlockModal } from './CreateAbilityBlockModal';
import { toLabel } from '@utils/strings';
import { hashData } from '@utils/numbers';

export function CreateClassArchetypeModal(props: {
  opened: boolean;
  editId?: number;
  onComplete: (archetype: ClassArchetype) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const theme = useMantineTheme();

  const [openedAdjustments, { toggle: toggleAdjustments }] = useDisclosure(false);
  const [openedOperations, { toggle: toggleOperations }] = useDisclosure(false);

  const classRef = useRef<Class | null>(null);
  const [openedModalFA, setOpenedModalFA] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: [`get-class-archetype-${props.editId}`, { editId: props.editId }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { editId }] = queryKey;

      const archetype = await fetchContentById<ClassArchetype>('class-archetype', editId);
      if (!archetype) return null;
      const _class = await fetchContentById<Class>('class', archetype.class_id);
      if (_class) {
        classRef.current = _class;
      }

      form.setInitialValues({
        ...archetype,
      });
      form.reset();
      refreshDisplayDescription();

      return archetype;
    },
    enabled: props.editId !== undefined && props.editId !== -1,
    refetchOnWindowFocus: false,
  });

  const [description, setDescription] = useState<JSONContent>();
  const [isValidImageURL, setIsValidImageURL] = useState(true);
  const [displayDescription, refreshDisplayDescription] = useRefresh();

  const form = useForm<ClassArchetype>({
    initialValues: {
      id: -1,
      created_at: '',
      name: '',
      rarity: 'COMMON' as Rarity,
      description: '',
      class_id: -1,
      archetype_id: undefined as number | undefined,
      operations: [] as Operation[] | undefined,
      feature_adjustments: [] as ClassArchetype['feature_adjustments'] | undefined,
      artwork_url: '',
      content_source_id: -1,
      version: '1.0',
    },

    validate: {
      rarity: (value) => (['COMMON', 'UNCOMMON', 'RARE', 'UNIQUE'].includes(value) ? null : 'Invalid rarity'),
      class_id: (value) => (value === -1 ? 'Class is required' : null),
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
          {' Class Archetype'}
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
      <ScrollArea h={`calc(min(80dvh, ${EDIT_MODAL_HEIGHT}px))`} pr={14} scrollbars='y'>
        <LoadingOverlay visible={loading || isFetching} />
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap={10}>
            <Group gap={10}>
              <SelectContentButton<Class>
                type='class'
                onClick={(c) => {
                  // Remove class-specific feature adjustment data
                  const fas =
                    form.values?.feature_adjustments?.map((fa) => {
                      const oldClassTraitId = classRef.current?.trait_id;

                      // Update traits to new class trait
                      const faDataTraits = fa.data?.traits?.map((traitId) => {
                        if (traitId === oldClassTraitId) {
                          return c.trait_id;
                        } else {
                          return traitId;
                        }
                      });
                      if (fa.data) {
                        fa.data.traits = faDataTraits;
                      }

                      return {
                        ...fa,
                        // Remove old class feature reference
                        prev_id: undefined,
                      };
                    }) ?? [];

                  form.setFieldValue('class_id', c.id);
                  form.setFieldValue('feature_adjustments', fas);
                  classRef.current = c;
                }}
                options={{
                  showButton: false,
                  overrideLabel: 'Select a Class',
                }}
                selectedId={form.values.class_id}
              />
              <SelectContentButton<Archetype>
                type='archetype'
                onClick={(c) => {
                  form.setFieldValue('archetype_id', c.id);
                }}
                options={{
                  showButton: false,
                  overrideLabel: 'Select an Archetype',
                }}
                selectedId={form.values.archetype_id}
              />
            </Group>

            <Group wrap='nowrap' justify='space-between'>
              <Group wrap='nowrap'>
                <TextInput label='Name' required {...form.getInputProps('name')} />
              </Group>
              <Select
                label='Rarity'
                required
                data={[
                  { value: 'COMMON', label: 'Common' },
                  { value: 'UNCOMMON', label: 'Uncommon' },
                  { value: 'RARE', label: 'Rare' },
                  { value: 'UNIQUE', label: 'Unique' },
                ]}
                w={170}
                {...form.getInputProps('rarity')}
              />
            </Group>

            <TextInput
              defaultValue={form.values.artwork_url ?? ''}
              label='Image URL'
              onBlur={async (e) => {
                setIsValidImageURL(!e.target?.value ? true : await isValidImage(e.target?.value));
                form.setFieldValue('artwork_url', e.target?.value);
              }}
              error={isValidImageURL ? false : 'Invalid URL'}
            />

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
                    disabled={form.values.class_id === -1}
                    variant={openedAdjustments ? 'light' : 'subtle'}
                    size='compact-sm'
                    color='gray.6'
                  >
                    Class Feature Adjustments
                  </Button>
                  {form.values.feature_adjustments && form.values.feature_adjustments.length > 0 && (
                    <Badge variant='light' color={theme.primaryColor} size='xs'>
                      {form.values.feature_adjustments.length}
                    </Badge>
                  )}
                </Group>
              }
              labelPosition='left'
              onClick={() => {
                if (form.values.class_id !== -1) {
                  toggleAdjustments();
                }
              }}
            />
            <Collapse in={openedAdjustments}>
              <Stack gap={10}>
                <Group justify='flex-end'>
                  <Select
                    variant='default'
                    size='xs'
                    placeholder='+ Add Adjustment'
                    data={[
                      { value: 'ADD', label: 'Add Class Feature' },
                      { value: 'REPLACE', label: 'Replace Class Feature' },
                      { value: 'REMOVE', label: 'Remove Class Feature' },
                    ]}
                    value={null}
                    onChange={(value) => {
                      if (!value) return;

                      form.setValues({
                        ...form.values,
                        feature_adjustments: [
                          ...(form.values.feature_adjustments ?? []),
                          {
                            fa_id: crypto.randomUUID(),
                            type: value as 'ADD' | 'REPLACE' | 'REMOVE',
                          },
                        ],
                      });
                    }}
                    styles={() => ({
                      dropdown: {
                        zIndex: 1500,
                      },
                    })}
                  />
                </Group>

                {form.values.feature_adjustments?.map((fa, i) => (
                  <Group key={i} justify='flex-start' style={{ position: 'relative' }} pr={40} wrap='nowrap' gap={5}>
                    <Text fz='xs' ta='right' fs='italic' miw={60}>
                      {toLabel(fa.type)} —{' '}
                    </Text>
                    {fa.type === 'REMOVE' || fa.type === 'REPLACE' ? (
                      <Box>
                        <SelectContentButton<AbilityBlock>
                          type='ability-block'
                          onClick={(feat) => {
                            const updatedFA = { ...fa, prev_id: feat.id };
                            form.setValues({
                              ...form.values,
                              feature_adjustments: form.values.feature_adjustments?.map((f) =>
                                f.fa_id === fa.fa_id ? updatedFA : f
                              ),
                            });
                          }}
                          options={{
                            showButton: false,
                            overrideLabel: `${fa.type === 'REMOVE' ? 'Removed' : 'Replaced'} Feature`,
                            abilityBlockType: 'class-feature',
                            filterFn: (feat) => {
                              return !!(
                                feat.traits &&
                                classRef.current &&
                                feat.traits.includes(classRef.current.trait_id)
                              );
                            },
                          }}
                          selectedId={fa.prev_id}
                        />
                      </Box>
                    ) : (
                      <Box></Box>
                    )}
                    {fa.type === 'ADD' || fa.type === 'REPLACE' ? (
                      <Button
                        variant={fa.data ? 'light' : 'filled'}
                        size='compact-sm'
                        radius='xl'
                        onClick={() => {
                          setOpenedModalFA(fa.fa_id);
                        }}
                      >
                        {fa.data?.name ?? 'New Feature'}
                      </Button>
                    ) : (
                      <Box></Box>
                    )}
                    <ActionIcon
                      size='xs'
                      variant='light'
                      radius={100}
                      color='gray'
                      aria-label='Remove Adjustment'
                      onClick={() => {
                        form.setValues({
                          ...form.values,
                          feature_adjustments: form.values.feature_adjustments?.filter((f) => f.fa_id !== fa.fa_id),
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
                  </Group>
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
              <Button disabled={form.values.class_id === -1} type='submit'>
                {props.editId === undefined || props.editId === -1 ? 'Create' : 'Update'}
              </Button>
            </Group>
          </Stack>
        </form>
      </ScrollArea>
      {openedModalFA !== null && classRef.current && (
        <CreateAbilityBlockModal
          opened={true}
          type='class-feature'
          editAbilityBlock={form.values.feature_adjustments?.find((fa) => fa.fa_id === openedModalFA)?.data}
          onComplete={async (abilityBlock) => {
            // Make sure the abilityBlock has the class trait
            abilityBlock.traits = abilityBlock.traits ?? [];
            if (classRef.current && !abilityBlock.traits.includes(classRef.current.trait_id)) {
              abilityBlock.traits.push(classRef.current.trait_id);
            }

            // Update the abilityBlock ID
            abilityBlock.id = hashData({
              id: crypto.randomUUID(),
            });

            form.setValues({
              ...form.values,
              feature_adjustments: form.values.feature_adjustments?.map((f) =>
                f.fa_id === openedModalFA ? { ...f, data: abilityBlock } : f
              ),
            });

            setOpenedModalFA(null);
          }}
          onCancel={() => setOpenedModalFA(null)}
        />
      )}
    </Modal>
  );
}
