import type { Element, ElementContent } from 'hast';
import { visit, EXIT, CONTINUE } from 'unist-util-visit';

import { assertIsDefined } from '../assert.js';
import type { HastNode, HastNodeIndex, HastNodeParent } from '../types/hast.js';
import { turnChildrenIntoMdx } from '../utils/children.js';
import { findImg } from '../utils/img.js';
import { findTitle } from '../utils/title.js';

export function gitBookScrapeCard(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (
    (node.tagName !== 'a' && node.tagName !== 'div') ||
    !Array.isArray(node.properties.className) ||
    !node.properties.className
      .join(' ')
      .startsWith(
        'group grid shadow-1xs shadow-dark/[0.02] rounded-md straight-corners:rounded-none dark:shadow-transparent'
      )
  ) {
    return undefined;
  }

  let firstTextElement: Element | undefined = undefined;
  visit(node, 'element', function (subNode, index, parent) {
    if (
      !Array.isArray(subNode.properties.className) ||
      subNode.properties.className.join(' ') !== 'w-full space-y-2 lg:space-y-3 leading-normal'
    )
      return CONTINUE;

    firstTextElement = subNode;
    if (parent && typeof index === 'number') {
      parent.children.splice(index, 1);
    }
    return EXIT;
  });

  const title = findTitle(firstTextElement);
  const imgSrc = findImg(node);

  const newNode: Element = {
    type: 'element',
    tagName: 'Card',
    properties: {
      title: title,
    },
    children: turnChildrenIntoMdx(node.children) as Array<ElementContent>,
  };

  if (node.properties.href) newNode.properties.href = node.properties.href;
  if (imgSrc) newNode.properties.img = imgSrc;

  return newNode;
}

export function readmeScrapeCard(
  node: HastNode,
  _: HastNodeIndex,
  parent: HastNodeParent
): Element | undefined {
  if (
    (node.tagName !== 'div' && node.tagName !== 'a') ||
    !Array.isArray(node.properties.className) ||
    (!node.properties.className.includes('Tile') &&
      !node.properties.className.includes('card') &&
      !node.properties.className.includes('Card') &&
      !node.properties.className.includes('docs-card') &&
      !node.properties.className.includes('next-steps__step') &&
      !node.properties.className.join(' ').includes('_card') &&
      !node.properties.className.join(' ').includes('-card'))
  ) {
    return undefined;
  }

  const title = findTitle(node);

  let href: string | undefined = undefined;
  if (node.properties.href) {
    href = node.properties.href as string;
  } else if (node.properties.onclick && typeof node.properties.onclick === 'string') {
    const str = node.properties.onclick.split("'")[1];
    href = str ? `./${str}` : undefined;
  } else {
    visit(node, 'element', function (subNode) {
      if (subNode.properties.href) {
        href = subNode.properties.href as string;
        return EXIT;
      } else if (subNode.properties.onclick && typeof node.properties.onclick === 'string') {
        const str = node.properties.onclick.split("'")[1];
        href = str ? `./${str}` : undefined;
        return EXIT;
      }
    });
  }

  assertIsDefined(parent);
  const newNode: Element = {
    type: 'element',
    tagName: 'Card',
    properties: {
      title: title,
      href: href,
    },
    children: turnChildrenIntoMdx(node.children as Array<Element>) as Array<ElementContent>,
  };

  return newNode;
}

export function docusaurusScrapeCard(
  node: HastNode,
  _: HastNodeIndex,
  parent: HastNodeParent
): Element | undefined {
  if (
    (node.tagName !== 'div' && node.tagName !== 'a') ||
    !Array.isArray(node.properties.className) ||
    (!node.properties.className.includes('Tile') &&
      !node.properties.className.includes('card') &&
      !node.properties.className.includes('Card') &&
      !node.properties.className.includes('docs-card') &&
      !node.properties.className.join(' ').includes('_card') &&
      !node.properties.className.join(' ').includes('-card'))
  ) {
    return undefined;
  }

  const title = findTitle(node);

  let href: string | undefined = undefined;
  if (node.properties.href) {
    href = node.properties.href as string;
  } else if (node.properties.onclick && typeof node.properties.onclick === 'string') {
    const str = node.properties.onclick.split("'")[1];
    href = str ? `./${str}` : undefined;
  } else {
    visit(node, 'element', function (subNode) {
      if (subNode.properties.href) {
        href = subNode.properties.href as string;
        return EXIT;
      } else if (subNode.properties.onclick && typeof node.properties.onclick === 'string') {
        const str = node.properties.onclick.split("'")[1];
        href = str ? `./${str}` : undefined;
        return EXIT;
      }
    });
  }

  assertIsDefined(parent);
  const newNode: Element = {
    type: 'element',
    tagName: 'Card',
    properties: {
      title: title,
      href: href,
    },
    children: turnChildrenIntoMdx(node.children as Array<Element>) as Array<ElementContent>,
  };

  return newNode;
}
