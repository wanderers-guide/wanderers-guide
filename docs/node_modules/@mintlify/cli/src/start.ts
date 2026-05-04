#!/usr/bin/env node
import { cli } from './cli.js';
import { shutdownPostHog } from './telemetry/client.js';

const packageName = process.env.MINTLIFY_PACKAGE_NAME ?? 'mint';

cli({ packageName }).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

async function shutdown(exitCode: number): Promise<never> {
  await shutdownPostHog();
  process.exit(exitCode);
}

process.once('beforeExit', async () => {
  try {
    await shutdownPostHog();
  } catch {}
});
process.on('SIGINT', () => {
  void shutdown(130);
});
process.on('SIGTERM', () => {
  void shutdown(143);
});
