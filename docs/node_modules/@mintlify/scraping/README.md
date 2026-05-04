# @mintlify/scraping

Scrape documentation frameworks to Mintlify docs.

## Commands

- `mintlify-scrape section [url]` - scrapes multiple pages in a site
- `mintlify-scrape page [url]` - scrapes a single page in a site

## Frameworks

We currently support:

- ReadMe
- Docusarus
- Gitbook (coming soon!)

The commands will automatically detect the framework.

## 🚀 Installation

One time use:

```
npx @mintlify/scraping@latest section [url]
```

```
npx @mintlify/scraping@latest page [url]
```

Global installation:

```
npm install @mintlify/scraping@latest -g
```

Global usage:

```
mintlify-scrape section [url]
```

```
mintlify-scrape page [url]
```

Provide the relative path or URL to the OpenAPI file to generate frontmatter files for each endpoint.

```
mintlify-scrape openapi-file [openApiFilename]

-w, --writeFiles  Whether or not to write the frontmatter files [boolean] [default: true]
-o, --outDir      The folder in which to write any created frontmatter files [string]
```

## Community

Join our Discord community if you have questions or just want to chat:

[![](https://dcbadge.vercel.app/api/server/ACREKdwjG5)](https://discord.gg/ACREKdwjG5)

_Built with 💚 by the Mintlify community._
