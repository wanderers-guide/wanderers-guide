import { addLog, SuccessLog, WarningLog } from '@mintlify/previewing';
import { Text } from 'ink';

import { isTelemetryEnabled } from './config.js';
import { terminate } from './helpers.js';

export function comingSoon(command: string, packageName: string) {
  return async () => {
    if (!isTelemetryEnabled()) {
      addLog(
        <WarningLog
          message={`Telemetry is disabled, so your vote won't be counted. Enable it with: ${packageName} --telemetry=true`}
        />
      );
    } else {
      addLog(
        <SuccessLog
          message={`Thanks for your interest in "${packageName} ${command}"! Your vote has been counted.`}
        />
      );
    }
    addLog(
      <Text dimColor>
        This feature is currently in development. Learn more at https://mintlify.com/docs
      </Text>
    );
    await terminate(0);
  };
}
