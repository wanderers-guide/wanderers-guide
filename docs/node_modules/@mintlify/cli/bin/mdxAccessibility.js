var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { coreRemark } from '@mintlify/common';
import { categorizeFilePaths, getMintIgnore } from '@mintlify/prebuild';
import fs from 'fs';
import path from 'path';
import { visit } from 'unist-util-visit';
const checkAltAttributes = (filePath, content) => {
    const issues = [];
    const visitElements = () => {
        return (tree) => {
            visit(tree, (node) => {
                var _a, _b, _c, _d, _e, _f;
                if (node.type === 'image') {
                    if (!node.alt || node.alt.trim() === '') {
                        issues.push({
                            filePath,
                            line: (_a = node.position) === null || _a === void 0 ? void 0 : _a.start.line,
                            column: (_b = node.position) === null || _b === void 0 ? void 0 : _b.start.column,
                            element: 'img',
                            tagName: 'image (markdown)',
                        });
                    }
                    return;
                }
                const mdxJsxElement = node;
                if (mdxJsxElement.name === 'img' || mdxJsxElement.name === 'video') {
                    const altAttrIndex = mdxJsxElement.attributes.findIndex((attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'alt');
                    const altAttribute = mdxJsxElement.attributes[altAttrIndex];
                    const hasValidAlt = altAttribute &&
                        typeof altAttribute.value === 'string' &&
                        altAttribute.value.trim() !== '';
                    if (!hasValidAlt) {
                        issues.push({
                            filePath,
                            line: (_c = node.position) === null || _c === void 0 ? void 0 : _c.start.line,
                            column: (_d = node.position) === null || _d === void 0 ? void 0 : _d.start.column,
                            element: mdxJsxElement.name,
                            tagName: mdxJsxElement.name,
                        });
                    }
                }
                else if (mdxJsxElement.name === 'a') {
                    const hasTextContent = (children) => {
                        return children.some((child) => {
                            if (child.type === 'text') {
                                const textNode = child;
                                return textNode.value.trim() !== '';
                            }
                            if ('children' in child && Array.isArray(child.children)) {
                                return hasTextContent(child.children);
                            }
                            return false;
                        });
                    };
                    if (!hasTextContent(mdxJsxElement.children)) {
                        issues.push({
                            filePath,
                            line: (_e = node.position) === null || _e === void 0 ? void 0 : _e.start.line,
                            column: (_f = node.position) === null || _f === void 0 ? void 0 : _f.start.column,
                            element: 'a',
                            tagName: '<a>',
                        });
                    }
                }
            });
            return tree;
        };
    };
    try {
        coreRemark().use(visitElements).processSync(content);
    }
    catch (error) {
        console.warn(`Warning: Could not parse ${filePath}: ${error}`);
    }
    return issues;
};
export const checkMdxAccessibility = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (baseDir = process.cwd()) {
    const mintIgnore = yield getMintIgnore(baseDir);
    const { contentFilenames } = yield categorizeFilePaths(baseDir, mintIgnore);
    const mdxFiles = [];
    for (const file of contentFilenames) {
        mdxFiles.push(path.join(baseDir, file));
    }
    const allIssues = [];
    const filesWithIssues = new Set();
    for (const filePath of mdxFiles) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const issues = checkAltAttributes(filePath, content);
            if (issues.length > 0) {
                allIssues.push(...issues);
                filesWithIssues.add(filePath);
            }
        }
        catch (error) {
            console.warn(`Warning: Could not read file ${filePath}: ${error}`);
        }
    }
    return {
        missingAltAttributes: allIssues,
        totalFiles: mdxFiles.length,
        filesWithIssues: filesWithIssues.size,
    };
});
