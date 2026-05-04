var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { addLog, ErrorLog } from '@mintlify/previewing';
import { Box, Text } from 'ink';
import { z } from 'zod';
import { authenticatedFetch } from './authenticatedFetch.js';
import { getConfigValue } from './config.js';
import { API_URL } from './constants.js';
import { getCliVersion } from './helpers.js';
import { getAccessToken } from './keyring.js';
const StatusResponseSchema = z.object({
    user: z.object({ email: z.string() }),
    org: z.object({ name: z.string() }),
    subdomains: z.array(z.string()).default([]),
});
export function getCliSubdomains(accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch(`${API_URL}/api/cli/status`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok)
                return [];
            const json = yield res.json().catch(() => null);
            const parsed = StatusResponseSchema.safeParse(json);
            return parsed.success ? parsed.data.subdomains : [];
        }
        catch (_a) {
            return [];
        }
    });
}
export function status() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const accessToken = yield getAccessToken();
        if (!accessToken) {
            addLog(_jsx(ErrorLog, { message: "not logged in. Run `mint login` to authenticate." }));
            return;
        }
        try {
            const res = yield authenticatedFetch(`${API_URL}/api/cli/status`);
            if (!res.ok) {
                addLog(_jsx(ErrorLog, { message: "not logged in. Run `mint login` to authenticate." }));
                return;
            }
            const json = yield res.json().catch(() => null);
            const parsed = StatusResponseSchema.safeParse(json);
            if (!parsed.success) {
                addLog(_jsx(ErrorLog, { message: "unexpected response from server. please try again." }));
                return;
            }
            const { user, org, subdomains } = parsed.data;
            const version = getCliVersion();
            const subdomain = (_b = (_a = getConfigValue('subdomain')) !== null && _a !== void 0 ? _a : subdomains[0]) !== null && _b !== void 0 ? _b : null;
            addLog(_jsxs(Box, { flexDirection: "column", paddingY: 1, children: [version && (_jsxs(Box, { children: [_jsx(Box, { minWidth: 16, children: _jsx(Text, { dimColor: true, children: "Version" }) }), _jsx(Text, { children: version })] })), _jsxs(Box, { children: [_jsx(Box, { minWidth: 16, children: _jsx(Text, { dimColor: true, children: "Email" }) }), _jsx(Text, { children: user.email })] }), _jsxs(Box, { children: [_jsx(Box, { minWidth: 16, children: _jsx(Text, { dimColor: true, children: "Organization" }) }), _jsx(Text, { children: org.name })] }), subdomain && (_jsxs(Box, { children: [_jsx(Box, { minWidth: 16, children: _jsx(Text, { dimColor: true, children: "Subdomain" }) }), _jsx(Text, { children: subdomain })] }))] }));
        }
        catch (e) {
            addLog(_jsx(ErrorLog, { message: "unexpected response from server. please try again." }));
        }
    });
}
