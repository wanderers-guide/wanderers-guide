import type { Element, ElementContent } from 'hast';
import { visit, CONTINUE, EXIT } from 'unist-util-visit';

import { assertIsDefined } from '../assert.js';
import type { HastNode, HastNodeIndex, HastNodeParent } from '../types/hast.js';
import { turnChildrenIntoMdx } from '../utils/children.js';

export function gitBookScrapeTabs(
  node: HastNode,
  _: HastNodeIndex,
  parent: HastNodeParent
): Element | undefined {
  if (node.tagName !== 'div' || !node.properties.role || node.properties.role !== 'tablist') {
    return undefined;
  }

  const titles: Array<string> = [];
  visit(node, 'element', function (subNode) {
    if (subNode.tagName !== 'button') return CONTINUE;
    visit(subNode, 'text', function (textNode) {
      titles.push(textNode.value);
      return EXIT;
    });
  });

  assertIsDefined(parent);
  parent.children.shift();

  const children = turnChildrenIntoMdx(parent.children) as Array<ElementContent>;
  const tabChildren: Array<ElementContent> = [];
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

  const newNode: Element = {
    type: 'element',
    tagName: 'Tabs',
    properties: {},
    children: tabChildren as Array<ElementContent>,
  };

  return newNode;
}

export function readmeScrapeTabs(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (
    (node.tagName !== 'div' && node.tagName !== 'a') ||
    !Array.isArray(node.properties.className) ||
    (!node.properties.className.includes('tabbed-component') &&
      !node.properties.className.includes('tabs') &&
      !node.properties.className.includes('Tabs'))
  ) {
    return undefined;
  }

  if (!node.children[0] || !node.children[1]) return undefined;

  const titles: Array<string> = [];
  const tabContents: Array<Element> = [];

  if (node.children.length !== 2) {
    visit(node, 'element', function (subNode) {
      if (subNode.tagName !== 'label' && subNode.tagName !== 'button') return CONTINUE;

      let title = '';
      visit(subNode, 'text', function (textNode) {
        title += textNode.value;
      });

      titles.push(title.trim().replace('\n', ''));
    });

    tabContents.push(
      ...(node.children.filter((subNode) => {
        if (
          subNode.type === 'element' &&
          Array.isArray(subNode.properties.className) &&
          (subNode.properties.className.includes('tab') ||
            subNode.properties.className.includes('Tab') ||
            subNode.properties.className.includes('tabbed-content') ||
            subNode.properties.className.includes('tab-content'))
        )
          return true;
        return false;
      }) as Array<Element>)
    );
  } else {
    const tabTitles = node.children[0];

    visit(tabTitles, 'element', function (subNode) {
      visit(subNode, 'text', function (textNode) {
        titles.push(textNode.value);
        return EXIT;
      });
    });

    node.children.shift();
    if (node.children[0].type === 'element') {
      tabContents.push(...(node.children[0].children as Array<Element>));
    }
  }

  const tabChildren: Array<ElementContent> = [];
  tabContents.forEach((tab, index) => {
    if (!titles[index]) return;
    const children = turnChildrenIntoMdx([tab]) as Array<ElementContent>;
    tabChildren.push({
      type: 'element',
      tagName: 'Tab',
      properties: {
        title: titles[index],
      },
      children,
    });
  });

  const newNode: Element = {
    type: 'element',
    tagName: 'Tabs',
    properties: {},
    children: tabChildren as Array<ElementContent>,
  };

  return newNode;
}

export function docusaurusScrapeTabs(
  node: HastNode,
  _: HastNodeIndex,
  parent: HastNodeParent
): Element | undefined {
  if ((node.tagName !== 'div' && node.tagName !== 'ul') || node.properties.role !== 'tablist') {
    return undefined;
  }

  const titles: Array<string> = [];
  visit(node, 'element', function (subNode) {
    if (subNode.tagName !== 'li') return CONTINUE;
    visit(subNode, 'text', function (textNode) {
      titles.push(textNode.value);
      return EXIT;
    });
  });

  assertIsDefined(parent);
  parent.children.shift();

  const children = turnChildrenIntoMdx(parent.children) as Array<ElementContent>;
  const tabChildren: Array<ElementContent> = [];
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

  const newNode: Element = {
    type: 'element',
    tagName: 'Tabs',
    properties: {},
    children: tabChildren as Array<ElementContent>,
  };

  return newNode;
}
