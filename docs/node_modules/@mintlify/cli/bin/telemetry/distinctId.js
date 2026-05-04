import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CONFIG_DIR } from '../constants.js';
const ID_FILE = path.join(CONFIG_DIR, 'anonymous-id');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function readValidIdFromFile() {
    try {
        const raw = fs.readFileSync(ID_FILE, 'utf-8').trim();
        if (UUID_RE.test(raw))
            return raw;
    }
    catch (_a) { }
    return null;
}
function stableMachineDistinctId() {
    var _a, _b;
    const h = crypto.createHash('sha256');
    h.update(os.hostname());
    h.update('\0');
    h.update(os.homedir());
    h.update('\0');
    h.update((_b = (_a = process.env.USER) !== null && _a !== void 0 ? _a : process.env.USERNAME) !== null && _b !== void 0 ? _b : '');
    const hex = h.digest('hex').slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
function tryPersistId(id) {
    fs.mkdirSync(path.dirname(ID_FILE), { recursive: true });
    fs.writeFileSync(ID_FILE, id, { flag: 'wx' });
}
export function getDistinctId() {
    var _a, _b, _c;
    const existing = readValidIdFromFile();
    if (existing)
        return existing;
    const randomId = crypto.randomUUID();
    try {
        tryPersistId(randomId);
        return (_a = readValidIdFromFile()) !== null && _a !== void 0 ? _a : randomId;
    }
    catch (err) {
        const code = err.code;
        if (code === 'EEXIST') {
            const concurrent = readValidIdFromFile();
            if (concurrent)
                return concurrent;
            try {
                fs.writeFileSync(ID_FILE, randomId);
            }
            catch (_d) { }
            return (_b = readValidIdFromFile()) !== null && _b !== void 0 ? _b : randomId;
        }
    }
    const stable = stableMachineDistinctId();
    try {
        fs.mkdirSync(path.dirname(ID_FILE), { recursive: true });
        fs.writeFileSync(ID_FILE, stable);
    }
    catch (_e) { }
    return (_c = readValidIdFromFile()) !== null && _c !== void 0 ? _c : stable;
}
