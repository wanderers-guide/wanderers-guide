var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { CALLBACK_PORT, DASHBOARD_URL } from './constants.js';
export function startCallbackServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const { default: http } = yield import('http');
        let resolveCode;
        let rejectCode;
        let closed = false;
        const codePromise = new Promise((res, rej) => {
            resolveCode = res;
            rejectCode = rej;
        });
        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', DASHBOARD_URL);
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }
            if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk;
                });
                req.on('end', () => {
                    try {
                        const { code } = JSON.parse(body);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true }));
                        closed = true;
                        server.close();
                        resolveCode(code);
                    }
                    catch (_a) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'invalid body' }));
                    }
                });
            }
            else {
                res.writeHead(405);
                res.end();
            }
        });
        server.listen(CALLBACK_PORT, 'localhost');
        const close = () => {
            if (!closed) {
                closed = true;
                server.close();
                rejectCode(new Error('Login cancelled'));
            }
        };
        return { codePromise, close };
    });
}
