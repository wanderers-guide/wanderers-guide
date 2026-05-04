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
import { input, search } from '@inquirer/prompts';
import { addLog, ErrorLog, InfoLog, SuccessLog } from '@mintlify/previewing';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import open from 'open';
import { calculatePKCECodeChallenge, randomNonce, randomPKCECodeVerifier, randomState, } from 'openid-client';
import { startCallbackServer } from './callbackServer.js';
import { setConfigValue } from './config.js';
import { DASHBOARD_URL, STYTCH_CLIENT_ID, TOKEN_ENDPOINT } from './constants.js';
import { storeCredentials } from './keyring.js';
import { getCliSubdomains } from './status.js';
import { trackLoginAttempt, trackLoginFailed, trackLoginSuccess } from './telemetry/track.js';
export function login() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const codeVerifier = randomPKCECodeVerifier();
        const codeChallenge = yield calculatePKCECodeChallenge(codeVerifier);
        const nonce = randomNonce();
        const clientState = randomState();
        const state = Buffer.from(JSON.stringify({ nonce, clientState })).toString('base64url');
        const authorizeUrl = new URL('/api/cli/oauth/authorize', DASHBOARD_URL);
        authorizeUrl.searchParams.set('state', state);
        authorizeUrl.searchParams.set('code_challenge', codeChallenge);
        const url = authorizeUrl.toString();
        void trackLoginAttempt();
        const { codePromise, close: closeServer } = yield startCallbackServer();
        addLog(_jsxs(Box, { flexDirection: "column", gap: 1, paddingY: 1, children: [_jsxs(Text, { bold: true, children: [_jsx(Text, { color: "green", children: "\u25C6 " }), "A browser window will open for Mintlify authentication"] }), _jsxs(Box, { flexDirection: "column", paddingLeft: 3, gap: 1, children: [_jsx(Text, { dimColor: true, children: "If your browser doesn't open automatically, copy this URL:" }), _jsx(Text, { dimColor: true, children: url })] })] }));
        open(url).catch(() => { });
        addLog(_jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginTop: 1, children: [_jsx(Text, { dimColor: true, children: "\u256D\u2500 Paste the authorization code from your browser" }), _jsx(Text, { dimColor: true, children: "\u2502" })] }));
        // Let ink finish rendering before inquirer takes over stdout
        yield new Promise((resolve) => setTimeout(resolve, 50));
        const inputPromise = input({
            message: '█',
            theme: {
                prefix: chalk.dim(' │'),
                style: {
                    answer: (text) => chalk.cyan(text),
                },
            },
        });
        let code;
        try {
            code = yield Promise.race([codePromise, inputPromise]);
        }
        catch (_c) {
            closeServer();
            inputPromise.cancel();
            addLog(_jsx(ErrorLog, { message: "login cancelled" }));
            return;
        }
        closeServer();
        inputPromise.cancel();
        const res = yield fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STYTCH_CLIENT_ID,
                grant_type: 'authorization_code',
                code,
                code_verifier: codeVerifier,
                redirect_uri: `${DASHBOARD_URL}/api/cli/oauth/callback`,
            }),
        });
        const body = yield res.json().catch(() => ({}));
        if (!res.ok) {
            const reason = (_b = (_a = body.error_message) !== null && _a !== void 0 ? _a : body.error) !== null && _b !== void 0 ? _b : 'unknown error';
            void trackLoginFailed(reason);
            addLog(_jsx(ErrorLog, { message: `login failed: ${reason}` }));
            return;
        }
        const token = body;
        yield storeCredentials(token.access_token, token.refresh_token);
        void trackLoginSuccess();
        addLog(_jsx(SuccessLog, { message: "logged in successfully" }));
        yield promptSubdomainSelection(token.access_token);
    });
}
function isPromptCancellationError(error) {
    return error instanceof Error && error.name === 'ExitPromptError';
}
function promptSubdomainSelection(accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const subdomains = yield getCliSubdomains(accessToken);
        if (subdomains.length === 0)
            return;
        if (subdomains.length === 1) {
            yield setConfigValue('subdomain', subdomains[0]);
            addLog(_jsx(InfoLog, { message: `default project set to ${subdomains[0]}` }));
            return;
        }
        yield new Promise((resolve) => setTimeout(resolve, 50));
        let chosen;
        try {
            chosen = yield search({
                message: 'Select a default project',
                source: (term) => {
                    const results = term
                        ? subdomains.filter((s) => s.toLowerCase().includes(term.toLowerCase()))
                        : subdomains;
                    return results.map((s) => ({ name: s, value: s }));
                },
            });
        }
        catch (error) {
            if (isPromptCancellationError(error)) {
                addLog(_jsx(InfoLog, { message: `No project set. To set a default project, run ${chalk.bold('mintlify config set subdomain <subdomain>')}` }));
                return;
            }
            throw error;
        }
        yield setConfigValue('subdomain', chosen);
        addLog(_jsx(InfoLog, { message: `default project set to ${chosen}` }));
    });
}
