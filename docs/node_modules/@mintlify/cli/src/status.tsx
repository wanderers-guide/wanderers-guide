import { addLog, ErrorLog } from '@mintlify/previewing';
import { Box, Text } from 'ink';
import { z } from 'zod';

import { authenticatedFetch } from './authenticatedFetch.js';
import { getConfigValue } from './config.js';
import { API_URL } from './constants.js';
import { getCliVersion } from './helpers.js';
import { getAccessToken } from './keyring.js';

const StatusResponseSchema = z.object({
  user: z.object({ email: z.string() }),
  org: z.object({ name: z.string() }),
  subdomains: z.array(z.string()).default([]),
});

export async function getCliSubdomains(accessToken: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/api/cli/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const parsed = StatusResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.subdomains : [];
  } catch {
    return [];
  }
}

export async function status(): Promise<void> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    addLog(<ErrorLog message="not logged in. Run `mint login` to authenticate." />);
    return;
  }

  try {
    const res = await authenticatedFetch(`${API_URL}/api/cli/status`);

    if (!res.ok) {
      addLog(<ErrorLog message="not logged in. Run `mint login` to authenticate." />);
      return;
    }

    const json = await res.json().catch(() => null);
    const parsed = StatusResponseSchema.safeParse(json);

    if (!parsed.success) {
      addLog(<ErrorLog message="unexpected response from server. please try again." />);
      return;
    }

    const { user, org, subdomains } = parsed.data;
    const version = getCliVersion();
    const subdomain = getConfigValue('subdomain') ?? subdomains[0] ?? null;
    addLog(
      <Box flexDirection="column" paddingY={1}>
        {version && (
          <Box>
            <Box minWidth={16}>
              <Text dimColor>Version</Text>
            </Box>
            <Text>{version}</Text>
          </Box>
        )}
        <Box>
          <Box minWidth={16}>
            <Text dimColor>Email</Text>
          </Box>
          <Text>{user.email}</Text>
        </Box>
        <Box>
          <Box minWidth={16}>
            <Text dimColor>Organization</Text>
          </Box>
          <Text>{org.name}</Text>
        </Box>
        {subdomain && (
          <Box>
            <Box minWidth={16}>
              <Text dimColor>Subdomain</Text>
            </Box>
            <Text>{subdomain}</Text>
          </Box>
        )}
      </Box>
    );
  } catch (e) {
    addLog(<ErrorLog message="unexpected response from server. please try again." />);
  }
}
