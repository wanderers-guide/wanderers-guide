var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx } from "react/jsx-runtime";
import { select } from '@inquirer/prompts';
import { addLog, SpinnerLog, removeLastLog } from '@mintlify/previewing';
import AdmZip from 'adm-zip';
import fse from 'fs-extra';
import path from 'path';
const TEMPLATES_REPO_OWNER = 'mintlify';
const TEMPLATES_REPO_NAME = 'templates';
const TEMPLATES_REPO_BRANCH = 'main';
export function fetchAvailableTemplates() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://api.github.com/repos/${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}/contents/?ref=${TEMPLATES_REPO_BRANCH}`;
        const response = yield fetch(url, {
            headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
        }
        const entries = (yield response.json());
        return entries.filter((entry) => entry.type === 'dir').map((entry) => entry.name);
    });
}
export function validateTemplateName(templateName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!templateName ||
            templateName === '.' ||
            templateName === '..' ||
            templateName.includes('/')) {
            throw new Error(`Invalid template name: "${templateName}".`);
        }
        const url = `https://api.github.com/repos/${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}/contents/${encodeURIComponent(templateName)}?ref=${TEMPLATES_REPO_BRANCH}`;
        const response = yield fetch(url, {
            headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!response.ok) {
            const available = yield fetchAvailableTemplates().catch(() => []);
            const suggestion = available.length > 0 ? ` Available templates: ${available.join(', ')}` : '';
            throw new Error(`Template "${templateName}" not found in ${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}.${suggestion}`);
        }
        const entries = (yield response.json());
        const hasDocsJson = entries.some((entry) => entry.name === 'docs.json');
        if (!hasDocsJson) {
            throw new Error(`Template "${templateName}" is not a valid Mintlify template (missing docs.json).`);
        }
        return templateName;
    });
}
export function promptForTemplate() {
    return __awaiter(this, void 0, void 0, function* () {
        addLog(_jsx(SpinnerLog, { message: "fetching available templates..." }));
        let templateNames;
        try {
            templateNames = yield fetchAvailableTemplates();
        }
        catch (_a) {
            removeLastLog();
            throw new Error('Failed to fetch templates. Please check your network connection and try again.');
        }
        removeLastLog();
        if (templateNames.length === 0) {
            throw new Error('No templates are currently available.');
        }
        return select({
            message: 'Choose a template',
            choices: templateNames.map((t) => ({ name: t, value: t })),
        });
    });
}
export function installFromTemplate(installDir, templateName, projectName, theme) {
    return __awaiter(this, void 0, void 0, function* () {
        const zipPath = path.join(installDir, '__template__.zip');
        const extractDir = path.join(installDir, '__template_extract__');
        try {
            addLog(_jsx(SpinnerLog, { message: `downloading template "${templateName}"...` }));
            try {
                const zipUrl = `https://github.com/${TEMPLATES_REPO_OWNER}/${TEMPLATES_REPO_NAME}/archive/refs/heads/${TEMPLATES_REPO_BRANCH}.zip`;
                const response = yield fetch(zipUrl);
                if (!response.ok) {
                    throw new Error(`Failed to download templates archive: ${response.status}`);
                }
                const buffer = yield response.arrayBuffer();
                yield fse.writeFile(zipPath, Buffer.from(buffer));
            }
            finally {
                removeLastLog();
            }
            addLog(_jsx(SpinnerLog, { message: "extracting template..." }));
            try {
                const zip = new AdmZip(zipPath);
                zip.extractAllTo(extractDir, true);
            }
            finally {
                removeLastLog();
            }
            const repoRoot = path.join(extractDir, `${TEMPLATES_REPO_NAME}-${TEMPLATES_REPO_BRANCH}`);
            const templateDir = path.join(repoRoot, templateName);
            if (!(yield fse.pathExists(templateDir))) {
                throw new Error(`Template directory "${templateName}" not found in the downloaded archive.`);
            }
            yield fse.copy(templateDir, installDir, { overwrite: true });
        }
        finally {
            yield fse.remove(zipPath).catch(() => { });
            yield fse.remove(extractDir).catch(() => { });
        }
        const docsJsonPath = path.join(installDir, 'docs.json');
        if (yield fse.pathExists(docsJsonPath)) {
            const docsConfig = yield fse.readJson(docsJsonPath);
            if (projectName) {
                docsConfig.name = projectName;
            }
            if (theme) {
                docsConfig.theme = theme;
            }
            yield fse.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
        }
    });
}
