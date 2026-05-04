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
var _a;
import { cli } from './cli.js';
import { shutdownPostHog } from './telemetry/client.js';
const packageName = (_a = process.env.MINTLIFY_PACKAGE_NAME) !== null && _a !== void 0 ? _a : 'mint';
cli({ packageName }).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
function shutdown(exitCode) {
    return __awaiter(this, void 0, void 0, function* () {
        yield shutdownPostHog();
        process.exit(exitCode);
    });
}
process.once('beforeExit', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield shutdownPostHog();
    }
    catch (_a) { }
}));
process.on('SIGINT', () => {
    void shutdown(130);
});
process.on('SIGTERM', () => {
    void shutdown(143);
});
