import { addLog, ErrorLog, SpinnerLog, removeLastLog } from '@mintlify/previewing';
import chalk from 'chalk';
import { Text } from 'ink';
import type { Argv } from 'yargs';

import { getConfigValue } from '../config.js';
import { terminate } from '../helpers.js';
import { subdomainMiddleware } from '../middlewares/subdomainMiddleware.js';
import {
  getBucketThreads,
  getBuckets,
  getConversations,
  getFeedback,
  getFeedbackByPage,
  getKpi,
  getSearches,
} from './client.js';
import { num, truncate } from './format.js';
import { formatBarChart, formatOutput, resolveFormat, type OutputFormat } from './output.js';
import type { Conversation } from './types.js';

const withSubdomain = <T extends object>(yargs: Argv<T>) =>
  yargs.option('subdomain', {
    type: 'string' as const,
    description: 'Documentation subdomain (default: mint config set subdomain)',
  });

function defaultFrom(): string {
  const configured = getConfigValue('dateFrom');
  if (configured) return configured;
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return getConfigValue('dateTo') ?? new Date().toISOString().slice(0, 10);
}

const withDates = <T extends object>(yargs: Argv<T>) =>
  yargs
    .option('from', {
      type: 'string' as const,
      default: defaultFrom(),
      description: 'Start date (YYYY-MM-DD)',
    })
    .option('to', {
      type: 'string' as const,
      default: defaultTo(),
      description: 'End date (YYYY-MM-DD)',
    });

const withFormat = <T extends object>(yargs: Argv<T>) =>
  yargs.option('format', {
    type: 'string' as const,
    choices: ['table', 'plain', 'json', 'graph'] as const,
    description: 'Output format (table=pretty, plain=pipeable, json=raw)',
  });

const withAll = <T extends object>(yargs: Argv<T>) => withFormat(withDates(withSubdomain(yargs)));

function output(format: OutputFormat, text: string) {
  if (format === 'table') {
    addLog(<Text>{text}</Text>);
  } else {
    process.stdout.write(text + '\n');
  }
}

