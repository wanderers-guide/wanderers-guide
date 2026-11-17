import { PATREON_AUTH_URL } from '@constants/urls';
import { Alert, Button, Group, Text } from '@mantine/core';
import type { PublicUser } from '@schemas/content';
import { IconBrandPatreon } from '@tabler/icons-react';
import { getPatreonReconnectTarget } from '@utils/patreon';

/** Keep migration actionable on every signed-in route without starting OAuth automatically. */
export function PatreonMigrationNotice({ user }: { user: PublicUser | null }) {
  const target = getPatreonReconnectTarget(user);
  if (!target) return null;
  return (
    <Alert
      color='dark'
      variant='filled'
      title={target === 'self' ? 'Update your Patreon connection' : 'Your Game Master’s Patreon needs updating'}
      icon={<IconBrandPatreon size='1rem' />}
      mb='md'
      data-testid='patreon-migration-notice'
    >
      <Group justify='space-between' gap='sm'>
        <Text size='sm'>
          {target === 'self' ? 'Reconnect to verify your membership.' : 'Ask your Game Master to reconnect Patreon.'}
        </Text>
        {target === 'self' && (
          <Button component='a' href={PATREON_AUTH_URL} variant='light' color='yellow' size='xs'>
            Reconnect Patreon
          </Button>
        )}
      </Group>
    </Alert>
  );
}
