import { Alert, Button, Center, Stack } from '@mantine/core';

/** A failed connection must not turn a character route into an unauthorized page. */
export function CharacterLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Center py='xl' px='sm'>
      <Alert color='yellow' title='Could not load character'>
        <Stack gap='xs'>
          Check your connection and try again.
          <Button variant='light' onClick={onRetry}>
            Retry loading
          </Button>
        </Stack>
      </Alert>
    </Center>
  );
}
