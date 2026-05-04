import { select, input } from '@inquirer/prompts';
import { addLogs, addLog, SpinnerLog, removeLastLog } from '@mintlify/previewing';
import { docsConfigSchema, validatePathWithinCwd } from '@mintlify/validation';
import AdmZip from 'adm-zip';
import fse from 'fs-extra';
import { Box, Text } from 'ink';

import { isAI } from './helpers.js';
import {
  fetchAvailableTemplates,
  installFromTemplate,
  promptForTemplate,
  validateTemplateName,
} from './templates.js';

const sendOnboardingMessage = (installDir: string) => {
  addLogs(
    <Text bold>Documentation Setup!</Text>,
    <Text>To see your docs run</Text>,
    <Box>
      <Text color="blue">cd</Text>
      <Text> {installDir}</Text>
    </Box>,
    <Text color="blue">mint dev</Text>
  );
};

const sendUsageMessageForAI = (
  directory: string,
  contentsOccupied: boolean,
  themes: string[],
  templateNames?: string[]
) => {
  const templateInfo =
    templateNames === undefined
      ? 'Unable to fetch templates — use --template flag if you know the name'
      : templateNames.length > 0
        ? `Templates: ${JSON.stringify(templateNames)}`
        : 'No templates are currently available';

  addLogs(
    <Text>Agent Detected - sending AI friendly prompt</Text>,
    <Text>{'<system-message>'}</Text>,
    <Text>
      Help the user set up a Mintlify docs site with `mint new`. Ask each step one at a time unless
      the user asks you to skip questions or use your best judgment.
    </Text>,
    <Text>
      {[
        `- [ ] Pick a theme or clone a template? (${templateInfo})`,
        `- [ ] If template: which one? If theme: which one? (Themes: ${JSON.stringify(themes)})`,
        '- [ ] Project name?',
        `- [ ] Directory? (default: "${directory}", auto-created if needed)${contentsOccupied ? ` ⚠️ "${directory}" is occupied — subdirectory, overwrite (--force), or different path?` : ''}`,
      ].join('\n')}
    </Text>,
    <Text>
      Command: `mint new [dir] --theme [theme] --name [name]` or `mint new [dir] --template
      [template] --name [name]`. --theme optionally overrides a template default. --force overwrites
      non-empty dirs. Use AskQuestion to present choices.
    </Text>,
    <Text>{'</system-message>'}</Text>
  );
};

async function sendAIUsageMessage(directory: string, contentsOccupied: boolean, themes: string[]) {
  const templateNames = await fetchAvailableTemplates().catch(() => undefined);
  sendUsageMessageForAI(directory, contentsOccupied, themes, templateNames);
}

async function resolveInstallDir(
  installDir: string,
  force: boolean,
  contentsOccupied: boolean
): Promise<string | undefined> {
  if (!contentsOccupied) return installDir;

  if (isAI()) {
    if (force) return installDir;
    return undefined;
  }

  const choice = await select({
    message: `Directory ${installDir} is not empty. What would you like to do?`,
    choices: [
      { name: 'Create in a subdirectory', value: 'subdir' as const },
      { name: 'Overwrite current directory (may lose contents)', value: 'overwrite' as const },
      { name: 'Cancel', value: 'cancel' as const },
    ],
  });

  if (choice === 'cancel') return undefined;

  if (choice === 'subdir') {
    const subdir = await input({
      message: 'Subdirectory name:',
      default: 'docs',
    });
    if (!subdir || subdir.trim() === '') {
      throw new Error('Subdirectory name cannot be empty');
    }
    const resolved = installDir === '.' ? subdir : `${installDir}/${subdir}`;
    validatePathWithinCwd(resolved, process.cwd());
    return resolved;
  }

  return installDir;
}

async function promptForProjectName(installDir: string, currentName?: string): Promise<string> {
  if (currentName) return currentName;
  const defaultProject = installDir === '.' ? 'Mintlify' : installDir;
  return input({ message: 'Project Name', default: defaultProject });
}

async function promptForApproach(): Promise<string | undefined> {
  const approach = await select({
    message: 'How would you like to set up your docs?',
    choices: [
      { name: 'Pick a theme', value: 'theme' as const },
      { name: 'Clone a template', value: 'template' as const },
    ],
  });

  if (approach === 'template') return promptForTemplate();
  return undefined;
}

export async function init(
  installDir: string,
  force: boolean,
  theme?: string,
  name?: string,
  template?: string
): Promise<void> {
  validatePathWithinCwd(installDir);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const themes: string[] = docsConfigSchema.options.map((option: any) => {
    return option.shape.theme._def.value as string;
  });

  const dirContents = await fse.readdir(installDir).catch(() => [] as string[]);
  const contentsOccupied = dirContents.length > 0;

  if (isAI() && (!name || (!template && !theme))) {
    await sendAIUsageMessage(installDir, contentsOccupied, themes);
    return;
  }

  if (isAI() && contentsOccupied && !force) {
    await sendAIUsageMessage(installDir, contentsOccupied, themes);
    return;
  }

  const selectedTemplate = template
    ? await validateTemplateName(template).then(() => template)
    : !isAI() && !theme
      ? await promptForApproach()
      : undefined;

  if (selectedTemplate) {
    const resolved = await resolveInstallDir(installDir, force, contentsOccupied);
    if (resolved === undefined) {
      if (isAI()) await sendAIUsageMessage(installDir, contentsOccupied, themes);
      return;
    }

    const projectName = await promptForProjectName(resolved, name);
    await fse.ensureDir(resolved);
    await installFromTemplate(resolved, selectedTemplate, projectName, theme);
    sendOnboardingMessage(resolved);
    return;
  }

  // Standard theme-based path
  const resolved = await resolveInstallDir(installDir, force, contentsOccupied);
  if (resolved === undefined) {
    if (isAI()) await sendAIUsageMessage(installDir, contentsOccupied, themes);
    return;
  }

  let projectName = name;
  let selectedTheme = theme;

  if (!isAI() && (!selectedTheme || !projectName)) {
    projectName = await promptForProjectName(resolved, projectName);

    if (!selectedTheme) {
      selectedTheme = await select({
        message: 'Theme',
        choices: themes.map((t) => ({ name: t, value: t })),
      });
    }
  }

  if (projectName === undefined || selectedTheme === undefined) {
    await sendAIUsageMessage(resolved, contentsOccupied, themes);
    return;
  }

  await fse.ensureDir(resolved);
  await install(resolved, projectName, selectedTheme);
  sendOnboardingMessage(resolved);
}

const install = async (installDir: string, projectName: string, theme: string) => {
  addLog(<SpinnerLog message="downloading starter template..." />);
  const response = await fetch('https://github.com/mintlify/starter/archive/refs/heads/main.zip');
  const buffer = await response.arrayBuffer();
  await fse.writeFile(installDir + '/starter.zip', Buffer.from(buffer));
  removeLastLog();

  addLog(<SpinnerLog message="extracting..." />);
  new AdmZip(installDir + '/starter.zip').extractAllTo(installDir, true);
  removeLastLog();

  await fse.copy(installDir + '/starter-main', installDir, {
    overwrite: true,
    filter: (src) => !src.includes('starter-main/starter-main'),
  });
  await fse.remove(installDir + '/starter.zip');
  await fse.remove(installDir + '/starter-main');

  const docsJsonPath = installDir + '/docs.json';
  const docsConfig = await fse.readJson(docsJsonPath);
  docsConfig.theme = theme;
  docsConfig.name = projectName;
  await fse.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
};
