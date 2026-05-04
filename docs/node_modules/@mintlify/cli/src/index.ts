#!/usr/bin/env node
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageName =
  path.basename(process.argv[1] ?? '') === 'index.js'
    ? 'mint'
    : path.basename(process.argv[1] ?? '') || 'mint';

let cli: ChildProcess | null = null;
let isShuttingDown = false;
let hasExited = false;

const cleanup = async (): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (cli && !cli.killed) {
    try {
      cli.kill('SIGTERM');

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (cli && !cli.killed) {
            cli.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        cli!.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      // ignore
    }
  }
};

const exitProcess = (code: number) => {
  if (hasExited) return;
  hasExited = true;
  process.exit(code);
};

const killSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP'];
killSignals.forEach((signal) => {
  process.on(signal, async () => {
    await cleanup();
    exitProcess(0);
  });
});

process.on('uncaughtException', async () => {
  await cleanup();
  exitProcess(1);
});

process.on('unhandledRejection', async () => {
  await cleanup();
  exitProcess(1);
});

// Arguments are passed as array elements to spawn() without shell: true,
// so shell metacharacters are not interpreted and command injection is prevented.
const userArgs = process.argv.slice(2);

try {
  cli = spawn('node', ['--no-deprecation', path.join(__dirname, '../bin/start.js'), ...userArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      MINTLIFY_PACKAGE_NAME: packageName,
      CLI_TEST_MODE: process.env.CLI_TEST_MODE ?? 'false',
    },
    windowsHide: process.platform === 'win32',
    detached: false,
  });

  cli.on('error', async (error) => {
    console.error(`Failed to start ${packageName}: ${error.message}`);
    await cleanup();
    exitProcess(1);
  });

  cli.on('exit', (code) => {
    exitProcess(code ?? 0);
  });
} catch (error) {
  console.error(`Failed to start ${packageName}: ${error}`);
  exitProcess(1);
}

process.on('exit', () => {
  if (cli && !cli.killed) {
    try {
      cli.kill('SIGKILL');
    } catch (error) {
      // ignore
    }
  }
});

export { cli };
