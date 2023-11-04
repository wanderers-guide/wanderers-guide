"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HEADERS = void 0;
// constants.ts
const version_1 = require("./version");
let JS_ENV = '';
// @ts-ignore
if (typeof Deno !== 'undefined') {
    JS_ENV = 'deno';
}
else if (typeof document !== 'undefined') {
    JS_ENV = 'web';
}
else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    JS_ENV = 'react-native';
}
else {
    JS_ENV = 'node';
}
exports.DEFAULT_HEADERS = { 'X-Client-Info': `supabase-js-${JS_ENV}/${version_1.version}` };
//# sourceMappingURL=constants.js.map