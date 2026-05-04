var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx } from "react/jsx-runtime";
import { validate, getOpenApiDocumentFromUrl, isAllowedLocalSchemaUrl } from '@mintlify/common';
import { addLog, ErrorLog, SuccessLog, WarningLog } from '@mintlify/previewing';
import { readLocalOpenApiFile } from './helpers.js';
export const getOpenApiFilenamesFromDocsConfig = (config) => {
    var _a;
    const openapi = (_a = config.api) === null || _a === void 0 ? void 0 : _a.openapi;
    if (openapi === undefined)
        return [];
    if (typeof openapi === 'string')
        return [openapi];
    if (Array.isArray(openapi))
        return openapi;
    return [openapi.source];
};
export const checkOpenApiFile = (filename, localSchema) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (isAllowedLocalSchemaUrl(filename, localSchema)) {
            yield getOpenApiDocumentFromUrl(filename);
            addLog(_jsx(SuccessLog, { message: "OpenAPI definition is valid." }));
            return true;
        }
        if (filename.startsWith('http://') && !localSchema) {
            addLog(_jsx(WarningLog, { message: "include the --local-schema flag to check locally hosted OpenAPI files" }));
            addLog(_jsx(WarningLog, { message: "only https protocol is supported in production" }));
            return true;
        }
        const document = yield readLocalOpenApiFile(filename);
        if (!document) {
            throw new Error('failed to parse OpenAPI spec: could not parse file correctly, please check for any syntax errors.');
        }
        yield validate(document);
        addLog(_jsx(SuccessLog, { message: "OpenAPI definition is valid." }));
        return true;
    }
    catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            addLog(_jsx(ErrorLog, { message: `file not found, please check the path provided: ${filename}` }));
        }
        else {
            addLog(_jsx(ErrorLog, { message: err instanceof Error ? err.message : 'unknown error' }));
        }
        return false;
    }
});
