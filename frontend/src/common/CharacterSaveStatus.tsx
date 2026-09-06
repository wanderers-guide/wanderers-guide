import { Button, Group, Text } from '@mantine/core';

export type CharacterSaveState = 'saved' | 'pending' | 'saving' | 'failed' | 'offline' | 'conflict' | 'read-only';

/** Distinguish server confirmation from a local draft throughout every character editor. */
export function CharacterSaveStatus({
  state,
  draftStored,
  onRetry,
}: {
  state: CharacterSaveState;
  draftStored: boolean;
  onRetry: () => void;
}) {
  const message =
    state === 'saved'
      ? 'Saved'
      : state === 'read-only'
        ? 'View only'
        : state === 'conflict'
          ? 'Saving paused: resolve conflicting edits'
          : !draftStored
            ? 'Not saved: keep this page open'
            : state === 'failed'
              ? 'Not synced: retrying automatically'
              : state === 'offline'
                ? 'Offline: changes kept on this device'
                : state === 'saving'
                  ? 'Saving…'
                  : 'Changes waiting to save';
  return (
    <Group gap='xs' justify='flex-end' px='xs' py='xs' w='100%' data-testid='character-save-status'>
      <Text
        size='xs'
        c={state === 'failed' || state === 'conflict' || !draftStored ? 'orange' : 'dimmed'}
        role='status'
      >
        {message}
      </Text>
      {(state === 'failed' || state === 'offline') && (
        <Button size='compact-xs' variant='subtle' onClick={onRetry}>
          Retry now
        </Button>
      )}
    </Group>
  );
}
