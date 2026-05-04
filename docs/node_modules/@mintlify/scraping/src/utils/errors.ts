import type { Result } from '../types/result.js';
import { log } from './log.js';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? `: ${error.message}` : '';
}

export function logErrorResults(
  actionThatFailed: string,
  results: Array<Result<[string, string]>>
) {
  const sumOfErrors = results.reduce(
    (prev, curr) => (Number.isNaN(Number(curr.success)) ? prev : prev + Number(!curr.success)),
    0
  );

  if (sumOfErrors > 0) {
    log(`We encountered ${sumOfErrors} errors when ${actionThatFailed}`, 'warn');
    results.forEach((result) => {
      if (result.success) return;
      log(result.message, 'failure');
    });
  }
}
