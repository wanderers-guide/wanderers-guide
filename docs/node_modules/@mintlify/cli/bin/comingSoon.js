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
import { addLog, SuccessLog, WarningLog } from '@mintlify/previewing';
import { Text } from 'ink';
import { isTelemetryEnabled } from './config.js';
import { terminate } from './helpers.js';
export function comingSoon(command, packageName) {
    return () => __awaiter(this, void 0, void 0, function* () {
        if (!isTelemetryEnabled()) {
            addLog(_jsx(WarningLog, { message: `Telemetry is disabled, so your vote won't be counted. Enable it with: ${packageName} --telemetry=true` }));
        }
        else {
            addLog(_jsx(SuccessLog, { message: `Thanks for your interest in "${packageName} ${command}"! Your vote has been counted.` }));
        }
        addLog(_jsx(Text, { dimColor: true, children: "This feature is currently in development. Learn more at https://mintlify.com/docs" }));
        yield terminate(0);
    });
}
