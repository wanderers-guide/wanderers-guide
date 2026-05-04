export function dedupedAppend(item, arr, prepend) {
    if (arr.includes(item))
        return arr;
    if (prepend) {
        arr.unshift(item);
    }
    else {
        arr.push(item);
    }
    return arr;
}
//# sourceMappingURL=append.js.map