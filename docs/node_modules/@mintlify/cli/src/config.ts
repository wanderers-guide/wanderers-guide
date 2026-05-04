import fs from 'fs';
import { ensureDir } from 'fs-extra';

import { CLI_CONFIG_FILE, CONFIG_DIR } from './constants.js';

interface MintlifyConfig {
  telemetryEnabled?: boolean;
  subdomain?: string;
  dateFrom?: string;
  dateTo?: string;
}

function readConfig(): MintlifyConfig {
  try {
    const raw = fs.readFileSync(CLI_CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as MintlifyConfig;
  } catch {
    return {};
  }
}

async function writeConfig(updates: Partial<MintlifyConfig>): Promise<void> {
  await ensureDir(CONFIG_DIR);
  const existing = readConfig();
  fs.writeFileSync(CLI_CONFIG_FILE, JSON.stringify({ ...existing, ...updates }, null, 2));
}

export function isTelemetryEnabled(): boolean {
  if (process.env.CLI_TEST_MODE === 'true') return false;
  if (process.env.MINTLIFY_TELEMETRY_DISABLED === '1') return false;
  if (process.env.DO_NOT_TRACK === '1') return false;
  return readConfig().telemetryEnabled !== false;
}

export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
  await writeConfig({ telemetryEnabled: enabled });
}

export function getConfigValue(key: string): string | undefined {
  const config = readConfig();
  return config[key as keyof MintlifyConfig] as string | undefined;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await writeConfig({ [key]: value });
}

export async function clearConfigValue(key: string): Promise<void> {
  await writeConfig({ [key]: undefined });
}
