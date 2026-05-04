import { describe, it, expect } from 'vitest';

import { DEFAULT_API_GROUP_NAME } from '../src/apiPages/common.js';
import { generateOpenApiPages } from '../src/openapi/generateOpenApiPages.js';
import {
  emptyDoc,
  simpleDoc,
  docWithTags,
  complexDoc,
  webhooksDoc,
  pathsAndWebhooksDoc,
} from './fixtures/openapi.js';

describe('generateOpenApiPages', () => {
  it('should throw error for empty paths', async () => {
    await expect(generateOpenApiPages(emptyDoc)).rejects.toThrow('No paths defined.');
  });

  it('should generate navigation structure for simple API', async () => {
    const result = await generateOpenApiPages(simpleDoc);

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
    const result = await generateOpenApiPages(docWithTags);

    // Check that the group name matches the tag
    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', 'Users');
  });

  it('should handle multiple paths and methods', async () => {
    const result = await generateOpenApiPages(complexDoc);

    // Should have two groups (Users and Products)
    expect(result.nav).toHaveLength(2);

    // Check that pages were generated for all operations
    const allPages = result.nav.flatMap((group) => group.pages);
    expect(allPages).toHaveLength(3); // getUsers, createUser, getProducts
  });

  it('should handle URL input', async () => {
    const validUrl = new URL('https://api.example.com/openapi.json');

    // Mock fetch implementation would be needed for this test
    // This is just to show the structure
    await expect(generateOpenApiPages(validUrl)).rejects.toThrow();
  });

  it('should handle creating pages for webhooks', async () => {
    const result = await generateOpenApiPages(webhooksDoc);

    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect(result.nav[0]?.pages[0]).toBe('newpet');
  });

  it('should handle creating pages for paths and webhooks', async () => {
    const result = await generateOpenApiPages(pathsAndWebhooksDoc);

    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_API_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect(result.nav[0]?.pages[0]).toBe('get-plants');
    expect(result.nav[0]?.pages[1]).toBe('post-plants');
    expect(result.nav[0]?.pages[2]).toBe('delete-plants');
    expect(result.nav[0]?.pages[3]).toBe('newplant');
  });
});
