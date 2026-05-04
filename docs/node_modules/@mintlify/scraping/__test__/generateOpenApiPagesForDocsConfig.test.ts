import { OpenAPI, OpenAPIV3_1 } from 'openapi-types';
import { describe, it, expect } from 'vitest';

import { DEFAULT_API_GROUP_NAME } from '../src/apiPages/common.js';
import { generateOpenApiPagesForDocsConfig } from '../src/openapi/generateOpenApiPagesForDocsConfig.js';
import {
  emptyDoc,
  simpleDoc,
  docWithTags,
  complexDoc,
  webhooksDoc,
  pathsAndWebhooksDoc,
  excludedPlantStore,
  hiddenPlantStore,
} from './fixtures/openapi.js';

describe('generateOpenApiPagesForDocsConfig', () => {
  it('should throw error for empty paths', async () => {
    await expect(generateOpenApiPagesForDocsConfig(emptyDoc as OpenAPI.Document)).rejects.toThrow(
      'No paths defined.'
    );
  });

  it('should generate navigation structure for simple API', async () => {
    const result = await generateOpenApiPagesForDocsConfig(simpleDoc as OpenAPI.Document);

    // Check nav structure
    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');

    // Check decorated nav structure
    expect(result.decoratedNav).toHaveLength(1);
    expect(result.decoratedNav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.decoratedNav[0]).toHaveProperty('pages');
  });

  it('should handle custom group names', async () => {
    const result = await generateOpenApiPagesForDocsConfig(docWithTags as OpenAPI.Document);

    // Check that the group name matches the tag
    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', 'Users');
  });

  it('should handle multiple paths and methods', async () => {
    const result = await generateOpenApiPagesForDocsConfig(complexDoc as OpenAPI.Document);

    // Should have two groups (Users and Products)
    expect(result.nav).toHaveLength(2);

    // Check that pages were generated for all operations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPages = result.nav.flatMap((group) => (group as any).pages);
    expect(allPages).toHaveLength(3); // getUsers, createUser, getProducts
  });

  it('should handle URL input', async () => {
    const validUrl = new URL('https://api.example.com/openapi.json');

    // Mock fetch implementation would be needed for this test
    // This is just to show the structure
    await expect(generateOpenApiPagesForDocsConfig(validUrl)).rejects.toThrow();
  });

  it('should handle creating pages for webhooks', async () => {
    const result = await generateOpenApiPagesForDocsConfig(webhooksDoc as OpenAPIV3_1.Document);

    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect((result.nav[0] as { pages: string[] }).pages[0]).toBe('newpet');
  });

  it('should handle creating pages for paths and webhooks', async () => {
    const result = await generateOpenApiPagesForDocsConfig(
      pathsAndWebhooksDoc as OpenAPIV3_1.Document
    );

    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect((result.nav[0] as { pages: string[] }).pages[0]).toBe('get-plants');
    expect((result.nav[0] as { pages: string[] }).pages[1]).toBe('post-plants');
    expect((result.nav[0] as { pages: string[] }).pages[2]).toBe('delete-plants');
    expect((result.nav[0] as { pages: string[] }).pages[3]).toBe('newplant');
  });

  it('should not create pages for paths with x-excluded', async () => {
    const result = await generateOpenApiPagesForDocsConfig(excludedPlantStore as OpenAPI.Document);
    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect((result.nav[0] as { pages: string[] }).pages.length).toBe(3);
    expect((result.nav[0] as { pages: string[] }).pages[0]).toBe('get-plants');
    expect((result.nav[0] as { pages: string[] }).pages[1]).toBe('post-plants');
    expect((result.nav[0] as { pages: string[] }).pages[2]).toBe('plantwebhook');
    expect(result.pagesAcc['get-plants']).toBeDefined();
    expect(result.pagesAcc['post-plants']).toBeDefined();
    expect(result.pagesAcc['plantwebhook']).toBeDefined();
    // excluded pages should be undefined
    expect(result.pagesAcc['get-secretplants']).toBeUndefined();
    expect(result.pagesAcc['plantsecretwebhook']).toBeUndefined();
  });

  it('should create pages for paths with x-hidden, but exclude them from the nav', async () => {
    const result = await generateOpenApiPagesForDocsConfig(hiddenPlantStore as OpenAPI.Document);
    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect((result.nav[0] as { pages: string[] }).pages.length).toBe(3);
    expect((result.nav[0] as { pages: string[] }).pages[0]).toBe('get-plants');
    expect((result.nav[0] as { pages: string[] }).pages[1]).toBe('post-plants');
    expect((result.nav[0] as { pages: string[] }).pages[2]).toBe('plantwebhook');
    expect(result.pagesAcc['get-plants']).toBeDefined();
    expect(result.pagesAcc['post-plants']).toBeDefined();
    expect(result.pagesAcc['plantwebhook']).toBeDefined();
    // hidden pages should be defined
    expect(result.pagesAcc['get-secretplants']).toBeDefined();
    expect(result.pagesAcc['plantsecret-webhook']).toBeDefined();
  });
});
