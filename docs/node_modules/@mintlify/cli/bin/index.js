#!/usr/bin/env node
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b, _c;
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageName = path.basename((_a = process.argv[1]) !== null && _a !== void 0 ? _a : '') === 'index.js'
    ? 'mint'
    : path.basename((_b = process.argv[1]) !== null && _b !== void 0 ? _b : '') || 'mint';
let cli = null;
let isShuttingDown = false;
let hasExited = false;
const cleanup = () => __awaiter(void 0, void 0, void 0, function* () {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    if (cli && !cli.killed) {
        try {
            cli.kill('SIGTERM');
            yield new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (cli && !cli.killed) {
                        cli.kill('SIGKILL');
                    }
                    resolve();
                }, 5000);
                cli.once('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
        }
        catch (error) {
            // ignore
        }
    }
});
const exitProcess = (code) => {
    if (hasExited)
        return;
    hasExited = true;
    process.exit(code);
};
const killSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP'];
killSignals.forEach((signal) => {
    process.on(signal, () => __awaiter(void 0, void 0, void 0, function* () {
        yield cleanup();
        exitProcess(0);
    }));
});
process.on('uncaughtException', () => __awaiter(void 0, void 0, void 0, function* () {
    yield cleanup();
    exitProcess(1);
}));
process.on('unhandledRejection', () => __awaiter(void 0, void 0, void 0, function* () {
    yield cleanup();
    exitProcess(1);
}));
// Arguments are passed as array elements to spawn() without shell: true,
// so shell metacharacters are not interpreted and command injection is prevented.
const userArgs = process.argv.slice(2);
try {
    cli = spawn('node', ['--no-deprecation', path.join(__dirname, '../bin/start.js'), ...userArgs], {
        stdio: 'inherit',
        env: Object.assign(Object.assign({}, process.env), { MINTLIFY_PACKAGE_NAME: packageName, CLI_TEST_MODE: (_c = process.env.CLI_TEST_MODE) !== null && _c !== void 0 ? _c : 'false' }),
        windowsHide: process.platform === 'win32',
        detached: false,
    });
    cli.on('error', (error) => __awaiter(void 0, void 0, void 0, function* () {
        console.error(`Failed to start ${packageName}: ${error.message}`);
        yield cleanup();
        exitProcess(1);
    }));
    cli.on('exit', (code) => {
        exitProcess(code !== null && code !== void 0 ? code : 0);
    });
}
catch (error) {
    console.error(`Failed to start ${packageName}: ${error}`);
    exitProcess(1);
}
process.on('exit', () => {
    if (cli && !cli.killed) {
        try {
            cli.kill('SIGKILL');
        }
        catch (error) {
            // ignore
        }
    }
});
export { cli };
