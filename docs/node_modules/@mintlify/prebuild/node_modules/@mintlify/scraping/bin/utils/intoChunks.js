export function* intoChunks(values, chunkSize = 16) {
    for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        yield chunk;
    }
}
//# sourceMappingURL=intoChunks.js.map