import type { ArgumentsCamelCase } from 'yargs';

import { getConfigValue } from '../config.js';
import { getAccessToken } from '../keyring.js';
import { getCliSubdomains } from '../status.js';

type MiddlewareArgs = ArgumentsCamelCase<Record<string, unknown>>;

export async function subdomainMiddleware(argv: MiddlewareArgs): Promise<void> {
  if (typeof argv.subdomain === 'string' && argv.subdomain.length > 0) return;
  const fromConfig = getConfigValue('subdomain');
  if (fromConfig) {
    argv.subdomain = fromConfig;
    return;
  }
  const accessToken = await getAccessToken();
  if (!accessToken) return;
  const subdomains = await getCliSubdomains(accessToken);
  argv.subdomain = subdomains[0];
}
