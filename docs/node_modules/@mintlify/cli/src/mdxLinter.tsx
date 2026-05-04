import { addLog, ErrorLog, SuccessLog } from '@mintlify/previewing';
import { Text } from 'ink';
import path from 'path';

import { TerminateCode } from './accessibilityCheck.js';
import { checkMdxAccessibility, type AccessibilityFixAttribute } from './mdxAccessibility.js';

export const mdxLinter = async (): Promise<TerminateCode> => {
  try {
    addLog(
      <Text bold color="cyan">
        Checking mdx files for accessibility issues...
      </Text>
    );

    const results = await checkMdxAccessibility();

    if (results.missingAltAttributes.length === 0) {
      addLog(<SuccessLog message="no accessibility issues found" />);
      addLog(
        <Text>
          Checked {results.totalFiles} MDX files - all images and videos have alt attributes.
        </Text>
      );
      return 0;
    }

    const issuesByFile: Record<string, AccessibilityFixAttribute[]> = {};
    results.missingAltAttributes.forEach((issue) => {
      if (!issuesByFile[issue.filePath]) {
        issuesByFile[issue.filePath] = [];
      }
      issuesByFile[issue.filePath]?.push(issue);
    });

    addLog(
      <Text bold color="red">
        Found {results.missingAltAttributes.length} accessibility issues in{' '}
        {results.filesWithIssues} files:
      </Text>
    );
    addLog(<Text></Text>);

    for (const [filePath, issues] of Object.entries(issuesByFile)) {
      const relativePath = path.relative(process.cwd(), filePath);
      addLog(<Text bold>{relativePath}:</Text>);

      for (const issue of issues) {
        const location =
          issue.line && issue.column ? ` (line ${issue.line}, col ${issue.column})` : '';
        if (issue.element === 'a') {
          addLog(
            <Text>
              <Text color="red"> ✗</Text> Missing text attribute <Text bold>{issue.tagName}</Text>{' '}
              element{location}
            </Text>
          );
        } else {
          addLog(
            <Text>
              <Text color="red"> ✗</Text> Missing alt attribute on <Text bold>{issue.tagName}</Text>{' '}
              element{location}
            </Text>
          );
        }
      }
      addLog(<Text></Text>);
    }

    addLog(
      <Text color="yellow">
        <Text bold>Recommendation:</Text> Add alt attributes to all images and videos for better
        accessibility.
      </Text>
    );

    return 1;
  } catch (error) {
    addLog(
      <ErrorLog
        message={`MDX accessibility check failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`}
      />
    );
    return 1;
  }
};
