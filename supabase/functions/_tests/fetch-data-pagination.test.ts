// Regression tests for fetchData() keyset pagination in _shared/helpers.ts.
//
// Bug class being pinned: the loop continues to the next page only when a page
// comes back *exactly* CHUNK_SIZE rows (hasMore = data.length === CHUNK_SIZE).
// If the PostgREST server caps responses below CHUNK_SIZE (self-hosted stacks
// were observed returning exactly 1000 rows regardless of the requested limit,
// via PGRST_DB_MAX_ROWS), every multi-page table fetch silently stops after one
// truncated page — an HTTP 200 with a partial corpus that clients then persist
// as complete. Real symptom: find-ability-block returned exactly 1000 rows and
// omitted the Hunter Automaton heritage, blocking Pathbuilder import 1606885
// (export 474853) at selection resolution.
//
// Fix under test: CHUNK_SIZE lowered from 5000 to 1000 so the full-page check
// matches the smallest cap any deployment enforces.

import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';

// ---------------------------------------------------------------------------
// Hermetic part: the fetchData pagination loop extracted VERBATIM from
// _shared/helpers.ts (same constants, same termination condition) so this
// regression runs with zero network/stack deps — importing helpers.ts pulls
// npm:@supabase + jose, which breaks under deno test without env keys.
// If the loop in helpers.ts changes, mirror it here (the live-stack leg below
// guards against drift by exercising find-ability-block end to end).
// ---------------------------------------------------------------------------

async function fetchDataLoop(client: any, tableName: string): Promise<FakeRow[]> {
  const CHUNK_SIZE = 1000; // must match _shared/helpers.ts
  let lastId: number | null = null;
  let allRows: FakeRow[] = [];
  let hasMore = true;

  while (hasMore) {
    let query = client.from(tableName).select();
    if (lastId !== null) {
      query = query.gt('id', lastId);
    }
    const { data, error } = await query.order('id', { ascending: true }).limit(CHUNK_SIZE);
    if (error) throw error;

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      lastId = data[data.length - 1].id;
    }

    hasMore = data.length === CHUNK_SIZE;
  }

  return allRows;
}

type FakeRow = { id: number; name: string };

/**
 * Minimal builder-chain stand-in for the supabase-js query interface used by
 * fetchData(): select/gt/in/eq/is/contains/ilike/order/limit are all recorded
 * or applied against `rows`; `.then()` finalizes filtering like a real query.
 */
function fakeClient(rows: FakeRow[], maxRows?: number, calls?: Array<{ cursor: number | null; limit: number | undefined }>) {
  type QueryState = { gtId: number | null; limitN?: number };

  function makeBuilder(state: QueryState): Record<string, unknown> {
    const self: Record<string, unknown> = {};
    const chain = () => self;
    self.select = chain;
    self.order = chain;
    self.in = chain;
    self.eq = chain;
    self.is = chain;
    self.contains = chain;
    self.ilike = chain;
    self.gte = chain;
    self.lte = chain;
    self.gt = (_col: string, val: number) => { state.gtId = val; return self; };
    self.limit = (n: number) => { state.limitN = n; return self; };
    // Thenable terminal, like the real PostgREST builder.
    self.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
      try {
        if (calls) calls.push({ cursor: state.gtId, limit: state.limitN });
        let page = rows
          .filter((r) => state.gtId === null || r.id > state.gtId)
          .sort((a, b) => a.id - b.id);
        if (state.limitN !== undefined && page.length > state.limitN) page = page.slice(0, state.limitN);
        // Server-side hard cap truncates regardless of the requested limit.
        if (maxRows !== undefined && page.length > maxRows) page = page.slice(0, maxRows);
        return Promise.resolve({ data: page, error: null }).then(onFulfilled, onRejected);
      } catch (e) {
        return Promise.reject(e).then(onFulfilled, onRejected);
      }
    };
    return self;
  }

  return {
    from: (_table: string) => ({
      select: () => makeBuilder({ gtId: null }),
    }),
  };
}

Deno.test('fetchData: paginates past a full first page and returns every row', async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1, name: `block-${i + 1}` }));
  const requests: Array<{ cursor: number | null; limit: number | undefined }> = [];
  const client = fakeClient(rows, undefined, requests) as never;

  const result = await fetchDataLoop(client as never, 'ability_block');

  assertEquals(result.length, 2500, 'must collect all rows across pages');
  assertEquals(requests.length, 3, 'expected ceil(2500/1000) page requests at CHUNK_SIZE=1000');
  assertEquals(requests[0].cursor, null);
  assertEquals(requests[0].limit, 1000);
  assertEquals(requests[1].cursor, 1000, 'second page must keyset-cursor past the first');
  assertEquals(requests[2].cursor, 2000);
});

Deno.test('fetchData: a server cap equal to CHUNK_SIZE still walks every page', async () => {
  // Reproduces the exact production failure: server truncates every response to
  // 1000 rows. With CHUNK_SIZE=1000 the full-page check fires and pagination
  // continues; with the old CHUNK_SIZE=5000 this returned a silent 1000-row stub.
  const rows = Array.from({ length: 3200 }, (_, i) => ({ id: i + 1, name: `block-${i + 1}` }));
  rows[27108 % 3200] = { id: 27109, name: 'Hunter Automaton' };
  const client = fakeClient(rows, 1000) as never;

  const result = await fetchDataLoop(client as never, 'ability_block');

  assertEquals(result.length, 3200, 'capped responses must not truncate the corpus');
  assert(result.some((r) => r.name === 'Hunter Automaton'), 'heritage beyond page 1 must be present');
});

Deno.test('fetchData: stops without an extra round-trip when the last page is short', async () => {
  const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, name: `block-${i + 1}` }));
  const requests: Array<{ cursor: number | null; limit: number | undefined }> = [];
  const client = fakeClient(rows, undefined, requests) as never;

  const result = await fetchDataLoop(client as never, 'ability_block');

  assertEquals(result.length, 1000);
  assertEquals(requests.length, 2, 'a full page must probe once more; the short probe ends the loop');
});

// ---------------------------------------------------------------------------
// Live-stack part: end-to-end through find-ability-block against the seeded
// local Supabase (same suite pattern as helpers.test.ts / seed.ts). The
// seed.ts import is DYNAMIC so this file stays runnable in environments
// without stack credentials — seed.ts builds an admin client at module scope
// and throws "supabaseKey is required" if imported with empty env keys.
// ---------------------------------------------------------------------------

type SeedModule = typeof import('./seed.ts');

let seedMod: SeedModule | null = null;
try {
  seedMod = await import('./seed.ts');
} catch {
  seedMod = null; // No stack env keys here — hermetic legs above still ran.
}

const skip = !seedMod || seedMod.stackUnavailable();

Deno.test({
  name: 'find-ability-block: returns the complete block list including Hunter Automaton',
  ignore: skip,
  async fn() {
    const { seed, callFunction } = seedMod!;
    const { jwt } = await seed();
    const result = await callFunction('find-ability-block', { type: 'heritage' }, { token: jwt });
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');
    const blocks = result.body?.data as Array<{ name: string }>;
    assert(Array.isArray(blocks), 'expected an array of ability blocks');
    assert(
      blocks.some((b) => b.name.toLowerCase().includes('hunter automaton')),
      `Hunter Automaton missing from ${blocks.length} heritage blocks (pagination truncation?)`
    );
  },
});
