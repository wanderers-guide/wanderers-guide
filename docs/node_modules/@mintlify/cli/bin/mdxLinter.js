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
import { addLog, ErrorLog, SuccessLog } from '@mintlify/previewing';
import { Text } from 'ink';
import path from 'path';
import { checkMdxAccessibility } from './mdxAccessibility.js';
export const mdxLinter = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        addLog(_jsx(Text, { bold: true, color: "cyan", children: "Checking mdx files for accessibility issues..." }));
        const results = yield checkMdxAccessibility();
        if (results.missingAltAttributes.length === 0) {
            addLog(_jsx(SuccessLog, { message: "no accessibility issues found" }));
            addLog(_jsxs(Text, { children: ["Checked ", results.totalFiles, " MDX files - all images and videos have alt attributes."] }));
            return 0;
        }
        const issuesByFile = {};
        results.missingAltAttributes.forEach((issue) => {
            var _a;
            if (!issuesByFile[issue.filePath]) {
                issuesByFile[issue.filePath] = [];
            }
            (_a = issuesByFile[issue.filePath]) === null || _a === void 0 ? void 0 : _a.push(issue);
        });
        addLog(_jsxs(Text, { bold: true, color: "red", children: ["Found ", results.missingAltAttributes.length, " accessibility issues in", ' ', results.filesWithIssues, " files:"] }));
        addLog(_jsx(Text, {}));
        for (const [filePath, issues] of Object.entries(issuesByFile)) {
            const relativePath = path.relative(process.cwd(), filePath);
            addLog(_jsxs(Text, { bold: true, children: [relativePath, ":"] }));
            for (const issue of issues) {
                const location = issue.line && issue.column ? ` (line ${issue.line}, col ${issue.column})` : '';
                if (issue.element === 'a') {
                    addLog(_jsxs(Text, { children: [_jsx(Text, { color: "red", children: " \u2717" }), " Missing text attribute ", _jsx(Text, { bold: true, children: issue.tagName }), ' ', "element", location] }));
                }
                else {
                    addLog(_jsxs(Text, { children: [_jsx(Text, { color: "red", children: " \u2717" }), " Missing alt attribute on ", _jsx(Text, { bold: true, children: issue.tagName }), ' ', "element", location] }));
                }
            }
            addLog(_jsx(Text, {}));
        }
        addLog(_jsxs(Text, { color: "yellow", children: [_jsx(Text, { bold: true, children: "Recommendation:" }), " Add alt attributes to all images and videos for better accessibility."] }));
        return 1;
    }
    catch (error) {
        addLog(_jsx(ErrorLog, { message: `MDX accessibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}` }));
        return 1;
    }
});
