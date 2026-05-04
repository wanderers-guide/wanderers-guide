import { visit, CONTINUE, EXIT } from 'unist-util-visit';
import { assertIsDefined } from '../assert.js';
import { turnChildrenIntoMdx } from '../utils/children.js';
export function gitBookScrapeTabs(node, _, parent) {
    if (node.tagName !== 'div' || !node.properties.role || node.properties.role !== 'tablist') {
        return undefined;
    }
    const titles = [];
    visit(node, 'element', function (subNode) {
        if (subNode.tagName !== 'button')
            return CONTINUE;
        visit(subNode, 'text', function (textNode) {
            titles.push(textNode.value);
            return EXIT;
        });
    });
    assertIsDefined(parent);
    parent.children.shift();
    const children = turnChildrenIntoMdx(parent.children);
    const tabChildren = [];
    for (let childIndex = 0; childIndex < children.length; childIndex++) {
        const child = children[childIndex];
        if (child) {
            tabChildren.push({
                type: 'element',
                tagName: 'Tab',
                properties: {
                    title: titles[childIndex],
                },
                children: [child],
            });
        }
    }
    const newNode = {
        type: 'element',
        tagName: 'Tabs',
        properties: {},
        children: tabChildren,
    };
    return newNode;
}
export function readmeScrapeTabs(node, _, __) {
    if ((node.tagName !== 'div' && node.tagName !== 'a') ||
        !Array.isArray(node.properties.className) ||
        (!node.properties.className.includes('tabbed-component') &&
            !node.properties.className.includes('tabs') &&
            !node.properties.className.includes('Tabs'))) {
        return undefined;
    }
    if (!node.children[0] || !node.children[1])
        return undefined;
    const titles = [];
    const tabContents = [];
    if (node.children.length !== 2) {
        visit(node, 'element', function (subNode) {
            if (subNode.tagName !== 'label' && subNode.tagName !== 'button')
                return CONTINUE;
            let title = '';
            visit(subNode, 'text', function (textNode) {
                title += textNode.value;
            });
            titles.push(title.trim().replace('\n', ''));
        });
        tabContents.push(...node.children.filter((subNode) => {
            if (subNode.type === 'element' &&
                Array.isArray(subNode.properties.className) &&
                (subNode.properties.className.includes('tab') ||
                    subNode.properties.className.includes('Tab') ||
                    subNode.properties.className.includes('tabbed-content') ||
                    subNode.properties.className.includes('tab-content')))
                return true;
            return false;
        }));
    }
    else {
        const tabTitles = node.children[0];
        visit(tabTitles, 'element', function (subNode) {
            visit(subNode, 'text', function (textNode) {
                titles.push(textNode.value);
                return EXIT;
            });
        });
        node.children.shift();
        if (node.children[0].type === 'element') {
            tabContents.push(...node.children[0].children);
        }
    }
    const tabChildren = [];
    tabContents.forEach((tab, index) => {
        if (!titles[index])
            return;
        const children = turnChildrenIntoMdx([tab]);
        tabChildren.push({
            type: 'element',
            tagName: 'Tab',
            properties: {
                title: titles[index],
            },
            children,
        });
    });
    const newNode = {
        type: 'element',
        tagName: 'Tabs',
        properties: {},
        children: tabChildren,
    };
    return newNode;
}
export function docusaurusScrapeTabs(node, _, parent) {
    if ((node.tagName !== 'div' && node.tagName !== 'ul') || node.properties.role !== 'tablist') {
        return undefined;
    }
    const titles = [];
    visit(node, 'element', function (subNode) {
        if (subNode.tagName !== 'li')
            return CONTINUE;
        visit(subNode, 'text', function (textNode) {
            titles.push(textNode.value);
            return EXIT;
        });
    });
    assertIsDefined(parent);
    parent.children.shift();
    const children = turnChildrenIntoMdx(parent.children);
    const tabChildren = [];
    for (let childIndex = 0; childIndex < children.length; childIndex++) {
        const child = children[childIndex];
        if (child) {
            tabChildren.push({
                type: 'element',
                tagName: 'Tab',
                properties: {
                    title: titles[childIndex],
                },
                children: [child],
            });
        }
    }
    const newNode = {
        type: 'element',
        tagName: 'Tabs',
        properties: {},
        children: tabChildren,
    };
    return newNode;
}
//# sourceMappingURL=Tabs.js.map