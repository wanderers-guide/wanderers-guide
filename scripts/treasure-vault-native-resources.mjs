import assert from 'node:assert/strict';

/** A bounded policy for each newly created test PostgreSQL container, not the whole host. */
export function nativeDatabaseResourceLimits() {
  return {Memory:1073741824,MemorySwap:1073741824,NanoCpus:1000000000};
}

/** Call only after fresh exact owner/image/container verification; these are actual HostConfig values. */
export function assertNativeDatabaseResourceLimits(row) {
  assert.ok(row?.HostConfig&&typeof row.HostConfig==='object'&&!Array.isArray(row.HostConfig),'Actual owned database HostConfig');
  const expected=nativeDatabaseResourceLimits();
  const observed=Object.fromEntries(Object.keys(expected).map(field=>[field,row.HostConfig[field]]));
  for(const field of Object.keys(expected))assert.equal(observed[field],expected[field],'Exact new-owned PostgreSQL '+field+' limit');
  return observed;
}

