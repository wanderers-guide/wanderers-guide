import { select } from '@inquirer/prompts';
import { addLog, SpinnerLog, removeLastLog } from '@mintlify/previewing';
import AdmZip from 'adm-zip';
import fse from 'fs-extra';
import path from 'path';

const TEMPLATES_REPO_OWNER = 'mintlify';
const TEMPLATES_REPO_NAME = 'templates';
const TEMPLATES_REPO_BRANCH = 'main';

interface GitHubContentEntry {
  name: string;
  type: 'file' | 'dir';
  path: string;
}

export async function fetchAvailableTemplates(): Promise<string[]> {
  const url = `https://api.github.com/repos/${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}/contents/?ref=${TEMPLATES_REPO_BRANCH}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
  }

  const entries: GitHubContentEntry[] = (await response.json()) as GitHubContentEntry[];
  return entries.filter((entry) => entry.type === 'dir').map((entry) => entry.name);
}

export async function validateTemplateName(templateName: string): Promise<string> {
  if (
    !templateName ||
    templateName === '.' ||
    templateName === '..' ||
    templateName.includes('/')
  ) {
    throw new Error(`Invalid template name: "${templateName}".`);
  }

  const url = `https://api.github.com/repos/${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}/contents/${encodeURIComponent(templateName)}?ref=${TEMPLATES_REPO_BRANCH}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!response.ok) {
    const available = await fetchAvailableTemplates().catch(() => []);
    const suggestion = available.length > 0 ? ` Available templates: ${available.join(', ')}` : '';
    throw new Error(
      `Template "${templateName}" not found in ${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}.${suggestion}`
    );
  }

  const entries: GitHubContentEntry[] = (await response.json()) as GitHubContentEntry[];
  const hasDocsJson = entries.some((entry) => entry.name === 'docs.json');
  if (!hasDocsJson) {
    throw new Error(
      `Template "${templateName}" is not a valid Mintlify template (missing docs.json).`
    );
  }

  return templateName;
}

export async function promptForTemplate(): Promise<string> {
  addLog(<SpinnerLog message="fetching available templates..." />);
  let templateNames: string[];
  try {
    templateNames = await fetchAvailableTemplates();
  } catch {
    removeLastLog();
    throw new Error(
      'Failed to fetch templates. Please check your network connection and try again.'
    );
  }
  removeLastLog();

  if (templateNames.length === 0) {
    throw new Error('No templates are currently available.');
  }

  return select({
    message: 'Choose a template',
    choices: templateNames.map((t) => ({ name: t, value: t })),
  });
}

export async function installFromTemplate(
  installDir: string,
  templateName: string,
  projectName?: string,
  theme?: string
): Promise<void> {
  const zipPath = path.join(installDir, '__template__.zip');
  const extractDir = path.join(installDir, '__template_extract__');

  try {
    addLog(<SpinnerLog message={`downloading template "${templateName}"...`} />);
    try {
      const zipUrl = `https://github.com/${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}/archive/refs/heads/${TEMPLATES_REPO_BRANCH}.zip`;
      const response = await fetch(zipUrl);
      if (!response.ok) {
        throw new Error(`Failed to download templates archive: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      await fse.writeFile(zipPath, Buffer.from(buffer));
    } finally {
      removeLastLog();
    }

    addLog(<SpinnerLog message="extracting template..." />);
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true);
    } finally {
      removeLastLog();
    }

    const repoRoot = path.join(extractDir, `${TEMPLATES_REPO_NAME}-${TEMPLATES_REPO_BRANCH}`);
    const templateDir = path.join(repoRoot, templateName);

    if (!(await fse.pathExists(templateDir))) {
      throw new Error(`Template directory "${templateName}" not found in the downloaded archive.`);
    }

    await fse.copy(templateDir, installDir, { overwrite: true });
  } finally {
    await fse.remove(zipPath).catch(() => {});
    await fse.remove(extractDir).catch(() => {});
  }

  const docsJsonPath = path.join(installDir, 'docs.json');
  if (await fse.pathExists(docsJsonPath)) {
    const docsConfig = await fse.readJson(docsJsonPath);
    if (projectName) {
      docsConfig.name = projectName;
    }
    if (theme) {
      docsConfig.theme = theme;
    }
    await fse.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
  }
}
