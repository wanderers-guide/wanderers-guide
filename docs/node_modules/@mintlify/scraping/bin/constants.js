import { activeColors } from './utils/log.js';
export const OVERVIEW_PAGE_SLUG = '/mintie_overview';
export const SUPPORTED_MEDIA_EXTENSIONS = [
    'png',
    'jpeg',
    'jpg',
    'webp',
    'avif',
    'svg',
    'ico',
    'jfif',
    'pjpeg',
    'pjp',
    'svgz',
    'bmp',
    'gif',
];
export const ESCAPED_COMPONENTS = [
    'Accordion',
    'AccordionGroup',
    'Note',
    'Warning',
    'Info',
    'Tip',
    'Check',
    'Card',
    'CardGroup',
    'CodeGroup',
    'Frame',
    'Icon',
    'Steps',
    'Step',
    'Tabs',
    'Tab',
    'Tooltip',
];
export const SPACES = ' '.repeat(13);
export const CONTENT_FAILURE_MSG = `failed to retrieve root content from HTML.
${SPACES}Please double check your documentation provider and ensure they are supported.
${SPACES}We currently support: ReadMe, GitBook, and Docusaurus`;
export const NAV_FAILURE_MSG = `failed to retrieve nav items from HTML.
${SPACES}Please double check your documentation provider and ensure they are supported.
${SPACES}We currently support: ReadMe, GitBook, and Docusaurus`;
export const MDAST_FAILURE_MSG = 'failed to convert MDAST to Markdown string';
export const FINAL_SUCCESS_MESSAGE = `We've successfully scraped your docs site.
${SPACES}We've downloaded the ${activeColors.cyan}\`navigation\`${activeColors.default} array (and if necessary, the ${activeColors.cyan}\`tabs\`${activeColors.default} array)
${SPACES}into ${activeColors.blue}\`docs.json\`${activeColors.default}.`;
//# sourceMappingURL=constants.js.map