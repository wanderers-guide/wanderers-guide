import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

/** Accept only the reviewed state before or after a content migration. */
export function assertReviewedTransition(actual, before, after, label) {
  if (isDeepStrictEqual(actual, before)) return 'before';
  assert.deepEqual(actual, after, label);
  return 'after';
}
