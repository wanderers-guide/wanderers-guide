import { CONTINUE, EXIT, visit } from 'unist-util-visit';
const defaultTitle = 'Enter name here';
export async function downloadTitle(hast) {
    let text = undefined;
    visit(hast, 'element', function (node) {
        if (node.tagName !== 'title')
            return CONTINUE;
        visit(node, 'text', function (subNode) {
            text = subNode.value;
            return EXIT;
        });
        if (text) {
            return EXIT;
        }
    });
    if (!text)
        return defaultTitle;
    const title = text;
    let siteGroupTitle = '';
    if (title.includes('|')) {
        siteGroupTitle = (title.split('|').at(-1) ?? '').trim();
    }
    else if (title.includes('–')) {
        siteGroupTitle = (title.split('–').at(-1) ?? '').trim();
    }
    else if (title.includes('-')) {
        siteGroupTitle = (title.split('-').at(-1) ?? '').trim();
    }
    else {
        siteGroupTitle = title.trim();
    }
    return siteGroupTitle ? siteGroupTitle : defaultTitle;
}
//# sourceMappingURL=title.js.map