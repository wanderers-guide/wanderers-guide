import fs from 'fs';
import * as fsExtra from 'fs-extra';
import os from 'os';

import { isTelemetryEnabled, setTelemetryEnabled } from '../src/config.js';
import { TELEMETRY_ASYNC_TIMEOUT_MS } from '../src/constants.js';
import {
  createTelemetryMiddleware,
  getSanitizedCommandForTelemetry,
} from '../src/middlewares/telemetryMiddleware.js';
import { getDistinctId } from '../src/telemetry/distinctId.js';
import * as trackModule from '../src/telemetry/track.js';
import {
  trackCommand,
  trackEvent,
  trackTelemetryPreferenceChange,
} from '../src/telemetry/track.js';

vi.mock('fs-extra', () => ({ ensureDir: vi.fn().mockResolvedValue(undefined) }));

const mockCaptureImmediate = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/telemetry/client.js', () => ({
  getPostHogClient: () => ({ captureImmediate: mockCaptureImmediate }),
  shutdownPostHog: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createTelemetryMiddleware', () => {
  beforeEach(() => {
    vi.spyOn(trackModule, 'trackCommand').mockResolvedValue(undefined);
  });

  it('only tracks once when middleware runs multiple times for the same parse', async () => {
    const middleware = createTelemetryMiddleware();
    await middleware({ _: ['dev'] });
    await middleware({ _: ['dev'] });
    expect(trackModule.trackCommand).toHaveBeenCalledTimes(1);
  });

  it('tracks again for a new middleware instance (new cli invocation)', async () => {
    await createTelemetryMiddleware()({ _: ['dev'] });
    expect(trackModule.trackCommand).toHaveBeenCalledTimes(1);
    await createTelemetryMiddleware()({ _: ['build'] });
    expect(trackModule.trackCommand).toHaveBeenCalledTimes(2);
  });
});

describe('getSanitizedCommandForTelemetry', () => {
  it('includes known scrape subcommands', () => {
    expect(getSanitizedCommandForTelemetry(['scrape', 'page', 'https://example.com'])).toBe(
      'scrape page'
    );
    expect(getSanitizedCommandForTelemetry(['scrape', 'site', 'https://example.com'])).toBe(
      'scrape site'
    );
    expect(getSanitizedCommandForTelemetry(['scrape', 'openapi', './spec.yaml'])).toBe(
      'scrape openapi'
    );
  });

  it('strips positional args from all other commands', () => {
    expect(getSanitizedCommandForTelemetry(['scrape', 'https://example.com'])).toBe('scrape');
    expect(getSanitizedCommandForTelemetry(['openapi-check', 'https://swagger.io/spec.json'])).toBe(
      'openapi-check'
    );
    expect(getSanitizedCommandForTelemetry(['rename', 'a.mdx', 'b.mdx'])).toBe('rename');
    expect(getSanitizedCommandForTelemetry(['new', './my-docs'])).toBe('new');
  });

  it('includes known analytics subcommands', () => {
    expect(getSanitizedCommandForTelemetry(['analytics', 'stats'])).toBe('analytics stats');
    expect(getSanitizedCommandForTelemetry(['analytics', 'search'])).toBe('analytics search');
    expect(getSanitizedCommandForTelemetry(['analytics', 'feedback'])).toBe('analytics feedback');
    expect(getSanitizedCommandForTelemetry(['analytics', 'conversation'])).toBe(
      'analytics conversation'
    );
  });

  it('includes analytics conversation subcommands', () => {
    expect(getSanitizedCommandForTelemetry(['analytics', 'conversation', 'list'])).toBe(
      'analytics conversation list'
    );
    expect(getSanitizedCommandForTelemetry(['analytics', 'conversation', 'view', 'abc123'])).toBe(
      'analytics conversation view'
    );
  });

  it('includes analytics conversation buckets subcommands', () => {
    expect(getSanitizedCommandForTelemetry(['analytics', 'conversation', 'buckets', 'list'])).toBe(
      'analytics conversation buckets list'
    );
    expect(
      getSanitizedCommandForTelemetry(['analytics', 'conversation', 'buckets', 'view', 'abc123'])
    ).toBe('analytics conversation buckets view');
  });

  it('includes known config subcommands', () => {
    expect(getSanitizedCommandForTelemetry(['config', 'set', 'subdomain', 'my-docs'])).toBe(
      'config set'
    );
    expect(getSanitizedCommandForTelemetry(['config', 'get', 'subdomain'])).toBe('config get');
    expect(getSanitizedCommandForTelemetry(['config', 'clear', 'subdomain'])).toBe('config clear');
  });
});

