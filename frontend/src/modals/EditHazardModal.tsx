import TraitsInput from '@common/TraitsInput';
import { prepareHazardContentUpdate } from '@content/hazard-content-update';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { randomId } from '@mantine/hooks';
import { ActionCostSchema, Hazard, RaritySchema } from '@schemas/content';
import { toLabel } from '@utils/strings';
import { cloneDeep, unset } from 'lodash-es';
import { useState, type ChangeEvent, type ReactNode } from 'react';

type HazardListField = 'passive_abilities' | 'secondary_activities';

/** Edit a catalog hazard for moderator review without touching encounter snapshots. */
export function EditHazardModal(props: {
  opened: boolean;
  hazard: Hazard;
  zIndex?: number;
  onComplete: (hazard: Hazard) => void;
  onCancel: () => void;
}) {
  const [traitValues, setTraitValues] = useState<(string | number)[]>(props.hazard.details.trait_ids ?? []);
  const hasInvalidTraits = traitValues.some((value) => typeof value !== 'number');
  const form = useForm<Hazard>({ initialValues: cloneDeep(props.hazard) });
  // Stable row identity belongs only to the editor, never to the submitted source entries.
  const [listKeys, setListKeys] = useState<Record<HazardListField, string[]>>(() => ({
    passive_abilities: (props.hazard.details.passive_abilities ?? []).map((): string => randomId()),
    secondary_activities: (props.hazard.details.secondary_activities ?? []).map((): string => randomId()),
  }));
  const zIndex = props.zIndex ?? 1000;

  /** Remove a cleared optional property rather than adding empty defaults to the draft. */
  const clearOptionalField = (path: string): void => {
    form.setValues((current: Partial<Hazard>): Partial<Hazard> => {
      const next = cloneDeep(current);
      unset(next, path);
      return next;
    });
    form.clearFieldError(path);
  };

  /** Keep optional text controlled without changing absent values until the user edits them. */
  const optionalTextProps = (path: string, value: string | undefined): ReturnType<typeof form.getInputProps> => ({
    ...form.getInputProps(path),
    value: value ?? '',
    onChange: (event: ChangeEvent<HTMLTextAreaElement>): void => {
      const text = event.currentTarget.value;
      if (text === '') clearOptionalField(path);
      else form.getInputProps(path).onChange(text);
    },
  });

  /** Explicit additions create only the source fields required by the chosen entry kind. */
  const addEntry = (field: HazardListField): void => {
    const path = `details.${field}`;
    const entry = field === 'passive_abilities' ? { name: '', text: '' } : { name: '', effect: '' };
    if (form.getValues().details[field] === undefined) form.setFieldValue(path, [entry]);
    else form.insertListItem(path, entry);
    setListKeys(
      (current): Record<HazardListField, string[]> => ({
        ...current,
        [field]: [...current[field], randomId()],
      })
    );
  };

  /** Delete by index so duplicate source names are independent; the final removal restores absence. */
  const removeEntry = (field: HazardListField, index: number): void => {
    const path = `details.${field}`;
    const length = form.getValues().details[field]?.length ?? 0;
    form.removeListItem(path, index);
    if (length === 1) clearOptionalField(path);
    setListKeys(
      (current): Record<HazardListField, string[]> => ({
        ...current,
        [field]: current[field].filter((_, position: number): boolean => position !== index),
      })
    );
  };

  /** Move form values and local keys together, without persisting editor-only identifiers. */
  const moveEntry = (field: HazardListField, from: number, to: number): void => {
    form.reorderListItem(`details.${field}`, { from, to });
    setListKeys((current): Record<HazardListField, string[]> => {
      const keys = [...current[field]];
      const [key] = keys.splice(from, 1);
      keys.splice(to, 0, key);
      return { ...current, [field]: keys };
    });
  };

  /** Keep concise ordered-list controls consistent for both source-only entry arrays. */
  const entryControls = (field: HazardListField, index: number): ReactNode => (
    <Group gap='xs' justify='flex-end' wrap='wrap'>
      <Button
        type='button'
        size='xs'
        variant='subtle'
        disabled={index === 0}
        onClick={() => moveEntry(field, index, index - 1)}
      >
        Up
      </Button>
      <Button
        type='button'
        size='xs'
        variant='subtle'
        disabled={index === (form.values.details[field]?.length ?? 0) - 1}
        onClick={() => moveEntry(field, index, index + 1)}
      >
        Down
      </Button>
      <Button type='button' size='xs' variant='subtle' onClick={() => removeEntry(field, index)}>
        Remove
      </Button>
    </Group>
  );

  const submit = (values: Hazard) => {
    if (hasInvalidTraits) return;
    const result = prepareHazardContentUpdate(props.hazard, values);
    if (!result.success) {
      for (const issue of result.error.issues) form.setFieldError(issue.path.join('.'), issue.message);
      return;
    }
    props.onComplete(result.data);
  };

  return (
    <Modal
      opened={props.opened}
      onClose={props.onCancel}
      title={<Title order={3}>Edit Hazard</Title>}
      size='lg'
      zIndex={zIndex}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Box component='form' onSubmit={form.onSubmit(submit)}>
        <Stack gap='md'>
          <TextInput label='Name' required {...form.getInputProps('name')} />
          <SimpleGrid cols={{ base: 2, sm: 3 }}>
            <NumberInput label='Level' required allowDecimal={false} {...form.getInputProps('level')} />
            <Select
              label='Rarity'
              data={RaritySchema.options.map((value) => ({ value, label: toLabel(value.toLowerCase()) }))}
              allowDeselect={false}
              comboboxProps={{ zIndex: zIndex + 1 }}
              {...form.getInputProps('rarity')}
            />
            <Select
              label='Complexity'
              data={[
                { value: 'SIMPLE', label: 'Simple' },
                { value: 'COMPLEX', label: 'Complex' },
              ]}
              allowDeselect={false}
              comboboxProps={{ zIndex: zIndex + 1 }}
              {...form.getInputProps('details.complexity')}
            />
          </SimpleGrid>
          <Tabs defaultValue='details'>
            <Tabs.List>
              <Tabs.Tab value='details'>Details</Tabs.Tab>
              <Tabs.Tab value='defenses'>Defenses</Tabs.Tab>
              <Tabs.Tab value='activation'>Activation</Tabs.Tab>
              <Tabs.Tab value='source'>Source</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value='details' pt='md'>
              <Stack gap='sm'>
                <TraitsInput
                  label='Traits'
                  traits={traitValues}
                  zIndex={zIndex + 1}
                  onValuesChange={(values) => {
                    const invalid = values.some((value) => typeof value !== 'number');
                    setTraitValues(values);
                    if (invalid) {
                      form.setFieldError('details.trait_ids', 'Select a listed trait');
                      return;
                    }
                    form.clearFieldError('details.trait_ids');
                    form.setFieldValue(
                      'details.trait_ids',
                      values.filter((value): value is number => typeof value === 'number')
                    );
                  }}
                  error={form.errors['details.trait_ids']}
                />
                <TagsInput
                  label='Trait labels'
                  comboboxProps={{ zIndex: zIndex + 1 }}
                  {...form.getInputProps('details.trait_labels')}
                />
                <Textarea label='Stealth' autosize minRows={2} {...form.getInputProps('details.stealth')} />
                <Textarea label='Description' autosize minRows={3} {...form.getInputProps('details.description')} />
                <Textarea label='Disable' autosize minRows={3} {...form.getInputProps('details.disable')} />
                <Divider />
                <Group justify='space-between' wrap='wrap'>
                  <Text fw={600}>Passive abilities</Text>
                  <Button type='button' size='xs' variant='light' onClick={() => addEntry('passive_abilities')}>
                    Add
                  </Button>
                </Group>
                {form.values.details.passive_abilities?.map((ability, index) => (
                  <Stack key={listKeys.passive_abilities[index]} gap='xs'>
                    <TextInput
                      label='Name'
                      required
                      {...form.getInputProps(`details.passive_abilities.${index}.name`)}
                    />
                    <Textarea
                      label='Text'
                      required
                      autosize
                      minRows={3}
                      {...form.getInputProps(`details.passive_abilities.${index}.text`)}
                    />
                    {entryControls('passive_abilities', index)}
                  </Stack>
                ))}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value='defenses' pt='md'>
              <Stack gap='sm'>
                <Checkbox
                  label='Defenses'
                  checked={form.values.details.defenses !== undefined}
                  onChange={(event) =>
                    form.setFieldValue(
                      'details.defenses',
                      event.currentTarget.checked ? cloneDeep(props.hazard.details.defenses ?? {}) : undefined
                    )
                  }
                />
                {form.values.details.defenses && (
                  <>
                    <SimpleGrid cols={{ base: 2, sm: 3 }}>
                      {(['ac', 'fort', 'ref', 'hardness', 'hp', 'bt'] as const).map((field) => (
                        <NumberInput
                          key={field}
                          label={
                            field === 'ac' || field === 'hp' || field === 'bt' ? field.toUpperCase() : toLabel(field)
                          }
                          allowDecimal={false}
                          value={form.values.details.defenses?.[field] ?? ''}
                          onChange={(value) =>
                            form.getInputProps(`details.defenses.${field}`).onChange(value === '' ? undefined : value)
                          }
                          error={form.errors[`details.defenses.${field}`]}
                        />
                      ))}
                    </SimpleGrid>
                    <Textarea
                      label='HP note'
                      autosize
                      minRows={2}
                      {...optionalTextProps('details.defenses.hp_note', form.values.details.defenses.hp_note)}
                    />
                    <Textarea
                      label='Immunities'
                      autosize
                      minRows={2}
                      {...form.getInputProps('details.defenses.immunities')}
                    />
                    <Textarea
                      label='Weaknesses'
                      autosize
                      minRows={2}
                      {...optionalTextProps('details.defenses.weaknesses', form.values.details.defenses.weaknesses)}
                    />
                    <Textarea
                      label='Resistances'
                      autosize
                      minRows={2}
                      {...optionalTextProps('details.defenses.resistances', form.values.details.defenses.resistances)}
                    />
                  </>
                )}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value='activation' pt='md'>
              <Stack gap='sm'>
                <TextInput label='Activation name' {...form.getInputProps('details.activation.name')} />
                <Select
                  label='Actions'
                  data={ActionCostSchema.unwrap().options.map((value) => ({
                    value,
                    label: toLabel(value.toLowerCase().replaceAll('-', ' ')),
                  }))}
                  clearable
                  comboboxProps={{ zIndex: zIndex + 1 }}
                  {...form.getInputProps('details.activation.actions')}
                />
                <TagsInput
                  label='Activation traits'
                  comboboxProps={{ zIndex: zIndex + 1 }}
                  {...form.getInputProps('details.activation.traits')}
                />
                <Textarea label='Trigger' autosize minRows={2} {...form.getInputProps('details.activation.trigger')} />
                <Textarea
                  label='Requirements'
                  autosize
                  minRows={2}
                  {...optionalTextProps('details.activation.requirements', form.values.details.activation.requirements)}
                />
                <Textarea label='Effect' autosize minRows={3} {...form.getInputProps('details.activation.effect')} />
                <Checkbox
                  label='Routine'
                  checked={form.values.details.routine !== undefined}
                  onChange={(event) =>
                    form.setFieldValue(
                      'details.routine',
                      event.currentTarget.checked
                        ? cloneDeep(props.hazard.details.routine ?? { actions: 0, text: '' })
                        : undefined
                    )
                  }
                />
                {form.values.details.routine && (
                  <>
                    <NumberInput
                      label='Routine actions'
                      allowDecimal={false}
                      min={0}
                      {...form.getInputProps('details.routine.actions')}
                    />
                    <Textarea label='Routine' autosize minRows={3} {...form.getInputProps('details.routine.text')} />
                  </>
                )}
                <Divider />
                <Group justify='space-between' wrap='wrap'>
                  <Text fw={600}>Secondary activities</Text>
                  <Button type='button' size='xs' variant='light' onClick={() => addEntry('secondary_activities')}>
                    Add
                  </Button>
                </Group>
                {form.values.details.secondary_activities?.map((activity, index) => (
                  <Stack key={listKeys.secondary_activities[index]} gap='xs'>
                    <TextInput
                      label='Name'
                      required
                      {...form.getInputProps(`details.secondary_activities.${index}.name`)}
                    />
                    <Select
                      label='Actions'
                      data={ActionCostSchema.unwrap().options.map((value) => ({
                        value,
                        label: toLabel(value.toLowerCase().replaceAll('-', ' ')),
                      }))}
                      clearable
                      comboboxProps={{ zIndex: zIndex + 1 }}
                      {...form.getInputProps(`details.secondary_activities.${index}.actions`)}
                      value={activity.actions ?? null}
                      onChange={(value) =>
                        value === null
                          ? clearOptionalField(`details.secondary_activities.${index}.actions`)
                          : form.getInputProps(`details.secondary_activities.${index}.actions`).onChange(value)
                      }
                    />
                    <TagsInput
                      label='Traits'
                      comboboxProps={{ zIndex: zIndex + 1 }}
                      {...form.getInputProps(`details.secondary_activities.${index}.traits`)}
                      value={activity.traits ?? []}
                      onChange={(values) =>
                        values.length === 0
                          ? clearOptionalField(`details.secondary_activities.${index}.traits`)
                          : form.getInputProps(`details.secondary_activities.${index}.traits`).onChange(values)
                      }
                    />
                    <Textarea
                      label='Trigger'
                      autosize
                      minRows={2}
                      {...optionalTextProps(`details.secondary_activities.${index}.trigger`, activity.trigger)}
                    />
                    <Textarea
                      label='Requirements'
                      autosize
                      minRows={2}
                      {...optionalTextProps(
                        `details.secondary_activities.${index}.requirements`,
                        activity.requirements
                      )}
                    />
                    <Textarea
                      label='Effect'
                      required
                      autosize
                      minRows={3}
                      {...form.getInputProps(`details.secondary_activities.${index}.effect`)}
                    />
                    {entryControls('secondary_activities', index)}
                  </Stack>
                ))}
                <Textarea label='Reset' autosize minRows={2} {...form.getInputProps('details.reset')} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value='source' pt='md'>
              <Stack gap='sm'>
                <TextInput label='Book' {...form.getInputProps('meta_data.source.book')} />
                <TextInput label='Source page' {...form.getInputProps('meta_data.source.page')} />
                <TextInput label='Source URL' {...form.getInputProps('meta_data.source.url')} />
              </Stack>
            </Tabs.Panel>
          </Tabs>
          <Group justify='flex-end'>
            <Button variant='subtle' onClick={props.onCancel}>
              Cancel
            </Button>
            <Button type='submit' disabled={hasInvalidTraits}>
              Update
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}
