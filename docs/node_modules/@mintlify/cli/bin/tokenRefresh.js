var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { STYTCH_CLIENT_ID, TOKEN_ENDPOINT } from './constants.js';
import { getRefreshToken, storeCredentials } from './keyring.js';
let inflightRefresh = null;
export function refreshAccessToken() {
    return __awaiter(this, void 0, void 0, function* () {
        if (inflightRefresh)
            return inflightRefresh;
        inflightRefresh = doRefresh().finally(() => {
            inflightRefresh = null;
        });
        return inflightRefresh;
    });
}
function doRefresh() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const refreshToken = yield getRefreshToken();
            if (!refreshToken)
                return null;
            const res = yield fetch(TOKEN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: STYTCH_CLIENT_ID,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            });
            if (!res.ok)
                return null;
            const body = (yield res.json().catch(() => null));
            if (!(body === null || body === void 0 ? void 0 : body.access_token) || !body.refresh_token)
                return null;
            yield storeCredentials(body.access_token, body.refresh_token);
            return body.access_token;
        }
        catch (_a) {
            return null;
        }
    });
}
