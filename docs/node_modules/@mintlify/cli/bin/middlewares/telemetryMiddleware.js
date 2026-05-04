var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getConfigValue } from '../config.js';
import { getVersions } from '../helpers.js';
import { trackCommand } from '../telemetry/track.js';
const SCRAPE_SUBCOMMANDS = new Set(['page', 'site', 'openapi']);
const ANALYTICS_SUBCOMMANDS = new Set(['stats', 'search', 'feedback', 'conversation']);
const CONFIG_SUBCOMMANDS = new Set(['set', 'get', 'clear']);
const CONVERSATION_SUBCOMMANDS = new Set(['list', 'view', 'buckets']);
const BUCKETS_SUBCOMMANDS = new Set(['list', 'view']);
export function getSanitizedCommandForTelemetry(_) {
    const parts = _.filter((p) => typeof p === 'string');
    if (parts.length === 0)
        return '';
    const first = parts[0];
    const second = parts[1];
    const third = parts[2];
    if (first === 'scrape' && second !== undefined && SCRAPE_SUBCOMMANDS.has(second)) {
        return `scrape ${second}`;
    }
    if (first === 'config' && second !== undefined && CONFIG_SUBCOMMANDS.has(second)) {
        return `config ${second}`;
    }
    if (first === 'analytics' && second !== undefined && ANALYTICS_SUBCOMMANDS.has(second)) {
        if (second === 'conversation' && third !== undefined) {
            if (CONVERSATION_SUBCOMMANDS.has(third)) {
                const fourth = parts[3];
                if (third === 'buckets' && fourth !== undefined && BUCKETS_SUBCOMMANDS.has(fourth)) {
                    return `analytics conversation buckets ${fourth}`;
                }
                return `analytics conversation ${third}`;
            }
        }
        return `analytics ${second}`;
    }
    return first;
}
export function createTelemetryMiddleware() {
    let tracked = false;
    return function telemetryMiddleware(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = argv._[0];
            if (typeof command === 'string') {
                if (tracked)
                    return;
                tracked = true;
                const sanitizedCommand = getSanitizedCommandForTelemetry(argv._);
                const { cli: cliVersion } = getVersions();
                const subdomain = getConfigValue('subdomain');
                void trackCommand({ command: sanitizedCommand, cliVersion, subdomain });
            }
        });
    };
}
