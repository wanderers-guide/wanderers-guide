import { Box, Button, Loader, Stack, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

/**
 * Shared load/failure state for content drawers.
 *
 * Content drawers fetch their record by id and, until this component, rendered a bare
 * <Loader> whenever the record was falsy. But `makeRequest` returns `null` on a failed
 * fetch (network/timeout/HTTP error), which react-query treats as a *successful* query
 * with null data — so `isError` never fired and the drawer spun forever with a blank
 * title, no error, and no way to retry. That was the single most common dead-end when
 * reading game content.
 *
 * Rendering this instead distinguishes the two cases by the query's fetching state:
 *  - still fetching  -> the spinner (unchanged from before)
 *  - settled + empty -> a short message and a Retry button (calls the query's refetch)
 *
 * Pass the query's `isFetching` as `loading` and its `refetch` as `onRetry`.
 */
export default function DrawerLoadState(props: { loading: boolean; onRetry?: () => void }) {
  if (props.loading) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  return (
    <Box
      style={{
        position: 'absolute',
        top: '35%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: 320,
      }}
    >
      <Stack align='center' gap={8}>
        <Text ta='center' fw={600}>
          Couldn’t load this content
        </Text>
        <Text ta='center' size='sm' c='dimmed'>
          Something went wrong fetching it. Check your connection and try again.
        </Text>
        {props.onRetry && (
          <Button
            variant='light'
            size='compact-sm'
            radius='xl'
            mt={4}
            leftSection={<IconRefresh size='0.9rem' />}
            onClick={() => props.onRetry?.()}
          >
            Retry
          </Button>
        )}
      </Stack>
    </Box>
  );
}
