import chalk from 'chalk';
import { isAI } from '../helpers.js';
export function resolveFormat(argv) {
    if (argv.format === 'table' ||
        argv.format === 'plain' ||
        argv.format === 'json' ||
        argv.format === 'graph')
        return argv.format;
    if (isAI())
        return 'json';
    return 'plain';
}
export function formatPlainTable(headers, rows) {
    if (rows.length === 0)
        return '';
    const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => { var _a; return ((_a = r[i]) !== null && _a !== void 0 ? _a : '').length; })));
    const headerLine = headers.map((h, i) => h.toUpperCase().padEnd(colWidths[i])).join('\t');
    const bodyLines = rows.map((row) => row.map((cell, i) => cell.padEnd(colWidths[i])).join('\t'));
    return [headerLine, ...bodyLines].join('\n');
}
export function formatPrettyTable(headers, rows) {
    if (rows.length === 0)
        return chalk.dim('  No data found.');
    const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => { var _a; return ((_a = r[i]) !== null && _a !== void 0 ? _a : '').length; })));
    const headerLine = headers.map((h, i) => chalk.bold(h.padEnd(colWidths[i]))).join('  ');
    const separator = chalk.dim(colWidths.map((w) => '\u2500'.repeat(w)).join('\u2500\u2500'));
    const bodyLines = rows.map((row) => row.map((cell, i) => cell.padEnd(colWidths[i])).join('  '));
    return [headerLine, separator, ...bodyLines].join('\n');
}
function gradientBar(len, rgb) {
    let result = '';
    for (let i = 0; i < len; i++) {
        const t = len === 1 ? 1 : i / (len - 1);
        const dim = 0.3 + t * 0.7;
        const r = Math.round(rgb[0] * dim);
        const g = Math.round(rgb[1] * dim);
        const b = Math.round(rgb[2] * dim);
        result += chalk.rgb(r, g, b)('\u2588');
    }
    return result;
}
const COLOR_MAP = {
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    yellow: [255, 255, 0],
    green: [0, 255, 100],
    blue: [80, 140, 255],
    red: [255, 80, 80],
};
export function formatBarChart(items, opts = {}) {
    var _a;
    if (items.length === 0)
        return chalk.dim('  No data found.');
    const maxWidth = (_a = opts.maxWidth) !== null && _a !== void 0 ? _a : 40;
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    const maxLabel = Math.max(...items.map((i) => i.label.length));
    const maxValStr = Math.max(...items.map((i) => i.value.toLocaleString('en-US').length));
    return items
        .map((item) => {
        var _a, _b;
        const barLen = Math.round((item.value / maxVal) * maxWidth);
        const rgb = (_b = COLOR_MAP[(_a = item.color) !== null && _a !== void 0 ? _a : 'cyan']) !== null && _b !== void 0 ? _b : COLOR_MAP.cyan;
        const bar = barLen > 0 ? gradientBar(barLen, rgb) : '';
        const pad = ' '.repeat(maxWidth - barLen);
        return `  ${item.label.padEnd(maxLabel)}  ${bar}${pad} ${item.value.toLocaleString('en-US').padStart(maxValStr)}`;
    })
        .join('\n');
}
export function formatOutput(format, headers, rows, jsonData) {
    if (format === 'json')
        return JSON.stringify(jsonData, null, 2);
    if (format === 'plain')
        return formatPlainTable(headers, rows);
    return formatPrettyTable(headers, rows);
}
