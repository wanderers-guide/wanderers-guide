import type { Element, ElementContent } from 'hast';

import type { HastNode, HastNodeIndex, HastNodeParent } from '../types/hast.js';
import { turnChildrenIntoMdx } from '../utils/children.js';
import { findTitle } from '../utils/title.js';

export function gitBookScrapeFrame(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (
    (node.tagName === 'figure' &&
      node.children.find(
        (subNode) => subNode.type === 'element' && subNode.tagName === 'picture'
      )) ||
    (node.tagName !== 'picture' && node.tagName !== 'figure')
  )
    return undefined;

  const newNode: Element = {
    type: 'element',
    tagName: 'Frame',
    properties: {},
    children: turnChildrenIntoMdx(node.children, { jsxImages: true }) as Array<ElementContent>,
  };

  const caption = findTitle(newNode);
  if (caption) newNode.properties.caption = caption;

  return newNode;
}

export function readmeScrapeFrame(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (
    (node.tagName === 'figure' &&
      node.children.find(
        (subNode) => subNode.type === 'element' && subNode.tagName === 'picture'
      )) ||
    (node.tagName !== 'picture' && node.tagName !== 'figure')
  )
    return undefined;

  const newNode: Element = {
    type: 'element',
    tagName: 'Frame',
    properties: {},
    children: turnChildrenIntoMdx(node.children, { jsxImages: true }) as Array<ElementContent>,
  };

  const caption = findTitle(newNode);
  if (caption) newNode.properties.caption = caption;

  return newNode;
}

export function docusaurusScrapeFrame(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (
    (node.tagName === 'figure' &&
      node.children.find(
        (subNode) => subNode.type === 'element' && subNode.tagName === 'picture'
      )) ||
    (node.tagName !== 'picture' && node.tagName !== 'figure')
  )
    return undefined;

  const newNode: Element = {
    type: 'element',
    tagName: 'Frame',
    properties: {},
    children: turnChildrenIntoMdx(node.children, { jsxImages: true }) as Array<ElementContent>,
  };

  const caption = findTitle(newNode);
  if (caption) newNode.properties.caption = caption;

  return newNode;
}
