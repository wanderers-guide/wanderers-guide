import TraitsInput from '@common/TraitsInput';
import { prepareHazardContentUpdate } from '@content/hazard-content-update';
import {
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  TagsInput,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { ActionCostSchema, Hazard, RaritySchema } from '@schemas/content';
import { toLabel } from '@utils/strings';
import { cloneDeep } from 'lodash-es';
import { useState } from 'react';

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
  const zIndex = props.zIndex ?? 1000;

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
                      label='Immunities'
                      autosize
                      minRows={2}
                      {...form.getInputProps('details.defenses.immunities')}
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
