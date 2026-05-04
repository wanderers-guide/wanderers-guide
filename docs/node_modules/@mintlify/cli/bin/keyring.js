var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const SERVICE = 'mintlify';
const ACCESS_TOKEN_ACCOUNT = 'access_token';
const REFRESH_TOKEN_ACCOUNT = 'refresh_token';
function getKeytar() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const mod = yield import('keytar');
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ESM wraps CJS in { default: ... } at runtime despite types
            return (_a = mod.default) !== null && _a !== void 0 ? _a : mod;
        }
        catch (_b) {
            throw new Error('keytar is required for credential storage but is not installed. Install it with: npm install keytar');
        }
    });
}
export function storeCredentials(accessToken, refreshToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const keytar = yield getKeytar();
        yield Promise.all([
            keytar.setPassword(SERVICE, ACCESS_TOKEN_ACCOUNT, accessToken),
            keytar.setPassword(SERVICE, REFRESH_TOKEN_ACCOUNT, refreshToken),
        ]);
    });
}
export function getAccessToken() {
    return __awaiter(this, void 0, void 0, function* () {
        const keytar = yield getKeytar();
        return keytar.getPassword(SERVICE, ACCESS_TOKEN_ACCOUNT);
    });
}
export function getRefreshToken() {
    return __awaiter(this, void 0, void 0, function* () {
        const keytar = yield getKeytar();
        return keytar.getPassword(SERVICE, REFRESH_TOKEN_ACCOUNT);
    });
}
export function clearCredentials() {
    return __awaiter(this, void 0, void 0, function* () {
        const keytar = yield getKeytar();
        yield Promise.all([
            keytar.deletePassword(SERVICE, ACCESS_TOKEN_ACCOUNT),
            keytar.deletePassword(SERVICE, REFRESH_TOKEN_ACCOUNT),
        ]);
    });
}
