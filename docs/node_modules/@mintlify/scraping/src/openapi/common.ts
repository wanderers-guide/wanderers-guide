import {
  getOpenApiTitleAndDescription,
  OperationObject,
  optionallyAddLeadingSlash,
  optionallyRemoveLeadingSlash,
  slugToTitle,
  isAllowedLocalSchemaUrl,
  buildOpenApiMetaTag,
  registerXMintContent,
} from '@mintlify/common';
import type { DecoratedNavigationPage, PageMetaTags } from '@mintlify/models';
import { XMint } from '@mintlify/validation';
import { outputFile } from 'fs-extra';
import fse from 'fs-extra';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import path, { join, parse, posix } from 'path';

import {
  prepareStringToBeValidFilename,
  generateUniqueFilenameWithoutExtension,
} from '../apiPages/common.js';
import { fetchOpenApi } from '../utils/network.js';

export type OpenApiExtensions = {
  'x-mint'?: XMint;
  'x-excluded'?: boolean;
  'x-hidden'?: boolean;
};

export const getOpenApiDefinition = async (
  pathOrDocumentOrUrl: string | OpenAPI.Document | URL,
  localSchema?: boolean
): Promise<{ document: OpenAPI.Document; isUrl: boolean }> => {
  if (typeof pathOrDocumentOrUrl === 'string') {
    if (pathOrDocumentOrUrl.startsWith('http:') && !localSchema) {
      // This is an invalid location either for a file or a URL
      throw new Error(
        'Only HTTPS URLs are supported. HTTP URLs are only supported with the cli option --local-schema.'
      );
    } else {
      try {
        const url = new URL(pathOrDocumentOrUrl);
        pathOrDocumentOrUrl = url;
      } catch {
        const pathname = path.join(process.cwd(), pathOrDocumentOrUrl.toString());
        const file = await fs.readFile(pathname, 'utf-8');
        pathOrDocumentOrUrl = yaml.load(file) as OpenAPI.Document;
      }
    }
  }
  const isUrl = pathOrDocumentOrUrl instanceof URL;
  if (pathOrDocumentOrUrl instanceof URL) {
    if (!isAllowedLocalSchemaUrl(pathOrDocumentOrUrl.toString(), localSchema)) {
      throw new Error(
        'Only HTTPS URLs are supported. HTTP URLs are only supported with the cli option --local-schema.'
      );
    }
    pathOrDocumentOrUrl = await fetchOpenApi(pathOrDocumentOrUrl);
  }

  return { document: pathOrDocumentOrUrl, isUrl };
};

export const createOpenApiFrontmatter = async ({
  filename,
  openApiMetaTag,
  version,
  deprecated,
  metadata,
  extraContent,
}: {
  filename: string;
  openApiMetaTag: string;
  version?: string;
  deprecated?: boolean;
  metadata?: PageMetaTags;
  extraContent?: string;
}) => {
  let frontmatter = `---\nopenapi: ${openApiMetaTag}`;
  if (metadata && 'version' in metadata) {
    frontmatter += `\nversion: ${metadata.version}`;
  } else if (version) {
    frontmatter += `\nversion: ${version}`;
  }
  if (metadata && 'deprecated' in metadata) {
    frontmatter += `\ndeprecated: ${metadata.deprecated}`;
  } else if (deprecated) {
    frontmatter += `\ndeprecated: ${deprecated}`;
  }

  if (metadata) {
    const reserved = new Set(['openapi', 'version', 'deprecated']);
    Object.entries(metadata)
      .filter(([k]) => !reserved.has(k))
      .forEach(([key, value]) => {
        frontmatter += `\n${key}: ${value}`;
      });
  }

  frontmatter += `\n---`;

  const data = extraContent ? `${frontmatter}\n\n${extraContent}` : frontmatter;

  await outputFile(filename, data);
};

export type GenerateOpenApiPagesOptions = {
  openApiFilePath?: string;
  version?: string;
  writeFiles?: boolean;
  outDir?: string;
  outDirBasePath?: string;
  overwrite?: boolean;
  localSchema?: boolean;
};

export type OpenApiPageGenerationResult<N, DN> = {
  nav: N;
  decoratedNav: DN;
  spec: OpenAPI.Document;
  pagesAcc: Record<string, DecoratedNavigationPage>;
  isUrl: boolean;
};

