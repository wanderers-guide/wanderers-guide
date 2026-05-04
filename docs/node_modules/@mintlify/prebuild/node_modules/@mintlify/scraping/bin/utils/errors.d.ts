import type { Result } from '../types/result.js';
export declare function getErrorMessage(error: unknown): string;
export declare function logErrorResults(actionThatFailed: string, results: Array<Result<[string, string]>>): void;
