import { getContentUpdateReviewFields } from '@content/content-update-review';
import { Accordion, JsonInput, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { ContentUpdate } from '@schemas/content';

/** Shows reviewer-only settings and complete read-only records for a content submission. */
export default function ContentUpdateDetails(props: {
  update: ContentUpdate;
  original: Record<string, unknown> | null;
}) {
  const compare = props.update.action !== 'CREATE';
  const fields = getContentUpdateReviewFields(props.update.type, props.update.data, props.original);

  return (
    <Stack gap='sm' mt='md'>
      <Text fw={600}>Content details</Text>
      {compare && (
        <Text size='xs' c='dimmed'>
          Changed values are shown in bold.
        </Text>
      )}
      <Table
        aria-label='Content settings'
        fz='sm'
        verticalSpacing='xs'
        horizontalSpacing='xs'
        style={{ tableLayout: 'fixed', overflowWrap: 'anywhere' }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Setting</Table.Th>
            {compare && <Table.Th>Original</Table.Th>}
            <Table.Th>Submitted</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {fields.map((field) => (
            <Table.Tr key={field.label}>
              <Table.Th scope='row' fw={400}>
                {field.label}
              </Table.Th>
              {compare && <Table.Td>{field.original}</Table.Td>}
              <Table.Td fw={compare && props.original && field.original !== field.submitted ? 700 : 400}>
                {field.submitted}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Accordion variant='default'>
        <Accordion.Item value='full-content-data'>
          <Accordion.Control>Full content data</Accordion.Control>
          <Accordion.Panel>
            <Text size='xs' c='dimmed' mb='sm'>
              Read-only records, including operations, metadata, and fields omitted from the rules preview.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: compare ? 2 : 1 }}>
              {compare &&
                (props.original ? (
                  <JsonInput
                    label='Original data'
                    value={JSON.stringify(props.original, null, 2)}
                    readOnly
                    autosize
                    minRows={6}
                    maxRows={16}
                  />
                ) : (
                  <Text size='sm' c='dimmed'>
                    Original content is unavailable.
                  </Text>
                ))}
              <JsonInput
                label='Submitted data'
                value={JSON.stringify(props.update.data, null, 2)}
                readOnly
                autosize
                minRows={6}
                maxRows={16}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