type MaybeOperationObjectWithExtensions = OperationObject & {
  [`x-hidden`]?: boolean;
  [`x-excluded`]?: boolean;
};

const isHiddenOperation = (operation: MaybeOperationObjectWithExtensions) => {
  return operation['x-hidden'];
};

const isExcludedOperation = (operation: MaybeOperationObjectWithExtensions) => {
  return operation['x-excluded'];
};

export function processOpenApiPath<N, DN>(
  path: string,
  pathItemObject: OpenAPIV3.PathItemObject<OpenApiExtensions>,
  schema: OpenAPI.Document,
  nav: N,
  decoratedNav: DN,
  writePromises: Promise<void>[],
  pagesAcc: Record<string, DecoratedNavigationPage>,
  options: GenerateOpenApiPagesOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findNavGroup: (nav: any, groupName?: string) => any
) {
  const openApiFilePathFromRoot = options.openApiFilePath
    ? optionallyAddLeadingSlash(options.openApiFilePath)
    : undefined;

  Object.values(OpenAPIV3.HttpMethods).forEach((method) => {
    if (method in pathItemObject) {
      const operation = pathItemObject[method];
      if (isExcludedOperation(operation as MaybeOperationObjectWithExtensions)) {
        return;
      }
      const xMint = operation?.['x-mint'];
      const xMintGroups = getXMintGroups({
        pathObject: pathItemObject,
        operationObject: operation,
      });

      if (xMint?.href) {
        xMint.href = optionallyAddLeadingSlash(xMint.href);
      }

      const groupName = operation?.tags?.[0];
      let title =
        prepareStringToBeValidFilename(operation?.summary) ??
        `${method}-${prepareStringToBeValidFilename(path)}`;

      let folder = prepareStringToBeValidFilename(groupName) ?? '';
      let base = posix.join(options.outDir ?? '', folder, title);

      if (xMint?.href) {
        const slug = optionallyRemoveLeadingSlash(xMint.href);
        title = posix.parse(slug).name;
        folder = posix.parse(slug).dir;
        base = posix.join(folder, title);
      }

      const navGroup = findNavGroup(nav, groupName);
      const decoratedNavGroup = findNavGroup(decoratedNav, groupName);

      const filenameWithoutExtension = generateUniqueFilenameWithoutExtension(navGroup, base);

      const openapiMetaTag = buildOpenApiMetaTag({
        filePath: openApiFilePathFromRoot,
        method,
        path,
      });
      const { title: titleTag, description } = getOpenApiTitleAndDescription(
        [
          {
            filename: options.openApiFilePath
              ? parse(options.openApiFilePath).name
              : 'filler-filename',
            spec: schema,
            originalFileLocation: options.openApiFilePath,
          },
        ],
        openapiMetaTag
      );

      let xMintMetadata = xMint?.metadata;
      if (xMintGroups.length > 0) {
        xMintMetadata = {
          ...xMintMetadata,
          groups: [
            ...(Array.isArray(xMintMetadata?.groups) ? xMintMetadata.groups : []),
            ...xMintGroups,
          ],
        };
      }

      const page: DecoratedNavigationPage = {
        title: titleTag ?? slugToTitle(filenameWithoutExtension),
        description,
        deprecated: operation?.deprecated,
        version: options.version,
        ...xMintMetadata,
        openapi: openapiMetaTag,
        href: posix.resolve('/', filenameWithoutExtension),
      };

      if (!isHiddenOperation(operation as MaybeOperationObjectWithExtensions)) {
        navGroup.push(filenameWithoutExtension);
        decoratedNavGroup.push(page);
      }
      pagesAcc[filenameWithoutExtension] = page;

      if (!options.writeFiles) {
        registerXMintContent(filenameWithoutExtension, xMint?.content);
      }

      const targetPath = options.outDirBasePath
        ? join(options.outDirBasePath, `${filenameWithoutExtension}.mdx`)
        : `${filenameWithoutExtension}.mdx`;
      if (options.writeFiles && (!fse.pathExistsSync(targetPath) || options.overwrite)) {
        writePromises.push(
          createOpenApiFrontmatter({
            filename: targetPath,
            openApiMetaTag: openapiMetaTag,
            version: options.version,
            deprecated: operation?.deprecated,
            metadata: xMintMetadata,
            extraContent: xMint?.content,
          })
        );
      }
    }
  });
}

