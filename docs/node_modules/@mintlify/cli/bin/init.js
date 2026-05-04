var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { select, input } from '@inquirer/prompts';
import { addLogs, addLog, SpinnerLog, removeLastLog } from '@mintlify/previewing';
import { docsConfigSchema, validatePathWithinCwd } from '@mintlify/validation';
import AdmZip from 'adm-zip';
import fse from 'fs-extra';
import { Box, Text } from 'ink';
import { isAI } from './helpers.js';
import { fetchAvailableTemplates, installFromTemplate, promptForTemplate, validateTemplateName, } from './templates.js';
const sendOnboardingMessage = (installDir) => {
    addLogs(_jsx(Text, { bold: true, children: "Documentation Setup!" }), _jsx(Text, { children: "To see your docs run" }), _jsxs(Box, { children: [_jsx(Text, { color: "blue", children: "cd" }), _jsxs(Text, { children: [" ", installDir] })] }), _jsx(Text, { color: "blue", children: "mint dev" }));
};
const sendUsageMessageForAI = (directory, contentsOccupied, themes, templateNames) => {
    const templateInfo = templateNames === undefined
        ? 'Unable to fetch templates — use --template flag if you know the name'
        : templateNames.length > 0
            ? `Templates: ${JSON.stringify(templateNames)}`
            : 'No templates are currently available';
    addLogs(_jsx(Text, { children: "Agent Detected - sending AI friendly prompt" }), _jsx(Text, { children: '<system-message>' }), _jsx(Text, { children: "Help the user set up a Mintlify docs site with `mint new`. Ask each step one at a time unless the user asks you to skip questions or use your best judgment." }), _jsx(Text, { children: [
            `- [ ] Pick a theme or clone a template? (${templateInfo})`,
            `- [ ] If template: which one? If theme: which one? (Themes: ${JSON.stringify(themes)})`,
            '- [ ] Project name?',
            `- [ ] Directory? (default: "${directory}", auto-created if needed)${contentsOccupied ? ` ⚠️ "${directory}" is occupied — subdirectory, overwrite (--force), or different path?` : ''}`,
        ].join('\n') }), _jsx(Text, { children: "Command: `mint new [dir] --theme [theme] --name [name]` or `mint new [dir] --template [template] --name [name]`. --theme optionally overrides a template default. --force overwrites non-empty dirs. Use AskQuestion to present choices." }), _jsx(Text, { children: '</system-message>' }));
};
function sendAIUsageMessage(directory, contentsOccupied, themes) {
    return __awaiter(this, void 0, void 0, function* () {
        const templateNames = yield fetchAvailableTemplates().catch(() => undefined);
        sendUsageMessageForAI(directory, contentsOccupied, themes, templateNames);
    });
}
function resolveInstallDir(installDir, force, contentsOccupied) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!contentsOccupied)
            return installDir;
        if (isAI()) {
            if (force)
                return installDir;
            return undefined;
        }
        const choice = yield select({
            message: `Directory ${installDir} is not empty. What would you like to do?`,
            choices: [
                { name: 'Create in a subdirectory', value: 'subdir' },
                { name: 'Overwrite current directory (may lose contents)', value: 'overwrite' },
                { name: 'Cancel', value: 'cancel' },
            ],
        });
        if (choice === 'cancel')
            return undefined;
        if (choice === 'subdir') {
            const subdir = yield input({
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
    });
}
function promptForProjectName(installDir, currentName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (currentName)
            return currentName;
        const defaultProject = installDir === '.' ? 'Mintlify' : installDir;
        return input({ message: 'Project Name', default: defaultProject });
    });
}
function promptForApproach() {
    return __awaiter(this, void 0, void 0, function* () {
        const approach = yield select({
            message: 'How would you like to set up your docs?',
            choices: [
                { name: 'Pick a theme', value: 'theme' },
                { name: 'Clone a template', value: 'template' },
            ],
        });
        if (approach === 'template')
            return promptForTemplate();
        return undefined;
    });
}
export function init(installDir, force, theme, name, template) {
    return __awaiter(this, void 0, void 0, function* () {
        validatePathWithinCwd(installDir);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const themes = docsConfigSchema.options.map((option) => {
            return option.shape.theme._def.value;
        });
        const dirContents = yield fse.readdir(installDir).catch(() => []);
        const contentsOccupied = dirContents.length > 0;
        if (isAI() && (!name || (!template && !theme))) {
            yield sendAIUsageMessage(installDir, contentsOccupied, themes);
            return;
        }
        if (isAI() && contentsOccupied && !force) {
            yield sendAIUsageMessage(installDir, contentsOccupied, themes);
            return;
        }
        const selectedTemplate = template
            ? yield validateTemplateName(template).then(() => template)
            : !isAI() && !theme
                ? yield promptForApproach()
                : undefined;
        if (selectedTemplate) {
            const resolved = yield resolveInstallDir(installDir, force, contentsOccupied);
            if (resolved === undefined) {
                if (isAI())
                    yield sendAIUsageMessage(installDir, contentsOccupied, themes);
                return;
            }
            const projectName = yield promptForProjectName(resolved, name);
            yield fse.ensureDir(resolved);
            yield installFromTemplate(resolved, selectedTemplate, projectName, theme);
            sendOnboardingMessage(resolved);
            return;
        }
        // Standard theme-based path
        const resolved = yield resolveInstallDir(installDir, force, contentsOccupied);
        if (resolved === undefined) {
            if (isAI())
                yield sendAIUsageMessage(installDir, contentsOccupied, themes);
            return;
        }
        let projectName = name;
        let selectedTheme = theme;
        if (!isAI() && (!selectedTheme || !projectName)) {
            projectName = yield promptForProjectName(resolved, projectName);
            if (!selectedTheme) {
                selectedTheme = yield select({
                    message: 'Theme',
                    choices: themes.map((t) => ({ name: t, value: t })),
                });
            }
        }
        if (projectName === undefined || selectedTheme === undefined) {
            yield sendAIUsageMessage(resolved, contentsOccupied, themes);
            return;
        }
        yield fse.ensureDir(resolved);
        yield install(resolved, projectName, selectedTheme);
        sendOnboardingMessage(resolved);
    });
}
const install = (installDir, projectName, theme) => __awaiter(void 0, void 0, void 0, function* () {
    addLog(_jsx(SpinnerLog, { message: "downloading starter template..." }));
    const response = yield fetch('https://github.com/mintlify/starter/archive/refs/heads/main.zip');
    const buffer = yield response.arrayBuffer();
    yield fse.writeFile(installDir + '/starter.zip', Buffer.from(buffer));
    removeLastLog();
    addLog(_jsx(SpinnerLog, { message: "extracting..." }));
    new AdmZip(installDir + '/starter.zip').extractAllTo(installDir, true);
    removeLastLog();
    yield fse.copy(installDir + '/starter-main', installDir, {
        overwrite: true,
        filter: (src) => !src.includes('starter-main/starter-main'),
    });
    yield fse.remove(installDir + '/starter.zip');
    yield fse.remove(installDir + '/starter-main');
    const docsJsonPath = installDir + '/docs.json';
    const docsConfig = yield fse.readJson(docsJsonPath);
    docsConfig.theme = theme;
    docsConfig.name = projectName;
    yield fse.writeJson(docsJsonPath, docsConfig, { spaces: 2 });
});
