import { describe, it, expect, vi } from 'vitest';

import { createOpenApiFrontmatter } from '../src/openapi/common.js';

const { mockedOutputFile } = vi.hoisted(() => {
  return { mockedOutputFile: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('fs-extra', () => ({
  outputFile: mockedOutputFile,
}));

describe('createOpenApiFrontmatter', () => {
  it('writes basic frontmatter with version and deprecated flags', async () => {
    mockedOutputFile.mockClear();
    const filename = 'test-basic.md';

    await createOpenApiFrontmatter({
      filename,
      openApiMetaTag: 'foo',
      version: '1.0.0',
      deprecated: true,
    });

    const expected = `---\nopenapi: foo\nversion: 1.0.0\ndeprecated: true\n---`;
    expect(mockedOutputFile).toHaveBeenCalledWith(filename, expected);
  });

  it('prioritizes metadata fields and includes extra content', async () => {
    mockedOutputFile.mockClear();
    const filename = 'test-meta.md';

    await createOpenApiFrontmatter({
      filename,
      openApiMetaTag: 'ABC',
      version: '1.2.3',
      deprecated: true,
      metadata: {
        version: '9.9.9',
        deprecated: 'false',
        title: 'My API',
        extra: 'value',
      },
      extraContent: '# Hello',
    });

    const expected =
      `---\n` +
      `openapi: ABC\n` +
      `version: 9.9.9\n` +
      `deprecated: false\n` +
      `title: My API\n` +
      `extra: value\n` +
      `---\n\n` +
      `# Hello`;

    expect(mockedOutputFile).toHaveBeenCalledWith(filename, expected);
  });

  it('ignores openapi key in metadata', async () => {
    mockedOutputFile.mockClear();
    const filename = 'test-ignore.md';

    await createOpenApiFrontmatter({
      filename,
      openApiMetaTag: 'XYZ',
      version: '0.0.1',
      metadata: {
        openapi: 'SHOULD_IGNORE',
        version: '2.0.0',
        foo: 'bar',
      },
    });

    const expected = `---\n` + `openapi: XYZ\n` + `version: 2.0.0\n` + `foo: bar\n` + `---`;

    expect(mockedOutputFile).toHaveBeenCalledWith(filename, expected);
  });
});
