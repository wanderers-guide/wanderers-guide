import { NavigationEntry } from '@mintlify/models';
import type { Element } from 'hast';
import { visit, CONTINUE, SKIP } from 'unist-util-visit';

import { framework } from '../utils/detectFramework.js';
import { findTitle } from '../utils/title.js';
import { processListItem } from './listItems.js';

export function retrieveNavItems(rootNode: Element): Array<NavigationEntry> {
  const result: Array<NavigationEntry> = [];

  let rootSectionTagName = 'li';
  switch (framework.vendor) {
    case 'docusaurus':
      rootSectionTagName = 'li';
      break;
    case 'gitbook':
      rootSectionTagName = 'li';
      break;
    case 'readme':
      rootSectionTagName = 'section';
      break;
  }

  let innerSectionTagName = 'div';
  switch (framework.vendor) {
    case 'docusaurus':
      innerSectionTagName = 'div';
      break;
    case 'gitbook':
      innerSectionTagName = 'div';
      break;
    case 'readme':
      innerSectionTagName = 'h2';
      break;
  }

  visit(rootNode, 'element', function (node, index, parent) {
    if (node.tagName === rootSectionTagName) node.tagName = 'li';
    if (node.tagName !== 'li') return CONTINUE;

    let title: string | undefined = undefined;
    if (
      node.children[0] &&
      node.children[1] &&
      node.children[0].type === 'element' &&
      node.children[0].tagName === 'div' &&
      node.children[1].type === 'element' &&
      node.children[1].tagName === 'ul' &&
      node.children[0].children.filter(
        (child) => framework.vendor === 'docusaurus' || child.type === 'text'
      ).length === node.children[0].children.length
    ) {
      title = findTitle(node.children[0], { delete: false });
    }

    if (
      framework.vendor === 'readme' &&
      node.children.length === 2 &&
      node.children[1] &&
      node.children[1].type === 'element' &&
      node.children[1].tagName === 'ul' &&
      typeof index === 'number' &&
      parent
    ) {
      node.children = [
        {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: node.children,
        },
      ];
    }

    const entry = processListItem(node, {
      sectionTagName: innerSectionTagName,
      childListTagName: 'ul',
      title,
    });

    if (entry !== undefined) {
      result.push(entry);
      return SKIP;
    }
    return CONTINUE;
  });

  return result;
}
