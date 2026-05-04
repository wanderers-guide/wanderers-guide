import fs from 'fs/promises';
import yaml from 'js-yaml';
import { OpenAPI } from 'openapi-types';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getOpenApiDefinition } from '../src/openapi/common.js';

vi.mock('fs/promises');
vi.mock('node-fetch');

const mockOpenApiDoc: OpenAPI.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  paths: {},
};

const httpsError =
  'Only HTTPS URLs are supported. HTTP URLs are only supported with the cli option --local-schema.';

describe('getOpenApiDefinition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should load OpenAPI doc from a local file path', async () => {
    const mockYaml = yaml.dump(mockOpenApiDoc);
    vi.mocked(fs.readFile).mockResolvedValue(mockYaml);

    const result = await getOpenApiDefinition('test.yaml');

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('test.yaml'), 'utf-8');
    expect(result).toEqual({ document: mockOpenApiDoc, isUrl: false });
  });

  it('should accept OpenAPI document directly', async () => {
    const result = await getOpenApiDefinition(mockOpenApiDoc);
    expect(result).toEqual({ document: mockOpenApiDoc, isUrl: false });
  });

  it('should fetch yaml OpenAPI doc from URL', async () => {
    const mockYaml = yaml.dump(mockOpenApiDoc);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockYaml),
    });

    const url = new URL('https://example.com/openapi.yaml');
    const result = await getOpenApiDefinition(url);

    expect(fetch).toHaveBeenCalledWith(url);
    expect(result).toEqual({ document: mockOpenApiDoc, isUrl: true });
  });

  it('should fetch and parse valid JSON OpenAPI doc from URL', async () => {
    const mockJson = JSON.stringify(mockOpenApiDoc);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockJson),
    });

    const url = new URL('https://example.com/openapi.yaml');
    const result = await getOpenApiDefinition(url);

    expect(fetch).toHaveBeenCalledWith(url);
    expect(result).toEqual({ document: mockOpenApiDoc, isUrl: true });
  });

  it('should fetch OpenAPI doc from URL string', async () => {
    const mockYaml = yaml.dump(mockOpenApiDoc);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockYaml),
    });

    const urlString = 'https://example.com/openapi.yaml';
    const result = await getOpenApiDefinition(urlString);

    expect(fetch).toHaveBeenCalledWith(new URL(urlString));
    expect(result).toEqual({ document: mockOpenApiDoc, isUrl: true });
  });

  it('should throw error when local file read fails', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File read error'));

    await expect(getOpenApiDefinition('test.yaml')).rejects.toThrow('File read error');
  });

  it('should throw error with URL and status code when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const urlString = 'https://petstore3.swagger.io/api/v3/openapi.doesnotexist';

    await expect(getOpenApiDefinition(urlString)).rejects.toThrow(
      'https://petstore3.swagger.io/api/v3/openapi.doesnotexist - failed to retrieve OpenAPI file from source: 404 Not Found'
    );

    expect(fetch).toHaveBeenCalledWith(new URL(urlString));
  });

  it('should throw error when HTTP URL is provided', async () => {
    const httpUrl = new URL('http://example.com/openapi.yaml');
    await expect(getOpenApiDefinition(httpUrl)).rejects.toThrow(httpsError);
  });

  it('should allow HTTP URL when local schema is true', async () => {
    const httpUrl = new URL('http://example.com/openapi.yaml');
    const mockYaml = yaml.dump(mockOpenApiDoc);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockYaml),
    });
    await expect(getOpenApiDefinition(httpUrl, true)).resolves.toEqual({
      document: mockOpenApiDoc,
      isUrl: true,
    });
  });

  it('should throw error when HTTP URL string is provided', async () => {
    const httpUrlString = 'http://example.com/openapi.yaml';
    await expect(getOpenApiDefinition(httpUrlString)).rejects.toThrow(httpsError);
  });

  it('should allow HTTP URL string when local schema is true', async () => {
    const httpUrlString = 'http://example.com/openapi.yaml';
    const mockYaml = yaml.dump(mockOpenApiDoc);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockYaml),
    });
    await expect(getOpenApiDefinition(httpUrlString, true)).resolves.toEqual({
      document: mockOpenApiDoc,
      isUrl: true,
    });
  });

  it('should throw error when non-HTTPS URL string is provided', async () => {
    const httpUrlString = 'ftp://example.com/openapi.yaml';
    await expect(getOpenApiDefinition(httpUrlString)).rejects.toThrow(httpsError);
  });

  it('should throw error when URL response is invalid YAML', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve('invalid: yaml: content'),
    });

    await expect(getOpenApiDefinition('https://example.com/openapi.yaml')).rejects.toThrow();
  });

  it('should throw error when URL response is invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve('{"invalid": "yaml", "invalid": "content"}'),
    });

    await expect(getOpenApiDefinition('https://example.com/openapi.json')).rejects.toThrow();
  });

  it('should throw error when local file contains invalid YAML', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('invalid: yaml: content');

    await expect(getOpenApiDefinition('test.yaml')).rejects.toThrow();
  });

  it('should throw error when local file contains invalid JSON', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{"invalid": "yaml", "invalid": "content"}');

    await expect(getOpenApiDefinition('test.json')).rejects.toThrow();
  });
});
