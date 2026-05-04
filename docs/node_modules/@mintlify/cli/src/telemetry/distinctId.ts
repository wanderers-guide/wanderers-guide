import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { CONFIG_DIR } from '../constants.js';

const ID_FILE = path.join(CONFIG_DIR, 'anonymous-id');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function readValidIdFromFile(): string | null {
  try {
    const raw = fs.readFileSync(ID_FILE, 'utf-8').trim();
    if (UUID_RE.test(raw)) return raw;
  } catch {}
  return null;
}

function stableMachineDistinctId(): string {
  const h = crypto.createHash('sha256');
  h.update(os.hostname());
  h.update('\0');
  h.update(os.homedir());
  h.update('\0');
  h.update(process.env.USER ?? process.env.USERNAME ?? '');
  const hex = h.digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function tryPersistId(id: string): void {
  fs.mkdirSync(path.dirname(ID_FILE), { recursive: true });
  fs.writeFileSync(ID_FILE, id, { flag: 'wx' });
}

export function getDistinctId(): string {
  const existing = readValidIdFromFile();
  if (existing) return existing;

  const randomId = crypto.randomUUID();

  try {
    tryPersistId(randomId);
    return readValidIdFromFile() ?? randomId;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') {
      const concurrent = readValidIdFromFile();
      if (concurrent) return concurrent;
      try {
        fs.writeFileSync(ID_FILE, randomId);
      } catch {}
      return readValidIdFromFile() ?? randomId;
    }
  }

  const stable = stableMachineDistinctId();
  try {
    fs.mkdirSync(path.dirname(ID_FILE), { recursive: true });
    fs.writeFileSync(ID_FILE, stable);
  } catch {}
  return readValidIdFromFile() ?? stable;
}
