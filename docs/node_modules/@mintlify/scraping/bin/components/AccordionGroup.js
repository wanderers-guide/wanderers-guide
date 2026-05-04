export function gitBookScrapeAccordionGroup(node, index, parent) {
    if (node.tagName !== 'Accordion')
        return undefined;
    if (!parent || typeof index !== 'number')
        return undefined;
    let accordionCount = 0;
    while (parent.children[index]) {
        const child = parent.children[index];
        if (!child || child.type !== 'element' || child.tagName !== 'Accordion')
            break;
        accordionCount++;
        index++;
    }
    index -= accordionCount;
    if (accordionCount > 1) {
        const children = parent.children.splice(index, accordionCount);
        const newNode = {
            type: 'element',
            tagName: 'AccordionGroup',
            properties: {},
            children: children,
        };
        parent.children.splice(index, 0, newNode);
    }
    return undefined;
}
export function readmeScrapeAccordionGroup(node, index, parent) {
    if (node.tagName !== 'Accordion')
        return undefined;
    if (!parent || typeof index !== 'number')
        return undefined;
    let accordionCount = 0;
    while (parent.children[index]) {
        const child = parent.children[index];
        if (!child || child.type !== 'element' || child.tagName !== 'Accordion')
            break;
        accordionCount++;
        index++;
    }
    index -= accordionCount;
    if (accordionCount > 1) {
        const children = parent.children.splice(index, accordionCount);
        const newNode = {
            type: 'element',
            tagName: 'AccordionGroup',
            properties: {},
            children: children,
        };
        parent.children.splice(index, 0, newNode);
    }
    return undefined;
}
export function docusaurusScrapeAccordionGroup(node, index, parent) {
    if (node.tagName !== 'Accordion')
        return undefined;
    if (!parent || typeof index !== 'number')
        return undefined;
    let accordionCount = 0;
    while (parent.children[index]) {
        const child = parent.children[index];
        if (!child || child.type !== 'element' || child.tagName !== 'Accordion')
            break;
        accordionCount++;
        index++;
    }
    index -= accordionCount;
    if (accordionCount > 1) {
        const children = parent.children.splice(index, accordionCount);
        const newNode = {
            type: 'element',
            tagName: 'AccordionGroup',
            properties: {},
            children: children,
        };
        parent.children.splice(index, 0, newNode);
    }
    return undefined;
}
//# sourceMappingURL=AccordionGroup.js.map