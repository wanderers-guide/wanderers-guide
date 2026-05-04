var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PostHog } from 'posthog-node';
const TELEMETRY_ASYNC_TIMEOUT_MS = 10000;
const POSTHOG_API_KEY = 'phc_eNuN6Ojnk9O7uWfC17z12AK85fNR0BY6IiGVy0Gfwzw';
const POSTHOG_HOST = 'https://ph.mintlify.com';
let client = null;
export function getPostHogClient() {
    if (!client) {
        client = new PostHog(POSTHOG_API_KEY, {
            host: POSTHOG_HOST,
        });
    }
    return client;
}
export function shutdownPostHog() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client)
            return;
        try {
            yield Promise.race([
                client.shutdown(),
                new Promise((resolve) => {
                    const t = setTimeout(resolve, TELEMETRY_ASYNC_TIMEOUT_MS);
                    t.unref();
                }),
            ]);
        }
        catch (_a) { }
        client = null;
    });
}
