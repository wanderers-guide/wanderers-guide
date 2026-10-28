import assert from 'node:assert/strict';

/** Bound each owned PostgreSQL fixture; three CPUs let its leader and two workers run together.
 * The 1 GiB memory/no-swap limits remain independent of host-wide resource availability.
 */
export function nativeDatabaseResourceLimits() {
  return {Memory:1073741824,MemorySwap:1073741824,NanoCpus:3000000000};
}

/** Call only after fresh exact owner/image/container verification; these are actual HostConfig values. */
export function assertNativeDatabaseResourceLimits(row) {
  assert.ok(row?.HostConfig&&typeof row.HostConfig==='object'&&!Array.isArray(row.HostConfig),'Actual owned database HostConfig');
  const expected=nativeDatabaseResourceLimits();
  const observed=Object.fromEntries(Object.keys(expected).map(field=>[field,row.HostConfig[field]]));
  for(const field of Object.keys(expected))assert.equal(observed[field],expected[field],'Exact new-owned PostgreSQL '+field+' limit');
  return observed;
}

