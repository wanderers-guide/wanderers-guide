import { prepareStarshipContentUpdate } from '@content/starship-content-update';
import { Box, Button, Group, Modal, Stack, Textarea, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Starship } from '@schemas/content';

/** Submit source-rule corrections through moderation, preserving catalog identity and classification. */
export function EditStarshipModal(props: {
  opened: boolean;
  starship: Starship;
  zIndex?: number;
  onCancel: () => void;
  onComplete: (ship: Starship) => void;
}) {
  const form = useForm({ initialValues: structuredClone(props.starship) });
  return (
    <Modal
      opened={props.opened}
      onClose={props.onCancel}
      title={<Title order={3}>Edit Starship</Title>}
      size='lg'
      zIndex={props.zIndex ?? 1000}
    >
      <Box
        component='form'
        onSubmit={form.onSubmit((values) => {
          const result = prepareStarshipContentUpdate(props.starship, values);
          if (result.success) props.onComplete(result.data);
          else for (const issue of result.error.issues) form.setFieldError(issue.path.join('.'), issue.message);
        })}
      >
        <Stack gap='md'>
          <TextInput label='Name' required {...form.getInputProps('name')} />
          <Textarea label='Description' autosize minRows={3} {...form.getInputProps('details.description')} />
          <Textarea label='Stat Block' required autosize minRows={10} {...form.getInputProps('details.stat_block')} />
          <Group justify='flex-end'>
            <Button variant='subtle' onClick={props.onCancel}>
              Cancel
            </Button>
            <Button type='submit'>Update</Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}
