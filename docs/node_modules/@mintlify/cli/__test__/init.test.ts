import { input, select } from '@inquirer/prompts';

import { isAI } from '../src/helpers.js';
import { init } from '../src/init.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
}));

vi.mock('../src/helpers.js', () => ({
  isAI: vi.fn().mockReturnValue(false),
}));

vi.mock('@mintlify/previewing', () => ({
  addLogs: vi.fn(),
  addLog: vi.fn(),
  SpinnerLog: vi.fn(),
  removeLastLog: vi.fn(),
}));

vi.mock('@mintlify/validation', async () => {
  const original =
    await vi.importActual<typeof import('@mintlify/validation')>('@mintlify/validation');
  return {
    ...original,
    docsConfigSchema: {
      options: [{ shape: { theme: { _def: { value: 'quill' } } } }],
    },
  };
});

vi.mock('fs-extra', () => ({
  default: {
    readdir: vi.fn().mockResolvedValue([]),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    readJson: vi.fn().mockResolvedValue({ theme: 'quill', name: 'Test' }),
    writeJson: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('adm-zip', () => ({
  default: vi.fn().mockImplementation(() => ({
    extractAllTo: vi.fn(),
  })),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  json: () => Promise.resolve([]),
});

describe('init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      json: () => Promise.resolve([]),
    });
  });

  describe('path traversal prevention', () => {
    it('rejects path traversal with ../', async () => {
      await expect(init('../outside', false, 'quill', 'Test')).rejects.toThrow(
        'Access denied: path: ../outside is outside the current directory'
      );
    });

    it('rejects deep path traversal', async () => {
      await expect(init('../../../etc', false, 'quill', 'Test')).rejects.toThrow(
        'Access denied: path: ../../../etc is outside the current directory'
      );
    });

    it('rejects absolute paths outside cwd', async () => {
      await expect(init('/etc/test', false, 'quill', 'Test')).rejects.toThrow(
        'Access denied: path: /etc/test is outside the current directory'
      );
    });

    it('allows current directory (.)', async () => {
      await expect(init('.', false, 'quill', 'Test')).resolves.not.toThrow();
    });

    it('allows subdirectory paths', async () => {
      await expect(init('docs', false, 'quill', 'Test')).resolves.not.toThrow();
    });

    it('allows nested subdirectory paths', async () => {
      await expect(init('docs/api', false, 'quill', 'Test')).resolves.not.toThrow();
    });
  });

  describe('AI agent guard for template without name', () => {
    it('does not call interactive prompts when AI uses --template without --name', async () => {
      vi.mocked(isAI).mockReturnValue(true);

      await init('.', false, undefined, undefined, 'some-template');

      expect(input).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
    });

    it('does not call interactive prompts when AI omits both --template and --theme', async () => {
      vi.mocked(isAI).mockReturnValue(true);

      await init('.', false, undefined, 'MyProject');

      expect(input).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
    });
  });
});
