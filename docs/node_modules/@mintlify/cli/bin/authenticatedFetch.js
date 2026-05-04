var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getAccessToken } from './keyring.js';
import { refreshAccessToken } from './tokenRefresh.js';
function getKeyringToken() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield getAccessToken();
        }
        catch (_a) {
            return null;
        }
    });
}
export function authenticatedFetch(url, init) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyringToken = yield getKeyringToken();
        const envToken = process.env.MINTLIFY_SESSION_TOKEN;
        const token = keyringToken !== null && keyringToken !== void 0 ? keyringToken : envToken;
        if (!token) {
            throw new Error('Not authenticated. Run `mint login` to authenticate.');
        }
        const makeRequest = (t) => fetch(url, Object.assign(Object.assign({}, init), { headers: Object.assign(Object.assign({}, init === null || init === void 0 ? void 0 : init.headers), { Authorization: `Bearer ${t}` }) }));
        const res = yield makeRequest(token);
        if (res.status !== 401)
            return res;
        // If the keyring token expired, try refreshing it
        if (keyringToken) {
            const refreshed = yield refreshAccessToken();
            if (refreshed)
                return makeRequest(refreshed);
        }
        // Fall back to the env session token if it wasn't already used
        if (envToken && token !== envToken) {
            return makeRequest(envToken);
        }
        return res;
    });
}
