import { buildGraph, getBrokenExternalLinks } from '@mintlify/link-rot';
import { MdxPath } from '@mintlify/link-rot/dist/graph.js';
import { addLog, clearLogs } from '@mintlify/previewing';
import { mockProcessExit } from 'vitest-mock-process';

import { checkForMintJson } from '../src/helpers.js';
import { runCommand } from './utils.js';

vi.mock('@mintlify/previewing', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@mintlify/previewing')>();
  return { ...mod, addLog: vi.fn(), clearLogs: vi.fn() };
});

vi.mock('../src/helpers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/helpers.js')>();
  return {
    ...actual,
    checkForMintJson: vi.fn(),
  };
});

const mockGraph = {
  precomputeFileResolutions: vi.fn(),
  getBrokenInternalLinks: vi.fn().mockReturnValue([]),
  getExternalPathsByNode: vi.fn().mockReturnValue(new Map()),
};

vi.mock('@mintlify/link-rot', async () => {
  const actual = await import('@mintlify/link-rot');
  return {
    ...actual,
    buildGraph: vi.fn(),
    getBrokenExternalLinks: vi.fn(),
  };
});

const addLogSpy = vi.mocked(addLog);
const clearLogsSpy = vi.mocked(clearLogs);
const processExitMock = mockProcessExit();

describe('brokenLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildGraph).mockResolvedValue(mockGraph as never);
    mockGraph.getBrokenInternalLinks.mockReturnValue([]);
  });

  it('success with no broken links', async () => {
    vi.mocked(checkForMintJson).mockResolvedValueOnce(true);

    await runCommand('broken-links');

    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'checking for broken links...' },
      })
    );
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'no broken links found' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('fails with broken links', async () => {
    vi.mocked(checkForMintJson).mockResolvedValueOnce(true);
    mockGraph.getBrokenInternalLinks.mockReturnValue([
      {
        relativeDir: '.',
        filename: 'introduction.mdx',
        originalPath: '/api/invalid-path',
        pathType: 'internal',
      } as MdxPath,
    ]);

    await runCommand('broken-links');

    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'checking for broken links...' },
      })
    );
    expect(clearLogsSpy).toHaveBeenCalled();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: {
          brokenLinksByFile: {
            'introduction.mdx': ['/api/invalid-path'],
          },
        },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  it('fails when checking throws error', async () => {
    vi.mocked(checkForMintJson).mockResolvedValueOnce(true);
    vi.mocked(buildGraph).mockRejectedValueOnce(new Error('some error'));

    await runCommand('broken-links');

    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'checking for broken links...' },
      })
    );
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'some error' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });
});

describe('brokenLinks --check-external', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildGraph).mockResolvedValue(mockGraph as never);
    mockGraph.getBrokenInternalLinks.mockReturnValue([]);
  });

  it('success with no broken external links', async () => {
    vi.mocked(checkForMintJson).mockResolvedValueOnce(true);
    vi.mocked(getBrokenExternalLinks).mockResolvedValueOnce([]);

    await runCommand('broken-links', '--check-external');

    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'no broken links found' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(0);
  });

  it('fails with broken external links', async () => {
    vi.mocked(checkForMintJson).mockResolvedValueOnce(true);
    vi.mocked(getBrokenExternalLinks).mockResolvedValueOnce([
      {
        url: 'https://example.com/broken',
        status: 404,
        sources: [{ file: 'introduction.mdx', originalPath: 'https://example.com/broken' }],
      },
    ]);

    await runCommand('broken-links', '--check-external');

    expect(clearLogsSpy).toHaveBeenCalled();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: {
          brokenLinksByFile: {
            'introduction.mdx': ['https://example.com/broken (404)'],
          },
        },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  it('fails when external link checking throws error', async () => {
    vi.mocked(checkForMintJson).mockResolvedValueOnce(true);
    vi.mocked(getBrokenExternalLinks).mockRejectedValueOnce(new Error('network error'));

    await runCommand('broken-links', '--check-external');

    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'network error' },
      })
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  it('does not check external links without --check-external flag', async () => {
    vi.mocked(checkForMintJson).mockResolvedValueOnce(true);

    await runCommand('broken-links');

    expect(getBrokenExternalLinks).not.toHaveBeenCalled();
    expect(processExitMock).toHaveBeenCalledWith(0);
  });
});
