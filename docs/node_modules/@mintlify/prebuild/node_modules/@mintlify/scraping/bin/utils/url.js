export function checkUrl({ url }) {
    try {
        new URL(url);
    }
    catch {
        throw Error(`Invalid link: ${url}\nMake sure the link starts with http:// or https://`);
    }
    return true;
}
//# sourceMappingURL=url.js.map