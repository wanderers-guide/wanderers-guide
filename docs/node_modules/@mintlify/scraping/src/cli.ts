#!/usr/bin/env node
import { MintConfigType } from '@mintlify/models';
import { upgradeToDocsConfig } from '@mintlify/validation';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { FINAL_SUCCESS_MESSAGE } from './constants.js';
import { generateOpenApiPages } from './openapi/generateOpenApiPages.js';
import { scrapePageGroup } from './pipeline/group.js';
import { htmlToHast } from './pipeline/root.js';
import { scrapeAllSiteTabs } from './pipeline/tabs.js';
import { detectFramework, framework } from './utils/detectFramework.js';
import { getErrorMessage } from './utils/errors.js';
import { write } from './utils/file.js';
import { log } from './utils/log.js';
import { fetchPageHtml } from './utils/network.js';
import { checkUrl } from './utils/url.js';

await yargs(hideBin(process.argv))
  .command(
    'page <url>',
    'Scrapes the docs page for the URL provided',
    (yargs) => yargs.positional('url', { type: 'string', demandOption: true }).check(checkUrl),
    async ({ url }) => await page(url)
  )

  .command(
    'section <url>',
    'Scrapes the entire docs site based on the URL provided',
    (yargs) => yargs.positional('url', { type: 'string', demandOption: true }).check(checkUrl),
    async ({ url }) => await site(url)
  )

  .command(
    'openapi-file <openapiLocation>',
    'Creates MDX files from an OpenAPI spec',
    (yargs) =>
      yargs
        .positional('openapiLocation', {
          describe: 'The filename or URL location of the OpenAPI spec',
          type: 'string',
          demandOption: true,
        })
        .option('writeFiles', {
          describe: 'Whether or not to write the frontmatter files',
          default: true,
          type: 'boolean',
          alias: 'w',
        })
        .option('outDir', {
          describe: 'The folder in which to write any created frontmatter files',
          type: 'string',
          alias: 'o',
        })
        .option('overwrite', {
          describe: 'Whether or not to overwrite existing files',
          default: false,
          type: 'boolean',
        }),
    async (argv) => {
      try {
        const { nav, isUrl } = await generateOpenApiPages(argv.openapiLocation, {
          openApiFilePath: undefined,
          version: undefined,
          writeFiles: argv.writeFiles,
          outDir: argv.outDir,
          overwrite: argv.overwrite,
        });
        console.log('navigation object suggestion:');
        console.log(JSON.stringify(nav, undefined, 2));
        if (isUrl) {
          console.log('openapi location suggestion:');
          console.log(`openapi: ${argv.openapiLocation}`);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error(error);
        }
      }
    }
  )

  .strictCommands()
  .demandCommand(1, 'Unknown command. See above for the list of supported commands.')
  .alias('h', 'help')
  .alias('v', 'version')
  .parse();

async function page(url: string) {
  try {
    const urlObj = new URL(url);
    const html = await fetchPageHtml(urlObj);
    log('Successfully retrieved initial HTML from src: ' + urlObj.toString());

    const hast = htmlToHast(html);
    detectFramework(hast);

    const needsBrowser = framework.vendor === 'gitbook';
    const results = await scrapePageGroup([urlObj], needsBrowser);
    const result = results[0] || {
      success: false,
      message: `An unknown error occurred when scraping ${url}`,
    };

    if (result.success) {
      log(`Successfully scraped ${url} ${result.data ? `into ${result.data[1]}` : ''}`);
    } else {
      log(result.message);
    }
    process.exit(0);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    log(errorMessage);
    process.exit(1);
  }
}

async function site(url: string) {
  try {
    const urlObj = new URL(url);
    const html = await fetchPageHtml(urlObj);
    log('Successfully retrieved initial HTML from src: ' + urlObj.toString());

    const result = await scrapeAllSiteTabs(html, urlObj);
    if (result.success) {
      const mintConfig = result.data as MintConfigType;
      const docsConfig = upgradeToDocsConfig(mintConfig, {
        shouldUpgradeTheme: true,
      });
      docsConfig.theme = 'aspen';
      write('docs.json', JSON.stringify(docsConfig, undefined, 2));
      log(FINAL_SUCCESS_MESSAGE);
    } else {
      log(result.message);
    }
    process.exit(0);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    log(errorMessage);
    process.exit(1);
  }
}
