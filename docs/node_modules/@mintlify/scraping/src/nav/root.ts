import type { Root as HastRoot, Element } from 'hast';
import { visit, EXIT } from 'unist-util-visit';

import { framework } from '../utils/detectFramework.js';
import { intersection } from '../utils/intersection.js';

export function retrieveRootNavElement(rootNode: HastRoot): Element | undefined {
  let rootTagName = 'aside';
  switch (framework.vendor) {
    case 'docusaurus':
      rootTagName = 'nav';
      break;
    case 'gitbook':
      rootTagName = 'aside';
      break;
    case 'readme':
      rootTagName = 'nav';
      break;
  }

  let rootSelectorSet = new Set(['page-no-toc:hidden']);
  switch (framework.vendor) {
    case 'docusaurus':
      rootSelectorSet = new Set(['menu']);
      break;
    case 'gitbook':
      rootSelectorSet = new Set([
        'lg:page-no-toc:hidden',
        'page-no-toc:hidden',
        'page-no-toc:lg:hidden',
      ]);
      break;
    case 'readme':
      rootSelectorSet = new Set(['rm-Sidebar']);
      break;
  }

  let element: Element | undefined = undefined;
  visit(rootNode, 'element', function (node) {
    const { className } = node.properties;
    if (
      node.tagName === rootTagName &&
      Array.isArray(className) &&
      !!intersection(className, rootSelectorSet).size
    ) {
      element = node;
      return EXIT;
    }
  });

  return element;
}
