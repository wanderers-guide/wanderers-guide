import type { Element, ElementContent } from 'hast';

import { assertIsDefined, assertIsNumber } from '../assert.js';
import type { HastNode, HastNodeIndex, HastNodeParent } from '../types/hast.js';
import { turnChildrenIntoMdx } from '../utils/children.js';
import { findTitle } from '../utils/title.js';

export function gitBookScrapeAccordion(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (node.tagName !== 'details') {
    return undefined;
  }

  const title = findTitle(node, { delete: true, nodeType: 'element', tagName: 'summary' });

  const newNode: Element = {
    type: 'element',
    tagName: 'Accordion',
    properties: {
      title: title,
    },
    children: turnChildrenIntoMdx(node.children) as Array<ElementContent>,
  };

  return newNode;
}

export function readmeScrapeAccordion(
  node: HastNode,
  index: HastNodeIndex,
  parent: HastNodeParent
): Element | undefined {
  if (
    node.tagName !== 'button' ||
    !node.properties.className ||
    !(node.properties.className as Array<string>).includes('accordion')
  ) {
    return undefined;
  }

  assertIsNumber(index);
  assertIsDefined(parent);

  const title = findTitle(node);

  parent.children.shift();

  const newNode: Element = {
    type: 'element',
    tagName: 'Accordion',
    properties: {
      title: title,
    },
    children: turnChildrenIntoMdx(parent.children) as Array<ElementContent>,
  };

  return newNode;
}

export function docusaurusScrapeAccordion(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (node.tagName !== 'details') {
    return undefined;
  }

  const title = findTitle(node, { delete: true, nodeType: 'element', tagName: 'summary' });

  const newNode: Element = {
    type: 'element',
    tagName: 'Accordion',
    properties: {
      title: title,
    },
    children: turnChildrenIntoMdx(node.children) as Array<ElementContent>,
  };

  return newNode;
}