describe('isTelemetryEnabled', () => {
  const savedEnv = process.env;

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.MINTLIFY_TELEMETRY_DISABLED;
    delete process.env.DO_NOT_TRACK;
    delete process.env.CLI_TEST_MODE;
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('is enabled by default when config file does not exist', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    expect(isTelemetryEnabled()).toBe(true);
  });

  it('is disabled when config file has telemetryEnabled: false', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ telemetryEnabled: false }));
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is enabled when config file has telemetryEnabled: true', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ telemetryEnabled: true }));
    expect(isTelemetryEnabled()).toBe(true);
  });

  it('is disabled via CLI_TEST_MODE=true', () => {
    process.env.CLI_TEST_MODE = 'true';
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is disabled via MINTLIFY_TELEMETRY_DISABLED=1', () => {
    process.env.MINTLIFY_TELEMETRY_DISABLED = '1';
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is disabled via DO_NOT_TRACK=1', () => {
    process.env.DO_NOT_TRACK = '1';
    expect(isTelemetryEnabled()).toBe(false);
  });
});

describe('setTelemetryEnabled', () => {
  beforeEach(() => {
    vi.mocked(fsExtra.ensureDir).mockResolvedValue(undefined);
  });

  it('writes telemetryEnabled into config.json', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    await setTelemetryEnabled(false);

    expect(fsExtra.ensureDir).toHaveBeenCalledWith(expect.stringContaining('mintlify'));
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      JSON.stringify({ telemetryEnabled: false }, null, 2)
    );
  });

  it('merges with existing config fields', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ someOtherSetting: true }));
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    await setTelemetryEnabled(false);

    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      JSON.stringify({ someOtherSetting: true, telemetryEnabled: false }, null, 2)
    );
  });
});

