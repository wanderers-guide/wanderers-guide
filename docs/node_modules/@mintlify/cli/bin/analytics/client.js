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
function request(path_1) {
    return __awaiter(this, arguments, void 0, function* (path, params = {}) {
        const url = new URL(`${API_URL}/api/cli/analytics${path}`);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined)
                url.searchParams.set(key, String(value));
        }
        const res = yield authenticatedFetch(url.toString(), {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
            const body = yield res.text().catch(() => '');
            throw new Error(`API error (${res.status}): ${body || res.statusText}`);
        }
        return res.json();
    });
}
export function getKpi(opts, subdomain) {
    return request('/kpi', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getFeedback(opts, subdomain) {
    return request('/feedback', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getFeedbackByPage(opts, subdomain) {
    return request('/feedback/by-page', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getConversations(opts, subdomain) {
    return request('/assistant', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getSearches(opts, subdomain) {
    return request('/searches', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getViews(opts, subdomain) {
    return request('/views', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getVisitors(opts, subdomain) {
    return request('/visitors', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getBuckets(opts, subdomain) {
    return request('/conversations/buckets', Object.assign(Object.assign({}, opts), { subdomain }));
}
export function getBucketThreads(bucketId, opts, subdomain) {
    return request(`/conversations/buckets/${encodeURIComponent(bucketId)}`, Object.assign(Object.assign({}, opts), { subdomain }));
}
