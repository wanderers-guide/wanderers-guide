export function num(n) {
    return n.toLocaleString('en-US');
}
export function pct(n, total) {
    if (total === 0)
        return '\u2014';
    return ((n / total) * 100).toFixed(1) + '%';
}
export function truncate(s, max) {
    if (s.length <= max)
        return s;
    return s.slice(0, max - 1) + '\u2026';
}
