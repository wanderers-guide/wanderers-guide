import { visit, CONTINUE, EXIT } from 'unist-util-visit';
export function findImg(node) {
    let imgSrc = undefined;
    visit(node, 'element', function (subNode, index, parent) {
        if (subNode.tagName !== 'img')
            return CONTINUE;
        if (parent && typeof index === 'number') {
            parent.children.splice(index, 1);
        }
        imgSrc = subNode.properties.src || undefined;
        return EXIT;
    });
    return imgSrc;
}
//# sourceMappingURL=img.js.map