import { validateAsyncApi } from '@mintlify/common';
import { readFile } from 'fs/promises';
import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getAsyncApiDefinition } from '../src/asyncapi/getAsyncApiDefinition.js';

const httpsError =
  'Only HTTPS URLs are supported. HTTP URLs are only supported with the cli option --local-schema.';

describe('getAsyncApiDefinition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should load AsyncAPI doc from a local file path', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'basicAsyncAPI.yml');
    const str = await readFile(filePath, 'utf8');
    const { document: expectedDocument } = await validateAsyncApi(str);
    const result = await getAsyncApiDefinition('__test__/fixtures/basicAsyncAPI.yml');

    expect(result).toEqual({ document: expectedDocument, isUrl: false });
  });

  it('should throw error when local file contains invalid schema', async () => {
    await expect(getAsyncApiDefinition('__test__/fixtures/badAsyncAPI.yml')).rejects.toThrow();
  });

  it('should fetch yaml AsyncAPI doc from URL', async () => {
    const url = new URL(
      'https://raw.githubusercontent.com/asyncapi/spec/refs/heads/master/examples/websocket-gemini-asyncapi.yml'
    );
    const result = await getAsyncApiDefinition(url);
    expect(result.document).toBeDefined();
    expect(result.isUrl).toBe(true);
  });

  it('should fetch AsyncAPI doc from URL string', async () => {
    const url =
      'https://raw.githubusercontent.com/asyncapi/spec/refs/heads/master/examples/websocket-gemini-asyncapi.yml';
    const result = await getAsyncApiDefinition(url);
    expect(result.document).toBeDefined();
    expect(result.isUrl).toBe(true);
  });

  it('should throw error when local file read fails', async () => {
    await expect(getAsyncApiDefinition('__test__/fixtures/doesntExist.yml')).rejects.toThrowError();
  });

  it('should throw error with URL and status code when fetch fails', async () => {
    const urlString = 'https://mycoolwebsocketschema/asyncapi.doesnotexist';

    await expect(getAsyncApiDefinition(urlString)).rejects.toThrow(
      `${urlString} - failed to retrieve AsyncAPI file from source - : fetch failed`
    );
  });

  it('should throw error when HTTP URL is provided', async () => {
    const httpUrl = new URL('http://example.com/asyncapi.yaml');
    await expect(getAsyncApiDefinition(httpUrl)).rejects.toThrow(httpsError);
  });

  it('should throw error when HTTP URL string is provided', async () => {
    const httpUrlString = 'http://example.com/asyncapi.yaml';
    await expect(getAsyncApiDefinition(httpUrlString)).rejects.toThrow(httpsError);
  });

  it('should throw error when non-HTTPS URL string is provided', async () => {
    const httpUrlString = 'ftp://example.com/asyncapi.yaml';
    await expect(getAsyncApiDefinition(httpUrlString)).rejects.toThrow(httpsError);
  });

  it('should throw error when URL response is invalid', async () => {
    await expect(getAsyncApiDefinition('https://example.com/asyncapi.yaml')).rejects.toThrow();
  });
});
