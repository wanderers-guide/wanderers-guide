**A robust Next.js newsletter `Next.js Weekly` is sponsoring me** 💖
[![NextjsWeekly banner](./assets/next-js-weekly.png)](https://nextjsweekly.com/)

### [Become a sponsor](https://github.com/sponsors/ipikuka) 🚀

If you find **`remark-mdx-remove-esm`** useful in your projects, consider supporting my work.  
Your sponsorship means a lot 💖

My sponsors are going to be featured here and on [my sponsor wall](https://github.com/sponsors/ipikuka).

A warm thanks 🙌 to [@ErfanEbrahimnia](https://github.com/ErfanEbrahimnia), [@recepkyk](https://github.com/recepkyk), and [@LSeaburg](https://github.com/LSeaburg) for the support!

Thank you for supporting open source! 🙌

# remark-mdx-remove-esm

[![npm version][badge-npm-version]][url-npm-package]
[![npm downloads][badge-npm-download]][url-npm-package]
[![publish to npm][badge-publish-to-npm]][url-publish-github-actions]
[![code-coverage][badge-codecov]][url-codecov]
[![type-coverage][badge-type-coverage]][url-github-package]
[![typescript][badge-typescript]][url-typescript]
[![license][badge-license]][url-license]

This package is a [**unified**][unified] ([**remark**][remark]) plugin **to remove import and/or export statements (`mdxjsEsm`) in MDX documents.**

[**unified**][unified] is a project that transforms content with abstract syntax trees (ASTs) using the new parser [**micromark**][micromark]. [**remark**][remark] adds support for markdown to unified. [**mdast**][mdast] is the Markdown Abstract Syntax Tree (AST) which is a specification for representing markdown in a syntax tree.

**This plugin is a remark plugin that removes `mdxjsEsm` type AST nodes in MDX which is parsed via [remark-mdx][remarkmdx].**

## When should I use this?

**`remark-mdx-remove-esm`** is useful if you want to remove `import` and / or `export` statements from a MDX document.

## Installation

This package is suitable for ESM only. In Node.js (version 16+), install with npm:

```bash
npm install remark-mdx-remove-esm
```

or

```bash
yarn add remark-mdx-remove-esm
```

## Usage

Say we have the following MDX file, `example.mdx`, which consists some import and export statements.

```mdx
import x from "y";

Hi

export const b = 1;
```

And our module, `example.js`, looks as follows:

```javascript
import { read } from "to-vfile";
import remark from "remark";
import remarkMdx from "remark-mdx";
import gfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkMdxRemoveEsm from "remark-mdx-remove-esm";

main();

async function main() {
  const file = await remark()
    .use(remarkMdx)
    .use(gfm)
    .use(remarkMdxRemoveEsm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(await read("example.mdx"));

  console.log(String(file));
}
```

Now, running `node example.js` you see that the imports and exports have been removed:

```html
<p>Hi</p>
```

Without **`remark-mdx-remove-esm`**, running of the compiled source would cause the import and export statements work.

## Options

The option can be either `"import"` or `"export"` or array of `("import" | "export")`. 

By default it is `undefined`.

```typescript
type MdxEsmSpecifier = "import" | "export";

type MdxRemoveEsmOptions = MdxEsmSpecifier | (MdxEsmSpecifier | string | boolean | null | undefined | 0)[];

// removes both export and import statements
use(remarkMdxRemoveEsm);

// removes both export and import statements
use(remarkMdxRemoveEsm, undefined);

// removes ONLY import statements
use(remarkMdxRemoveEsm, "import"); 

// removes ONLY export statements
use(remarkMdxRemoveEsm, "export"); 

// removes ONLY import statements
use(remarkMdxRemoveEsm, ["import"]); 

// removes ONLY export statements
use(remarkMdxRemoveEsm, ["export"]); 

// removes both export and import statements
use(remarkMdxRemoveEsm, ["export", "import"]); 

// DOESN'T remove any statement
use(remarkMdxRemoveEsm, []);
```

**`remark-mdx-remove-esm`** accepts conditionally filtered arrays, automatically ignoring any falsy values (like `false`, `null`, or `undefined`) resulting from feature flags. For example:

```javascript
// dynamic configuration based on environment or flags
const disableExports = process.env.STRIP_EXPORTS === 'true';
const disableExports = false;

// handles "dirty" arrays, no need to filter out false/undefined manually!
const mdxRemoveEsmOptions = [ disableExports && "export", disableImports && "import"];

// result: ["export", false] -> this is treated as ["export"]
use(remarkMdxRemoveEsm, mdxRemoveEsmOptions);
```

## Syntax tree

This plugin modifies the `mdast` (markdown abstract syntax tree).

## Types

This package is fully typed with [TypeScript][url-typescript]. The plugin exports the types `MdxRemoveEsmOptions`, `MdxEsmSpecifier`.

## Compatibility

This plugin works with unified version 6+ and remark version 7+. It is compatible with MDX version 3.

## Security

Use of **`remark-mdx-remove-esm`** does not involve rehype (hast) or user content so there are no openings for cross-site scripting (XSS) attacks.

## My Plugins

I like to contribute the Unified / Remark / MDX ecosystem, so I recommend you to have a look my plugins.

### My Remark Plugins

- [`remark-flexible-code-titles`](https://www.npmjs.com/package/remark-flexible-code-titles)
  – Remark plugin to add titles or/and containers for the code blocks with customizable properties
- [`remark-flexible-containers`](https://www.npmjs.com/package/remark-flexible-containers)
  – Remark plugin to add custom containers with customizable properties in markdown
- [`remark-ins`](https://www.npmjs.com/package/remark-ins)
  – Remark plugin to add `ins` element in markdown
- [`remark-flexible-paragraphs`](https://www.npmjs.com/package/remark-flexible-paragraphs)
  – Remark plugin to add custom paragraphs with customizable properties in markdown
- [`remark-flexible-markers`](https://www.npmjs.com/package/remark-flexible-markers)
  – Remark plugin to add custom `mark` element with customizable properties in markdown
- [`remark-flexible-toc`](https://www.npmjs.com/package/remark-flexible-toc)
  – Remark plugin to expose the table of contents via `vfile.data` or via an option reference
- [`remark-mdx-remove-esm`](https://www.npmjs.com/package/remark-mdx-remove-esm)
  – Remark plugin to remove import and/or export statements (mdxjsEsm)
- [`remark-mdx-remove-expressions`](https://www.npmjs.com/package/remark-mdx-remove-expressions)
  – Remark plugin to remove MDX expressions within curlybraces {} in MDX content

### My Rehype Plugins

- [`rehype-pre-language`](https://www.npmjs.com/package/rehype-pre-language)
  – Rehype plugin to add language information as a property to `pre` element
- [`rehype-highlight-code-lines`](https://www.npmjs.com/package/rehype-highlight-code-lines)
  – Rehype plugin to add line numbers to code blocks and allow highlighting of desired code lines
- [`rehype-code-meta`](https://www.npmjs.com/package/rehype-code-meta)
  – Rehype plugin to copy `code.data.meta` to `code.properties.metastring`
- [`rehype-image-toolkit`](https://www.npmjs.com/package/rehype-image-toolkit)
  – Rehype plugin to enhance Markdown image syntax `![]()` and Markdown/MDX media elements (`<img>`, `<audio>`, `<video>`) by auto-linking bracketed or parenthesized image URLs, wrapping them in `<figure>` with optional captions, unwrapping images/videos/audio from paragraph, parsing directives in title for styling and adding attributes, and dynamically converting images into `<video>` or `<audio>` elements based on file extension.

### My Recma Plugins

- [`recma-mdx-escape-missing-components`](https://www.npmjs.com/package/recma-mdx-escape-missing-components)
  – Recma plugin to set the default value `() => null` for the Components in MDX in case of missing or not provided so as not to throw an error
- [`recma-mdx-change-props`](https://www.npmjs.com/package/recma-mdx-change-props)
  – Recma plugin to change the `props` parameter into the `_props` in the `function _createMdxContent(props) {/* */}` in the compiled source in order to be able to use `{props.foo}` like expressions. It is useful for the `next-mdx-remote` or `next-mdx-remote-client` users in `nextjs` applications.
- [`recma-mdx-change-imports`](https://www.npmjs.com/package/recma-mdx-change-imports)
  – Recma plugin to convert import declarations for assets and media with relative links into variable declarations with string URLs, enabling direct asset URL resolution in compiled MDX.
- [`recma-mdx-import-media`](https://www.npmjs.com/package/recma-mdx-import-media)
  – Recma plugin to turn media relative paths into import declarations for both markdown and html syntax in MDX.
- [`recma-mdx-import-react`](https://www.npmjs.com/package/recma-mdx-import-react)
  – Recma plugin to ensure getting `React` instance from the arguments and to make the runtime props `{React, jsx, jsxs, jsxDev, Fragment}` is available in the dynamically imported components in the compiled source of MDX.
- [`recma-mdx-html-override`](https://www.npmjs.com/package/recma-mdx-html-override)
  – Recma plugin to allow selected raw HTML elements to be overridden via MDX components.
- [`recma-mdx-interpolate`](https://www.npmjs.com/package/recma-mdx-interpolate)
  – Recma plugin to enable interpolation of identifiers wrapped in curly braces within the `alt`, `src`, `href`, and `title` attributes of markdown link and image syntax in MDX.

### My Unist Utils and Plugins

I also build low-level utilities and plugins for the Unist ecosystem that can be used across Remark, Rehype, Recma, and other syntax trees.

- [`unist-util-find-between-all`](https://www.npmjs.com/package/unist-util-find-between-all)
  – Unist utility to find the nodes between two nodes.
- [`unist-plugin-log-tree`](https://www.npmjs.com/package/unist-plugin-log-tree)
  – Debugging plugin for the unified ecosystem that logs abstract syntax trees (ASTs) without transforming.

## License

[MIT License](./LICENSE) © ipikuka

[unified]: https://github.com/unifiedjs/unified
[micromark]: https://github.com/micromark/micromark
[remark]: https://github.com/remarkjs/remark
[remarkplugins]: https://github.com/remarkjs/remark/blob/main/doc/plugins.md
[mdast]: https://github.com/syntax-tree/mdast
[remarkmdx]: https://mdxjs.com/packages/remark-mdx/

[badge-npm-version]: https://img.shields.io/npm/v/remark-mdx-remove-esm
[badge-npm-download]:https://img.shields.io/npm/dt/remark-mdx-remove-esm
[url-npm-package]: https://www.npmjs.com/package/remark-mdx-remove-esm
[url-github-package]: https://github.com/ipikuka/remark-mdx-remove-esm

[badge-license]: https://img.shields.io/github/license/ipikuka/remark-mdx-remove-esm
[url-license]: https://github.com/ipikuka/remark-mdx-remove-esm/blob/main/LICENSE

[badge-publish-to-npm]: https://github.com/ipikuka/remark-mdx-remove-esm/actions/workflows/publish.yml/badge.svg
[url-publish-github-actions]: https://github.com/ipikuka/remark-mdx-remove-esm/actions/workflows/publish.yml

[badge-typescript]: https://img.shields.io/npm/types/remark-mdx-remove-esm
[url-typescript]: https://www.typescriptlang.org/

[badge-codecov]: https://codecov.io/gh/ipikuka/remark-mdx-remove-esm/graph/badge.svg?token=U6CFVM0DRE
[url-codecov]: https://codecov.io/gh/ipikuka/remark-mdx-remove-esm

[badge-type-coverage]: https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fipikuka%2Fremark-mdx-remove-esm%2Fmaster%2Fpackage.json
