import { MintConfig, Navigation, Tab } from '@mintlify/models';
import type { Root as HastRoot } from 'hast';
import traverse from 'neotraverse';

import { NAV_FAILURE_MSG } from '../constants.js';
import { OVERVIEW_PAGE_SLUG } from '../constants.js';
import { iterateOverNavItems } from '../nav/iterate.js';
import { retrieveNavItems } from '../nav/retrieve.js';
import { retrieveRootNavElement } from '../nav/root.js';
import type { Result } from '../types/result.js';
import { detectFramework, framework } from '../utils/detectFramework.js';
import { logErrorResults } from '../utils/errors.js';
import { fetchPageHtml, startPuppeteer } from '../utils/network.js';
import { INDEX_NAMES, iterateThroughReservedNames } from '../utils/reservedNames.js';
import { removeTrailingSlash, removeLeadingSlash } from '../utils/strings.js';
import { downloadColors } from './color.js';
import { scrapePageGroup } from './group.js';
import { downloadFavicon } from './icon.js';
import { downloadLogos } from './logo.js';
import { htmlToHast } from './root.js';
import { downloadTitle } from './title.js';

export async function scrapeSite(
  html: string,
  url: string | URL,
  opts: { hast?: HastRoot; tabs?: Array<Tab> } = {}
): Promise<Result<MintConfig>> {
  let hast = opts.hast;
  if (!hast) hast = htmlToHast(html);

  url = new URL(url);
  const origin = url.origin;

  if (!framework.vendor) detectFramework(hast);

  if (framework.vendor === 'docusaurus') {
    const browser = await startPuppeteer();
    html = await fetchPageHtml(url, browser);
    hast = htmlToHast(html);
    if (browser) await browser.close();
  }

  const sidebar = retrieveRootNavElement(hast);
  if (!sidebar) return { success: false, message: `${url.toString()}: ${NAV_FAILURE_MSG}` };

  const navItems = retrieveNavItems(sidebar);

  if (origin === '') {
    return { success: false, message: `invalid URL provided to scrape site: ${url}` };
  }

  const listOfLinks = iterateOverNavItems(navItems, origin);
  if (listOfLinks.length === 0) {
    return { success: false, message: `no navigation links were able to be found: ${url}` };
  }

  const needsBrowser = framework.vendor === 'gitbook';

  const externalLinks = listOfLinks.filter((url) => url.origin !== origin);
  const internalLinks = listOfLinks.filter(
    (url) => url.origin === origin && removeTrailingSlash(url.toString()) !== origin
  );
  const rootLinks = listOfLinks.filter(
    (url) => url.origin === origin && removeTrailingSlash(url.toString()) === origin
  );

  const allPathnames = [
    ...internalLinks.map((url) => url.toString()),
    ...rootLinks.map((url) => url.toString()),
  ];
  const rootPaths = rootLinks.map(() => {
    const name = iterateThroughReservedNames(INDEX_NAMES, allPathnames);
    allPathnames.push(name);
    return name;
  });

  try {
    const externalResults = await scrapePageGroup(externalLinks, needsBrowser, {
      externalLinks: true,
    });
    const internalResults = await scrapePageGroup(internalLinks, needsBrowser);
    const rootResults = await scrapePageGroup(rootLinks, needsBrowser, {
      externalLinks: false,
      rootPaths,
    });

    const externalLinkReplaceMap = new Map<string, string>(
      externalResults
        .filter((result) => result.success)
        .map((result) => result.data as [string, string])
    );

    const rootPathReplaceMap = new Map<string, string>(
      rootResults
        .filter((result) => result.success)
        .map((result) => result.data as [string, string])
    );

    traverse(navItems).forEach(function (value) {
      if (typeof value === 'string') {
        if (externalLinkReplaceMap.has(value)) {
          this.update(externalLinkReplaceMap.get(value) ?? value);
        } else if (rootPathReplaceMap.has(value)) {
          this.update(rootPathReplaceMap.get(value) ?? value);
        }
      } else if (Array.isArray(value)) {
        if (value.find((item) => externalLinkReplaceMap.has(item))) {
          this.update(value.map((item) => externalLinkReplaceMap.get(item) ?? item));
        } else if (value.find((item) => rootPathReplaceMap.has(item))) {
          this.update(value.map((item) => rootPathReplaceMap.get(item) ?? item));
        }
      }
    });

    traverse(navItems).forEach(function (value) {
      if (typeof value === 'string') {
        this.update(value.replace(OVERVIEW_PAGE_SLUG, ''));
      } else if (Array.isArray(value)) {
        this.update(
          value.map((item) =>
            typeof item === 'string' ? item.replace(OVERVIEW_PAGE_SLUG, '') : item
          )
        );
      }
    });

    navItems.forEach((navItem, index) => {
      if (typeof navItem !== 'string') return;
      const lastItemInPath = navItem.split('/').pop() || navItem;
      const name = lastItemInPath
        .split(/[-_]/)
        .map((str) => (str[0] ? `${str[0].toUpperCase()}${str.substring(1)}` : str))
        .join(' ');

      navItems[index] = {
        group: name,
        pages: [navItem],
      };
    });

    const allErrors = [
      ...externalResults.filter((result) => !result.success),
      ...internalResults.filter((result) => !result.success),
      ...rootResults.filter((result) => !result.success),
    ];

    const allErroredPaths = allErrors
      .map((result) => {
        if (result.data) {
          const url = new URL(result.data[0]);
          const pathname = url.pathname;
          const normalizedPathname = removeLeadingSlash(removeTrailingSlash(pathname));
          return normalizedPathname;
        } else {
          return '';
        }
      })
      .filter(Boolean);

    traverse(navItems).forEach(function (value) {
      if (typeof value === 'string' && allErroredPaths.includes(value)) {
        this.remove();
      } else if (Array.isArray(value)) {
        this.update(
          value
            .filter((item) =>
              typeof item === 'string' && allErroredPaths.includes(item) ? undefined : item
            )
            .filter(Boolean)
        );
      }
    });

    let count = 1;
    while (count > 0) {
      count = 0;
      traverse(navItems).forEach(function (value) {
        if (Array.isArray(value) && value.filter(Boolean).length === 0) {
          count++;
          if (this.parent) {
            this.parent.remove();
          } else {
            this.remove();
          }
        }
      });
    }

    traverse(navItems).forEach(function (value) {
      if (
        typeof value === 'string' &&
        (value.startsWith('https://') || value.startsWith('http://'))
      ) {
        this.remove();
      } else if (
        Array.isArray(value) &&
        value.find(
          (val) =>
            typeof val === 'string' && (val.startsWith('https://') || val.startsWith('http://'))
        )
      ) {
        this.update(
          value.filter(
            (val) =>
              !(
                typeof val === 'string' &&
                (val.startsWith('https://') || val.startsWith('http://'))
              )
          )
        );
      }
    });

    logErrorResults('linking to external pages', externalResults);
    logErrorResults('scraping your docs', [...internalResults, ...rootResults]);

    const needsBrowserForLogos = framework.vendor === 'readme';
    const browser = needsBrowserForLogos ? await startPuppeteer() : undefined;

    const favicon = await downloadFavicon(hast);
    const colors = await downloadColors(hast);
    const logo = await downloadLogos(url, browser);
    const name = await downloadTitle(hast);

    return {
      success: true,
      data: {
        $schema: 'https://mintlify.com/schema.json',
        name,
        logo,
        colors,
        favicon,
        navigation: navItems as Navigation,
        tabs: opts.tabs,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: 'An unknown error occurred when scraping this site. Please try again.',
    };
  }
}
