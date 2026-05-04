import { validate } from '@mintlify/common';
import type {
  DecoratedNavigation,
  DecoratedNavigationGroup,
  Navigation,
  NavigationGroup,
  DecoratedNavigationPage,
} from '@mintlify/models';
import { OpenAPI } from 'openapi-types';

import { DEFAULT_API_GROUP_NAME } from '../apiPages/common.js';
import {
  getOpenApiDefinition,
  GenerateOpenApiPagesOptions,
  OpenApiPageGenerationResult,
  processOpenApiPath,
  processOpenApiWebhook,
} from './common.js';

export async function generateOpenApiPages(
  pathOrDocumentOrUrl: string | OpenAPI.Document | URL,
  opts?: GenerateOpenApiPagesOptions
): Promise<OpenApiPageGenerationResult<Navigation, DecoratedNavigation>> {
  const { document, isUrl } = await getOpenApiDefinition(pathOrDocumentOrUrl, opts?.localSchema);
  const { schema } = await validate(document);

  if (
    schema?.openapi === '3.0.0' &&
    (schema.paths === undefined || Object.keys(schema.paths).length === 0)
  ) {
    throw new Error('No paths defined.');
  } else if (
    schema?.openapi === '3.1.0' &&
    (schema.paths === undefined || Object.keys(schema.paths).length === 0) &&
    (schema.webhooks === undefined || Object.keys(schema.webhooks).length === 0)
  ) {
    throw new Error('No paths or webhooks defined.');
  }

  const nav: Navigation = [];
  const decoratedNav: DecoratedNavigation = [];
  const writePromises: Promise<void>[] = [];
  const pagesAcc: Record<string, DecoratedNavigationPage> = {};

  if (schema?.paths) {
    Object.entries(schema.paths).forEach(([path, pathItemObject]) => {
      if (!pathItemObject || typeof pathItemObject !== 'object') {
        return;
      }
      processOpenApiPath<Navigation, DecoratedNavigation>(
        path,
        pathItemObject,
        schema as OpenAPI.Document,
        nav,
        decoratedNav,
        writePromises,
        pagesAcc,
        opts ?? {},
        findNavGroup
      );
    });
  }

  if (schema?.webhooks) {
    Object.entries(schema.webhooks).forEach(([webhook, webhookObject]) => {
      if (!webhookObject || typeof webhookObject !== 'object') {
        return;
      }
      processOpenApiWebhook<Navigation, DecoratedNavigation>(
        webhook,
        webhookObject,
        schema as OpenAPI.Document,
        nav,
        decoratedNav,
        writePromises,
        pagesAcc,
        opts ?? {},
        findNavGroup
      );
    });
  }

  await Promise.all(writePromises);

  return {
    nav,
    decoratedNav,
    spec: schema as OpenAPI.Document,
    pagesAcc,
    isUrl,
  };
}

const findNavGroup = <T extends NavigationGroup | DecoratedNavigationGroup>(
  nav: T['pages'][number][],
  groupName: string = DEFAULT_API_GROUP_NAME
): T['pages'][number][] => {
  const group = nav.find(
    (fileOrGroup) =>
      typeof fileOrGroup === 'object' && 'group' in fileOrGroup && fileOrGroup.group === groupName
  ) as T | undefined;
  if (group === undefined) {
    const newGroup = {
      group: groupName,
      pages: [],
    };
    nav.push(newGroup);
    return newGroup.pages;
  } else {
    return group.pages;
  }
};