export const analyticsBuilder = (yargs: Argv) =>
  yargs
    .middleware(subdomainMiddleware)
    .command(
      'stats',
      'display KPI numbers (views, visitors, searches)',
      (yargs) =>
        withAll(yargs).option('page', {
          type: 'string',
          description: 'Filter to a specific page path',
        }),
      async (argv) => {
        const format = resolveFormat(argv);
        try {
          if (format === 'table') addLog(<SpinnerLog message="Fetching analytics..." />);
          const kpi = await getKpi(
            { dateFrom: argv.from, dateTo: argv.to, page: argv.page },
            argv.subdomain
          );
          if (format === 'table') removeLastLog();

          if (format === 'json') {
            output(format, JSON.stringify(kpi, null, 2));
            await terminate(0);
            return;
          }

          if (format === 'plain') {
            const lines = [
              ['METRIC', 'HUMAN', 'AGENT', 'TOTAL'].join('\t'),
              ['Views', kpi.humanViews, kpi.agentViews, kpi.humanViews + kpi.agentViews].join('\t'),
              [
                'Visitors',
                kpi.humanVisitors,
                kpi.agentVisitors,
                kpi.humanVisitors + kpi.agentVisitors,
              ].join('\t'),
              ['Searches', kpi.humanSearches, '', kpi.humanSearches].join('\t'),
              ['Feedback', kpi.humanFeedback, '', kpi.humanFeedback].join('\t'),
              [
                'Assistant',
                kpi.humanAssistant,
                kpi.agentMcpSearches,
                kpi.humanAssistant + kpi.agentMcpSearches,
              ].join('\t'),
            ];
            output(format, lines.join('\n'));
            await terminate(0);
            return;
          }

          if (format === 'graph') {
            const label = argv.subdomain ?? '';
            const lines: string[] = [];
            lines.push(chalk.bold(`\nAnalytics \u2014 ${label} (${argv.from} to ${argv.to})\n`));
            lines.push(chalk.bold('  Human vs Agent\n'));
            lines.push(
              formatBarChart([
                { label: 'Human Views', value: kpi.humanViews, color: 'cyan' },
                { label: 'Agent Views', value: kpi.agentViews, color: 'magenta' },
                { label: 'Human Visitors', value: kpi.humanVisitors, color: 'cyan' },
                { label: 'Agent Visitors', value: kpi.agentVisitors, color: 'magenta' },
              ])
            );
            lines.push(chalk.bold('\n\n  Engagement\n'));
            lines.push(
              formatBarChart([
                { label: 'Searches', value: kpi.humanSearches, color: 'yellow' },
                { label: 'Feedback', value: kpi.humanFeedback, color: 'green' },
                { label: 'Assistant (web)', value: kpi.humanAssistant, color: 'blue' },
                { label: 'Assistant (API)', value: kpi.agentMcpSearches, color: 'magenta' },
              ])
            );
            output('table', lines.join('\n'));
            await terminate(0);
            return;
          }

          const lines: string[] = [];
          const label = argv.subdomain ?? '';
          lines.push(chalk.bold(`\nAnalytics \u2014 ${label} (${argv.from} to ${argv.to})\n`));

          if (argv.page) {
            lines.push(`  Page: ${argv.page}\n`);
          }

          lines.push(chalk.bold('  Views'));
          lines.push(`    Human:  ${chalk.cyan(num(kpi.humanViews).padStart(8))}`);
          lines.push(`    Agent:  ${chalk.magenta(num(kpi.agentViews).padStart(8))}`);
          lines.push(`    Total:  ${num(kpi.humanViews + kpi.agentViews).padStart(8)}`);

          lines.push(chalk.bold('\n  Visitors'));
          lines.push(`    Human:  ${chalk.cyan(num(kpi.humanVisitors).padStart(8))}`);
          lines.push(`    Agent:  ${chalk.magenta(num(kpi.agentVisitors).padStart(8))}`);
          lines.push(`    Total:  ${num(kpi.humanVisitors + kpi.agentVisitors).padStart(8)}`);

          lines.push(`\n  Searches:   ${chalk.bold(num(kpi.humanSearches))}`);
          lines.push(`  Feedback:   ${chalk.bold(num(kpi.humanFeedback))}`);
          lines.push(
            `  Assistant:  ${chalk.bold(num(kpi.humanAssistant))} web, ${chalk.bold(num(kpi.agentMcpSearches))} API`
          );

          output(format, lines.join('\n'));
          await terminate(0);
        } catch (err) {
          if (format === 'table') removeLastLog();
          addLog(<ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />);
          await terminate(1);
        }
      }
    )
    .command(
      'search',
      'display search analytics',
      (yargs) =>
        withAll(yargs)
          .option('query', { type: 'string', description: 'Filter by search query substring' })
          .option('page', { type: 'string', description: 'Filter by top clicked page' }),
      async (argv) => {
        const format = resolveFormat(argv);
        try {
          if (format === 'table') addLog(<SpinnerLog message="Fetching search analytics..." />);
          const data = await getSearches({ dateFrom: argv.from, dateTo: argv.to }, argv.subdomain);
          if (format === 'table') removeLastLog();

          let rows = data.searches;
          if (argv.query) {
            const q = argv.query.toLowerCase();
            rows = rows.filter((r) => r.searchQuery.toLowerCase().includes(q));
          }
          if (argv.page) {
            rows = rows.filter((r) => r.topClickedPage?.includes(argv.page!));
          }

          const headers = ['Query', 'Hits', 'CTR', 'Top Clicked Page', 'Last Searched'];
          const tableRows = rows.map((r) => [
            truncate(r.searchQuery, 30),
            num(r.hits),
            r.ctr.toFixed(1) + '%',
            truncate(r.topClickedPage || '\u2014', 30),
            r.lastSearchedAt.slice(0, 10),
          ]);

          if (format === 'json') {
            output(format, JSON.stringify(data, null, 2));
          } else if (format === 'graph') {
            const label = argv.subdomain ?? '';
            const lines: string[] = [];
            lines.push(
              chalk.bold(`\nSearch Queries \u2014 ${label} (${argv.from} to ${argv.to})\n`)
            );
            lines.push(
              formatBarChart(
                rows.slice(0, 20).map((r) => ({
                  label: truncate(r.searchQuery, 25),
                  value: r.hits,
                  color: 'yellow',
                }))
              )
            );
            output('table', lines.join('\n'));
          } else if (format === 'plain') {
            output(format, formatOutput(format, headers, tableRows, data));
          } else {
            const label = argv.subdomain ?? '';
            const lines: string[] = [];
            lines.push(
              chalk.bold(`\nSearch Analytics \u2014 ${label} (${argv.from} to ${argv.to})`)
            );
            lines.push(`Total Searches: ${chalk.bold(num(data.totalSearches))}\n`);
            lines.push(formatOutput(format, headers, tableRows, data));
            output(format, lines.join('\n'));
          }
          await terminate(0);
        } catch (err) {
          if (format === 'table') removeLastLog();
          addLog(<ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />);
          await terminate(1);
        }
      }
    )
    .command(
      'feedback',
      'display feedback analytics',
      (yargs) =>
        withAll(yargs)
          .option('type', {
            type: 'string',
            choices: ['code', 'page'] as const,
            description: 'Feedback type: code snippets or page-level aggregation',
          })
          .option('page', { type: 'string', description: 'Filter to a specific page path' }),
      async (argv) => {
        const format = resolveFormat(argv);
        try {
          if (format === 'table') addLog(<SpinnerLog message="Fetching feedback..." />);

          if (argv.type === 'page') {
            const data = await getFeedbackByPage(
              { dateFrom: argv.from, dateTo: argv.to },
              argv.subdomain
            );
            if (format === 'table') removeLastLog();

            let rows = data.feedback;
            if (argv.page) rows = rows.filter((r) => r.path.includes(argv.page!));

            const headers = ['Path', 'Thumbs Up', 'Thumbs Down', 'Code', 'Total'];
            const tableRows = rows.map((r) => [
              truncate(r.path, 40),
              num(r.thumbsUp),
              num(r.thumbsDown),
              num(r.code),
              num(r.total),
            ]);

            if (format === 'json') {
              output(format, JSON.stringify(data, null, 2));
            } else if (format === 'graph') {
              const label = argv.subdomain ?? '';
              const lines: string[] = [];
              lines.push(
                chalk.bold(`\nFeedback by Page \u2014 ${label} (${argv.from} to ${argv.to})\n`)
              );
              lines.push(
                formatBarChart(
                  rows.slice(0, 20).map((r) => ({
                    label: truncate(r.path, 25),
                    value: r.total,
                    color: 'green',
                  }))
                )
              );
              output('table', lines.join('\n'));
            } else {
              const label = argv.subdomain ?? '';
              const lines: string[] = [];
              if (format === 'table')
                lines.push(chalk.bold(`\nFeedback \u2014 ${label} (${argv.from} to ${argv.to})\n`));
              lines.push(formatOutput(format, headers, tableRows, data));
              if (format === 'table' && data.hasMore)
                lines.push(chalk.dim('\n  (more results available)'));
              output(format, lines.join('\n'));
            }
          } else {
            const source = argv.type === 'code' ? 'code_snippet' : undefined;
            const data = await getFeedback(
              { dateFrom: argv.from, dateTo: argv.to, source },
              argv.subdomain
            );
            if (format === 'table') removeLastLog();

            let rows = data.feedback;
            if (argv.page) rows = rows.filter((r) => r.path.includes(argv.page!));

            const headers = ['ID', 'Path', 'Status', 'Source', 'Comment', 'Created'];
            const tableRows = rows.map((r) => [
              r.id.slice(0, 8),
              truncate(r.path, 30),
              r.status,
              r.source,
              truncate(r.comment ?? '\u2014', 30),
              r.createdAt?.slice(0, 10) ?? '\u2014',
            ]);

            if (format === 'json') {
              output(format, JSON.stringify(data, null, 2));
            } else {
              const label = argv.subdomain ?? '';
              const lines: string[] = [];
              if (format === 'table')
                lines.push(chalk.bold(`\nFeedback \u2014 ${label} (${argv.from} to ${argv.to})\n`));
              lines.push(formatOutput(format, headers, tableRows, data));
              if (format === 'table' && data.hasMore)
                lines.push(chalk.dim('\n  (more results available)'));
              output(format, lines.join('\n'));
            }
          }
          await terminate(0);
        } catch (err) {
          if (format === 'table') removeLastLog();
          addLog(<ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />);
          await terminate(1);
        }
      }
    )
    .command('conversation', 'view assistant conversation analytics', (yargs) =>
      yargs
        .command(
          'list',
          'list assistant conversations',
          (yargs) =>
            withAll(yargs).option('page', {
              type: 'string',
              description: 'Filter conversations mentioning this page in sources',
            }),
          async (argv) => {
            const format = resolveFormat(argv);
            try {
              if (format === 'table') addLog(<SpinnerLog message="Fetching conversations..." />);
              const data = await getConversations(
                { dateFrom: argv.from, dateTo: argv.to },
                argv.subdomain
              );
              if (format === 'table') removeLastLog();

              let conversations = data.conversations;
              if (argv.page) {
                conversations = conversations.filter((c) =>
                  c.sources.some((s) => s.url.includes(argv.page!))
                );
              }

              const headers = ['ID', 'Timestamp', 'Query', 'Category'];
              const tableRows = conversations.map((c) => [
                c.id,
                c.timestamp.slice(0, 19).replace('T', ' '),
                truncate(c.query, 40),
                c.queryCategory || '\u2014',
              ]);

              if (format === 'json') {
                output(format, JSON.stringify(data, null, 2));
              } else {
                const label = argv.subdomain ?? '';
                const lines: string[] = [];
                if (format === 'table')
                  lines.push(
                    chalk.bold(`\nConversations \u2014 ${label} (${argv.from} to ${argv.to})\n`)
                  );
                lines.push(formatOutput(format, headers, tableRows, data));
                if (format === 'table' && data.hasMore)
                  lines.push(chalk.dim('\n  (more results available)'));
                output(format, lines.join('\n'));
              }
              await terminate(0);
            } catch (err) {
              if (format === 'table') removeLastLog();
              addLog(<ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />);
              await terminate(1);
            }
          }
        )
        .command(
          'view <id>',
          'view a single conversation',
          (yargs) =>
            withFormat(withSubdomain(yargs)).positional('id', {
              type: 'string',
              demandOption: true,
              description: 'Conversation ID',
            }),
          async (argv) => {
            const format = resolveFormat(argv);
            try {
              if (format === 'table') addLog(<SpinnerLog message="Fetching conversation..." />);

              const today = new Date().toISOString().slice(0, 10);
              let conversation: Conversation | undefined;
              let cursor: string | undefined;

              for (let i = 0; i < 10 && !conversation; i++) {
                const data = await getConversations(
                  {
                    dateFrom: '2020-01-01',
                    dateTo: today,
                    limit: 100,
                    cursor,
                  },
                  argv.subdomain
                );
                conversation = data.conversations.find((c) => c.id === argv.id);
                if (!data.nextCursor) break;
                cursor = data.nextCursor;
              }

              if (format === 'table') removeLastLog();

              if (!conversation) {
                addLog(<ErrorLog message={`Conversation ${argv.id} not found`} />);
                await terminate(1);
                return;
              }

              if (format === 'json' || format === 'plain') {
                output(format, JSON.stringify(conversation, null, 2));
              } else {
                const lines: string[] = [];
                lines.push(chalk.bold(`\nConversation ${conversation.id}\n`));
                lines.push(`  Timestamp:  ${conversation.timestamp}`);
                lines.push(`  Category:   ${conversation.queryCategory || '\u2014'}`);
                lines.push(chalk.bold('\n  Query:'));
                lines.push(`  ${conversation.query}`);
                lines.push(chalk.bold('\n  Response:'));
                for (const line of conversation.response.split('\n')) {
                  lines.push(`  ${line}`);
                }
                if (conversation.sources.length > 0) {
                  lines.push(chalk.bold('\n  Sources:'));
                  for (const src of conversation.sources) {
                    lines.push(`    ${src.title} \u2014 ${chalk.dim(src.url)}`);
                  }
                }
                output(format, lines.join('\n'));
              }
              await terminate(0);
            } catch (err) {
              if (format === 'table') removeLastLog();
              addLog(<ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />);
              await terminate(1);
            }
          }
        )
        .command('buckets', 'view conversation category buckets', (yargs) =>
          yargs
            .command(
              'list',
              'list conversation buckets',
              (yargs) => withAll(yargs),
              async (argv) => {
                const format = resolveFormat(argv);
                try {
                  if (format === 'table')
                    addLog(<SpinnerLog message="Fetching conversation buckets..." />);
                  const data = await getBuckets(
                    { dateFrom: argv.from, dateTo: argv.to },
                    argv.subdomain
                  );
                  if (format === 'table') removeLastLog();

                  const headers = ['ID', 'Label', 'Count', 'Last Asked'];
                  const tableRows = data.data.map((b) => [
                    b.id.slice(0, 12),
                    truncate(b.questionSummary, 50),
                    num(b.size),
                    b.lastAsked ? b.lastAsked.slice(0, 10) : '\u2014',
                  ]);

                  if (format === 'json') {
                    output(format, JSON.stringify(data, null, 2));
                  } else if (format === 'graph') {
                    const label = argv.subdomain ?? '';
                    const lines: string[] = [];
                    lines.push(
                      chalk.bold(
                        `\nConversation Buckets \u2014 ${label} (${argv.from} to ${argv.to})\n`
                      )
                    );
                    lines.push(
                      formatBarChart(
                        data.data.slice(0, 20).map((b) => ({
                          label: truncate(b.questionSummary, 30),
                          value: b.size,
                          color: 'blue',
                        }))
                      )
                    );
                    output('table', lines.join('\n'));
                  } else {
                    const label = argv.subdomain ?? '';
                    const lines: string[] = [];
                    if (format === 'table')
                      lines.push(
                        chalk.bold(
                          `\nConversation Buckets \u2014 ${label} (${argv.from} to ${argv.to})\n`
                        )
                      );
                    lines.push(formatOutput(format, headers, tableRows, data));
                    if (format === 'table')
                      lines.push(chalk.dim(`\n  Total: ${data.pagination.total}`));
                    output(format, lines.join('\n'));
                  }
                  await terminate(0);
                } catch (err) {
                  if (format === 'table') removeLastLog();
                  addLog(
                    <ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />
                  );
                  await terminate(1);
                }
              }
            )
            .command(
              'view <id>',
              'view conversations in a bucket',
              (yargs) =>
                withAll(yargs).positional('id', {
                  type: 'string',
                  demandOption: true,
                  description: 'Bucket ID',
                }),
              async (argv) => {
                const format = resolveFormat(argv);
                try {
                  if (format === 'table')
                    addLog(<SpinnerLog message="Fetching bucket conversations..." />);
                  const data = await getBucketThreads(
                    argv.id,
                    { dateFrom: argv.from, dateTo: argv.to },
                    argv.subdomain
                  );
                  if (format === 'table') removeLastLog();

                  if (format === 'json') {
                    output(format, JSON.stringify(data, null, 2));
                  } else {
                    const headers = ['Thread ID', 'Query', 'Length', 'Feedback', 'Created'];
                    const tableRows = data.data.map((t) => [
                      t.id.slice(0, 12),
                      truncate(t.firstUserMessage || '\u2014', 40),
                      num(t.length),
                      `+${t.feedback.up} -${t.feedback.down}`,
                      t.createdAt.slice(0, 10),
                    ]);
                    const lines: string[] = [];
                    if (format === 'table') lines.push(chalk.bold(`\nBucket ${argv.id}\n`));
                    lines.push(formatOutput(format, headers, tableRows, data));
                    if (format === 'table' && data.pagination.hasMore)
                      lines.push(chalk.dim('\n  (more results available)'));
                    output(format, lines.join('\n'));
                  }
                  await terminate(0);
                } catch (err) {
                  if (format === 'table') removeLastLog();
                  addLog(
                    <ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />
                  );
                  await terminate(1);
                }
              }
            )
            .demandCommand(1, 'specify a subcommand: list or view')
        )
        .demandCommand(1, 'specify a subcommand: list, view, or buckets')
    )
    .demandCommand(1, 'specify a subcommand: stats, search, feedback, or conversation');
