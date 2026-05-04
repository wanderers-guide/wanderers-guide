import type { Element } from 'hast';
import { EXIT, visit } from 'unist-util-visit';

export function findFirstChild(node: Element, tagName: string): Element | undefined {
  let element: Element | undefined = undefined;
  visit(node, 'element', function (subNode) {
    if (subNode.tagName === tagName) {
      element = subNode;
      return EXIT;
    }
  });
  return element;
}
