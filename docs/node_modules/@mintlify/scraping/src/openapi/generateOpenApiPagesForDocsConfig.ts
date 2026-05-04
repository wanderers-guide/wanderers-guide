import { validate } from '@mintlify/common';
import { DecoratedNavigationPage } from '@mintlify/models';
import { DecoratedGroupsConfig, GroupsConfig } from '@mintlify/validation';
import { OpenAPI } from 'openapi-types';

import { findNavGroup } from '../apiPages/common.js';
import {
  getOpenApiDefinition,
  GenerateOpenApiPagesOptions,
  OpenApiPageGenerationResult,
  processOpenApiPath,
  processOpenApiWebhook,
} from './common.js';

export async function generateOpenApiPagesForDocsConfig(
  pathOrDocumentOrUrl: string | OpenAPI.Document | URL,
  opts?: GenerateOpenApiPagesOptions
): Promise<OpenApiPageGenerationResult<GroupsConfig, DecoratedGroupsConfig>> {
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

  const nav: GroupsConfig = [];
  const decoratedNav: DecoratedGroupsConfig = [];
  const writePromises: Promise<void>[] = [];
  const pagesAcc: Record<string, DecoratedNavigationPage> = {};

  if (schema?.paths) {
    Object.entries(schema.paths).forEach(([path, pathItemObject]) => {
      if (!pathItemObject || typeof pathItemObject !== 'object') {
        return;
      }
      processOpenApiPath<GroupsConfig, DecoratedGroupsConfig>(
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
      processOpenApiWebhook<GroupsConfig, DecoratedGroupsConfig>(
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
