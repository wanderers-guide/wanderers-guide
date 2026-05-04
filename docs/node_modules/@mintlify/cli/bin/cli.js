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
import { buildGraph, getBrokenExternalLinks } from '@mintlify/link-rot';
import { addLog, dev, exportSite, validateBuild, ErrorLog, SpinnerLog, SuccessLog, Logs, clearLogs, BrokenLinksLog, WarningLog, } from '@mintlify/previewing';
import { render, Text } from 'ink';
import fs from 'node:fs/promises';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { accessibilityCheck } from './accessibilityCheck.js';
import { analyticsBuilder } from './analytics/index.js';
import { comingSoon } from './comingSoon.js';
import { setTelemetryEnabled } from './config.js';
import { getConfigValue, setConfigValue, clearConfigValue } from './config.js';
import { API_URL } from './constants.js';
import { CMD_EXEC_PATH, checkPort, checkNodeVersion, autoUpgradeIfNeeded, getVersions, suppressConsoleWarnings, terminate, } from './helpers.js';
import { init } from './init.js';
import { getAccessToken } from './keyring.js';
import { login } from './login.js';
import { logout } from './logout.js';
import { mdxLinter } from './mdxLinter.js';
import { createTelemetryMiddleware } from './middlewares/telemetryMiddleware.js';
import { checkOpenApiFile, getOpenApiFilenamesFromDocsConfig } from './openApiCheck.js';
import { scoreHandler } from './score/index.js';
import { status, getCliSubdomains } from './status.js';
import { trackTelemetryPreferenceChange } from './telemetry/track.js';
import { update } from './update.js';
export const cli = ({ packageName = 'mint' }) => {
    const telemetryMiddleware = createTelemetryMiddleware();
    render(_jsx(Logs, {}));
    return (yargs(hideBin(process.argv))
        .scriptName(packageName)
        .option('telemetry', {
        type: 'boolean',
        alias: 't',
        description: 'Enable or disable anonymous usage telemetry',
    })
        .middleware((argv) => __awaiter(void 0, void 0, void 0, function* () {
        if (argv.telemetry !== undefined && argv._.length === 0) {
            yield setTelemetryEnabled(argv.telemetry);
            yield trackTelemetryPreferenceChange({ enabled: argv.telemetry });
            addLog(_jsx(SuccessLog, { message: `telemetry ${argv.telemetry ? 'enabled' : 'disabled'}` }));
            yield terminate(0);
        }
    }), true)
        .middleware(checkNodeVersion)
        .middleware(suppressConsoleWarnings)
        .middleware(telemetryMiddleware)
        .command('dev', 'Initialize a local preview environment', (yargs) => yargs
        .option('open', {
        type: 'boolean',
        default: true,
        description: 'open a local preview in the browser',
    })
        .option('local-schema', {
        type: 'boolean',
        default: false,
        hidden: true,
        description: 'use a locally hosted schema file (note: only https protocol is supported in production)',
    })
        .option('client-version', {
        type: 'string',
        hidden: true,
        description: 'the version of the client to use for cli testing',
    })
        .option('local-client-version', {
        type: 'string',
        hidden: true,
        description: 'path to local client repo to symlink for development',
    })
        .option('groups', {
        type: 'array',
        description: 'Mock user groups for local development and testing',
        example: '--groups admin user',
    })
        .option('disable-openapi', {
        type: 'boolean',
        default: false,
        description: 'Disable OpenAPI file generation',
    })
        .usage('usage: mintlify dev [options]')
        .example('mintlify dev', 'run with default settings (opens in browser)')
        .example('mintlify dev --no-open', 'run without opening in browser'), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        yield autoUpgradeIfNeeded();
        const port = yield checkPort(argv);
        const { cli: cliVersion } = getVersions(packageName);
        let accessToken;
        let subdomain;
        try {
            accessToken = (_a = (yield getAccessToken())) !== null && _a !== void 0 ? _a : undefined;
            const configuredSubdomain = getConfigValue('subdomain');
            subdomain =
                configuredSubdomain !== null && configuredSubdomain !== void 0 ? configuredSubdomain : (accessToken ? (yield getCliSubdomains(accessToken))[0] : undefined);
        }
        catch (_b) { }
        if (port != undefined) {
            yield dev(Object.assign(Object.assign({}, argv), { port,
                packageName,
                cliVersion,
                accessToken,
                subdomain, apiUrl: API_URL }));
        }
        else {
            addLog(_jsx(ErrorLog, { message: "no available port found" }));
            yield terminate(1);
        }
    }))
        .command('validate', 'Validate the documentation build (strict mode, exits on warnings or errors)', (yargs) => yargs
        .option('local-schema', {
        type: 'boolean',
        default: false,
        hidden: true,
        description: 'use a locally hosted schema file',
    })
        .option('client-version', {
        type: 'string',
        hidden: true,
        description: 'the version of the client to use for cli testing',
    })
        .option('groups', {
        type: 'array',
        description: 'Mock user groups for validation',
    })
        .option('disable-openapi', {
        type: 'boolean',
        default: false,
        description: 'Disable OpenAPI file generation',
    })
        .usage('usage: mintlify validate [options]')
        .example('mintlify validate', 'validate the build'), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        if (!argv['disable-openapi']) {
            let openApiFilenames = [];
            try {
                const docsJson = yield fs.readFile(path.join(CMD_EXEC_PATH, 'docs.json'), 'utf-8');
                openApiFilenames = getOpenApiFilenamesFromDocsConfig(JSON.parse(docsJson));
            }
            catch (_a) { }
            const results = yield Promise.all(openApiFilenames.map((file) => checkOpenApiFile(file, argv['local-schema'])));
            if (results.some((valid) => !valid)) {
                yield terminate(1);
                return;
            }
        }
        const { cli: cliVersion } = getVersions(packageName);
        yield validateBuild(Object.assign(Object.assign({}, argv), { packageName,
            cliVersion }));
    }))
        .command('export', 'Export a static site for air-gapped deployment', (yargs) => yargs
        .option('output', {
        type: 'string',
        default: 'export.zip',
        description: 'output zip file path',
    })
        .option('client-version', {
        type: 'string',
        hidden: true,
    })
        .option('groups', {
        type: 'array',
        description: 'Mock user groups for export',
    })
        .option('disable-openapi', {
        type: 'boolean',
        default: false,
        description: 'Disable OpenAPI file generation',
    })
        .usage('usage: mintlify export [options]')
        .example('mintlify export', 'export as export.zip')
        .example('mintlify export --output docs.zip', 'export to custom filename'), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        const { cli: cliVersion } = getVersions(packageName);
        yield exportSite(Object.assign(Object.assign({}, argv), { packageName,
            cliVersion }));
        yield terminate(0);
    }))
        .command('openapi-check <filename>', false, (yargs) => yargs
        .positional('filename', {
        describe: 'the filename of the OpenAPI spec (e.g. ./openapi.yaml) or the URL to the OpenAPI spec (e.g. https://petstore3.swagger.io/api/v3/openapi.json)',
        type: 'string',
        demandOption: true,
    })
        .option('local-schema', {
        type: 'boolean',
        default: false,
        description: 'use a locally hosted schema file (note: only https protocol is supported in production)',
    }), (_a) => __awaiter(void 0, [_a], void 0, function* ({ filename, 'local-schema': localSchema }) {
        addLog(_jsx(WarningLog, { message: "openapi-check is deprecated, use `mintlify validate` instead" }));
        const valid = yield checkOpenApiFile(filename, localSchema);
        yield terminate(valid ? 0 : 1);
    }))
        .command('broken-links', 'Check for broken links', (yargs) => yargs
        .option('check-anchors', {
        type: 'boolean',
        default: false,
        description: 'also validate anchor links (e.g. #section) against heading slugs',
    })
        .option('check-external', {
        type: 'boolean',
        default: false,
        description: 'also check external links for broken URLs',
    })
        .option('check-snippets', {
        type: 'boolean',
        default: false,
        description: 'also check links inside <Snippet> components',
    })
        .option('check-redirects', {
        type: 'boolean',
        default: false,
        description: 'also check that docs.json redirect destinations resolve to valid paths',
    }), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        yield autoUpgradeIfNeeded();
        addLog(_jsx(SpinnerLog, { message: "checking for broken links..." }));
        try {
            const graph = yield buildGraph(undefined, {
                checkSnippets: argv['check-snippets'],
            });
            graph.precomputeFileResolutions();
            const brokenInternalLinks = graph.getBrokenInternalLinks({
                checkAnchors: argv['check-anchors'],
            });
            const brokenLinksByFile = {};
            brokenInternalLinks.forEach((mdxPath) => {
                const filename = path.join(mdxPath.relativeDir, mdxPath.filename);
                const existing = brokenLinksByFile[filename];
                if (existing) {
                    existing.push(mdxPath.originalPath);
                }
                else {
                    brokenLinksByFile[filename] = [mdxPath.originalPath];
                }
            });
            if (argv['check-external']) {
                const brokenExternalLinks = yield getBrokenExternalLinks(graph);
                for (const result of brokenExternalLinks) {
                    for (const source of result.sources) {
                        const label = result.status
                            ? `${result.url} (${result.status})`
                            : `${result.url} (${result.error})`;
                        const existing = brokenLinksByFile[source.file];
                        if (existing) {
                            existing.push(label);
                        }
                        else {
                            brokenLinksByFile[source.file] = [label];
                        }
                    }
                }
            }
            if (argv['check-redirects']) {
                const brokenRedirects = graph.getBrokenRedirects();
                if (brokenRedirects.length > 0) {
                    const configFilename = yield fs
                        .access(path.join(CMD_EXEC_PATH, 'docs.json'))
                        .then(() => 'docs.json')
                        .catch(() => 'mint.json');
                    const labels = brokenRedirects.map(({ source, destination }) => `${source} → ${destination}`);
                    const existing = brokenLinksByFile[configFilename];
                    if (existing) {
                        existing.push(...labels);
                    }
                    else {
                        brokenLinksByFile[configFilename] = labels;
                    }
                }
            }
            if (Object.keys(brokenLinksByFile).length === 0) {
                clearLogs();
                addLog(_jsx(SuccessLog, { message: "no broken links found" }));
                yield terminate(0);
            }
            clearLogs();
            addLog(_jsx(BrokenLinksLog, { brokenLinksByFile: brokenLinksByFile }));
        }
        catch (err) {
            addLog(_jsx(ErrorLog, { message: err instanceof Error ? err.message : 'unknown error' }));
            yield terminate(1);
        }
        yield terminate(1);
    }))
        .command('status', 'View current authentication status', () => undefined, () => __awaiter(void 0, void 0, void 0, function* () {
        yield status();
        yield terminate(0);
    }))
        .command('logout', 'Logout of your Mintlify account', () => undefined, () => __awaiter(void 0, void 0, void 0, function* () {
        yield logout();
        yield terminate(0);
    }))
        .command('login', 'Authenticate your account to Mintlify', () => undefined, () => __awaiter(void 0, void 0, void 0, function* () {
        yield login();
        yield terminate(0);
    }))
        .command('config', 'Manage CLI configuration', (yargs) => yargs
        .command('set <key> <value>', 'Set a configuration value', (yargs) => yargs
        .positional('key', {
        type: 'string',
        demandOption: true,
        description: 'Config key (e.g. subdomain)',
    })
        .positional('value', {
        type: 'string',
        demandOption: true,
        description: 'Config value',
    }), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        const validKeys = ['subdomain', 'dateFrom', 'dateTo'];
        if (!validKeys.includes(argv.key)) {
            addLog(_jsx(ErrorLog, { message: `Unknown config key: "${argv.key}". Valid keys: ${validKeys.join(', ')}` }));
            yield terminate(1);
            return;
        }
        yield setConfigValue(argv.key, argv.value);
        addLog(_jsx(SuccessLog, { message: `${argv.key} = "${argv.value}"` }));
        yield terminate(0);
    }))
        .command('get <key>', 'Get a configuration value', (yargs) => yargs.positional('key', {
        type: 'string',
        demandOption: true,
        description: 'Config key (e.g. subdomain, dateFrom, dateTo)',
    }), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        const validKeys = ['subdomain', 'dateFrom', 'dateTo'];
        if (!validKeys.includes(argv.key)) {
            addLog(_jsx(ErrorLog, { message: `Unknown config key: "${argv.key}". Valid keys: ${validKeys.join(', ')}` }));
            yield terminate(1);
            return;
        }
        const val = getConfigValue(argv.key);
        addLog(_jsx(Text, { children: val !== null && val !== void 0 ? val : 'not set' }));
        yield terminate(0);
    }))
        .command('clear <key>', 'Remove a configuration value', (yargs) => yargs.positional('key', {
        type: 'string',
        demandOption: true,
        description: 'Config key (e.g. subdomain, dateFrom, dateTo)',
    }), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        const validKeys = ['subdomain', 'dateFrom', 'dateTo'];
        if (!validKeys.includes(argv.key)) {
            addLog(_jsx(ErrorLog, { message: `Unknown config key: "${argv.key}". Valid keys: ${validKeys.join(', ')}` }));
            yield terminate(1);
            return;
        }
        yield clearConfigValue(argv.key);
        addLog(_jsx(SuccessLog, { message: `${argv.key} cleared` }));
        yield terminate(0);
    }))
        .demandCommand(1, 'specify a subcommand: set, get, or clear'))
        .command('update', 'Update the CLI to the latest version', () => undefined, () => __awaiter(void 0, void 0, void 0, function* () {
        yield update({ packageName });
        yield terminate(0);
    }))
        .command(['a11y', 'accessibility-check', 'a11y-check', 'accessibility'], 'Check for accessibility issues in documentation', (yargs) => yargs
        .option('skip-contrast', {
        type: 'boolean',
        default: false,
        description: 'Skip color contrast checks',
    })
        .option('skip-alt-text', {
        type: 'boolean',
        default: false,
        description: 'Skip alt text checks on images and videos',
    })
        .check((argv) => {
        if (argv.skipContrast && argv.skipAltText) {
            throw new Error('Cannot skip both contrast and alt-text checks');
        }
        return true;
    })
        .example('mint a11y', 'Run all accessibility checks')
        .example('mint a11y --skip-contrast', 'Only check for missing alt text')
        .example('mint a11y --skip-alt-text', 'Only check color contrast'), (argv) => __awaiter(void 0, void 0, void 0, function* () {
        let accessibilityCheckTerminateCode = 0;
        let mdxLinterTerminateCode = 0;
        if (!argv.skipContrast) {
            accessibilityCheckTerminateCode = yield accessibilityCheck();
        }
        if (!argv.skipAltText) {
            mdxLinterTerminateCode = yield mdxLinter();
        }
        yield terminate(accessibilityCheckTerminateCode || mdxLinterTerminateCode);
    }))
        .command(['version', 'v'], 'Display the current version of the CLI and client', () => undefined, () => __awaiter(void 0, void 0, void 0, function* () {
        const { cli, client } = getVersions(packageName);
        addLog(_jsxs(Text, { children: [_jsx(Text, { bold: true, color: "green", children: "cli version" }), ' ', cli] }));
        addLog(_jsxs(Text, { children: [_jsx(Text, { bold: true, color: "green", children: "client version" }), ' ', client] }));
    }))
        .command('new [directory]', 'Create a new Mintlify documentation site', (yargs) => yargs
        .positional('directory', {
        describe: 'The directory to initialize your documentation',
        type: 'string',
        default: '.',
    })
        .option('theme', {
        type: 'string',
        description: 'Theme for the documentation site',
    })
        .option('name', {
        type: 'string',
        description: 'Name of the documentation project',
    })
        .option('template', {
        type: 'string',
        description: 'Use a template as a starting point',
    })
        .option('force', {
        type: 'boolean',
        default: false,
        description: 'Create the documentation in a subdirectory',
    }), (_a) => __awaiter(void 0, [_a], void 0, function* ({ directory, theme, name, force, template }) {
        try {
            yield init(directory, force, theme, name, template);
            yield terminate(0);
        }
        catch (error) {
            addLog(_jsx(ErrorLog, { message: error instanceof Error ? error.message : 'error occurred' }));
            yield terminate(1);
        }
    }))
        .command('analytics', 'View analytics for your documentation', analyticsBuilder)
        .command('score [url]', 'Run agent readiness checks on a docs site', (yargs) => yargs
        .positional('url', {
        type: 'string',
        description: 'URL of the docs site to check (defaults to your configured subdomain)',
    })
        .option('format', {
        type: 'string',
        choices: ['table', 'plain', 'json'],
        description: 'Output format',
    })
        .example('mint score', 'Run agent readiness checks on your default subdomain')
        .example('mint score docs.example.com', 'Run agent readiness checks on a URL'), scoreHandler)
        // Coming soon commands — visible in help, tracked via telemetry to gauge interest.
        .command('ai', '[Coming soon] AI-powered documentation (run mint ai to vote)', () => undefined, comingSoon('ai', packageName))
        .command('test', '[Coming soon] Test your documentation (run mint test to vote)', () => undefined, comingSoon('test', packageName))
        .command('signup', '[Coming soon] Sign up for a Mintlify account (run mint signup to vote)', () => undefined, comingSoon('signup', packageName))
        .command('mcp', '[Coming soon] MCP server for documentation (run mint mcp to vote)', () => undefined, comingSoon('mcp', packageName))
        // Print the help menu when the user enters an invalid command.
        .strictCommands()
        .demandCommand(1, 'unknown command. see above for the list of supported commands.')
        // Alias option flags --help = -h, default --version = -v
        .alias('h', 'help')
        .alias('v', 'version')
        .parseAsync());
};
