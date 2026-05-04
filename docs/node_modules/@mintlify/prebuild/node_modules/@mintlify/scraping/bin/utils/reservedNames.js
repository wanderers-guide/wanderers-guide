export const blacklistedNames = new Map([['api', 'api-reference']]);
export const INDEX_NAMES = [
    'home',
    'introduction',
    'getting-started',
    'get-started',
    'welcome',
    'start',
];
export const GROUP_NAMES = [
    'Home',
    'Introduction',
    'Getting Started',
    'Get Started',
    'Welcome',
    'Start',
    'Docs',
];
export function iterateThroughReservedNames(namesToUse, namesInUse) {
    for (const name of namesToUse) {
        if (namesInUse.includes(name))
            continue;
        return name;
    }
    return '';
}
//# sourceMappingURL=reservedNames.js.map