import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type { Plugin } from 'vite';

/** Tag actual UI targets for screenshot coverage, exclusively in the local visual preview. */
export function visualReviewPlugin(): Plugin {
  return {
    name: 'wg-visual-review',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use('/__visual-fixtures.json', async (_request, response) => {
        const file = process.env.WG_VISUAL_FIXTURE_FILE;
        if (!file || path.basename(file) !== 'visual-data.json') {
          response.statusCode = 404;
          response.end();
          return;
        }
        try {
          const body = await readFile(file, 'utf8');
          const fixture: unknown = JSON.parse(body);
          if (!fixture || typeof fixture !== 'object' || 'accounts' in fixture)
            throw new Error('Invalid visual fixture');
          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(body);
        } catch {
          response.statusCode = 500;
          response.end();
        }
      });
    },
    transform(code, id) {
      const file = id.split('?')[0];
      if (!file.includes('/src/') || !file.endsWith('.tsx')) return null;
      const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const edits: Array<{ offset: number; text: string }> = [];
      const name = path.basename(file, '.tsx');
      const tag = (element: ts.JsxOpeningElement | ts.JsxSelfClosingElement, kind: string, line: number): void => {
        edits.push({
          offset: element.attributes.pos,
          text: ` data-ui-review-id=${JSON.stringify(`${name}:${kind}:${line}`)} data-ui-review-kind=${JSON.stringify(kind)} `,
        });
      };
      const visit = (node: ts.Node): void => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          if (!node.tagName.getText(source).endsWith('.Target'))
            edits.push({
              offset: node.attributes.pos,
              text: ` data-ui-review-source=${JSON.stringify(file.split('/src/')[1])} `,
            });
        }
        if (ts.isJsxElement(node)) {
          const component = node.openingElement.tagName.getText(source);
          const line = source.getLineAndCharacterOfPosition(node.openingElement.getStart(source)).line + 1;
          if (['Menu', 'Popover', 'HoverCard'].includes(component)) {
            for (const child of node.children) {
              if (!ts.isJsxElement(child) || child.openingElement.tagName.getText(source) !== component + '.Target')
                continue;
              const target = child.children.find(
                (item): item is ts.JsxElement | ts.JsxSelfClosingElement =>
                  ts.isJsxElement(item) || ts.isJsxSelfClosingElement(item)
              );
              if (target) tag(ts.isJsxElement(target) ? target.openingElement : target, component, line);
            }
          } else if (component === 'Tooltip') {
            const target = node.children.find(
              (item): item is ts.JsxElement | ts.JsxSelfClosingElement =>
                ts.isJsxElement(item) || ts.isJsxSelfClosingElement(item)
            );
            if (target) tag(ts.isJsxElement(target) ? target.openingElement : target, component, line);
          } else if (['Modal', 'Drawer', 'Tabs.Tab', 'Accordion.Item'].includes(component))
            tag(node.openingElement, component, line);
        } else if (ts.isJsxSelfClosingElement(node)) {
          const component = node.tagName.getText(source);
          if (['Modal', 'Drawer', 'Tabs.Tab', 'Accordion.Item'].includes(component))
            tag(node, component, source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      if (!edits.length) return null;
      let transformed = code;
      for (const edit of edits.sort((a, b) => b.offset - a.offset))
        transformed = transformed.slice(0, edit.offset) + edit.text + transformed.slice(edit.offset);
      return { code: transformed, map: null };
    },
  };
}
