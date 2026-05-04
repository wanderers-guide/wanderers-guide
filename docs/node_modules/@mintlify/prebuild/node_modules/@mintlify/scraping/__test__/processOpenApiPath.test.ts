import type { DocumentV3 } from '@mintlify/common';
import { findNavGroup } from '@mintlify/common';
import type { DecoratedNavigationPage } from '@mintlify/models';
import type { OpenAPIV3 } from 'openapi-types';
import { describe, it, expect } from 'vitest';

import { OpenApiExtensions, processOpenApiPath } from '../src/openapi/common.js';
import { simpleDoc } from './fixtures/openapi.js';

type TagWithExtensions = OpenAPIV3.TagObject & {
  'x-group'?: string;
};

type OperationObject = OpenAPIV3.OperationObject<OpenApiExtensions>;

const createOperation = (overrides: Partial<OperationObject>) => {
  return {
    responses: {
      200: {
        description: 'OK',
      },
    },
    ...overrides,
  };
};

describe('processOpenApiPath', () => {
  const schema: DocumentV3 = simpleDoc;
  const defaultOptions = {
    writeFiles: false,
  } as const;

  it('should add a page and nav entry for a standard operation', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};

    const pathItemObject = {
      get: createOperation({ summary: 'List Pets', tags: ['Pets'] }),
    };

    processOpenApiPath(
      '/pets',
      pathItemObject,
      schema,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      defaultOptions,
      findNavGroup
    );

    expect(nav).toHaveLength(1);
    expect(nav[0]).toHaveProperty('group', 'Pets');
    expect(nav[0]).toHaveProperty('pages');
    expect(nav[0]?.pages).toHaveLength(1);

    expect(decoratedNav).toHaveLength(1);
    expect(decoratedNav[0]?.pages).toHaveLength(1);

    expect(Object.keys(pagesAcc)).toHaveLength(1);

    expect(writePromises).toHaveLength(0);
  });

  it('should skip operations marked with x-excluded', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};
    const operation: Partial<OperationObject> = {
      summary: 'List Pets',
      tags: ['Pets'],
      'x-excluded': true,
    };

    const pathItemObject = {
      get: createOperation(operation),
    };

    processOpenApiPath(
      '/pets',
      pathItemObject,
      schema,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      defaultOptions,
      findNavGroup
    );

    expect(nav).toHaveLength(0);
    expect(Object.keys(pagesAcc)).toHaveLength(0);
  });

  it('should use x-mint.metadata.title and description to override defaults', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};
    const operation: Partial<OperationObject> = {
      summary: 'List Pets',
      tags: ['Pets'],
      'x-mint': {
        metadata: {
          title: 'Custom Pet Title',
          description: 'Custom description',
        },
      },
    };

    const pathItemObject = {
      get: createOperation(operation),
    };

    processOpenApiPath(
      '/pets',
      pathItemObject,
      schema,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      defaultOptions,
      findNavGroup
    );

    const page = (decoratedNav[0]?.pages as DecoratedNavigationPage[])[0];
    expect(page?.title).toBe('Custom Pet Title');
    expect(page?.description).toBe('Custom description');

    const accPage = pagesAcc[Object.keys(pagesAcc)[0]!] as DecoratedNavigationPage;
    expect(accPage.title).toBe('Custom Pet Title');
    expect(accPage.description).toBe('Custom description');
  });

  it('should resolve title from OpenAPI summary when openApiFilePath is set', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};

    const pingSchema: DocumentV3 = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/ping': {
          get: {
            summary: 'Check API server status',
            description: 'This endpoint allows you to check the API server status',
            tags: ['Ping'],
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    };

    const pathItemObject = {
      get: createOperation({
        summary: 'Check API server status',
        description: 'This endpoint allows you to check the API server status',
        tags: ['Ping'],
        'x-mint': {
          href: '/reference/ping-server',
        },
      }),
    };

    processOpenApiPath(
      '/ping',
      pathItemObject,
      pingSchema,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      { ...defaultOptions, openApiFilePath: 'openapi.json' },
      findNavGroup
    );

    const page = pagesAcc[Object.keys(pagesAcc)[0]!] as DecoratedNavigationPage;
    expect(page.title).toBe('Check API server status');
    expect(page.sidebarTitle).toBe('Ping server');
    expect(page.description).toBe('This endpoint allows you to check the API server status');
  });

  it('should use x-mint.href to override the generated path', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};

    const operation: Partial<OperationObject> = {
      summary: 'List Pets',
      tags: ['Pets'],
      'x-mint': {
        href: '/custom/list',
      },
    };

    const pathItemObject = {
      get: createOperation(operation),
    };

    processOpenApiPath(
      '/pets',
      pathItemObject,
      schema,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      defaultOptions,
      findNavGroup
    );

    expect(nav).toHaveLength(1);
    expect(nav[0]?.pages).toHaveLength(1);
    expect((nav[0]?.pages as DecoratedNavigationPage[])[0]).toBe('custom/list');

    expect(decoratedNav).toHaveLength(1);
    expect(decoratedNav[0]?.pages).toHaveLength(1);
    expect((decoratedNav[0]?.pages as DecoratedNavigationPage[])[0]?.href).toBe('/custom/list');
  });

  it('should use x-group from tag definition for group display name', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};

    const schemaWithXGroup: DocumentV3 = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      tags: [
        {
          name: 'CRMActions',
          description: 'CRM related actions',
          'x-group': 'CRM Actions',
        } as TagWithExtensions,
      ],
      paths: {
        '/actions': {
          get: {
            summary: 'Get CRM Actions',
            description: 'Retrieve CRM actions',
            tags: ['CRMActions'],
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    };

    const pathItemObject = {
      get: createOperation({
        summary: 'Get CRM Actions',
        description: 'Retrieve CRM actions',
        tags: ['CRMActions'],
      }),
    };

    processOpenApiPath(
      '/actions',
      pathItemObject,
      schemaWithXGroup,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      defaultOptions,
      findNavGroup
    );

    expect(nav).toHaveLength(1);
    expect(nav[0]).toHaveProperty('group', 'CRM Actions');
  });

  it('should fall back to tag name when x-group is not defined', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};

    const schemaWithoutXGroup: DocumentV3 = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      tags: [
        {
          name: 'CustomTag',
          description: 'A custom tag',
          // No x-group defined
        },
      ],
      paths: {
        '/custom': {
          get: {
            summary: 'Get Custom',
            description: 'Get custom resource',
            tags: ['CustomTag'],
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    };

    const pathItemObject = {
      get: createOperation({
        summary: 'Get Custom',
        description: 'Get custom resource',
        tags: ['CustomTag'],
      }),
    };

    processOpenApiPath(
      '/custom',
      pathItemObject,
      schemaWithoutXGroup,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      defaultOptions,
      findNavGroup
    );

    expect(nav).toHaveLength(1);
    expect(nav[0]).toHaveProperty('group', 'CustomTag');
  });

  it('should use x-group display name for multiple operations in the same group', () => {
    const nav: DecoratedNavigationPage[] = [];
    const decoratedNav: DecoratedNavigationPage[] = [];
    const writePromises: Promise<void>[] = [];
    const pagesAcc: Record<string, DecoratedNavigationPage> = {};

    const schemaWithMultipleOps: DocumentV3 = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      tags: [
        {
          name: 'EmailVerification',
          description: 'Email verification endpoints',
          'x-group': 'Email Verification',
        } as TagWithExtensions,
      ],
      paths: {
        '/verify-email': {
          get: {
            summary: 'Verify Email',
            description: 'Verify an email',
            tags: ['EmailVerification'],
            responses: { 200: { description: 'OK' } },
          },
          post: {
            summary: 'Send Verification',
            description: 'Send verification code',
            tags: ['EmailVerification'],
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    };

    const pathItemObject = {
      get: createOperation({
        summary: 'Verify Email',
        description: 'Verify an email',
        tags: ['EmailVerification'],
      }),
      post: createOperation({
        summary: 'Send Verification',
        description: 'Send verification code',
        tags: ['EmailVerification'],
      }),
    };

    processOpenApiPath(
      '/verify-email',
      pathItemObject,
      schemaWithMultipleOps,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      defaultOptions,
      findNavGroup
    );

    expect(nav).toHaveLength(1);
    expect(nav[0]).toHaveProperty('group', 'Email Verification');
    expect((nav[0]?.pages as string[]).length).toBe(2);
  });
});
