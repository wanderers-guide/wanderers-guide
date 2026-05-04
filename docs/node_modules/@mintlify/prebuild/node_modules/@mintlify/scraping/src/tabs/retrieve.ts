import { Tab } from '@mintlify/models';
import type { Root as HastRoot, Element } from 'hast';
import { visit, EXIT, CONTINUE } from 'unist-util-visit';

import { framework } from '../utils/detectFramework.js';
import { findTitle, getTitleFromLink } from '../utils/title.js';

export function retrieveTabLinks(rootNode: HastRoot, url: URL): Array<Tab> | undefined {
  if (
    framework.vendor !== 'readme' &&
    framework.vendor !== 'docusaurus' &&
    framework.vendor !== 'gitbook'
  ) {
    return undefined;
  }

  let element: Element | undefined = undefined as Element | undefined;
  visit(rootNode, 'element', function (node) {
    if (framework.vendor === 'readme') {
      if (
        node.tagName === 'header' &&
        Array.isArray(node.properties.className) &&
        node.properties.className.includes('rm-Header')
      ) {
        element = node;
        return EXIT;
      }
    }

    if (framework.vendor === 'docusaurus') {
      if (
        node.tagName === 'nav' &&
        Array.isArray(node.properties.className) &&
        node.properties.className.includes('navbar')
      ) {
        element = node;
        return EXIT;
      }
    }

    if (framework.vendor === 'gitbook') {
      if (
        node.tagName === 'nav' &&
        node.properties.id === 'sections' &&
        node.properties.ariaLabel === 'Sections'
      ) {
        element = node;
        return EXIT;
      }
    }
  });

  if (!element) return undefined;

  const links: Array<Tab> = [];
  visit(element, 'element', function (node) {
    switch (framework.vendor) {
      case 'readme':
        if (
          node.tagName !== 'nav' &&
          !(
            node.tagName === 'div' &&
            Array.isArray(node.properties.className) &&
            node.properties.className.includes('rm-Header-right')
          )
        )
          return CONTINUE;

        visit(node, 'element', function (subNode) {
          if (
            subNode.tagName !== 'a' ||
            !subNode.properties.href ||
            typeof subNode.properties.href !== 'string' ||
            subNode.properties.href.startsWith('http')
          )
            return CONTINUE;
          const title = findTitle(subNode);
          links.push({
            name: title || getTitleFromLink(subNode.properties.href),
            url: subNode.properties.href,
          });
        });
        break;

      case 'docusaurus':
        if (node.tagName !== 'nav') return CONTINUE;

        visit(node, 'element', function (subNode, _, parent) {
          if (
            subNode.tagName !== 'a' ||
            !subNode.properties.href ||
            typeof subNode.properties.href !== 'string' ||
            subNode.properties.href.startsWith('http') ||
            !parent ||
            parent.type !== 'element' ||
            !Array.isArray(parent.properties.className) ||
            parent.properties.className.length !== 1 ||
            parent.properties.className[0] !== 'navbar__items' ||
            parent.properties.className.includes('navbar__items--right')
          )
            return CONTINUE;

          const title = findTitle(subNode);
          links.push({
            name: title || getTitleFromLink(subNode.properties.href),
            url: subNode.properties.href,
          });
        });
        break;

      case 'gitbook':
        if (node.tagName !== 'nav') return CONTINUE;

        visit(node, 'element', function (subNode, _, parent) {
          if (
            subNode.tagName !== 'a' ||
            !subNode.properties.href ||
            typeof subNode.properties.href !== 'string' ||
            !parent ||
            parent.type !== 'element'
          )
            return CONTINUE;

          const title = findTitle(subNode);
          const link = new URL(subNode.properties.href);
          links.push({
            name: title || getTitleFromLink(subNode.properties.href),
            url: link.origin === url.origin ? link.pathname : link.toString(),
          });
        });
        break;

      default:
        break;
    }
  });

  return links;
}
