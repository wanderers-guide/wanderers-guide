/** Exercise the real encounter queue, merge rules, response schemas and durable recovery. */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const folder = mkdtempSync(join(tmpdir(), 'wg-encounter-save-'));
after(() => rmSync(folder, { recursive: true, force: true }));
await build({
  stdin: {
    contents: `export * from './src/utils/encounter-character-writer'; export * from './src/utils/character-version'; export * from './src/request/request-rejection';`,
    resolveDir: root,
  },
  absWorkingDir: root,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: `${folder}/writer.mjs`,
});
const { createEncounterCharacterWriter, compareCharacterVersions, RequestRejectedError } = await import(
  `${folder}/writer.mjs`
);
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const row = () => ({
  id: 1,
  name: 'Campaign player',
  user_id: 'player',
  created_at: '',
  updated_at: '2026-09-06T12:00:00.000Z',
  campaign_id: 1,
  level: 1,
  experience: 0,
  hp_current: 20,
  hp_temp: 0,
  hero_points: 1,
  stamina_current: 0,
  resolve_current: 0,
  details: { conditions: [], info: { appearance: 'Original' } },
  meta_data: { reset_hp: false },
  notes: null,
  roll_history: null,
  spells: null,
  operation_data: null,
  inventory: null,
  custom_operations: null,
  options: null,
  variants: null,
  content_sources: null,
  companions: null,
});
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function until(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 2));
  }
  assert.fail('Queue did not reach the expected state');
}
function setup(t, initial = row(), override) {
  storage.clear();
  let server = structuredClone(initial),
    version = 0;
  const requests = [];
  const commit = (body) => {
    const { expected_updated_at, id, ...changes } = body;
    if (expected_updated_at !== server.updated_at) return { __conflict: true, character: structuredClone(server) };
    server = { ...server, ...changes, updated_at: `2026-09-06T12:00:${String(++version).padStart(2, '0')}.000Z` };
    return [structuredClone(server)];
  };
  const writer = createEncounterCharacterWriter({
    actorId: 'gm',
    changed() {},
    request: async (type, body) => {
      requests.push({ type, body: structuredClone(body) });
      return override
        ? override({
            type,
            body,
            commit,
            get server() {
              return server;
            },
            set server(value) {
              server = value;
            },
          })
        : type === 'find-character'
          ? structuredClone(server)
          : commit(body);
    },
  });
  t.after(() => writer.dispose());
  return {
    writer,
    requests,
    get server() {
      return server;
    },
    set server(value) {
      server = value;
    },
  };
}

