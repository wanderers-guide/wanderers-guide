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
import { getConfigPath } from '@mintlify/prebuild';
import { MintConfigUpdater } from '@mintlify/prebuild';
import { addLog, ErrorLog, getClientVersion, SuccessLog, InfoLog, SpinnerLog, removeLastLog, LOCAL_LINKED_CLI_VERSION, WarningLog, } from '@mintlify/previewing';
import { upgradeToDocsConfig, validatePathWithinCwd } from '@mintlify/validation';
import detect from 'detect-port';
import fse from 'fs-extra';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import { exec, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import path from 'path';
import { shutdownPostHog } from './telemetry/client.js';
export const CMD_EXEC_PATH = process.cwd();
export const checkPort = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    const initialPort = typeof argv.port === 'number' ? argv.port : 3000;
    if (initialPort === (yield detect(initialPort)))
        return initialPort;
    for (let port = initialPort + 1; port < initialPort + 10; port++) {
        addLog(_jsx(InfoLog, { message: `port ${port - 1} is already in use. trying ${port} instead` }));
        if (port === (yield detect(port)))
            return port;
    }
});
export const checkNodeVersion = () => __awaiter(void 0, void 0, void 0, function* () {
    let nodeVersionString = process.version;
    if (nodeVersionString.charAt(0) === 'v') {
        nodeVersionString = nodeVersionString.slice(1);
    }
    const versionArr = nodeVersionString.split('.');
    const majorVersion = parseInt(versionArr[0], 10);
    const minorVersion = parseInt(versionArr[1], 10);
    if (majorVersion >= 25) {
        addLog(_jsx(ErrorLog, { message: `mintlify is not supported on node versions 25+ (current version ${nodeVersionString}). Please downgrade to an LTS node version.` }));
        yield terminate(1);
    }
    if (majorVersion < 20 || (majorVersion === 20 && minorVersion < 17)) {
        addLog(_jsx(ErrorLog, { message: "mintlify requires node 20.17 or higher. Please upgrade to an LTS node version." }));
        yield terminate(1);
    }
});
export const checkForMintJson = () => __awaiter(void 0, void 0, void 0, function* () {
    return !!(yield getConfigPath(CMD_EXEC_PATH, 'mint'));
});
export const checkForDocsJson = () => __awaiter(void 0, void 0, void 0, function* () {
    const docsJsonPath = path.join(CMD_EXEC_PATH, 'docs.json');
    if (!(yield fse.pathExists(docsJsonPath))) {
        addLog(_jsx(InfoLog, { message: "new docs.json file is available" }));
        const promptResult = yield inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'would you like to upgrade your mint.json to docs.json?',
                choices: [
                    { name: 'upgrade (migrate from mint.json to docs.json)', value: 'upgrade' },
                    { name: 'continue (use existing mint.json)', value: 'continue' },
                ],
            },
        ]);
        const { action } = promptResult;
        if (action === 'continue') {
            addLog(_jsx(InfoLog, { message: "proceeding with the existing mint.json..." }));
        }
        if (action === 'upgrade') {
            addLog(_jsx(SpinnerLog, { message: "upgrading docs.json..." }));
            yield upgradeConfig();
        }
    }
});
export const autoUpgradeIfNeeded = () => __awaiter(void 0, void 0, void 0, function* () {
    const hasMintJson = yield checkForMintJson();
    if (!hasMintJson)
        return;
    const docsJsonPath = path.join(CMD_EXEC_PATH, 'docs.json');
    const hasDocsJson = yield fse.pathExists(docsJsonPath);
    if (!hasDocsJson) {
        addLog(_jsx(WarningLog, { message: "Legacy mint.json detected, auto-upgrading to docs.json" }));
        addLog(_jsx(SpinnerLog, { message: "upgrading mint.json to docs.json..." }));
        yield upgradeConfig();
    }
});
export const upgradeConfig = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mintJsonPath = path.join(CMD_EXEC_PATH, 'mint.json');
        const docsJsonPath = path.join(CMD_EXEC_PATH, 'docs.json');
        const mintJsonFileContent = yield fs.readFile(mintJsonPath, 'utf8');
        const validationResult = yield MintConfigUpdater.validateConfigJsonString(mintJsonFileContent);
        const mintConfig = validationResult.data;
        const upgradedDocsConfig = upgradeToDocsConfig(mintConfig, {
            shouldUpgradeTheme: true,
        });
        yield fs.writeFile(docsJsonPath, JSON.stringify(upgradedDocsConfig, null, 2));
        removeLastLog();
        addLog(_jsx(SuccessLog, { message: "mint.json file has been upgraded to docs.json." }));
    }
    catch (err) {
        removeLastLog();
        addLog(_jsx(ErrorLog, { message: err instanceof Error ? err.message : 'an unknown error occurred' }));
    }
});
const require = createRequire(import.meta.url);
const isRunningFromLinkedBuild = () => {
    try {
        const thisFile = fileURLToPath(import.meta.url);
        return !thisFile.split(path.sep).includes('node_modules');
    }
    catch (_a) {
        return false;
    }
};
const readPackageVersion = (packageName) => {
    try {
        const pkgPath = require.resolve(`${packageName}/package.json`);
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        return typeof pkg.version === 'string' ? pkg.version : undefined;
    }
    catch (_a) {
        return undefined;
    }
};
export const getCliVersion = (packageName) => {
    var _a;
    if (packageName === void 0) { packageName = (_a = process.env.MINTLIFY_PACKAGE_NAME) !== null && _a !== void 0 ? _a : 'mint'; }
    if (process.env.CLI_TEST_MODE === 'true') {
        return 'test-cli';
    }
    if (isRunningFromLinkedBuild()) {
        return LOCAL_LINKED_CLI_VERSION;
    }
    return readPackageVersion(packageName);
};
export const getVersions = (packageName) => {
    var _a;
    if (packageName === void 0) { packageName = (_a = process.env.MINTLIFY_PACKAGE_NAME) !== null && _a !== void 0 ? _a : 'mint'; }
    const cli = getCliVersion(packageName);
    const client = getClientVersion().trim();
    return { cli, client };
};
export const getLatestCliVersion = (packageName) => {
    return execSync(`npm view ${packageName} version --silent`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
};
export const suppressConsoleWarnings = () => {
    // Ignore tailwind warnings and punycode deprecation warning
    const ignoredMessages = [
        'No utility classes were detected',
        'https://tailwindcss.com/docs/content-configuration',
        'DeprecationWarning',
    ];
    const originalConsoleError = console.error;
    console.error = (...args) => {
        const message = args.join(' ');
        if (ignoredMessages.some((ignoredMessage) => message.includes(ignoredMessage))) {
            return;
        }
        originalConsoleError.apply(console, args);
    };
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
        const message = args.join(' ');
        if (ignoredMessages.some((ignoredMessage) => message.includes(ignoredMessage))) {
            return;
        }
        originalConsoleWarn.apply(console, args);
    };
};
export const readLocalOpenApiFile = (filename) => __awaiter(void 0, void 0, void 0, function* () {
    const { resolvedPath } = validatePathWithinCwd(filename, CMD_EXEC_PATH);
    const file = yield fs.readFile(resolvedPath, 'utf-8');
    const document = yaml.load(file);
    return document;
});
export const terminate = (code) => __awaiter(void 0, void 0, void 0, function* () {
    // Wait for the logs to be fully rendered before exiting
    yield new Promise((resolve) => setTimeout(resolve, 50));
    yield shutdownPostHog();
    process.exit(code);
});
export const execAsync = promisify(exec);
export function isAI() {
    return (!process.stdin.isTTY || process.env.CLAUDECODE === '1' || process.env.TERM_PROGRAM === 'claude');
}
export const detectPackageManager = (_a) => __awaiter(void 0, [_a], void 0, function* ({ packageName }) {
    try {
        const { stdout: packagePath } = yield execAsync(`which ${packageName}`);
        if (packagePath.includes('pnpm')) {
            return 'pnpm';
        }
        else {
            return 'npm';
        }
    }
    catch (error) {
        return 'npm';
    }
});
