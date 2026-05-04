import { getOpenApiDocumentFromUrl, isAllowedLocalSchemaUrl, validate } from '@mintlify/common';
import { addLog } from '@mintlify/previewing';
import { mockProcessExit } from 'vitest-mock-process';

import { readLocalOpenApiFile } from '../src/helpers.js';
import { getOpenApiFilenamesFromDocsConfig } from '../src/openApiCheck.js';
import { mockValidOpenApiDocument, runCommand } from './utils.js';

vi.mock('@mintlify/common', () => ({
  getOpenApiDocumentFromUrl: vi.fn(),
  isAllowedLocalSchemaUrl: vi.fn(),
  validate: vi.fn(),
}));

vi.mock('@mintlify/previewing', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@mintlify/previewing')>();
  return { ...mod, addLog: vi.fn() };
});

vi.mock('../src/helpers.js', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('../src/helpers.js')>();
  return {
    ...originalModule,
    readLocalOpenApiFile: vi.fn(),
  };
});

const addLogSpy = vi.mocked(addLog);
const processExitMock = mockProcessExit();

describe('getOpenApiFilenamesFromDocsConfig', () => {
  it('reads api.openapi string', () => {
    expect(
      getOpenApiFilenamesFromDocsConfig({
        api: { openapi: 'https://example.com/openapi.yaml' },
      })
    ).toEqual(['https://example.com/openapi.yaml']);
  });

  it('reads api.openapi array and object source form', () => {
    expect(
      getOpenApiFilenamesFromDocsConfig({
        api: { openapi: ['https://a.com/o.yaml', 'https://b.com/o.yaml'] },
      })
    ).toEqual(['https://a.com/o.yaml', 'https://b.com/o.yaml']);
    expect(
      getOpenApiFilenamesFromDocsConfig({
        api: { openapi: { source: 'https://c.com/o.yaml' } },
      })
    ).toEqual(['https://c.com/o.yaml']);
  });

  it('returns empty when api or openapi is missing', () => {
    expect(getOpenApiFilenamesFromDocsConfig({})).toEqual([]);
    expect(getOpenApiFilenamesFromDocsConfig({ api: {} })).toEqual([]);
  });
});

describe('openApiCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const expectDeprecationWarning = () => {
    expect(addLogSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        props: { message: 'openapi-check is deprecated, use `mintlify validate` instead' },
      })
    );
  };

  it('valid openApi file from url', async () => {
    vi.mocked(isAllowedLocalSchemaUrl).mockReturnValueOnce(true);
    vi.mocked(getOpenApiDocumentFromUrl).mockResolvedValueOnce(mockValidOpenApiDocument);

    await runCommand('openapi-check', 'https://petstore3.swagger.io/api/v3/openapi.json');

    expectDeprecationWarning();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'OpenAPI definition is valid.' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('invalid openApi file from url', async () => {
    vi.mocked(isAllowedLocalSchemaUrl).mockReturnValueOnce(true);
    vi.mocked(getOpenApiDocumentFromUrl).mockRejectedValueOnce(
      new Error('Could not parse OpenAPI document.')
    );

    await runCommand('openapi-check', 'https://petstore3.swagger.io/api/v3/openapi.json');

    expectDeprecationWarning();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'Could not parse OpenAPI document.' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  it('valid openApi file from localhost', async () => {
    vi.mocked(isAllowedLocalSchemaUrl).mockReturnValueOnce(true);
    vi.mocked(getOpenApiDocumentFromUrl).mockResolvedValueOnce(mockValidOpenApiDocument);

    await runCommand('openapi-check', 'http://localhost:3000/openapi.json');

    expectDeprecationWarning();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'OpenAPI definition is valid.' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('invalid openApi file from localhost', async () => {
    vi.mocked(isAllowedLocalSchemaUrl).mockReturnValueOnce(false);

    await runCommand('openapi-check', 'http://localhost:3000/openapi.json');

    expectDeprecationWarning();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'include the --local-schema flag to check locally hosted OpenAPI files' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('valid openApi file from local file', async () => {
    vi.mocked(isAllowedLocalSchemaUrl).mockReturnValueOnce(false);
    vi.mocked(readLocalOpenApiFile).mockResolvedValueOnce(mockValidOpenApiDocument);
    vi.mocked(validate).mockResolvedValueOnce({
      valid: true,
      errors: [],
    });

    await runCommand('openapi-check', 'test/openapi.yaml');

    expectDeprecationWarning();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'OpenAPI definition is valid.' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('invalid openApi file from local file', async () => {
    vi.mocked(isAllowedLocalSchemaUrl).mockReturnValueOnce(false);
    vi.mocked(readLocalOpenApiFile).mockResolvedValueOnce(mockValidOpenApiDocument);
    vi.mocked(validate).mockRejectedValueOnce(new Error('some schema parsing error'));

    await runCommand('openapi-check', 'test/openapi.yaml');

    expectDeprecationWarning();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'some schema parsing error' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });
});