export function processOpenApiWebhook<N, DN>(
  webhook: string,
  webhookObject: OpenAPIV3.PathItemObject<OpenApiExtensions>,
  _schema: OpenAPI.Document,
  nav: N,
  decoratedNav: DN,
  writePromises: Promise<void>[],
  pagesAcc: Record<string, DecoratedNavigationPage>,
  options: GenerateOpenApiPagesOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findNavGroup: (nav: any, groupName?: string) => any
) {
  const openApiFilePathFromRoot = options.openApiFilePath
    ? optionallyAddLeadingSlash(options.openApiFilePath)
    : undefined;

  Object.values(OpenAPIV3.HttpMethods).forEach((method) => {
    if (method in webhookObject) {
      const operation = webhookObject[method];
      if (isExcludedOperation(operation as MaybeOperationObjectWithExtensions)) {
        return;
      }
      const xMint = operation?.['x-mint'];

      if (xMint?.href) {
        xMint.href = optionallyAddLeadingSlash(xMint.href);
      }

      const groupName = operation?.tags?.[0];
      let title =
        prepareStringToBeValidFilename(operation?.summary) ??
        `${prepareStringToBeValidFilename(webhook)}`;
      let folder = prepareStringToBeValidFilename(groupName) ?? '';
      let base = posix.join(options.outDir ?? '', folder, title);

      if (xMint?.href) {
        const slug = optionallyRemoveLeadingSlash(xMint.href);
        title = posix.parse(slug).name;
        folder = posix.parse(slug).dir;
        base = posix.join(folder, title);
      }

      const navGroup = findNavGroup(nav, groupName);
      const decoratedNavGroup = findNavGroup(decoratedNav, groupName);

      const filenameWithoutExtension = generateUniqueFilenameWithoutExtension(navGroup, base);

      const openapiMetaTag = buildOpenApiMetaTag({
        filePath: openApiFilePathFromRoot,
        method: 'webhook',
        path: webhook,
      });

      const page: DecoratedNavigationPage = {
        title: slugToTitle(filenameWithoutExtension),
        description: operation?.description,
        version: options.version,
        deprecated: operation?.deprecated,
        ...xMint?.metadata,
        openapi: openapiMetaTag,
        href: posix.resolve('/', filenameWithoutExtension),
      };

      if (!isHiddenOperation(operation as MaybeOperationObjectWithExtensions)) {
        navGroup.push(filenameWithoutExtension);
        decoratedNavGroup.push(page);
      }
      pagesAcc[filenameWithoutExtension] = page;

      if (!options.writeFiles) {
        registerXMintContent(filenameWithoutExtension, xMint?.content);
      }

      const targetPath = options.outDirBasePath
        ? join(options.outDirBasePath, `${filenameWithoutExtension}.mdx`)
        : `${filenameWithoutExtension}.mdx`;
      if (options.writeFiles && (!fse.pathExistsSync(targetPath) || options.overwrite)) {
        writePromises.push(
          createOpenApiFrontmatter({
            filename: targetPath,
            openApiMetaTag: openapiMetaTag,
            version: options.version,
            deprecated: operation?.deprecated,
            metadata: xMint?.metadata,
            extraContent: xMint?.content,
          })
        );
      }
    }
  });
}

export const getXMintGroups = ({
  pathObject,
  operationObject,
}: {
  pathObject: OpenAPIV3.PathItemObject<OpenApiExtensions>;
  operationObject: OpenAPIV3.OperationObject<OpenApiExtensions> | undefined;
}): string[] => {
  const allowedGroups: string[] = [];
  if (
    'x-mint' in pathObject &&
    pathObject['x-mint'] &&
    typeof pathObject['x-mint'] === 'object' &&
    'groups' in pathObject['x-mint'] &&
    Array.isArray(pathObject['x-mint'].groups)
  ) {
    allowedGroups.push(...pathObject['x-mint'].groups);
  }

  if (
    operationObject &&
    'x-mint' in operationObject &&
    operationObject['x-mint'] &&
    typeof operationObject['x-mint'] === 'object' &&
    'groups' in operationObject['x-mint'] &&
    Array.isArray(operationObject['x-mint'].groups)
  ) {
    allowedGroups.push(...operationObject['x-mint'].groups);
  }

  return allowedGroups;
};
