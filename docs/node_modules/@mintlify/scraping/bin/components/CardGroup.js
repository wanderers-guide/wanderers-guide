export function gitBookScrapeCardGroup(node, _, parent) {
    if (node.tagName !== 'Card')
        return undefined;
    if (!parent)
        return undefined;
    let cardCount = 0;
    for (const child of parent.children) {
        if (child.type === 'element' && child.tagName === 'Card')
            cardCount++;
    }
    if (cardCount === parent.children.length) {
        parent.type = 'element';
        parent.tagName = 'CardGroup';
    }
    return undefined;
}
export function readmeScrapeCardGroup(node, _, parent) {
    if (node.tagName !== 'Card')
        return undefined;
    if (!parent)
        return undefined;
    let cardCount = 0;
    for (const child of parent.children) {
        if (child.type === 'element' && child.tagName === 'Card')
            cardCount++;
    }
    if (cardCount === parent.children.length) {
        parent.type = 'element';
        parent.tagName = 'CardGroup';
    }
    return undefined;
}
export function docusaurusScrapeCardGroup(node, _, parent) {
    if (node.tagName !== 'Card')
        return undefined;
    if (!parent)
        return undefined;
    let cardCount = 0;
    for (const child of parent.children) {
        if (child.type === 'element' && child.tagName === 'Card')
            cardCount++;
    }
    if (cardCount === parent.children.length && cardCount > 1) {
        parent.type = 'element';
        parent.tagName = 'CardGroup';
    }
    return undefined;
}
//# sourceMappingURL=CardGroup.js.map