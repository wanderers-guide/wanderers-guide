import type { DocumentV3 } from '@mintlify/common';
import type { DecoratedNavigationPage } from '@mintlify/models';
import type { OpenAPIV3 } from 'openapi-types';
import { describe, it, expect } from 'vitest';

import { findNavGroup } from '../src/apiPages/common.js';
import { OpenApiExtensions, processOpenApiPath } from '../src/openapi/common.js';
import { simpleDoc } from './fixtures/openapi.js';

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
});
