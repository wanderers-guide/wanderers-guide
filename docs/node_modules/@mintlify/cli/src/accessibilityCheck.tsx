import { getBackgroundColors } from '@mintlify/common';
import { getConfigObj, getConfigPath } from '@mintlify/prebuild';
import { addLog, ErrorLog, WarningLog } from '@mintlify/previewing';
import type { DocsConfig } from '@mintlify/validation';
import { Text } from 'ink';

import { checkDocsColors, type AccessibilityCheckResult } from './accessibility.js';
import { ContrastResult } from './accessibility.js';
import { CMD_EXEC_PATH, checkForDocsJson } from './helpers.js';

export type TerminateCode = 0 | 1;

export const accessibilityCheck = async (): Promise<TerminateCode> => {
  try {
    await checkForDocsJson();

    const docsConfigPath = await getConfigPath(CMD_EXEC_PATH, 'docs');
    const mintConfigPath = await getConfigPath(CMD_EXEC_PATH, 'mint');

    if (!docsConfigPath && !mintConfigPath) {
      addLog(
        <ErrorLog message="No configuration file found. Please run this command from a directory with a mint.json or docs.json file." />
      );
      return 1;
    }

    const configType = docsConfigPath ? 'docs' : 'mint';
    const config = (await getConfigObj(CMD_EXEC_PATH, configType)) as DocsConfig | null;

    if (!config?.colors) {
      addLog(<WarningLog message="No colors section found in configuration file" />);
      return 0;
    }

    const { colors, navigation } = config;

    const { lightHex, darkHex } = getBackgroundColors(config);

    const results: AccessibilityCheckResult = checkDocsColors(
      colors,
      { lightHex, darkHex },
      navigation
    );

    const displayContrastResult = (
      result: ContrastResult | null,
      label: string,
      prefix: string = ''
    ) => {
      if (!result) return;

      const { recommendation, message } = result;
      const icon =
        recommendation === 'pass' ? 'PASS' : recommendation === 'warning' ? 'WARN' : 'FAIL';
      const color =
        recommendation === 'pass' ? 'green' : recommendation === 'warning' ? 'yellow' : 'red';

      addLog(
        <Text>
          <Text bold={prefix === ''}>
            {prefix}
            {label}:{' '}
          </Text>
          <Text color={color}>
            {icon} {message}
          </Text>
        </Text>
      );
    };

    addLog(
      <Text bold color="cyan">
        Checking color accessibility...
      </Text>
    );
    addLog(<Text></Text>);

    displayContrastResult(
      results.primaryContrast,
      `Primary Color (${colors.primary}) vs Light Background`
    );
    displayContrastResult(
      results.lightContrast,
      `Light Color (${colors.light}) vs Dark Background`
    );
    displayContrastResult(results.darkContrast, `Dark Color (${colors.dark}) vs Dark Background`);
    displayContrastResult(
      results.darkOnLightContrast,
      `Dark Color (${colors.dark}) vs Light Background`
    );

    const anchorsWithResults = results.anchorResults.filter(
      (anchor) => anchor.lightContrast || anchor.darkContrast
    );

    if (anchorsWithResults.length > 0) {
      addLog(<Text></Text>);
      addLog(
        <Text bold color="cyan">
          Navigation Anchors:
        </Text>
      );

      for (const anchor of anchorsWithResults) {
        addLog(<Text bold> {anchor.name}:</Text>);
        displayContrastResult(anchor.lightContrast, 'Light variant vs Light Background', '    ');
        displayContrastResult(anchor.darkContrast, 'Dark variant vs Dark Background', '    ');
      }
    }

    addLog(<Text></Text>);
    const overallIcon =
      results.overallScore === 'pass'
        ? 'PASS'
        : results.overallScore === 'warning'
          ? 'WARN'
          : 'FAIL';
    const overallColor =
      results.overallScore === 'pass'
        ? 'green'
        : results.overallScore === 'warning'
          ? 'yellow'
          : 'red';
    const overallMessage =
      results.overallScore === 'pass'
        ? 'All colors meet accessibility standards!'
        : results.overallScore === 'warning'
          ? 'Some colors could be improved for better accessibility'
          : 'Some colors fail accessibility standards and should be updated';

    addLog(
      <Text>
        <Text bold color={overallColor}>
          Overall Assessment: {overallIcon} {overallMessage}
        </Text>
      </Text>
    );

    return results.overallScore === 'fail' ? 1 : 0;
  } catch (error) {
    addLog(
      <ErrorLog
        message={`Accessibility check failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`}
      />
    );
    return 1;
  }
};
