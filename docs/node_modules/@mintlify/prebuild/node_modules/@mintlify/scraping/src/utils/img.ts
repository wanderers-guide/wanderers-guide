import type { Element } from 'hast';
import { visit, CONTINUE, EXIT } from 'unist-util-visit';

export function findImg(node: Element): string | undefined {
  let imgSrc: string | undefined = undefined;
  visit(node, 'element', function (subNode, index, parent) {
    if (subNode.tagName !== 'img') return CONTINUE;

    if (parent && typeof index === 'number') {
      parent.children.splice(index, 1);
    }

    imgSrc = (subNode.properties.src as string) || undefined;
    return EXIT;
  });
  return imgSrc;
}
