var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import os from 'os';
import { isTelemetryEnabled } from '../config.js';
import { TELEMETRY_ASYNC_TIMEOUT_MS } from '../constants.js';
import { getVersions, isAI } from '../helpers.js';
import { getPostHogClient } from './client.js';
import { getDistinctId } from './distinctId.js';
function captureWithTimeout(event, properties) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.race([
            getPostHogClient()
                .captureImmediate({
                distinctId: getDistinctId(),
                event,
                properties,
            })
                .catch(() => { }),
            new Promise((resolve) => {
                const t = setTimeout(resolve, TELEMETRY_ASYNC_TIMEOUT_MS);
                t.unref();
            }),
        ]);
    });
}
export function trackCommand(_a) {
    return __awaiter(this, arguments, void 0, function* ({ command, cliVersion, subdomain, }) {
        if (!isTelemetryEnabled())
            return;
        try {
            yield captureWithTimeout('cli.command.executed', {
                command,
                cli_version: cliVersion,
                os: os.platform(),
                arch: os.arch(),
                node_version: process.version,
                is_ai_agent: isAI(),
                subdomain,
            });
        }
        catch (_b) { }
    });
}
function trackLoginEvent(event, extra) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isTelemetryEnabled())
            return;
        try {
            const { cli: cliVersion } = getVersions();
            yield captureWithTimeout(event, Object.assign(Object.assign({}, extra), { cli_version: cliVersion, os: os.platform(), arch: os.arch(), node_version: process.version }));
        }
        catch (_a) { }
    });
}
export function trackLoginAttempt() {
    return __awaiter(this, void 0, void 0, function* () {
        return trackLoginEvent('cli.login.attempted');
    });
}
export function trackLoginSuccess() {
    return __awaiter(this, void 0, void 0, function* () {
        return trackLoginEvent('cli.login.succeeded');
    });
}
export function trackLoginFailed(reason) {
    return __awaiter(this, void 0, void 0, function* () {
        return trackLoginEvent('cli.login.failed', { reason });
    });
}
export function trackEvent(event, properties) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isTelemetryEnabled())
            return;
        try {
            const { cli: cliVersion } = getVersions();
            yield captureWithTimeout(event, Object.assign(Object.assign({}, properties), { cli_version: cliVersion, os: os.platform(), arch: os.arch(), node_version: process.version, is_ai_agent: isAI() }));
        }
        catch (_a) { }
    });
}
export function trackTelemetryPreferenceChange(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.env.CLI_TEST_MODE === 'true')
            return;
        try {
            const { cli: cliVersion } = getVersions();
            yield captureWithTimeout('cli.telemetry.preference_changed', {
                enabled: options.enabled,
                cli_version: cliVersion,
                os: os.platform(),
                arch: os.arch(),
                node_version: process.version,
            });
        }
        catch (_a) { }
    });
}
