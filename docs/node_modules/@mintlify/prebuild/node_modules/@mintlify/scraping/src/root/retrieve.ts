import type { Root as HastRoot, Element } from 'hast';
import { visit, EXIT, CONTINUE } from 'unist-util-visit';

import { framework } from '../utils/detectFramework.js';

export function retrieveRootContent(rootNode: HastRoot): Element | undefined {
  let rootSelector: Map<string, string | undefined> = new Map([['main', 'break-anywhere']]);
  switch (framework.vendor) {
    case 'docusaurus':
      rootSelector = new Map([
        ['article', undefined],
        ['div', 'index-page'],
      ]);
      break;
    case 'gitbook':
      rootSelector = new Map([['main', undefined]]);
      break;
    case 'readme':
      rootSelector = new Map([['article', 'rm-Article']]);
      break;
  }

  let element: Element | undefined = undefined;
  visit(rootNode, 'element', function (node) {
    if (!rootSelector.has(node.tagName)) {
      return CONTINUE;
    }

    const classNameSelector = rootSelector.get(node.tagName);
    const { className } = node.properties;
    if (!classNameSelector || (Array.isArray(className) && className.includes(classNameSelector))) {
      element = node;
      return EXIT;
    }
  });

  return element;
}
