import { NavigationEntry } from '@mintlify/models';
import type { Element } from 'hast';
import { EXIT, visit } from 'unist-util-visit';

import { OVERVIEW_PAGE_SLUG } from '../constants.js';
import { dedupedAppend } from '../utils/append.js';
import { framework } from '../utils/detectFramework.js';
import { findFirstChild } from '../utils/firstChild.js';
import { removeTrailingSlash } from '../utils/strings.js';
import { getText } from '../utils/text.js';
import { retrieveNavItems } from './retrieve.js';

export type ListItemOptions = {
  sectionTagName: string;
  childListTagName: string;
  title?: string;
};

export function processListItem(
  node: Element,
  opts: ListItemOptions = {
    sectionTagName: 'div',
    childListTagName: 'ul',
    title: undefined,
  }
): NavigationEntry | undefined {
  const link = findFirstChild(node, 'a');
  if (!link) return undefined;

  let linkHref: string | undefined = undefined;
  linkHref = link.properties.href as string | undefined;

  if (linkHref === undefined || (framework.vendor !== 'docusaurus' && linkHref === '#')) {
    return undefined;
  }

  let isApiReferenceLink = false as boolean;
  visit(link, 'element', function (subNode) {
    if (
      subNode.tagName === 'span' &&
      Array.isArray(subNode.properties.className) &&
      subNode.properties.className.includes('rm-APIMethod')
    ) {
      isApiReferenceLink = true;
      return EXIT;
    }
  });
  if (isApiReferenceLink) return undefined;

  if (linkHref.startsWith('/')) linkHref = linkHref.substring(1);

  const sectionHeader = findFirstChild(node, opts.sectionTagName);
  const childList = findFirstChild(node, opts.childListTagName);
  if (!childList && framework.vendor === 'docusaurus' && linkHref === '#') {
    return undefined;
  } else if (!childList) {
    return linkHref;
  }

  let title = opts.title;
  if (!title) {
    if (framework.vendor === 'readme') {
      title = getText(sectionHeader) || getText(link) || '';
    } else {
      title = getText(link) || getText(sectionHeader) || '';
    }
  }

  let childEntries = retrieveNavItems(childList);
  const newLink =
    linkHref !== '#' &&
    childEntries.find((child) => typeof child === 'string' && child.startsWith(linkHref))
      ? removeTrailingSlash(linkHref) + OVERVIEW_PAGE_SLUG
      : linkHref;

  if (linkHref !== '#' && childEntries.includes(linkHref)) {
    childEntries.forEach((child, index) => {
      if (child === linkHref) childEntries[index] = newLink;
    });
    childEntries = dedupedAppend(newLink, childEntries, true);
  } else if (linkHref !== '#') {
    childEntries = dedupedAppend(newLink, childEntries, true);
  }

  return { group: title, pages: childEntries };
}
