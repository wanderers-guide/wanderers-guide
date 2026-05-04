import os from 'os';

import { isTelemetryEnabled } from '../config.js';
import { TELEMETRY_ASYNC_TIMEOUT_MS } from '../constants.js';
import { getVersions, isAI } from '../helpers.js';
import { getPostHogClient } from './client.js';
import { getDistinctId } from './distinctId.js';

export interface TrackCommandOptions {
  command: string;
  cliVersion?: string;
  subdomain?: string;
}

async function captureWithTimeout(
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  await Promise.race([
    getPostHogClient()
      .captureImmediate({
        distinctId: getDistinctId(),
        event,
        properties,
      })
      .catch(() => {}),
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, TELEMETRY_ASYNC_TIMEOUT_MS);
      t.unref();
    }),
  ]);
}

export async function trackCommand({
  command,
  cliVersion,
  subdomain,
}: TrackCommandOptions): Promise<void> {
  if (!isTelemetryEnabled()) return;

  try {
    await captureWithTimeout('cli.command.executed', {
      command,
      cli_version: cliVersion,
      os: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      is_ai_agent: isAI(),
      subdomain,
    });
  } catch {}
}

async function trackLoginEvent(event: string, extra?: Record<string, unknown>): Promise<void> {
  if (!isTelemetryEnabled()) return;
  try {
    const { cli: cliVersion } = getVersions();
    await captureWithTimeout(event, {
      ...extra,
      cli_version: cliVersion,
      os: os.platform(),
      arch: os.arch(),
      node_version: process.version,
    });
  } catch {}
}

export async function trackLoginAttempt(): Promise<void> {
  return trackLoginEvent('cli.login.attempted');
}

export async function trackLoginSuccess(): Promise<void> {
  return trackLoginEvent('cli.login.succeeded');
}

export async function trackLoginFailed(reason: string): Promise<void> {
  return trackLoginEvent('cli.login.failed', { reason });
}

export async function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!isTelemetryEnabled()) return;

  try {
    const { cli: cliVersion } = getVersions();
    await captureWithTimeout(event, {
      ...properties,
      cli_version: cliVersion,
      os: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      is_ai_agent: isAI(),
    });
  } catch {}
}

export async function trackTelemetryPreferenceChange(options: { enabled: boolean }): Promise<void> {
  if (process.env.CLI_TEST_MODE === 'true') return;

  try {
    const { cli: cliVersion } = getVersions();
    await captureWithTimeout('cli.telemetry.preference_changed', {
      enabled: options.enabled,
      cli_version: cliVersion,
      os: os.platform(),
      arch: os.arch(),
      node_version: process.version,
    });
  } catch {}
}
