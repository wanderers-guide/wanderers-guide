import type { Root as HastRoot, Element } from 'hast';
import { join } from 'node:path';
import { Browser } from 'puppeteer';
import { EXIT, visit } from 'unist-util-visit';

import { framework } from '../utils/detectFramework.js';
import { getErrorMessage } from '../utils/errors.js';
import { downloadImage } from '../utils/images.js';
import { log } from '../utils/log.js';
import { fetchPageHtml } from '../utils/network.js';
import { htmlToHast } from './root.js';

function findReadmeLogoNodes(root: HastRoot): Array<Element> | undefined {
  const elements: Array<Element> = [];
  visit(root, 'element', function (node) {
    if (
      node.tagName === 'img' &&
      Array.isArray(node.properties.className) &&
      node.properties.className.includes('rm-Logo-img')
    )
      elements.push(node);
  });
  return elements.length ? elements : undefined;
}

function findGitBookLogoNodes(root: HastRoot): Array<Element> | undefined {
  const elements: Array<Element> = [];
  visit(root, 'element', function (node) {
    if (node.tagName === 'img' && node.properties.alt === 'Logo') {
      elements.push(node);
    }
  });
  return elements.length ? elements : undefined;
}

function findDocusaurusLogoNodes(root: HastRoot): Array<Element> | undefined {
  const elements: Array<Element> = [];
  visit(root, 'element', function (node) {
    if (
      Array.isArray(node.properties.className) &&
      node.properties.className.includes('navbar__brand')
    ) {
      visit(node, 'element', function (subNode) {
        if (subNode.tagName === 'img') elements.push(subNode);
      });
      return EXIT;
    }
  });
  return elements.length ? elements : undefined;
}

async function findLogosFromHtml(
  html: string,
  downloadFn: (root: HastRoot) => Array<Element> | undefined,
  filepaths: Array<string>,
  url: URL
): Promise<void> {
  const hast = htmlToHast(html);
  const imgNodes = downloadFn(hast);
  if (!imgNodes) return;
  const imagePaths = await Promise.all(
    imgNodes.map(async (node) => {
      const src = node.properties.src as string;
      const imageUrl = new URL(src, url.origin).toString();
      const res = await downloadImage(imageUrl, join(process.cwd(), 'images'));
      if (res.success && res.data) {
        return res.data[1];
      } else {
        return '';
      }
    })
  );

  filepaths.push(...imagePaths.filter(Boolean));
  filepaths.forEach((filepath, index) => {
    if (!filepath) filepaths.splice(index, 1);
  });
}

export async function downloadLogos(
  url: string | URL,
  browser: Browser | undefined
): Promise<string | { light: string; dark: string } | undefined> {
  url = new URL(url);
  const filepaths: Array<string> = [];

  if (browser) {
    const htmls: Array<string> = [];

    try {
      const page = await browser.newPage();
      await page.goto(url.toString(), {
        waitUntil: 'networkidle2',
      });

      htmls.push(await page.content());
      await page.click('.rm-ThemeToggle');
      htmls.push(await page.content());
    } catch {}

    await Promise.all(
      htmls.map(async (html) => {
        return await findLogosFromHtml(html, findReadmeLogoNodes, filepaths, url);
      })
    );
  } else {
    try {
      const html = await fetchPageHtml(url);
      await findLogosFromHtml(
        html,
        framework.vendor === 'gitbook' ? findGitBookLogoNodes : findDocusaurusLogoNodes,
        filepaths,
        url
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      log(`Failed to retrieve logo from HTML: ${errorMessage}`);
    }
  }

  const uniqueFilepaths = [...new Set(filepaths).values()];

  return uniqueFilepaths.length === 1
    ? uniqueFilepaths[0]
    : uniqueFilepaths.length > 1
      ? {
          light: uniqueFilepaths[0] as string,
          dark: uniqueFilepaths[1] as string,
        }
      : undefined;
}
