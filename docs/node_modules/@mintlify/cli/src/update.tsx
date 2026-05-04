import {
  SpinnerLog,
  SuccessLog,
  ErrorLog,
  addLog,
  addErrorLog,
  clearLogs,
  getLatestClientVersion,
  downloadTargetMint,
  getClientVersion,
} from '@mintlify/previewing';

import { execAsync, getLatestCliVersion, getVersions, detectPackageManager } from './helpers.js';

export const update = async ({ packageName }: { packageName: string }) => {
  addLog(<SpinnerLog message="updating..." />);
  const { cli: existingCliVersion } = getVersions(packageName);
  const latestCliVersion = getLatestCliVersion(packageName);
  const isUpToDate =
    existingCliVersion && latestCliVersion && latestCliVersion.trim() === existingCliVersion.trim();

  if (!isUpToDate && existingCliVersion && latestCliVersion.trim() !== existingCliVersion.trim()) {
    const packageManager = await detectPackageManager({ packageName });
    try {
      clearLogs();
      addLog(<SpinnerLog message={`updating ${packageName} package...`} />);

      if (packageManager === 'pnpm') {
        await execAsync(`pnpm install -g ${packageName}@latest --silent`);
      } else {
        await execAsync(`npm install -g ${packageName}@latest --silent`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addErrorLog(
        <ErrorLog
          message={`Failed to update ${packageName}@${latestCliVersion} using ${packageManager}: ${errorMessage}`}
        />
      );
      return;
    }
  }

  clearLogs();
  addLog(<SpinnerLog message="updating client..." />);
  let clientUpdated = false;
  const latestClientVersion = await getLatestClientVersion();
  if (latestClientVersion) {
    const existingClientVersion = getClientVersion().trim();
    if (existingClientVersion !== latestClientVersion.trim()) {
      try {
        await downloadTargetMint({
          targetVersion: latestClientVersion,
          existingVersion: existingClientVersion === 'none' ? null : existingClientVersion,
        });
        clientUpdated = true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addErrorLog(<ErrorLog message={`Failed to update client: ${errorMessage}`} />);
        return;
      }
    }
  }

  clearLogs();
  if (isUpToDate && !clientUpdated) {
    addLog(<SuccessLog message="already up to date" />);
  } else {
    addLog(
      <SuccessLog message={`updated ${packageName} to the latest version: ${latestCliVersion}`} />
    );
  }
};
