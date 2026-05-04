var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fs from 'fs';
import { ensureDir } from 'fs-extra';
import { CLI_CONFIG_FILE, CONFIG_DIR } from './constants.js';
function readConfig() {
    try {
        const raw = fs.readFileSync(CLI_CONFIG_FILE, 'utf-8');
        return JSON.parse(raw);
    }
    catch (_a) {
        return {};
    }
}
function writeConfig(updates) {
    return __awaiter(this, void 0, void 0, function* () {
        yield ensureDir(CONFIG_DIR);
        const existing = readConfig();
        fs.writeFileSync(CLI_CONFIG_FILE, JSON.stringify(Object.assign(Object.assign({}, existing), updates), null, 2));
    });
}
export function isTelemetryEnabled() {
    if (process.env.CLI_TEST_MODE === 'true')
        return false;
    if (process.env.MINTLIFY_TELEMETRY_DISABLED === '1')
        return false;
    if (process.env.DO_NOT_TRACK === '1')
        return false;
    return readConfig().telemetryEnabled !== false;
}
export function setTelemetryEnabled(enabled) {
    return __awaiter(this, void 0, void 0, function* () {
        yield writeConfig({ telemetryEnabled: enabled });
    });
}
export function getConfigValue(key) {
    const config = readConfig();
    return config[key];
}
export function setConfigValue(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
        yield writeConfig({ [key]: value });
    });
}
export function clearConfigValue(key) {
    return __awaiter(this, void 0, void 0, function* () {
        yield writeConfig({ [key]: undefined });
    });
}
