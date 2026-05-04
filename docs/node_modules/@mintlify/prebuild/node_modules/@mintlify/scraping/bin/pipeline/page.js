import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { convertHeaderLinksToText } from '../components/link.js';
import { CONTENT_FAILURE_MSG, MDAST_FAILURE_MSG } from '../constants.js';
import { createCallout, createCard, createAccordion, createAccordionGroup, createFrame, createCodeGroup, createTabs, createCardGroup, } from '../customComponents/create.js';
import { rehypeToRemarkCustomComponents } from '../customComponents/plugin.js';
import { selectiveRehypeRemark } from '../customComponents/selective.js';
import { retrieveRootContent } from '../root/retrieve.js';
import { unifiedRemoveBreadCrumbs } from '../utils/breadcrumbs.js';
import { unifiedRemoveBreaks } from '../utils/breaks.js';
import { unifiedRemoveClassNames } from '../utils/className.js';
import { unifiedRemoveCopyButtons } from '../utils/copyButton.js';
import { detectFramework, framework } from '../utils/detectFramework.js';
import { remarkRemoveEmptyEmphases } from '../utils/emptyEmphasis.js';
import { unifiedRemoveEmptyParagraphs } from '../utils/emptyParagraphs.js';
import { getErrorMessage, logErrorResults } from '../utils/errors.js';
import { writePage } from '../utils/file.js';
import { remarkProperlyFormatEmphasis } from '../utils/formatEmphasis.js';
import { removeHastComments } from '../utils/hastComments.js';
import { remarkSpaceListsOut } from '../utils/lists.js';
import { log } from '../utils/log.js';
import { remarkRemoveBottomMetadata } from '../utils/metadata.js';
import { unifiedRemoveNestedRoots } from '../utils/nestedRoots.js';
import { unifiedRemovePositions } from '../utils/position.js';
import { removeLeadingSlash, removeTrailingSlash } from '../utils/strings.js';
import { remarkRemoveCodeBlocksInCells } from '../utils/tableCells.js';
import { getDescriptionFromRoot, getTitleFromHeading } from '../utils/title.js';
import { unifiedRemoveTableOfContents } from '../utils/toc.js';
import { remarkRemoveUpdatedAt } from '../utils/updatedAt.js';
import { downloadImagesFromFile } from './images.js';
import { htmlToHast } from './root.js';
export async function scrapePage(html, url, opts = { externalLink: false }) {
    url = new URL(url);
    if (opts.externalLink) {
        let filename = html || 'index';
        if (filename.endsWith('/'))
            filename += 'index';
        const filenameWithExt = `${filename}.mdx`;
        writePage(filenameWithExt, '', '', '', url.toString());
        return { success: true, data: [url.toString(), filename] };
    }
    const hast = htmlToHast(html);
    removeHastComments(hast);
    if (!framework.vendor)
        detectFramework(hast);
    const urlStr = url.toString();
    const content = retrieveRootContent(hast);
    if (!content)
        return { success: false, message: `${urlStr}: ${CONTENT_FAILURE_MSG}`, data: [urlStr, ''] };
    const contentAsRoot = {
        type: 'root',
        children: [content],
    };
    const mdastTree = unified()
        .use(unifiedRemoveBreaks)
        .use(unifiedRemoveBreadCrumbs)
        .use(unifiedRemoveTableOfContents)
        .use(unifiedRemoveCopyButtons)
        .use(createCard)
        .use(createAccordion)
        .use(createFrame)
        .use(createCallout)
        .use(createCardGroup)
        .use(createAccordionGroup)
        .use(createCodeGroup)
        .use(createTabs)
        .use(unifiedRemoveClassNames)
        .use(unifiedRemoveEmptyParagraphs)
        .use(unifiedRemovePositions)
        .use(selectiveRehypeRemark)
        // Cleans up any nested components left untouched
        // by `selectiveRehypeRemark`, and converts them to
        // MDX compatible components
        .use(rehypeToRemarkCustomComponents)
        .use(convertHeaderLinksToText)
        .use(unifiedRemoveNestedRoots)
        .use(remarkSpaceListsOut)
        .use(remarkRemoveBottomMetadata)
        .use(remarkRemoveUpdatedAt)
        .use(remarkRemoveEmptyEmphases)
        .use(remarkProperlyFormatEmphasis)
        .use(remarkRemoveCodeBlocksInCells)
        // @ts-expect-error moving some of the pipeline around results in contentAsRoot being treated differently than its type which is Root Element
        .runSync(contentAsRoot);
    try {
        const imageResults = await downloadImagesFromFile(mdastTree, url);
        logErrorResults(`scraping images from ${url.toString()}`, imageResults);
    }
    catch (error) {
        const errorMessage = getErrorMessage(error);
        log(`We encountered an error when scraping the images from ${url.toString()}${errorMessage}`);
        throw error;
    }
    const title = getTitleFromHeading(mdastTree);
    const description = getDescriptionFromRoot(mdastTree);
    try {
        const result = unified()
            .use(remarkMdx)
            .use(remarkGfm)
            .use(remarkStringify)
            .stringify(mdastTree);
        const resultStr = String(result).replace(/\n{3,}/g, '\n\n');
        if (opts.rootPath) {
            url = new URL(opts.rootPath, url.origin);
        }
        else if (url.origin === removeTrailingSlash(url.toString())) {
            url = new URL('home', new URL(url).origin);
        }
        writePage(url, opts.isOverviewPage ? 'Overview' : title, description, resultStr);
        return {
            success: true,
            data: opts.rootPath
                ? [removeLeadingSlash(removeTrailingSlash(new URL(urlStr).pathname)), opts.rootPath]
                : undefined,
        };
    }
    catch (error) {
        const errorMessage = getErrorMessage(error);
        return {
            success: false,
            message: `${urlStr}: ${MDAST_FAILURE_MSG}${errorMessage}`,
            data: [urlStr, ''],
        };
    }
}
//# sourceMappingURL=page.js.map