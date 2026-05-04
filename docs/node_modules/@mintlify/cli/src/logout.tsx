import { addLog, SuccessLog } from '@mintlify/previewing';

import { clearCredentials } from './keyring.js';

export async function logout(): Promise<void> {
  await clearCredentials();
  addLog(<SuccessLog message="logged out successfully" />);
}
