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
import { addLog, ErrorLog, SpinnerLog, removeLastLog } from '@mintlify/previewing';
import chalk from 'chalk';
import { Text } from 'ink';
import { getConfigValue } from '../config.js';
import { terminate } from '../helpers.js';
import { getAccessToken } from '../keyring.js';
import { getCliSubdomains } from '../status.js';
import { trackEvent } from '../telemetry/track.js';
import { fetchScoreBySlug, resolveScoreForUrl } from './client.js';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;
function resolveFormat(argv) {
    if (argv.format === 'table' || argv.format === 'plain' || argv.format === 'json')
        return argv.format;
    return 'table';
}
function statusIcon(status) {
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
            const _exhaustive = status;
            void _exhaustive;
            return chalk.dim('?');
        }
    }
}
function plainStatusLabel(status) {
    return status.toUpperCase();
}
function formatCheckName(name) {
    return name
        .replace(/[-_]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}
function renderChecks(checks, indent = 0) {
    const lines = [];
    const pad = '  '.repeat(indent + 1);
    for (const check of checks) {
        lines.push(`${pad}${statusIcon(check.status)}  ${formatCheckName(check.name)}`);
        if (check.children && check.children.length > 0) {
            lines.push(...renderChecks(check.children, indent + 1));
        }
    }
    return lines;
}
function renderPlain(checks, prefix = '') {
    const lines = [];
    for (const check of checks) {
        lines.push(`${prefix}${plainStatusLabel(check.status)}\t${check.name}`);
        if (check.children && check.children.length > 0) {
            lines.push(...renderPlain(check.children, prefix + '  '));
        }
    }
    return lines;
}
function renderTable(score, opts) {
    const scoreColor = score.overallScore >= 70 ? 'green' : score.overallScore >= 40 ? 'yellow' : 'red';
    const header = (opts === null || opts === void 0 ? void 0 : opts.stale)
        ? chalk.bold(`\nAgent Readiness Score — ${score.canonicalUrl}`) +
            chalk.dim(` (last run ${new Date(score.computedAt).toLocaleString()})\n`)
        : chalk.bold(`\nAgent Readiness Score — ${score.canonicalUrl}\n`);
    const lines = [header];
    lines.push(`  Score: ${chalk[scoreColor].bold(`${score.overallScore}%`)}\n`);
    lines.push(chalk.bold('  Checks'));
    lines.push(...renderChecks(score.checks));
    return lines.join('\n');
}
function output(format, text) {
    if (format === 'table') {
        addLog(_jsx(Text, { children: text }));
    }
    else {
        process.stdout.write(text + '\n');
    }
}
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => setTimeout(resolve, ms));
    });
}
function pollForScore(slug, afterIso, onAttempt) {
    return __awaiter(this, void 0, void 0, function* () {
        const deadline = Date.now() + POLL_TIMEOUT_MS;
        while (Date.now() < deadline) {
            yield sleep(POLL_INTERVAL_MS);
            onAttempt === null || onAttempt === void 0 ? void 0 : onAttempt();
            const score = yield fetchScoreBySlug(slug);
            if (!score)
                continue;
            if (afterIso === null)
                return score;
            if (new Date(score.computedAt).getTime() > new Date(afterIso).getTime())
                return score;
        }
        throw new Error(`Score did not complete within ${POLL_TIMEOUT_MS / 1000}s`);
    });
}
function resolveDefaultSubdomain() {
    return __awaiter(this, void 0, void 0, function* () {
        const fromConfig = getConfigValue('subdomain');
        if (fromConfig)
            return fromConfig;
        const accessToken = yield getAccessToken();
        if (!accessToken)
            return undefined;
        const subdomains = yield getCliSubdomains(accessToken);
        return subdomains[0];
    });
}
export const scoreHandler = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    const format = resolveFormat(argv);
    try {
        let url = argv.url;
        if (!url) {
            const subdomain = yield resolveDefaultSubdomain();
            if (!subdomain) {
                throw new Error('No URL provided and no default subdomain set. Run `mint login` to set one, or pass a URL: `mint score <url>`.');
            }
            url = `${subdomain}.mintlify.app`;
        }
        if (format === 'table')
            addLog(_jsx(SpinnerLog, { message: "Checking agent readiness..." }));
        const resolved = yield resolveScoreForUrl(url);
        let final;
        if (resolved.status === 'ready') {
            const score = yield fetchScoreBySlug(resolved.slug);
            if (format === 'table')
                removeLastLog();
            if (!score)
                throw new Error('Score was unexpectedly unavailable');
            final = score;
        }
        else if (resolved.status === 'stale_refresh_queued') {
            const stale = yield fetchScoreBySlug(resolved.slug);
            if (format === 'table')
                removeLastLog();
            if (!stale)
                throw new Error('Stale score was unexpectedly unavailable');
            if (format === 'table') {
                output('table', renderTable(stale, { stale: true }));
                addLog(_jsx(SpinnerLog, { message: "Refreshing score in the background..." }));
            }
            else {
                process.stderr.write('Refreshing score in the background...\n');
            }
            final = yield pollForScore(resolved.slug, stale.computedAt);
            if (format === 'table')
                removeLastLog();
        }
        else {
            if (format === 'table') {
                removeLastLog();
                addLog(_jsx(SpinnerLog, { message: "Queued a new scoring run. Waiting for first result..." }));
            }
            else {
                process.stderr.write('Queued a new scoring run. Waiting for first result...\n');
            }
            final = yield pollForScore(resolved.slug, null);
            if (format === 'table')
                removeLastLog();
        }
        void trackEvent('cli.score.executed', {
            url,
            score: final.overallScore,
            format,
            status: resolved.status,
        });
        if (format === 'json') {
            output(format, JSON.stringify(final, null, 2));
        }
        else if (format === 'plain') {
            const lines = [`SCORE\t${final.overallScore}`, ...renderPlain(final.checks)];
            output(format, lines.join('\n'));
        }
        else {
            output(format, renderTable(final));
        }
        yield terminate(0);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        if (format === 'table') {
            removeLastLog();
            addLog(_jsx(ErrorLog, { message: message }));
        }
        else {
            process.stderr.write(`Error: ${message}\n`);
        }
        yield terminate(1);
    }
});
