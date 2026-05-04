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
import { SpinnerLog, SuccessLog, ErrorLog, addLog, addErrorLog, clearLogs, getLatestClientVersion, downloadTargetMint, getClientVersion, } from '@mintlify/previewing';
import { execAsync, getLatestCliVersion, getVersions, detectPackageManager } from './helpers.js';
export const update = (_a) => __awaiter(void 0, [_a], void 0, function* ({ packageName }) {
    addLog(_jsx(SpinnerLog, { message: "updating..." }));
    const { cli: existingCliVersion } = getVersions(packageName);
    const latestCliVersion = getLatestCliVersion(packageName);
    const isUpToDate = existingCliVersion && latestCliVersion && latestCliVersion.trim() === existingCliVersion.trim();
    if (!isUpToDate && existingCliVersion && latestCliVersion.trim() !== existingCliVersion.trim()) {
        const packageManager = yield detectPackageManager({ packageName });
        try {
            clearLogs();
            addLog(_jsx(SpinnerLog, { message: `updating ${packageName} package...` }));
            if (packageManager === 'pnpm') {
                yield execAsync(`pnpm install -g ${packageName}@latest --silent`);
            }
            else {
                yield execAsync(`npm install -g ${packageName}@latest --silent`);
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            addErrorLog(_jsx(ErrorLog, { message: `Failed to update ${packageName}@${latestCliVersion} using ${packageManager}: ${errorMessage}` }));
            return;
        }
    }
    clearLogs();
    addLog(_jsx(SpinnerLog, { message: "updating client..." }));
    let clientUpdated = false;
    const latestClientVersion = yield getLatestClientVersion();
    if (latestClientVersion) {
        const existingClientVersion = getClientVersion().trim();
        if (existingClientVersion !== latestClientVersion.trim()) {
            try {
                yield downloadTargetMint({
                    targetVersion: latestClientVersion,
                    existingVersion: existingClientVersion === 'none' ? null : existingClientVersion,
                });
                clientUpdated = true;
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                addErrorLog(_jsx(ErrorLog, { message: `Failed to update client: ${errorMessage}` }));
                return;
            }
        }
    }
    clearLogs();
    if (isUpToDate && !clientUpdated) {
        addLog(_jsx(SuccessLog, { message: "already up to date" }));
    }
    else {
        addLog(_jsx(SuccessLog, { message: `updated ${packageName} to the latest version: ${latestCliVersion}` }));
    }
});