describe('getDistinctId', () => {
  it('returns the persisted UUID', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    vi.spyOn(fs, 'readFileSync').mockReturnValue(id);
    expect(getDistinctId()).toBe(id);
  });

  it('generates and persists a new UUID when none exists', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    const id = getDistinctId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('anonymous-id'), id, {
      flag: 'wx',
    });
  });

  it('overwrites anonymous-id when it exists but is not a valid UUID', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('not-a-uuid');
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation((...args) => {
      const opts = args[2] as { flag?: string } | undefined;
      if (opts?.flag === 'wx') {
        throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
      }
    });

    const id = getDistinctId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('anonymous-id'), id, {
      flag: 'wx',
    });
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('anonymous-id'), id);
  });

  it('reuses the same id when the file cannot be persisted (stable machine fallback)', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('EACCES');
    });

    const a = getDistinctId();
    const b = getDistinctId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('trackCommand', () => {
  const savedEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCaptureImmediate.mockResolvedValue(undefined);
    process.env = { ...savedEnv };
    delete process.env.CLI_TEST_MODE;
    delete process.env.MINTLIFY_TELEMETRY_DISABLED;
    delete process.env.DO_NOT_TRACK;
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ telemetryEnabled: true }));
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('captures event when telemetry is enabled', async () => {
    await trackCommand({ command: 'dev', cliVersion: '1.0.0' });

    expect(mockCaptureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cli.command.executed',
        properties: expect.objectContaining({
          command: 'dev',
          cli_version: '1.0.0',
          os: os.platform(),
        }),
      })
    );
  });

  it('does not capture when config has telemetryEnabled: false', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ telemetryEnabled: false }));
    await trackCommand({ command: 'dev' });
    expect(mockCaptureImmediate).not.toHaveBeenCalled();
  });

  it('does not capture when MINTLIFY_TELEMETRY_DISABLED is set', async () => {
    process.env.MINTLIFY_TELEMETRY_DISABLED = '1';
    await trackCommand({ command: 'dev' });
    expect(mockCaptureImmediate).not.toHaveBeenCalled();
  });

  it('resolves when captureImmediate hangs after timeout', async () => {
    mockCaptureImmediate.mockImplementation(() => new Promise(() => {}));
    vi.useFakeTimers();
    try {
      const done = trackCommand({ command: 'dev' });
      await vi.advanceTimersByTimeAsync(TELEMETRY_ASYNC_TIMEOUT_MS);
      await expect(done).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('trackEvent', () => {
  const savedEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCaptureImmediate.mockResolvedValue(undefined);
    process.env = { ...savedEnv };
    delete process.env.CLI_TEST_MODE;
    delete process.env.MINTLIFY_TELEMETRY_DISABLED;
    delete process.env.DO_NOT_TRACK;
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ telemetryEnabled: true }));
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('captures a custom event with standard metadata', async () => {
    await trackEvent('cli.dev.started', { subdomain: 'test-docs', port: 3000 });

    expect(mockCaptureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cli.dev.started',
        properties: expect.objectContaining({
          subdomain: 'test-docs',
          port: 3000,
          cli_version: expect.any(String),
          os: os.platform(),
          arch: os.arch(),
          node_version: process.version,
        }),
      })
    );
  });

  it('captures event without extra properties', async () => {
    await trackEvent('cli.validate.executed');

    expect(mockCaptureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cli.validate.executed',
        properties: expect.objectContaining({
          os: os.platform(),
        }),
      })
    );
  });

  it('does not capture when telemetry is disabled', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ telemetryEnabled: false }));
    await trackEvent('cli.dev.started', { subdomain: 'test-docs' });
    expect(mockCaptureImmediate).not.toHaveBeenCalled();
  });

  it('does not capture when MINTLIFY_TELEMETRY_DISABLED is set', async () => {
    process.env.MINTLIFY_TELEMETRY_DISABLED = '1';
    await trackEvent('cli.dev.started');
    expect(mockCaptureImmediate).not.toHaveBeenCalled();
  });

  it('does not throw when captureImmediate rejects', async () => {
    mockCaptureImmediate.mockRejectedValue(new Error('network error'));
    await expect(trackEvent('cli.dev.started')).resolves.toBeUndefined();
  });
});

describe('trackTelemetryPreferenceChange', () => {
  const savedEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCaptureImmediate.mockResolvedValue(undefined);
    process.env = { ...savedEnv };
    delete process.env.CLI_TEST_MODE;
    delete process.env.MINTLIFY_TELEMETRY_DISABLED;
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('captures cli.telemetry.preference_changed when enabling', async () => {
    await trackTelemetryPreferenceChange({ enabled: true });

    expect(mockCaptureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cli.telemetry.preference_changed',
        properties: expect.objectContaining({ enabled: true, os: os.platform() }),
      })
    );
  });

  it('captures cli.telemetry.preference_changed when disabling', async () => {
    await trackTelemetryPreferenceChange({ enabled: false });

    expect(mockCaptureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cli.telemetry.preference_changed',
        properties: expect.objectContaining({ enabled: false, os: os.platform() }),
      })
    );
  });

  it('fires even when MINTLIFY_TELEMETRY_DISABLED is set (captures opt-out)', async () => {
    process.env.MINTLIFY_TELEMETRY_DISABLED = '1';
    await trackTelemetryPreferenceChange({ enabled: false });
    expect(mockCaptureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'cli.telemetry.preference_changed' })
    );
  });

  it('does not capture when CLI_TEST_MODE is set', async () => {
    process.env.CLI_TEST_MODE = 'true';
    await trackTelemetryPreferenceChange({ enabled: true });
    expect(mockCaptureImmediate).not.toHaveBeenCalled();
  });
});
