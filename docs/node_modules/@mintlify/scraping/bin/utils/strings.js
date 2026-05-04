export function removeTrailingSlash(str) {
    return str.endsWith('/') ? str.substring(0, str.length - 1) : str;
}
export function removeLeadingSlash(str) {
    return str.startsWith('/') ? str.substring(1) : str;
}
//# sourceMappingURL=strings.js.map