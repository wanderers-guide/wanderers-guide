export function iterateOverNavItems(navItems, origin) {
    return navItems.flatMap((navItem) => recurseOverGroup(navItem, origin));
}
function recurseOverGroup(group, origin) {
    if (typeof group === 'string') {
        return [new URL(group, origin)];
    }
    return group.pages.flatMap((pageOrGroup) => {
        if (typeof pageOrGroup === 'string') {
            return new URL(pageOrGroup, origin);
        }
        return recurseOverGroup(pageOrGroup, origin);
    });
}
//# sourceMappingURL=iterate.js.map