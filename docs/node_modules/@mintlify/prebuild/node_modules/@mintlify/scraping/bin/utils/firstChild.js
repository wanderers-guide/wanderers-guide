import { EXIT, visit } from 'unist-util-visit';
export function findFirstChild(node, tagName) {
    let element = undefined;
    visit(node, 'element', function (subNode) {
        if (subNode.tagName === tagName) {
            element = subNode;
            return EXIT;
        }
    });
    return element;
}
//# sourceMappingURL=firstChild.js.map