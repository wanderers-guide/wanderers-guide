import { CONTINUE, visit } from 'unist-util-visit';
import { framework } from '../utils/detectFramework.js';
function toHex(value) {
    Math.round(value).toString(16).padStart(2, '0');
}
function checkValidHex(str) {
    if (!str)
        return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(str);
}
function checkRgbBounds(...numbers) {
    for (const num of numbers) {
        if (num < 0 || num > 255)
            return false;
    }
    return true;
}
function rgbToHex(color) {
    if (checkValidHex(color))
        return color;
    color = color.trim().toLowerCase();
    let r, g, b;
    if (/^\d+\s+\d+\s+\d+(\s+[0-9.]+)?$/.test(color)) {
        [r, g, b] = color.split(/\s+/).map(Number);
    }
    else {
        const values = color.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/);
        if (!values) {
            return undefined;
        }
        [, r, g, b] = values.map(Number);
    }
    if (!r || !g || !b)
        return undefined;
    if (!checkRgbBounds(r, g, b))
        return undefined;
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
function getCssValue(cssString, key) {
    const regex = new RegExp(`${key}\\s*[:|,]\\s*([^;)]+)`, 'i');
    const match = cssString.match(regex);
    return match && match[1] ? match[1].trim() : undefined;
}
export const defaultColors = {
    primary: '#0D9373',
    light: '#55D799',
    dark: '#0D9373',
};
export async function downloadColors(hast) {
    if (framework.vendor === 'docusaurus')
        return defaultColors;
    let primaryHexCode = undefined;
    let lightHexCode = undefined;
    visit(hast, 'element', function (node) {
        if (node.tagName !== 'style')
            return CONTINUE;
        if ((framework.vendor === 'gitbook' && !!Object.keys(node.properties).length) ||
            (framework.vendor === 'readme' && node.properties.title !== 'rm-custom-css'))
            return CONTINUE;
        if (node.children.length !== 1 || !node.children[0] || node.children[0].type !== 'text')
            return CONTINUE;
        const cssStr = node.children[0].value;
        const primaryColorKey = framework.vendor === 'readme' ? '--color-link-primary' : '--primary-color-600';
        const lightColorKey = framework.vendor === 'readme' ? '--color-link-primary' : '--primary-color-400';
        const primaryCssColorValue = getCssValue(cssStr, primaryColorKey);
        const lightCssColorValue = getCssValue(cssStr, lightColorKey);
        if (!primaryCssColorValue || !lightCssColorValue)
            return CONTINUE;
        primaryHexCode = rgbToHex(primaryCssColorValue);
        lightHexCode = rgbToHex(lightCssColorValue);
    });
    const isPrimaryValid = checkValidHex(primaryHexCode);
    const isLightValid = checkValidHex(lightHexCode);
    if (isPrimaryValid && isLightValid) {
        return {
            primary: primaryHexCode,
            light: lightHexCode,
            dark: primaryHexCode,
        };
    }
    else if (isPrimaryValid) {
        return {
            primary: primaryHexCode,
            dark: primaryHexCode,
        };
    }
    else {
        return defaultColors;
    }
}
//# sourceMappingURL=color.js.map