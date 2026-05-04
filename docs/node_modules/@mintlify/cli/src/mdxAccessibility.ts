import { coreRemark } from '@mintlify/common';
import { categorizeFilePaths, getMintIgnore } from '@mintlify/prebuild';
import fs from 'fs';
import type { Root, Text } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import path from 'path';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

export interface AccessibilityFixAttribute {
  filePath: string;
  line?: number;
  column?: number;
  element: 'img' | 'video' | 'a';
  tagName: string;
}

export interface MdxAccessibilityResult {
  missingAltAttributes: AccessibilityFixAttribute[];
  totalFiles: number;
  filesWithIssues: number;
}

const checkAltAttributes = (filePath: string, content: string): AccessibilityFixAttribute[] => {
  const issues: AccessibilityFixAttribute[] = [];

  const visitElements = () => {
    return (tree: Root) => {
      visit(tree, (node) => {
        if (node.type === 'image') {
          if (!node.alt || node.alt.trim() === '') {
            issues.push({
              filePath,
              line: node.position?.start.line,
              column: node.position?.start.column,
              element: 'img',
              tagName: 'image (markdown)',
            });
          }
          return;
        }

        const mdxJsxElement = node as MdxJsxFlowElement;
        if (mdxJsxElement.name === 'img' || mdxJsxElement.name === 'video') {
          const altAttrIndex = mdxJsxElement.attributes.findIndex(
            (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'alt'
          );

          const altAttribute = mdxJsxElement.attributes[altAttrIndex];
          const hasValidAlt =
            altAttribute &&
            typeof altAttribute.value === 'string' &&
            altAttribute.value.trim() !== '';

          if (!hasValidAlt) {
            issues.push({
              filePath,
              line: node.position?.start.line,
              column: node.position?.start.column,
              element: mdxJsxElement.name,
              tagName: mdxJsxElement.name,
            });
          }
        } else if (mdxJsxElement.name === 'a') {
          const hasTextContent = (children: Node[]): boolean => {
            return children.some((child) => {
              if (child.type === 'text') {
                const textNode = child as Text;
                return textNode.value.trim() !== '';
              }
              if ('children' in child && Array.isArray(child.children)) {
                return hasTextContent(child.children as Node[]);
              }
              return false;
            });
          };

          if (!hasTextContent(mdxJsxElement.children as Node[])) {
            issues.push({
              filePath,
              line: node.position?.start.line,
              column: node.position?.start.column,
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
  } catch (error) {
    console.warn(`Warning: Could not parse ${filePath}: ${error}`);
  }

  return issues;
};

export const checkMdxAccessibility = async (
  baseDir: string = process.cwd()
): Promise<MdxAccessibilityResult> => {
  const mintIgnore = await getMintIgnore(baseDir);
  const { contentFilenames } = await categorizeFilePaths(baseDir, mintIgnore);
  const mdxFiles: string[] = [];
  for (const file of contentFilenames) {
    mdxFiles.push(path.join(baseDir, file));
  }
  const allIssues: AccessibilityFixAttribute[] = [];
  const filesWithIssues = new Set<string>();

  for (const filePath of mdxFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const issues = checkAltAttributes(filePath, content);

      if (issues.length > 0) {
        allIssues.push(...issues);
        filesWithIssues.add(filePath);
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error}`);
    }
  }

  return {
    missingAltAttributes: allIssues,
    totalFiles: mdxFiles.length,
    filesWithIssues: filesWithIssues.size,
  };
};
