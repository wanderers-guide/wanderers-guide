import type { Element, ElementContent } from 'hast';
import type { Code } from 'mdast';
import { visit, CONTINUE, EXIT } from 'unist-util-visit';

import { assertIsDefined } from '../assert.js';
import type { HastNode, HastNodeIndex, HastNodeParent } from '../types/hast.js';
import { turnChildrenIntoMdx } from '../utils/children.js';

function tabContainsOnlyCode(node: Element | undefined): boolean {
  if (!node) return false;

  let tabsCount = 0;
  let onlyCodeCount = 0;

  visit(node, 'element', function (subNode) {
    if (subNode.properties.role !== 'tabpanel') return CONTINUE;
    tabsCount++;
    if (
      subNode.children[0] &&
      subNode.children[0].type === 'element' &&
      subNode.children[0].children.length === 1 &&
      subNode.children[0].children[0] &&
      subNode.children[0].children[0].type === 'element' &&
      subNode.children[0].children[0].children.length > 1 &&
      subNode.children[0].children[0].children.find(
        (child) => child.type === 'element' && (child.tagName === 'pre' || child.tagName === 'code')
      ) !== undefined
    ) {
      onlyCodeCount++;
    }
  });
  return onlyCodeCount === tabsCount && tabsCount > 0;
}

export function gitBookScrapeCodeGroup(
  node: HastNode,
  _: HastNodeIndex,
  parent: HastNodeParent
): Element | undefined {
  if (
    node.tagName === 'div' &&
    Array.isArray(node.properties.className) &&
    node.properties.className.includes('group/codeblock') &&
    node.children.length === 2 &&
    node.children[0] &&
    node.children[1] &&
    node.children[1].type === 'element' &&
    (node.children[1].tagName === 'pre' || node.children[1].tagName === 'code')
  ) {
    let title = '';
    visit(node.children[0], 'text', function (subNode) {
      title = subNode.value;
      return EXIT;
    });

    if (!title) return undefined;

    const children = turnChildrenIntoMdx([node.children[1]]);
    const code = {
      type: 'code',
      lang: 'bash',
      meta: title,
      value: (children[0] as unknown as Code).value,
    };

    const newNode: Element = {
      type: 'element',
      tagName: 'CodeGroup',
      properties: {},
      children: [code] as Array<ElementContent>,
    };

    return newNode;
  }

  if (node.tagName !== 'div' || node.properties.role !== 'tablist') return undefined;

  if (!tabContainsOnlyCode(parent as Element | undefined)) return undefined;
  assertIsDefined(parent);

  const titles: Array<string> = [];
  visit(node, 'element', function (subNode) {
    if (subNode.tagName !== 'button') return CONTINUE;
    visit(subNode, 'text', function (textNode) {
      titles.push(textNode.value);
      return EXIT;
    });
  });

  parent.children.shift();

  const langs: Array<string> = [];
  visit(parent, 'element', function (subNode) {
    if (
      subNode.tagName === 'div' &&
      'id' in subNode.properties &&
      subNode.properties.role === 'tabpanel'
    ) {
      langs.push(subNode.properties.id as string);
    }
  });

  const children = turnChildrenIntoMdx(parent.children) as Array<ElementContent>;
  const tabChildren: Array<ElementContent> = [];
  children.forEach((child, index) => {
    const lang = langs[index] || 'bash';
    const title = titles[index] || lang;
    tabChildren.push({
      type: 'code',
      lang: lang,
      meta: title,
      value: (child as unknown as Code).value,
    } as unknown as ElementContent);
  });

  const newNode: Element = {
    type: 'element',
    tagName: 'CodeGroup',
    properties: {},
    children: tabChildren as Array<ElementContent>,
  };

  parent.children.length = 0;

  return newNode;
}

export function readmeScrapeCodeGroup(
  node: HastNode,
  _: HastNodeIndex,
  __: HastNodeParent
): Element | undefined {
  if (
    node.tagName !== 'div' ||
    !Array.isArray(node.properties.className) ||
    !node.properties.className.includes('CodeTabs')
  ) {
    return undefined;
  }

  let newNode: Element | undefined = undefined;
  visit(node, 'element', function (node) {
    if (
      node.tagName !== 'div' ||
      !Array.isArray(node.properties.className) ||
      !node.properties.className.includes('CodeTabs-inner')
    ) {
      return CONTINUE;
    }

    const langs: Array<string> = [];
    const titles: Array<string> = [];
    visit(node, 'element', function (subNode) {
      if (
        subNode.tagName !== 'code' ||
        !Array.isArray(subNode.properties.className) ||
        !subNode.properties.className.includes('rdmd-code')
      )
        return CONTINUE;

      langs.push((subNode.properties.dataLang as string | undefined) ?? '');
      titles.push((subNode.properties.name as string | undefined) ?? '');
    });

    const children = turnChildrenIntoMdx(node.children) as Array<ElementContent>;
    const tabChildren: Array<ElementContent> = [];
    children.forEach((child, index) => {
      const lang = langs[index] || 'bash';
      const title = titles[index] || lang;
      tabChildren.push({
        type: 'code',
        lang: lang,
        meta: title,
        value: (child as unknown as Code).value,
      } as unknown as ElementContent);
    });

    newNode = {
      type: 'element',
      tagName: 'CodeGroup',
      properties: {},
      children: tabChildren as Array<ElementContent>,
    };

    return EXIT;
  });

  return newNode;
}

export function docusaurusScrapeCodeGroup(
  node: HastNode,
  _: HastNodeIndex,
  parent: HastNodeParent
): Element | undefined {
  if ((node.tagName !== 'div' && node.tagName !== 'ul') || node.properties.role !== 'tablist') {
    return undefined;
  }

  if (!tabContainsOnlyCode(node)) return undefined;
  assertIsDefined(parent);

  const titles: Array<string> = [];
  visit(node, 'element', function (subNode) {
    if (subNode.tagName !== 'li') return CONTINUE;
    visit(subNode, 'text', function (textNode) {
      titles.push(textNode.value);
      return EXIT;
    });
  });

  parent.children.shift();

  const langs: Array<string> = [];
  visit(parent, 'element', function (subNode) {
    if (
      subNode.tagName === 'div' &&
      Array.isArray(subNode.properties.className) &&
      subNode.properties.className.find((className) => className.toString().includes('language-'))
    ) {
      const lang = subNode.properties.className.find((className) =>
        className.toString().includes('language-')
      );
      langs.push(lang?.toString().replace('language-', '') ?? '');
    }
  });

  const children = turnChildrenIntoMdx(parent.children) as Array<ElementContent>;
  const tabChildren: Array<ElementContent> = [];
  children.forEach((child, index) => {
    const lang = langs[index] || 'bash';
    const title = titles[index] || lang;
    tabChildren.push({
      type: 'code',
      lang: lang,
      meta: title,
      value: (child as unknown as Code).value,
    } as unknown as ElementContent);
  });

  const newNode: Element = {
    type: 'element',
    tagName: 'CodeGroup',
    properties: {},
    children: tabChildren as Array<ElementContent>,
  };

  parent.children.length = 0;

  return newNode;
}
