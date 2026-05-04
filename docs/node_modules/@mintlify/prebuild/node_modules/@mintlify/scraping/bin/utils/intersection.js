export function intersection(set1, set2) {
    if (Array.isArray(set1))
        set1 = new Set(set1);
    if (Array.isArray(set2))
        set2 = new Set(set2);
    const intersectedSet = new Set();
    for (const el of set1) {
        if (set2.has(el))
            intersectedSet.add(el);
    }
    return intersectedSet;
}
//# sourceMappingURL=intersection.js.map