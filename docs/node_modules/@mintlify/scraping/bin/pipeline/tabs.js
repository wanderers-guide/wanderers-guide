import { retrieveTabLinks } from '../tabs/retrieve.js';
import { detectFramework, framework } from '../utils/detectFramework.js';
import { getErrorMessage } from '../utils/errors.js';
import { log } from '../utils/log.js';
import { fetchPageHtml, startPuppeteer } from '../utils/network.js';
import { getTitleFromLink } from '../utils/title.js';
import { defaultColors } from './color.js';
import { downloadLogos } from './logo.js';
import { htmlToHast } from './root.js';
import { scrapeSite } from './site.js';
import { downloadTitle } from './title.js';
export async function scrapeAllSiteTabs(html, url) {
    const hast = htmlToHast(html);
    url = new URL(url);
    detectFramework(hast);
    if (framework.vendor === 'readme' ||
        framework.vendor === 'docusaurus' ||
        framework.vendor === 'gitbook') {
        const links = retrieveTabLinks(hast, url);
        if (!links ||
            !links.length ||
            (links.length === 1 && links[0] && links[0].url === url.pathname))
            return scrapeSite(html, url, { hast });
        if (!links.find((link) => url.pathname.startsWith(link.url))) {
            links.push({
                name: getTitleFromLink(url.pathname),
                url: url.pathname,
            });
        }
        const results = await Promise.all(links.map(async (tabEntry) => {
            const newUrl = new URL(url);
            newUrl.pathname = tabEntry.url;
            try {
                const newHtml = await fetchPageHtml(newUrl, undefined);
                return await scrapeSite(newHtml, newUrl, { tabs: [tabEntry] });
            }
            catch (error) {
                return { success: false, message: getErrorMessage(error) };
            }
        }));
        const navigations = [];
        const tabs = [];
        let favicon = '/favicon.svg';
        let colors = defaultColors;
        const successes = results.filter((result) => result.success);
        successes.forEach((result) => {
            if (!result.data)
                return;
            navigations.push(...result.data.navigation);
            if (result.data.tabs)
                tabs.push(...result.data.tabs);
            if (result.data.favicon !== '/favicon.svg')
                favicon = result.data.favicon;
            if (result.data.colors !== defaultColors)
                colors = result.data.colors;
        });
        const failures = results.filter((result) => !result.success);
        failures.forEach((result) => {
            log('Failed to scrape tab' + result.message);
        });
        const needsBrowser = framework.vendor === 'readme';
        const browser = needsBrowser ? await startPuppeteer() : undefined;
        const logo = await downloadLogos(url, browser);
        const name = await downloadTitle(hast);
        if (browser)
            await browser.close();
        return {
            success: true,
            data: {
                $schema: 'https://mintlify.com/schema.json',
                name,
                logo,
                colors,
                favicon,
                navigation: navigations,
                tabs,
            },
        };
    }
    return scrapeSite(html, url, { hast });
}
//# sourceMappingURL=tabs.js.map