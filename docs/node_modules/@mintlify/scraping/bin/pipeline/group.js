import { convertStrToTitle } from '@mintlify/common';
import { OVERVIEW_PAGE_SLUG } from '../constants.js';
import { getErrorMessage } from '../utils/errors.js';
import { intoChunks } from '../utils/intoChunks.js';
import { log } from '../utils/log.js';
import { fetchPageHtml, startPuppeteer } from '../utils/network.js';
import { scrapePage } from './page.js';
export async function scrapePageGroup(navGroup, needsBrowser, opts = { externalLinks: false }) {
    const browser = needsBrowser ? await startPuppeteer() : undefined;
    const allResults = [];
    try {
        for (const chunk of intoChunks(navGroup)) {
            const res = await Promise.all(chunk.map(async (url, index) => {
                try {
                    if (opts.externalLinks) {
                        let externalLinkTitle = convertStrToTitle(url.pathname.split('/').at(-1) ?? url.pathname) ||
                            `external-link-${index}`;
                        externalLinkTitle = externalLinkTitle.replace(/\s+/g, '-').toLowerCase();
                        const res = scrapePage(externalLinkTitle, url, { externalLink: true });
                        return res;
                    }
                    let isOverviewPage = false;
                    if (url.toString().endsWith(OVERVIEW_PAGE_SLUG)) {
                        isOverviewPage = true;
                        url = new URL(url.toString().replace(OVERVIEW_PAGE_SLUG, ''));
                    }
                    const html = await fetchPageHtml(url, browser);
                    const res = scrapePage(html, url, {
                        externalLink: false,
                        isOverviewPage,
                        rootPath: opts.rootPaths ? opts.rootPaths[index] : undefined,
                    });
                    return res;
                }
                catch (error) {
                    const errorMessage = getErrorMessage(error);
                    return {
                        success: false,
                        message: `We encountered an error when scraping ${url}${errorMessage}`,
                        data: [url.toString(), ''],
                    };
                }
            }));
            allResults.push(...res);
        }
    }
    catch (error) {
        const errorMessage = getErrorMessage(error);
        log(`We encountered an error when scraping the page group from ${navGroup[0]?.origin ?? 'the URL provided'}${errorMessage}`);
        if (browser)
            await browser.close();
        throw error;
    }
    finally {
        if (browser)
            await browser.close();
        return allResults;
    }
}
//# sourceMappingURL=group.js.map