test('GM HP writes merge newer player details and omit untouched combat/inventory/spell fields', async (t) => {
  const original = row();
  const state = setup(t);
  state.server = {
    ...original,
    hero_points: 2,
    details: { ...original.details, info: { appearance: 'Player edit' }, extension: { retained: true } },
    meta_data: { reset_hp: false, extension: { retained: true } },
    updated_at: '2026-09-06T12:00:00.100Z',
  };
  state.writer.update(original, { ...original, hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  const body = state.requests.find((r) => r.type === 'update-character').body;
  assert.deepEqual(Object.keys(body).sort(), ['expected_updated_at', 'hp_current', 'id']);
  assert.equal(state.server.hero_points, 2);
  assert.equal(state.server.details.info.appearance, 'Player edit');
  assert.deepEqual(state.server.details.extension, { retained: true });
  assert.equal(state.server.hp_current, 15);
  assert.equal(storage.size, 0);
});

test('JSON column patches preserve unknown sibling data while adding a condition', async (t) => {
  const original = row();
  const state = setup(t);
  state.server = {
    ...original,
    details: { ...original.details, extension: { retained: true } },
    meta_data: { reset_hp: false, extension: { retained: true } },
    updated_at: '2026-09-06T12:00:00.100Z',
  };
  state.writer.update(original, {
    ...original,
    details: {
      ...original.details,
      conditions: [
        { name: 'Frightened', description: 'Test condition', value: 1, for_object: false, for_creature: true },
      ],
    },
    meta_data: { reset_hp: true },
  });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.deepEqual(state.server.meta_data.extension, { retained: true });
  assert.equal(state.server.meta_data.reset_hp, true);
  assert.deepEqual(state.server.details.extension, { retained: true });
  assert.equal(state.server.details.conditions[0].name, 'Frightened');
  assert.equal(state.requests.filter((r) => r.type === 'update-character').length, 1);
});

test('simultaneous changes to HP pause with a recoverable draft and no overwrite', async (t) => {
  const original = row();
  const state = setup(t);
  state.server = { ...original, hp_current: 12, updated_at: '2026-09-06T12:00:00.100Z' };
  state.writer.update(original, { ...original, hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'conflict');
  assert.equal(state.server.hp_current, 12);
  assert.deepEqual(state.writer.status(1).conflicts, ['hp_current']);
  assert.equal(state.requests.filter((r) => r.type === 'update-character').length, 0);
  assert.equal(JSON.parse([...storage.values()][0]).body.hp_current, 15);
});

test('pending changes serialize and a later deliberate return to old HP survives ACK', async (t) => {
  const waiting = deferred();
  let writes = 0;
  const state = setup(t, row(), async (request) => {
    if (request.type === 'find-character') return structuredClone(request.server);
    writes++;
    const result = request.commit(request.body);
    if (writes === 1) await waiting.promise;
    return result;
  });
  const original = row();
  state.writer.update(original, { ...original, hp_current: 15 });
  await until(() => writes === 1);
  const pending = state.writer.display(original);
  state.writer.update(pending, { ...pending, hp_current: 20 });
  assert.equal(writes, 1);
  waiting.resolve();
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(state.server.hp_current, 20);
  assert.equal(writes, 2);
  assert.equal(storage.size, 0);
});

for (const withDrained of [false, true]) {
  test(`lost ACK acknowledges committed ${withDrained ? 'Drained and HP' : 'HP'} by reading without replay`, async (t) => {
    let writes = 0;
    const state = setup(t, row(), async (request) => {
      if (request.type === 'find-character') return structuredClone(request.server);
      writes++;
      // HTTP JSON drops optional object properties whose value is undefined.
      request.commit(JSON.parse(JSON.stringify(request.body)));
      return null;
    });
    const original = row();
    const edited = { ...original, hp_current: withDrained ? 19 : 15 };
    if (withDrained)
      edited.details = {
        ...original.details,
        conditions: [
          {
            name: 'Drained',
            description: 'Test condition',
            value: 1,
            for_object: false,
            for_creature: true,
            source: undefined,
          },
        ],
      };
    state.writer.update(original, edited);
    await until(() => state.writer.status(1)?.phase === 'failed');
    assert.ok(JSON.parse([...storage.values()][0]).submission);
    state.writer.retry(1);
    await until(() => state.writer.status(1)?.phase === 'saved');
    assert.equal(writes, 1);
    assert.equal(storage.size, 0);
    assert.deepEqual(state.server.details.conditions, JSON.parse(JSON.stringify(edited.details.conditions)));
    assert.equal(state.server.hp_current, edited.hp_current);
  });
}

test('guard conflicts merge unrelated writes made between GET and POST', async (t) => {
  let writes = 0;
  const state = setup(t, row(), (request) => {
    if (request.type === 'find-character') return structuredClone(request.server);
    if (++writes === 1) request.server = { ...request.server, hero_points: 2, updated_at: '2026-09-06T12:00:00.100Z' };
    return request.commit(request.body);
  });
  state.writer.update(row(), { ...row(), hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(writes, 2);
  assert.equal(state.server.hero_points, 2);
  assert.equal(state.server.hp_current, 15);
});

test('forbidden and empty results never claim the change was saved', async (t) => {
  for (const response of [{ __forbidden: true }, []]) {
    const state = setup(t, row(), (request) => (request.type === 'find-character' ? request.server : response));
    state.writer.update(row(), { ...row(), hp_current: 15 });
    await until(() => ['failed', 'forbidden'].includes(state.writer.status(1)?.phase));
    assert.equal(state.server.hp_current, 20);
    assert.equal(storage.size, 1);
    state.writer.dispose();
  }
});

test('confirmed encounter rejection retains its draft and only a changed edit retries it', async (t) => {
  const state = setup(t, row(), (request) => {
    if (request.type === 'find-character') return structuredClone(request.server);
    if (request.body.hp_current === 15) throw new RequestRejectedError(request.type);
    return request.commit(request.body);
  });
  state.writer.update(row(), { ...row(), hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'rejected');
  assert.equal(JSON.parse([...storage.values()][0]).body.hp_current, 15);
  assert.equal(JSON.parse([...storage.values()][0]).submission, undefined);
  state.writer.retry();
  state.writer.activate();
  assert.equal(state.requests.filter(({ type }) => type === 'update-character').length, 1);
  const current = state.writer.display(row());
  state.writer.update(current, { ...current, hp_current: 16 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(state.server.hp_current, 16);
  assert.equal(state.requests.filter(({ type }) => type === 'update-character').length, 2);
  assert.equal(storage.size, 0);
});

test('a corrected encounter edit queued during rejection still saves automatically', async (t) => {
  const pending = deferred();
  const state = setup(t, row(), async (request) => {
    if (request.type === 'find-character') return structuredClone(request.server);
    if (request.body.hp_current === 15) {
      await pending.promise;
      throw new RequestRejectedError(request.type);
    }
    return request.commit(request.body);
  });
  state.writer.update(row(), { ...row(), hp_current: 15 });
  await until(() => state.requests.filter(({ type }) => type === 'update-character').length === 1);
  const current = state.writer.display(row());
  state.writer.update(current, { ...current, hp_current: 16 });
  pending.resolve();
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(state.server.hp_current, 16);
  assert.equal(state.requests.filter(({ type }) => type === 'update-character').length, 2);
  assert.equal(storage.size, 0);
});

test('acknowledged overlay prevents stale polling from reverting HP, then follows newer reads', async (t) => {
  const state = setup(t);
  state.writer.update(row(), { ...row(), hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(state.writer.display(row()).hp_current, 15);
  const newer = { ...state.server, hp_current: 10, updated_at: '2026-09-06T12:00:20.000Z' };
  assert.equal(state.writer.display(newer).hp_current, 10);
  state.server = newer;
  state.writer.update(newer, { ...newer, hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(state.server.hp_current, 15);
});

test('no-op blur submits nothing and disposing retains only unsynced recovery data', async (t) => {
  const waiting = deferred();
  const state = setup(t, row(), () => waiting.promise);
  state.writer.update(row(), row());
  assert.equal(state.requests.length, 0);
  state.writer.update(row(), { ...row(), hp_current: 15 });
  state.writer.dispose();
  waiting.resolve(row());
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(state.requests.filter((r) => r.type === 'update-character').length, 0);
  assert.equal(storage.size, 1);
});

test('reconnecting preserves a later intentional revert after an uncertain committed write', async (t) => {
  let writes = 0;
  const state = setup(t, row(), (request) => {
    if (request.type === 'find-character') return structuredClone(request.server);
    const result = request.commit(request.body);
    return ++writes === 1 ? null : result;
  });
  state.writer.update(row(), { ...row(), hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'failed');
  const pending = state.writer.display(row());
  state.writer.update(pending, { ...pending, hp_current: 20 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(state.server.hp_current, 20);
  assert.equal(writes, 2);
  assert.equal(storage.size, 0);
});

test("simultaneous condition-array changes pause instead of dropping either writer's choice", async (t) => {
  const condition = (name) => ({ name, description: 'Test condition', for_creature: true, for_object: false });
  const state = setup(t);
  state.server = { ...row(), details: { conditions: [condition('Clumsy')] }, updated_at: '2026-09-06T12:00:00.100Z' };
  state.writer.update(row(), { ...row(), details: { conditions: [condition('Frightened')] } });
  await until(() => state.writer.status(1)?.phase === 'conflict');
  assert.deepEqual(state.writer.status(1).conflicts, ['details.conditions']);
  assert.equal(state.server.details.conditions[0].name, 'Clumsy');
  assert.equal(state.writer.display(row()).details.conditions[0].name, 'Frightened');
});

test('storage exhaustion is reported without discarding the in-memory pending edit', async (t) => {
  const waiting = deferred();
  const state = setup(t, row(), () => waiting.promise);
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    ...previous,
    setItem() {
      throw new Error('Quota exceeded');
    },
  };
  t.after(() => {
    globalThis.localStorage = previous;
  });
  state.writer.update(row(), { ...row(), hp_current: 15 });
  assert.equal(state.writer.status(1).stored, false);
  assert.equal(state.writer.display(row()).hp_current, 15);
  state.writer.dispose();
  waiting.resolve(row());
});

test('development effect cleanup/reattachment leaves the writer usable', async (t) => {
  const state = setup(t);
  state.writer.dispose();
  state.writer.activate();
  state.writer.update(row(), { ...row(), hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(state.server.hp_current, 15);
});

test('character versions preserve microseconds and equivalent timezone/precision representations', () => {
  assert.equal(compareCharacterVersions('2026-09-06T12:00:00.123456+00:00', '2026-09-06T12:00:00.123455Z'), 1);
  assert.equal(compareCharacterVersions('2026-09-06T12:00:00.123454Z', '2026-09-06T12:00:00.123455Z'), -1);
  assert.equal(compareCharacterVersions('2026-09-06T08:00:00.123400-04:00', '2026-09-06T12:00:00.1234Z'), 0);
  assert.equal(compareCharacterVersions('2026-09-06T12:00:00Z', '2026-09-06T12:00:00.000000Z'), 0);
  assert.equal(compareCharacterVersions('2026-09-06T12:00:01.000001Z', '2026-09-06T12:00:00.999999Z'), 1);
  assert.equal(compareCharacterVersions('version-2', 'version-1'), null);
  assert.equal(compareCharacterVersions(undefined, '2026-09-06T12:00:00Z'), null);
});

test('pending GM HP displays unrelated fresh player changes and ignores older polls', async (t) => {
  const waiting = deferred();
  const initial = { ...row(), updated_at: '2026-09-06T12:00:00.123455Z' };
  const state = setup(t, initial, () => waiting.promise);
  state.writer.update(initial, { ...initial, hp_current: 15 });
  const fresh = {
    ...initial,
    details: { ...initial.details, info: { appearance: 'Fresh player detail' } },
    updated_at: '2026-09-06T12:00:00.123456Z',
  };
  const displayed = state.writer.display(fresh);
  assert.equal(displayed.hp_current, 15);
  assert.equal(displayed.details.info.appearance, 'Fresh player detail');
  assert.equal(state.writer.display({ ...row(), hp_current: 3 }).hp_current, 15);
  state.writer.dispose();
  waiting.resolve(initial);
});

test('reattachment recovers an acknowledgement ignored while unmounted without repeating the write', async (t) => {
  const waiting = deferred();
  let writes = 0;
  const state = setup(t, row(), async (request) => {
    if (request.type === 'find-character') return structuredClone(request.server);
    writes++;
    const committed = request.commit(request.body);
    await waiting.promise;
    return committed;
  });
  state.writer.update(row(), { ...row(), hp_current: 15 });
  await until(() => writes === 1);
  state.writer.dispose();
  waiting.resolve();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(state.writer.status(1).phase, 'saving');
  state.writer.activate();
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.equal(writes, 1);
  assert.equal(storage.size, 0);
});

test('legacy partial inventory and extension JSON do not block a safe HP update', async (t) => {
  const original = { ...row(), inventory: { items: [], legacy: { keep: true } }, spells: { legacy: ['unchanged'] } };
  const state = setup(t, original);
  state.writer.update(original, { ...original, hp_current: 15 });
  await until(() => state.writer.status(1)?.phase === 'saved');
  assert.deepEqual(state.server.inventory, original.inventory);
  assert.deepEqual(state.server.spells, original.spells);
  const body = state.requests.find((request) => request.type === 'update-character').body;
  assert.equal('inventory' in body, false);
  assert.equal('spells' in body, false);
});
