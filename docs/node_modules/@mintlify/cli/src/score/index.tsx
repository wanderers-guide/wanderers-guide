import { addLog, ErrorLog, SpinnerLog, removeLastLog } from '@mintlify/previewing';
import chalk from 'chalk';
import { Text } from 'ink';

import { getConfigValue } from '../config.js';
import { terminate } from '../helpers.js';
import { getAccessToken } from '../keyring.js';
import { getCliSubdomains } from '../status.js';
import { trackEvent } from '../telemetry/track.js';
import { fetchScoreBySlug, resolveScoreForUrl } from './client.js';
import type { Check, CliCheckStatus, ScoreResponse } from './types.js';

type OutputFormat = 'table' | 'plain' | 'json';

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

function resolveFormat(argv: { format?: string }): OutputFormat {
  if (argv.format === 'table' || argv.format === 'plain' || argv.format === 'json')
    return argv.format;
  return 'table';
}

function statusIcon(status: CliCheckStatus): string {
  switch (status) {
    case 'pass':
      return chalk.green('✓');
    case 'warn':
      return chalk.yellow('⚠');
    case 'skip':
      return chalk.dim('○');
    case 'fail':
    case 'error':
      return chalk.red('✗');
    default: {
      const _exhaustive: never = status;
      void _exhaustive;
      return chalk.dim('?');
    }
  }
}

function plainStatusLabel(status: CliCheckStatus): string {
  return status.toUpperCase();
}

function formatCheckName(name: string): string {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function renderChecks(checks: Check[], indent = 0): string[] {
  const lines: string[] = [];
  const pad = '  '.repeat(indent + 1);
  for (const check of checks) {
    lines.push(`${pad}${statusIcon(check.status)}  ${formatCheckName(check.name)}`);
    if (check.children && check.children.length > 0) {
      lines.push(...renderChecks(check.children, indent + 1));
    }
  }
  return lines;
}

function renderPlain(checks: Check[], prefix = ''): string[] {
  const lines: string[] = [];
  for (const check of checks) {
    lines.push(`${prefix}${plainStatusLabel(check.status)}\t${check.name}`);
    if (check.children && check.children.length > 0) {
      lines.push(...renderPlain(check.children, prefix + '  '));
    }
  }
  return lines;
}

function renderTable(score: ScoreResponse, opts?: { stale?: boolean }): string {
  const scoreColor =
    score.overallScore >= 70 ? 'green' : score.overallScore >= 40 ? 'yellow' : 'red';
  const header = opts?.stale
    ? chalk.bold(`\nAgent Readiness Score — ${score.canonicalUrl}`) +
      chalk.dim(` (last run ${new Date(score.computedAt).toLocaleString()})\n`)
    : chalk.bold(`\nAgent Readiness Score — ${score.canonicalUrl}\n`);

  const lines: string[] = [header];
  lines.push(`  Score: ${chalk[scoreColor].bold(`${score.overallScore}%`)}\n`);
  lines.push(chalk.bold('  Checks'));
  lines.push(...renderChecks(score.checks));
  return lines.join('\n');
}

function output(format: OutputFormat, text: string) {
  if (format === 'table') {
    addLog(<Text>{text}</Text>);
  } else {
    process.stdout.write(text + '\n');
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForScore(
  slug: string,
  afterIso: string | null,
  onAttempt?: () => void
): Promise<ScoreResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    onAttempt?.();
    const score = await fetchScoreBySlug(slug);
    if (!score) continue;
    if (afterIso === null) return score;
    if (new Date(score.computedAt).getTime() > new Date(afterIso).getTime()) return score;
  }
  throw new Error(`Score did not complete within ${POLL_TIMEOUT_MS / 1000}s`);
}

async function resolveDefaultSubdomain(): Promise<string | undefined> {
  const fromConfig = getConfigValue('subdomain');
  if (fromConfig) return fromConfig;
  const accessToken = await getAccessToken();
  if (!accessToken) return undefined;
  const subdomains = await getCliSubdomains(accessToken);
  return subdomains[0];
}

export const scoreHandler = async (argv: { url?: string; format?: string }) => {
  const format = resolveFormat(argv);
  try {
    let url = argv.url;
    if (!url) {
      const subdomain = await resolveDefaultSubdomain();
      if (!subdomain) {
        throw new Error(
          'No URL provided and no default subdomain set. Run `mint login` to set one, or pass a URL: `mint score <url>`.'
        );
      }
      url = `${subdomain}.mintlify.app`;
    }
    if (format === 'table') addLog(<SpinnerLog message="Checking agent readiness..." />);
    const resolved = await resolveScoreForUrl(url);

    let final: ScoreResponse;

    if (resolved.status === 'ready') {
      const score = await fetchScoreBySlug(resolved.slug);
      if (format === 'table') removeLastLog();
      if (!score) throw new Error('Score was unexpectedly unavailable');
      final = score;
    } else if (resolved.status === 'stale_refresh_queued') {
      const stale = await fetchScoreBySlug(resolved.slug);
      if (format === 'table') removeLastLog();
      if (!stale) throw new Error('Stale score was unexpectedly unavailable');

      if (format === 'table') {
        output('table', renderTable(stale, { stale: true }));
        addLog(<SpinnerLog message="Refreshing score in the background..." />);
      } else {
        process.stderr.write('Refreshing score in the background...\n');
      }
      final = await pollForScore(resolved.slug, stale.computedAt);
      if (format === 'table') removeLastLog();
    } else {
      if (format === 'table') {
        removeLastLog();
        addLog(<SpinnerLog message="Queued a new scoring run. Waiting for first result..." />);
      } else {
        process.stderr.write('Queued a new scoring run. Waiting for first result...\n');
      }
      final = await pollForScore(resolved.slug, null);
      if (format === 'table') removeLastLog();
    }

    void trackEvent('cli.score.executed', {
      url,
      score: final.overallScore,
      format,
      status: resolved.status,
    });

    if (format === 'json') {
      output(format, JSON.stringify(final, null, 2));
    } else if (format === 'plain') {
      const lines = [`SCORE\t${final.overallScore}`, ...renderPlain(final.checks)];
      output(format, lines.join('\n'));
    } else {
      output(format, renderTable(final));
    }

    await terminate(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    if (format === 'table') {
      removeLastLog();
      addLog(<ErrorLog message={message} />);
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    await terminate(1);
  }
};
