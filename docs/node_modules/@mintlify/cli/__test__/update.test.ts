import * as previewing from '@mintlify/previewing';

import { getLatestCliVersion, getVersions, execAsync } from '../src/helpers.js';
import { update } from '../src/update.js';

vi.mock('@mintlify/previewing', async () => {
  const originalModule =
    await vi.importActual<typeof import('@mintlify/previewing')>('@mintlify/previewing');
  return {
    ...originalModule,
    getClientVersion: vi.fn().mockReturnValue('1.0.0'),
    getLatestClientVersion: vi.fn().mockResolvedValue('2.0.0'),
    downloadTargetMint: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../src/helpers.js', async () => {
  const originalModule =
    await vi.importActual<typeof import('../src/helpers.js')>('../src/helpers.js');
  return {
    ...originalModule,
    execAsync: vi.fn(),
    getLatestCliVersion: vi.fn(),
    getVersions: vi.fn().mockReturnValue({
      cli: '1.0.0',
      client: '1.0.0',
    }),
  };
});

const addLogSpy = vi.spyOn(previewing, 'addLog');
const addErrorLogSpy = vi.spyOn(previewing, 'addErrorLog');

describe('update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should update the cli successfully', async () => {
    vi.mocked(getVersions).mockReturnValue({
      cli: '1.0.0',
      client: '1.0.0',
    });
    vi.mocked(getLatestCliVersion).mockReturnValue('2.0.0');
    vi.mocked(execAsync).mockResolvedValue({ stdout: '', stderr: '' });
    vi.mocked(previewing.downloadTargetMint).mockResolvedValue();

    await update({ packageName: 'mintlify' });

    expect(execAsync).toHaveBeenCalledWith('npm install -g mintlify@latest --silent');
    expect(previewing.downloadTargetMint).toHaveBeenCalledWith({
      targetVersion: '2.0.0',
      existingVersion: '1.0.0',
    });
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'updated mintlify to the latest version: 2.0.0' },
      })
    );
  });

  it('should return when already up to date', async () => {
    vi.mocked(getVersions).mockReturnValue({
      cli: '1.0.0',
      client: '1.0.0',
    });
    vi.mocked(getLatestCliVersion).mockReturnValue('1.0.0');
    vi.mocked(previewing.getLatestClientVersion).mockResolvedValue('1.0.0');
    vi.mocked(previewing.getClientVersion).mockReturnValue('1.0.0');

    await update({ packageName: 'mintlify' });

    expect(execAsync).not.toHaveBeenCalled();
    expect(previewing.downloadTargetMint).not.toHaveBeenCalled();
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({ props: { message: 'already up to date' } })
    );
  });

  it('should handle cli update failure', async () => {
    vi.mocked(getVersions).mockReturnValue({
      cli: '1.0.0',
      client: '1.0.0',
    });
    vi.mocked(getLatestCliVersion).mockReturnValue('2.0.0');
    vi.mocked(execAsync).mockRejectedValue(new Error('Update failed'));

    await update({ packageName: 'mintlify' });

    expect(addLogSpy).toHaveBeenCalledTimes(2);
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({ props: { message: 'updating...' } })
    );
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({ props: { message: 'updating mintlify package...' } })
    );
    expect(addErrorLogSpy).toHaveBeenCalledTimes(1);
    expect(addErrorLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'Failed to update mintlify@2.0.0 using npm: Update failed' },
      })
    );
  });
});
