var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { authenticatedFetch } from '../authenticatedFetch.js';
import { API_URL } from '../constants.js';
export function resolveScoreForUrl(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const endpoint = new URL(`${API_URL}/api/cli/score`);
        endpoint.searchParams.set('url', url);
        const res = yield authenticatedFetch(endpoint.toString(), {
            headers: { Accept: 'application/json' },
        });
        if (res.status !== 200 && res.status !== 202) {
            const body = yield res.text().catch(() => '');
            throw new Error(`API error (${res.status}): ${body || res.statusText}`);
        }
        return res.json();
    });
}
export function fetchScoreBySlug(slug) {
    return __awaiter(this, void 0, void 0, function* () {
        const endpoint = new URL(`${API_URL}/api/cli/score/${encodeURIComponent(slug)}`);
        const res = yield authenticatedFetch(endpoint.toString(), {
            headers: { Accept: 'application/json' },
        });
        if (res.status === 202)
            return null;
        if (!res.ok) {
            const body = yield res.text().catch(() => '');
            throw new Error(`API error (${res.status}): ${body || res.statusText}`);
        }
        return res.json();
    });
}
