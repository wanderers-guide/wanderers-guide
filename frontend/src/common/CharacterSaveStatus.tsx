import { Button, Group, Text } from '@mantine/core';

export type CharacterSaveState = 'saved' | 'pending' | 'saving' | 'failed' | 'offline' | 'conflict' | 'read-only';

/** Distinguish server confirmation from a local draft throughout every character editor. */
export function CharacterSaveStatus({
  state,
  draftStored,
  onRetry,
  onReviewEarlierChanges,
}: {
  state: CharacterSaveState;
  draftStored: boolean;
  onRetry: () => void;
  onReviewEarlierChanges?: () => void;
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
              ? 'Not saved: retrying automatically'
              : state === 'offline'
                ? 'Offline: changes kept on this device'
                : state === 'saving'
                  ? 'Saving…'
                  : 'Changes waiting to save';
  return (
    <Group
      gap='xs'
      justify='flex-end'
      px='xs'
      py='xs'
      w='100%'
      bg='var(--glass-bg-color)'
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
      data-testid='character-save-status'
    >
      <Text
        size='xs'
        c={state === 'failed' || state === 'conflict' || !draftStored ? 'orange.3' : 'gray.0'}
        role='status'
      >
        {message}
      </Text>
      {onReviewEarlierChanges && (
        <Button size='compact-xs' variant='subtle' c='gray.0' onClick={onReviewEarlierChanges}>
          Review earlier changes
        </Button>
      )}
      {(state === 'failed' || state === 'offline') && (
        <Button size='compact-xs' variant='subtle' c='gray.0' onClick={onRetry}>
          Retry now
        </Button>
      )}
    </Group>
  );
}
