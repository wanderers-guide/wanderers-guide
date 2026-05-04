import { visit, CONTINUE, EXIT } from 'unist-util-visit';
export function findTitle(node, opts = {
    delete: true,
    nodeType: undefined,
    tagName: undefined,
}) {
    let title = '';
    if (!node)
        return title;
    visit(node, opts.nodeType ? opts.nodeType : node, function (subNode) {
        if (opts.tagName && subNode.type === 'element' && subNode.tagName !== opts.tagName) {
            return CONTINUE;
        }
        visit(subNode, 'text', function (textNode, index, parent) {
            title += textNode.value;
            if (opts.delete && parent && typeof index === 'number') {
                parent.children.splice(index, 1);
            }
        });
    });
    title = title.trim();
    if (opts.escaped) {
        return title.replace(/"/g, '\\"');
    }
    else {
        return title;
    }
}
export function getTitleFromHeading(root) {
    let headingElement = undefined;
    visit(root, 'heading', function (subNode, index, parent) {
        headingElement = subNode;
        if (parent && typeof index === 'number') {
            parent.children.splice(index, 1);
        }
        return EXIT;
    });
    return findTitle(headingElement, { delete: true, escaped: true });
}
export function getDescriptionFromRoot(root) {
    let descriptionElement = undefined;
    visit(root, 'paragraph', function (subNode, index, parent) {
        if (typeof index !== 'number' || index !== 0 || !parent || parent.type !== 'root')
            return EXIT;
        descriptionElement = subNode;
        if (typeof index === 'number') {
            parent.children.splice(index, 1);
        }
        return EXIT;
    });
    return findTitle(descriptionElement, { delete: true, escaped: true });
}
export function getTitleFromLink(url) {
    if (url.startsWith('http')) {
        url = new URL(url).pathname;
    }
    const lastPathname = url.split('/').at(-1) ?? '';
    const dashSplitPathname = lastPathname.split('-').flatMap((i) => i.split('_'));
    dashSplitPathname.forEach((str, index) => {
        dashSplitPathname[index] = str[0] ? `${str[0].toUpperCase()}${str.substring(1)}` : str;
    });
    return dashSplitPathname.join(' ');
}
//# sourceMappingURL=title.js.map