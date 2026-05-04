import { buildGraph, getBrokenExternalLinks } from '@mintlify/link-rot';
import {
  addLog,
  dev,
  exportSite,
  validateBuild,
  ErrorLog,
  SpinnerLog,
  SuccessLog,
  Logs,
  clearLogs,
  BrokenLinksLog,
  WarningLog,
} from '@mintlify/previewing';
import { render, Text } from 'ink';
import fs from 'node:fs/promises';
import path from 'path';
import yargs, { type Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';

import { accessibilityCheck } from './accessibilityCheck.js';
import { analyticsBuilder } from './analytics/index.js';
import { comingSoon } from './comingSoon.js';
import { setTelemetryEnabled } from './config.js';
import { getConfigValue, setConfigValue, clearConfigValue } from './config.js';
import { API_URL } from './constants.js';
import {
  CMD_EXEC_PATH,
  checkPort,
  checkNodeVersion,
  autoUpgradeIfNeeded,
  getVersions,
  suppressConsoleWarnings,
  terminate,
} from './helpers.js';
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

export const cli = ({ packageName = 'mint' }: { packageName?: string }) => {
  const telemetryMiddleware = createTelemetryMiddleware();
  render(<Logs />);

  return (
    yargs(hideBin(process.argv))
      .scriptName(packageName)
      .option('telemetry', {
        type: 'boolean',
        alias: 't',
        description: 'Enable or disable anonymous usage telemetry',
      })
      .middleware(async (argv) => {
        if (argv.telemetry !== undefined && argv._.length === 0) {
          await setTelemetryEnabled(argv.telemetry);
          await trackTelemetryPreferenceChange({ enabled: argv.telemetry });
          addLog(<SuccessLog message={`telemetry ${argv.telemetry ? 'enabled' : 'disabled'}`} />);
          await terminate(0);
        }
      }, true)
      .middleware(checkNodeVersion)
      .middleware(suppressConsoleWarnings)
      .middleware(telemetryMiddleware)
      .command(
        'dev',
        'Initialize a local preview environment',
        (yargs) =>
          yargs
            .option('open', {
              type: 'boolean',
              default: true,
              description: 'open a local preview in the browser',
            })
            .option('local-schema', {
              type: 'boolean',
              default: false,
              hidden: true,
              description:
                'use a locally hosted schema file (note: only https protocol is supported in production)',
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
            .example('mintlify dev --no-open', 'run without opening in browser'),
        async (argv) => {
          await autoUpgradeIfNeeded();
          const port = await checkPort(argv);
          const { cli: cliVersion } = getVersions(packageName);
          let accessToken: string | undefined;
          let subdomain: string | undefined;
          try {
            accessToken = (await getAccessToken()) ?? undefined;
            const configuredSubdomain = getConfigValue('subdomain');
            subdomain =
              configuredSubdomain ??
              (accessToken ? (await getCliSubdomains(accessToken))[0] : undefined);
          } catch {}
          if (port != undefined) {
            await dev({
              ...argv,
              port,
              packageName,
              cliVersion,
              accessToken,
              subdomain,
              apiUrl: API_URL,
            });
          } else {
            addLog(<ErrorLog message="no available port found" />);
            await terminate(1);
          }
        }
      )
      .command(
        'validate',
        'Validate the documentation build (strict mode, exits on warnings or errors)',
        (yargs) =>
          yargs
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
            .example('mintlify validate', 'validate the build'),
        async (argv) => {
          if (!argv['disable-openapi']) {
            let openApiFilenames: string[] = [];

            try {
              const docsJson = await fs.readFile(path.join(CMD_EXEC_PATH, 'docs.json'), 'utf-8');
              openApiFilenames = getOpenApiFilenamesFromDocsConfig(JSON.parse(docsJson));
            } catch {}

            const results = await Promise.all(
              openApiFilenames.map((file) => checkOpenApiFile(file, argv['local-schema']))
            );

            if (results.some((valid) => !valid)) {
              await terminate(1);
              return;
            }
          }

          const { cli: cliVersion } = getVersions(packageName);
          await validateBuild({
            ...argv,
            packageName,
            cliVersion,
          });
        }
      )
      .command(
        'export',
        'Export a static site for air-gapped deployment',
        (yargs) =>
          yargs
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
            .example('mintlify export --output docs.zip', 'export to custom filename'),
        async (argv) => {
          const { cli: cliVersion } = getVersions(packageName);
          await exportSite({
            ...argv,
            packageName,
            cliVersion,
          });
          await terminate(0);
        }
      )
      .command(
        'openapi-check <filename>',
        false,
        (yargs) =>
          yargs
            .positional('filename', {
              describe:
                'the filename of the OpenAPI spec (e.g. ./openapi.yaml) or the URL to the OpenAPI spec (e.g. https://petstore3.swagger.io/api/v3/openapi.json)',
              type: 'string',
              demandOption: true,
            })
            .option('local-schema', {
              type: 'boolean',
              default: false,
              description:
                'use a locally hosted schema file (note: only https protocol is supported in production)',
            }),
        async ({ filename, 'local-schema': localSchema }) => {
          addLog(
            <WarningLog message="openapi-check is deprecated, use `mintlify validate` instead" />
          );
          const valid = await checkOpenApiFile(filename, localSchema);
          await terminate(valid ? 0 : 1);
        }
      )
      .command(
        'broken-links',
        'Check for broken links',
        (yargs) =>
          yargs
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
            }),
        async (argv) => {
          await autoUpgradeIfNeeded();
          addLog(<SpinnerLog message="checking for broken links..." />);
          try {
            const graph = await buildGraph(undefined, {
              checkSnippets: argv['check-snippets'],
            });
            graph.precomputeFileResolutions();

            const brokenInternalLinks = graph.getBrokenInternalLinks({
              checkAnchors: argv['check-anchors'],
            });

            const brokenLinksByFile: Record<string, string[]> = {};

            brokenInternalLinks.forEach((mdxPath) => {
              const filename = path.join(mdxPath.relativeDir, mdxPath.filename);
              const existing = brokenLinksByFile[filename];
              if (existing) {
                existing.push(mdxPath.originalPath);
              } else {
                brokenLinksByFile[filename] = [mdxPath.originalPath];
              }
            });

            if (argv['check-external']) {
              const brokenExternalLinks = await getBrokenExternalLinks(graph);
              for (const result of brokenExternalLinks) {
                for (const source of result.sources) {
                  const label = result.status
                    ? `${result.url} (${result.status})`
                    : `${result.url} (${result.error})`;
                  const existing = brokenLinksByFile[source.file];
                  if (existing) {
                    existing.push(label);
                  } else {
                    brokenLinksByFile[source.file] = [label];
                  }
                }
              }
            }

            if (argv['check-redirects']) {
              const brokenRedirects = graph.getBrokenRedirects();
              if (brokenRedirects.length > 0) {
                const configFilename = await fs
                  .access(path.join(CMD_EXEC_PATH, 'docs.json'))
                  .then(() => 'docs.json')
                  .catch(() => 'mint.json');
                const labels = brokenRedirects.map(
                  ({ source, destination }) => `${source} → ${destination}`
                );
                const existing = brokenLinksByFile[configFilename];
                if (existing) {
                  existing.push(...labels);
                } else {
                  brokenLinksByFile[configFilename] = labels;
                }
              }
            }

            if (Object.keys(brokenLinksByFile).length === 0) {
              clearLogs();
              addLog(<SuccessLog message="no broken links found" />);
              await terminate(0);
            }

            clearLogs();
            addLog(<BrokenLinksLog brokenLinksByFile={brokenLinksByFile} />);
          } catch (err) {
            addLog(<ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />);
            await terminate(1);
          }

          await terminate(1);
        }
      )
      .command(
        'status',
        'View current authentication status',
        () => undefined,
        async () => {
          await status();
          await terminate(0);
        }
      )
      .command(
        'logout',
        'Logout of your Mintlify account',
        () => undefined,
        async () => {
          await logout();
          await terminate(0);
        }
      )
      .command(
        'login',
        'Authenticate your account to Mintlify',
        () => undefined,
        async () => {
          await login();
          await terminate(0);
        }
      )
      .command('config', 'Manage CLI configuration', (yargs) =>
        yargs
          .command(
            'set <key> <value>',
            'Set a configuration value',
            (yargs) =>
              yargs
                .positional('key', {
                  type: 'string',
                  demandOption: true,
                  description: 'Config key (e.g. subdomain)',
                })
                .positional('value', {
                  type: 'string',
                  demandOption: true,
                  description: 'Config value',
                }),
            async (argv) => {
              const validKeys = ['subdomain', 'dateFrom', 'dateTo'];
              if (!validKeys.includes(argv.key)) {
                addLog(
                  <ErrorLog
                    message={`Unknown config key: "${argv.key}". Valid keys: ${validKeys.join(', ')}`}
                  />
                );
                await terminate(1);
                return;
              }
              await setConfigValue(argv.key, argv.value);
              addLog(<SuccessLog message={`${argv.key} = "${argv.value}"`} />);
              await terminate(0);
            }
          )
          .command(
            'get <key>',
            'Get a configuration value',
            (yargs) =>
              yargs.positional('key', {
                type: 'string',
                demandOption: true,
                description: 'Config key (e.g. subdomain, dateFrom, dateTo)',
              }),
            async (argv) => {
              const validKeys = ['subdomain', 'dateFrom', 'dateTo'];
              if (!validKeys.includes(argv.key)) {
                addLog(
                  <ErrorLog
                    message={`Unknown config key: "${argv.key}". Valid keys: ${validKeys.join(', ')}`}
                  />
                );
                await terminate(1);
                return;
              }
              const val = getConfigValue(argv.key);
              addLog(<Text>{val ?? 'not set'}</Text>);
              await terminate(0);
            }
          )
          .command(
            'clear <key>',
            'Remove a configuration value',
            (yargs) =>
              yargs.positional('key', {
                type: 'string',
                demandOption: true,
                description: 'Config key (e.g. subdomain, dateFrom, dateTo)',
              }),
            async (argv) => {
              const validKeys = ['subdomain', 'dateFrom', 'dateTo'];
              if (!validKeys.includes(argv.key)) {
                addLog(
                  <ErrorLog
                    message={`Unknown config key: "${argv.key}". Valid keys: ${validKeys.join(', ')}`}
                  />
                );
                await terminate(1);
                return;
              }
              await clearConfigValue(argv.key);
              addLog(<SuccessLog message={`${argv.key} cleared`} />);
              await terminate(0);
            }
          )
          .demandCommand(1, 'specify a subcommand: set, get, or clear')
      )
      .command(
        'update',
        'Update the CLI to the latest version',
        () => undefined,
        async () => {
          await update({ packageName });
          await terminate(0);
        }
      )
      .command(
        ['a11y', 'accessibility-check', 'a11y-check', 'accessibility'],
        'Check for accessibility issues in documentation',
        (yargs) =>
          yargs
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
            .example('mint a11y --skip-alt-text', 'Only check color contrast'),
        async (argv) => {
          let accessibilityCheckTerminateCode = 0;
          let mdxLinterTerminateCode = 0;

          if (!argv.skipContrast) {
            accessibilityCheckTerminateCode = await accessibilityCheck();
          }

          if (!argv.skipAltText) {
            mdxLinterTerminateCode = await mdxLinter();
          }

          await terminate(accessibilityCheckTerminateCode || mdxLinterTerminateCode);
        }
      )
      .command(
        ['version', 'v'],
        'Display the current version of the CLI and client',
        () => undefined,
        async () => {
          const { cli, client } = getVersions(packageName);
          addLog(
            <Text>
              <Text bold color="green">
                cli version
              </Text>{' '}
              {cli}
            </Text>
          );
          addLog(
            <Text>
              <Text bold color="green">
                client version
              </Text>{' '}
              {client}
            </Text>
          );
        }
      )
      .command(
        'new [directory]',
        'Create a new Mintlify documentation site',
        (yargs) =>
          yargs
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
            }),
        async ({ directory, theme, name, force, template }) => {
          try {
            await init(directory, force, theme, name, template);
            await terminate(0);
          } catch (error) {
            addLog(
              <ErrorLog message={error instanceof Error ? error.message : 'error occurred'} />
            );
            await terminate(1);
          }
        }
      )
      .command('analytics', 'View analytics for your documentation', analyticsBuilder)
      .command(
        'score [url]',
        'Run agent readiness checks on a docs site',
        (yargs: Argv) =>
          yargs
            .positional('url', {
              type: 'string',
              description: 'URL of the docs site to check (defaults to your configured subdomain)',
            })
            .option('format', {
              type: 'string',
              choices: ['table', 'plain', 'json'] as const,
              description: 'Output format',
            })
            .example('mint score', 'Run agent readiness checks on your default subdomain')
            .example('mint score docs.example.com', 'Run agent readiness checks on a URL'),
        scoreHandler
      )
      // Coming soon commands — visible in help, tracked via telemetry to gauge interest.
      .command(
        'ai',
        '[Coming soon] AI-powered documentation (run mint ai to vote)',
        () => undefined,
        comingSoon('ai', packageName)
      )
      .command(
        'test',
        '[Coming soon] Test your documentation (run mint test to vote)',
        () => undefined,
        comingSoon('test', packageName)
      )
      .command(
        'signup',
        '[Coming soon] Sign up for a Mintlify account (run mint signup to vote)',
        () => undefined,
        comingSoon('signup', packageName)
      )
      .command(
        'mcp',
        '[Coming soon] MCP server for documentation (run mint mcp to vote)',
        () => undefined,
        comingSoon('mcp', packageName)
      )
      // Print the help menu when the user enters an invalid command.
      .strictCommands()
      .demandCommand(1, 'unknown command. see above for the list of supported commands.')

      // Alias option flags --help = -h, default --version = -v
      .alias('h', 'help')
      .alias('v', 'version')

      .parseAsync()
  );
};
