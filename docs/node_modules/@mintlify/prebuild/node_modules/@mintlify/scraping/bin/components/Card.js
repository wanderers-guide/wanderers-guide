import { visit, EXIT, CONTINUE } from 'unist-util-visit';
import { assertIsDefined } from '../assert.js';
import { turnChildrenIntoMdx } from '../utils/children.js';
import { findImg } from '../utils/img.js';
import { findTitle } from '../utils/title.js';
export function gitBookScrapeCard(node, _, __) {
    if ((node.tagName !== 'a' && node.tagName !== 'div') ||
        !Array.isArray(node.properties.className) ||
        !node.properties.className
            .join(' ')
            .startsWith('group grid shadow-1xs shadow-dark/[0.02] rounded-md straight-corners:rounded-none dark:shadow-transparent')) {
        return undefined;
    }
    let firstTextElement = undefined;
    visit(node, 'element', function (subNode, index, parent) {
        if (!Array.isArray(subNode.properties.className) ||
            subNode.properties.className.join(' ') !== 'w-full space-y-2 lg:space-y-3 leading-normal')
            return CONTINUE;
        firstTextElement = subNode;
        if (parent && typeof index === 'number') {
            parent.children.splice(index, 1);
        }
        return EXIT;
    });
    const title = findTitle(firstTextElement);
    const imgSrc = findImg(node);
    const newNode = {
        type: 'element',
        tagName: 'Card',
        properties: {
            title: title,
        },
        children: turnChildrenIntoMdx(node.children),
    };
    if (node.properties.href)
        newNode.properties.href = node.properties.href;
    if (imgSrc)
        newNode.properties.img = imgSrc;
    return newNode;
}
export function readmeScrapeCard(node, _, parent) {
    if ((node.tagName !== 'div' && node.tagName !== 'a') ||
        !Array.isArray(node.properties.className) ||
        (!node.properties.className.includes('Tile') &&
            !node.properties.className.includes('card') &&
            !node.properties.className.includes('Card') &&
            !node.properties.className.includes('docs-card') &&
            !node.properties.className.includes('next-steps__step') &&
            !node.properties.className.join(' ').includes('_card') &&
            !node.properties.className.join(' ').includes('-card'))) {
        return undefined;
    }
    const title = findTitle(node);
    let href = undefined;
    if (node.properties.href) {
        href = node.properties.href;
    }
    else if (node.properties.onclick && typeof node.properties.onclick === 'string') {
        const str = node.properties.onclick.split("'")[1];
        href = str ? `./${str}` : undefined;
    }
    else {
        visit(node, 'element', function (subNode) {
            if (subNode.properties.href) {
                href = subNode.properties.href;
                return EXIT;
            }
            else if (subNode.properties.onclick && typeof node.properties.onclick === 'string') {
                const str = node.properties.onclick.split("'")[1];
                href = str ? `./${str}` : undefined;
                return EXIT;
            }
        });
    }
    assertIsDefined(parent);
    const newNode = {
        type: 'element',
        tagName: 'Card',
        properties: {
            title: title,
            href: href,
        },
        children: turnChildrenIntoMdx(node.children),
    };
    return newNode;
}
export function docusaurusScrapeCard(node, _, parent) {
    if ((node.tagName !== 'div' && node.tagName !== 'a') ||
        !Array.isArray(node.properties.className) ||
        (!node.properties.className.includes('Tile') &&
            !node.properties.className.includes('card') &&
            !node.properties.className.includes('Card') &&
            !node.properties.className.includes('docs-card') &&
            !node.properties.className.join(' ').includes('_card') &&
            !node.properties.className.join(' ').includes('-card'))) {
        return undefined;
    }
    const title = findTitle(node);
    let href = undefined;
    if (node.properties.href) {
        href = node.properties.href;
    }
    else if (node.properties.onclick && typeof node.properties.onclick === 'string') {
        const str = node.properties.onclick.split("'")[1];
        href = str ? `./${str}` : undefined;
    }
    else {
        visit(node, 'element', function (subNode) {
            if (subNode.properties.href) {
                href = subNode.properties.href;
                return EXIT;
            }
            else if (subNode.properties.onclick && typeof node.properties.onclick === 'string') {
                const str = node.properties.onclick.split("'")[1];
                href = str ? `./${str}` : undefined;
                return EXIT;
            }
        });
    }
    assertIsDefined(parent);
    const newNode = {
        type: 'element',
        tagName: 'Card',
        properties: {
            title: title,
            href: href,
        },
        children: turnChildrenIntoMdx(node.children),
    };
    return newNode;
}
//# sourceMappingURL=Card.js.map