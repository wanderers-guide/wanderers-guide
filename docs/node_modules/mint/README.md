<div align="center">
  <a href="https://mintlify.com">
    <img
      src="https://mintlify-assets.b-cdn.net/logo.svg"
      alt="Mintlify Logo"
      height="48"
    />
  </a>
  <br />
  <p>
    <h3>
      <b>
        Mint CLI
      </b>
    </h3>
  </p>
  <p>
    The Mint CLI is the easiest way to build Mintlify apps from the command line.
  </p>
  <p>

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fmintlify.com&logo=mintlify)](https://mintlify.com) [![Tweet](https://img.shields.io/twitter/url?url=https%3A%2F%2Fmintlify.com%2F)](https://twitter.com/intent/tweet?url=&text=Check%20out%20%40mintlify)

  </p>
  <p>
    <sub>
      Built with ❤︎ by
      <a href="https://mintlify.com">
        Mintlify
      </a>
    </sub>
  </p>
</div>

### Installation

```
npm i -g mint
```

Requires Node 20.17 or higher. LTS versions recommended. Node 25+ is not supported.

### Local preview

#### `mint dev`

Run at the root of your Mintlify project to preview changes locally. Opens in the browser by default.

```
mint dev
```

**Options**

| Flag                  | Description                             | Default |
| --------------------- | --------------------------------------- | ------- |
| `--port <number>`     | Port to run the preview on              | `3000`  |
| `--no-open`           | Skip opening the preview in the browser | —       |
| `--groups <group...>` | Mock user groups for local testing      | —       |
| `--disable-openapi`   | Disable OpenAPI file generation         | —       |

**Custom port**

```
mint dev --port 3333
```

If the specified port is already in use, the CLI automatically tries the next available port.

**Troubleshooting**

If `mint dev` is not working, try these steps in order:

1. Make sure you are running in a folder with a `docs.json` file.
2. Run `mint update` to get the latest version of the CLI.
3. Make sure you are using Node 20.17 or higher.
4. Delete the contents of the `.mintlify` folder in your home directory.

### Validate and check

#### `mint validate`

Validate the documentation build in strict mode. Exits with a non-zero code on any warning or error — useful in CI.

```
mint validate
```

**Options**

| Flag                  | Description                     |
| --------------------- | ------------------------------- |
| `--groups <group...>` | Mock user groups for validation |
| `--disable-openapi`   | Disable OpenAPI file generation |

#### `mint broken-links`

Check for broken internal links in your project.

```
mint broken-links
```

**Options**

| Flag               | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `--check-anchors`  | Also validate anchor links like `link-path#section` against heading slugs |
| `--check-external` | Also check external links for broken URLs                                 |
| `--check-snippets` | Also check links inside `<Snippet>` components                            |

#### `mint openapi-check <filename>`

Check an OpenAPI spec for errors. Accepts a local file path or a URL.

```
mint openapi-check ./openapi.yaml
mint openapi-check https://petstore3.swagger.io/api/v3/openapi.json
```

#### `mint a11y`

Check for accessibility issues in your documentation. Also available as `mint accessibility`, `mint accessibility-check`, and `mint a11y-check`.

```
mint a11y
```

**Options**

| Flag              | Description                               |
| ----------------- | ----------------------------------------- |
| `--skip-contrast` | Skip color contrast checks                |
| `--skip-alt-text` | Skip alt text checks on images and videos |

### Create and manage content

#### `mint new [directory]`

Create a new Mintlify documentation site. Defaults to the current directory.

```
mint new
mint new my-docs
```

**Options**

| Flag             | Description                         |
| ---------------- | ----------------------------------- |
| `--theme <name>` | Theme for the documentation site    |
| `--name <name>`  | Name of the documentation project   |
| `--force`        | Initialize in a non-empty directory |

#### `mint rename <from> <to>`

Rename a file and update all internal references to it throughout the project.

```
mint rename introduction.mdx overview.mdx
```

**Options**

| Flag      | Description                  |
| --------- | ---------------------------- |
| `--force` | Rename files and skip errors |

#### `mint scrape <url>`

Scrape an entire documentation site and convert it to Mintlify MDX files. Also available as `mint scrape site <url>`.

```
mint scrape https://example.com/docs
```

**Options**

| Flag              | Description                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| `--filter <path>` | Only scrape URLs matching this path (e.g. `/docs` matches `/docs` and `/docs/*`) |

#### `mint scrape page <url>`

Scrape a single documentation page and convert it to an MDX file.

```
mint scrape page https://example.com/docs/introduction
```

#### `mint scrape openapi <location>`

Generate MDX files from an OpenAPI spec. Accepts a local file path or a URL.

```
mint scrape openapi ./openapi.yaml
mint scrape openapi https://petstore3.swagger.io/api/v3/openapi.json
```

**Options**

| Flag              | Description                         | Default |
| ----------------- | ----------------------------------- | ------- |
| `--outDir <path>` | Folder to write the generated files | —       |
| `--overwrite`     | Overwrite existing files            | `false` |

#### `mint migrate-mdx`

Migrate MDX OpenAPI endpoint pages to `x-mint` extensions and `docs.json`.

#### `mint upgrade`

Upgrade `mint.json` to `docs.json`. Creates a `docs.json` from your existing `mint.json`.

#### `mint workflow`

Add a workflow to your documentation repository.

### Export

#### `mint export`

Export a static site as a zip file for air-gapped deployment.

```
mint export
mint export --output docs.zip
```

**Options**

| Flag                  | Description                     | Default      |
| --------------------- | ------------------------------- | ------------ |
| `--output <path>`     | Output zip file path            | `export.zip` |
| `--groups <group...>` | Mock user groups for export     | —            |
| `--disable-openapi`   | Disable OpenAPI file generation | —            |

### CLI management

#### `mint update`

Update the CLI to the latest version.

#### `mint version`

Display the current version of the CLI and client. Also available as `mint v`.

### Get Started

[Create an account](https://mintlify.com/start) to start using Mintlify for your documentation.
