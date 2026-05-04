# Mintlify Scraping CLI

## Installation

```sh
npm i -g @mintlify/scraping
```

### Uninstall

To uninstall, run `npm uninstall -g @mintlify/scraping`.

## Usage

There are three main commands:

```sh
mintlify-scrape page [url] # for scraping a single page in your docs
mintlify-scrape section [url] # for scraping your entire docs site
mintlify-scrape openapi-file [url] # for scraping an OpenAPI spec into the required MDX format for Mintlify to display
```

## Detecting Frameworks

The CLI will automatically detect the framework of the passed in URL and scrape each page accordingly.

We currently support:

- Docusaurus
- GitBook
- ReadMe

## Output

You will get an output of all the pages that we scraped into MDX for you, as well as the `docs.json` config file that allows you to use the Mintlify platform.

We recommend running the CLI in a new directory, because it will add every page from the docs you scrape into the folder you're currently running in:

```sh
mkdir <new-docs-folder>
cd <new-docs-folder>
mintlify-scrape section <url>
```

# Image File Locations

Images go in an `images/` folder and map 1:1 with the docs they were scraped from. For example, if there's a page under the URL path `/integrations/payments/stripe`, any images on that page will be scraped to `/images/integrations/payments/stripe/image.png`.
