import * as previewing from '@mintlify/previewing';
import inquirer from 'inquirer';
import { mockProcessExit } from 'vitest-mock-process';

import { runCommand } from './utils.js';

vi.mock('@mintlify/previewing', async () => {
  const originalModule =
    await vi.importActual<typeof import('@mintlify/previewing')>('@mintlify/previewing');
  return {
    ...originalModule,
    dev: vi.fn(),
  };
});

vi.mock('readline/promises', () => {
  return {
    createInterface: () => {
      return {
        close: () => undefined,
        question: (question: string) => {
          console.log(question);
          return 'y';
        },
      };
    },
  };
});

const allowedPorts = [3000, 5002];

vi.mock('detect-port', () => ({
  default: (port: number) => (allowedPorts.includes(port) ? port : port + 1),
}));

const devSpy = vi.spyOn(previewing, 'dev');
const addLogSpy = vi.spyOn(previewing, 'addLog');
const processExitMock = mockProcessExit();

describe('checkPort', () => {
  let originalArgv: string[];

  beforeEach(() => {
    // Remove all cached modules, otherwise the same results are shown in subsequent tests.
    vi.resetModules();

    // mock inquirer prompt
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({ action: 'continue' });

    // Keep track of original process arguments.
    originalArgv = process.argv;
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Set process arguments back to the original value.
    process.argv = originalArgv;
  });

  it('should run dev command', async () => {
    await runCommand('dev');

    expect(devSpy).toHaveBeenCalledWith(expect.objectContaining({ port: 3000 }));
  });

  it('port 5000 and 5001 should be taken and 5002 should be accepted by the user and available.', async () => {
    await runCommand('dev', '--port=5000');

    expect(addLogSpy).toHaveBeenCalledTimes(2);
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'port 5000 is already in use. trying 5001 instead' },
      })
    );
    expect(addLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { message: 'port 5001 is already in use. trying 5002 instead' },
      })
    );
  });

  it('fails after the 10th used port', async () => {
    await runCommand('dev', '--port=8000');

    expect(addLogSpy).toHaveBeenCalledTimes(10);
    expect(addLogSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ props: { message: 'no available port found' } })
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });
});
