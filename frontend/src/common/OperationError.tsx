import { Button, Center, Paper, Stack, Text } from '@mantine/core';

/** Recover a failed calculation without resetting the character or its last valid store. */
export function OperationError({ loading, onRetry }: { loading: boolean; onRetry: () => void }) {
  return (
    <Center p='md'>
      <Paper withBorder p='xl' radius='md' bg='var(--mantine-color-body)' maw='30rem' w='100%'>
        <Stack align='center' gap='sm' role='alert'>
          <Text fw={600} ta='center'>
            Couldn't calculate this character
          </Text>
          <Text size='sm' c='dimmed' ta='center'>
            Retry to update your character's stats.
          </Text>
          <Button loading={loading} onClick={onRetry}>
            Retry calculation
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
