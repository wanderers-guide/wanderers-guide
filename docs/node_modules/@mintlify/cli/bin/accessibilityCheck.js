var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getBackgroundColors } from '@mintlify/common';
import { getConfigObj, getConfigPath } from '@mintlify/prebuild';
import { addLog, ErrorLog, WarningLog } from '@mintlify/previewing';
import { Text } from 'ink';
import { checkDocsColors } from './accessibility.js';
import { CMD_EXEC_PATH, checkForDocsJson } from './helpers.js';
export const accessibilityCheck = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield checkForDocsJson();
        const docsConfigPath = yield getConfigPath(CMD_EXEC_PATH, 'docs');
        const mintConfigPath = yield getConfigPath(CMD_EXEC_PATH, 'mint');
        if (!docsConfigPath && !mintConfigPath) {
            addLog(_jsx(ErrorLog, { message: "No configuration file found. Please run this command from a directory with a mint.json or docs.json file." }));
            return 1;
        }
        const configType = docsConfigPath ? 'docs' : 'mint';
        const config = (yield getConfigObj(CMD_EXEC_PATH, configType));
        if (!(config === null || config === void 0 ? void 0 : config.colors)) {
            addLog(_jsx(WarningLog, { message: "No colors section found in configuration file" }));
            return 0;
        }
        const { colors, navigation } = config;
        const { lightHex, darkHex } = getBackgroundColors(config);
        const results = checkDocsColors(colors, { lightHex, darkHex }, navigation);
        const displayContrastResult = (result, label, prefix = '') => {
            if (!result)
                return;
            const { recommendation, message } = result;
            const icon = recommendation === 'pass' ? 'PASS' : recommendation === 'warning' ? 'WARN' : 'FAIL';
            const color = recommendation === 'pass' ? 'green' : recommendation === 'warning' ? 'yellow' : 'red';
            addLog(_jsxs(Text, { children: [_jsxs(Text, { bold: prefix === '', children: [prefix, label, ":", ' '] }), _jsxs(Text, { color: color, children: [icon, " ", message] })] }));
        };
        addLog(_jsx(Text, { bold: true, color: "cyan", children: "Checking color accessibility..." }));
        addLog(_jsx(Text, {}));
        displayContrastResult(results.primaryContrast, `Primary Color (${colors.primary}) vs Light Background`);
        displayContrastResult(results.lightContrast, `Light Color (${colors.light}) vs Dark Background`);
        displayContrastResult(results.darkContrast, `Dark Color (${colors.dark}) vs Dark Background`);
        displayContrastResult(results.darkOnLightContrast, `Dark Color (${colors.dark}) vs Light Background`);
        const anchorsWithResults = results.anchorResults.filter((anchor) => anchor.lightContrast || anchor.darkContrast);
        if (anchorsWithResults.length > 0) {
            addLog(_jsx(Text, {}));
            addLog(_jsx(Text, { bold: true, color: "cyan", children: "Navigation Anchors:" }));
            for (const anchor of anchorsWithResults) {
                addLog(_jsxs(Text, { bold: true, children: [" ", anchor.name, ":"] }));
                displayContrastResult(anchor.lightContrast, 'Light variant vs Light Background', '    ');
                displayContrastResult(anchor.darkContrast, 'Dark variant vs Dark Background', '    ');
            }
        }
        addLog(_jsx(Text, {}));
        const overallIcon = results.overallScore === 'pass'
            ? 'PASS'
            : results.overallScore === 'warning'
                ? 'WARN'
                : 'FAIL';
        const overallColor = results.overallScore === 'pass'
            ? 'green'
            : results.overallScore === 'warning'
                ? 'yellow'
                : 'red';
        const overallMessage = results.overallScore === 'pass'
            ? 'All colors meet accessibility standards!'
            : results.overallScore === 'warning'
                ? 'Some colors could be improved for better accessibility'
                : 'Some colors fail accessibility standards and should be updated';
        addLog(_jsx(Text, { children: _jsxs(Text, { bold: true, color: overallColor, children: ["Overall Assessment: ", overallIcon, " ", overallMessage] }) }));
        return results.overallScore === 'fail' ? 1 : 0;
    }
    catch (error) {
        addLog(_jsx(ErrorLog, { message: `Accessibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}` }));
        return 1;
    }
});
