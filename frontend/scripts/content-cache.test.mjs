import assert from 'node:assert/strict';
import { readContentRows } from './operation-test-harness.mjs';
import { test } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const frontend = fileURLToPath(new URL('../', import.meta.url));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

/** Exercise real cache logic with explicit session, network and IndexedDB boundaries. */
test('content packages and cache respect failures, sources, actors and generations', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'wg-content-cache-'));
  const state = (globalThis.__contentCacheTest = {
    actor: 'A',
    records: new Map(),
    requests: [],
    read: async (key) => state.records.get(key),
    write: async (key, value) => {
      state.records.set(key, structuredClone(value));
    },
    delete: async (key) => {
      state.records.delete(key);
    },
    deleteIf: async (key, matches) => {
      const value = state.records.get(key);
      if (value !== undefined && matches(value)) state.records.delete(key);
    },
    request: async () => [],
    session: async () => ({ data: { session: { user: { id: state.actor } } } }),
  });
  const stubs = {
    '@auth/user-manager': `export const getPublicUser = async () => ({user_id:globalThis.__contentCacheTest.actor,subscribed_content_sources:[]});`,
    'supabase-client': `export const supabase = {auth:{getSession:()=>globalThis.__contentCacheTest.session()}};`,
    '@requests/request-manager': `export const makeRequest = async (...args) => { globalThis.__contentCacheTest.requests.push(args); return globalThis.__contentCacheTest.request(...args); };`,
    '@utils/images': `export const preloadImage = async () => {};`,
    'content-cache-db': `export const idbGet = key => globalThis.__contentCacheTest.read(key); export const idbSet = (key,value) => globalThis.__contentCacheTest.write(key,value); export const idbDelete = key => globalThis.__contentCacheTest.delete(key); export const idbDeleteIf = (key,matches) => globalThis.__contentCacheTest.deleteIf(key,matches);`,
  };
  let store;
  try {
    const result = await build({
      absWorkingDir: frontend,
      stdin: {
        contents:
          "export * from './src/process/content/content-store'; export {hashData as fixtureHash} from './src/utils/numbers';",
        resolveDir: frontend,
        loader: 'ts',
      },
      tsconfig: join(frontend, 'tsconfig.json'),
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
      define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production', PROD: true }) },
      plugins: [
        {
          name: 'boundaries',
          setup(b) {
            b.onResolve({ filter: /.*/ }, (args) => {
              const key = args.path.endsWith('content-cache-db')
                ? 'content-cache-db'
                : args.path.endsWith('supabase-client')
                  ? 'supabase-client'
                  : args.path;
              return stubs[key] ? { path: key, namespace: 'fixture' } : undefined;
            });
            b.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({ contents: stubs[args.path], loader: 'ts' }));
          },
        },
      ],
    });
    await writeFile(join(directory, 'store.mjs'), result.outputFiles[0].text);
    store = await import(pathToFileURL(join(directory, 'store.mjs')).href);
    await t.test(
      'anonymous package reads carry one scope through pagination and optional lookups without Auth',
      async () => {
        const originalSession = state.session;
        store.setContentCacheActor(null);
        store.resetContentStore(true, true);
        state.session = () => {
          throw new Error('Public content must not read Auth');
        };
        state.requests.length = 0;
        state.request = async () => [];
        try {
          const scope = store.captureContentReadScope(null);
          await store.fetchContentPackage([1], { fetchSources: true, fetchCreatures: true, readScope: scope });
          assert.ok(state.requests.length > 10, 'exercise the full package and optional lookups');
          for (const [type, , , options] of state.requests) {
            assert.equal(options.anonymous, true, type);
            assert.equal(options.expectedActorId, undefined, type);
          }
          const language = deferred();
          const started = deferred();
          state.request = async () => {
            started.resolve();
            return language.promise;
          };
          const pending = store.fetchContent('language', { id: 999, content_sources: [1] }, false, false, scope);
          const rejected = assert.rejects(pending, /Content changed/);
          await started.promise;
          store.setContentCacheActor('B');
          language.resolve([{ id: 999, content_source_id: 1, name: 'Old anonymous data' }]);
          await rejected;
          assert.deepEqual(store.getCachedContent('language'), []);
          assert.throws(() => store.assertContentReadScope(scope), /Content changed/);
          store.captureContentReadScope('B');
        } finally {
          state.session = originalSession;
          state.actor = 'A';
          state.request = async () => [];
          store.setContentCacheActor('A');
          store.resetContentStore(true, true);
        }
      }
    );
    await t.test('dedications prefer their own printing when an older archetype shares the feat ID', async () => {
      store.defineDefaultSources('BOTH', [371, 842]);
      const base = {
        created_at: '',
        name: 'Magus',
        rarity: 'COMMON',
        description: '',
        artwork_url: null,
        deprecated: null,
        version: '1.0',
        dedication_feat_id: 22549,
        meta_data: null,
      };
      state.request = async () => [
        { ...base, id: 282, content_source_id: 371, trait_id: 3995 },
        { ...base, id: 307, content_source_id: 842, trait_id: 4260 },
      ];
      assert.equal(
        (await store.fetchArchetypeByDedicationFeat(22549, { content_source_id: 842, traits: [4260] })).id,
        307
      );
      assert.equal(
        (await store.fetchArchetypeByDedicationFeat(22549, { content_source_id: 371, traits: [3995] })).id,
        282
      );
      store.resetContentStore(true, true);
    });

    await t.test('an account without subscriptions never issues an unrestricted empty-ID source query', async () => {
      const [{ row: source }] = await readContentRows([{ table: 'content_source', id: 1 }]);
      state.request = async (type, body) => {
        assert.equal(type, 'find-content-source');
        assert.notDeepEqual(body.id, [], 'empty subscription filters would return every source');
        return [source];
      };
      const available = await store.fetchContentSources('ALL-USER-ACCESSIBLE');
      assert.deepEqual(
        available.map((entry) => entry.id),
        [1]
      );
      store.resetContentStore(true, true);
    });

    const [{ row: abilityTemplate }] = await readContentRows([{ table: 'ability_block', id: 22549 }]);
    const abilityRows = (count, start = 91000) =>
      Array.from({ length: count }, (_, i) => ({
        ...abilityTemplate,
        id: start + i,
        uuid: start + i,
        name: `Paged feat ${start + i}`,
        content_source_id: 81000,
      }));
    const preparePages = (child) => {
      const reset = () => {
        state.actor = 'A';
        store.setContentCacheActor('A');
        store.resetContentStore(true, true);
        state.requests = [];
      };
      reset();
      child.after(reset);
    };
    await t.test(
      'paged catalogs coalesce and publish only after every page succeeds',
      { timeout: 10000 },
      async (child) => {
        preparePages(child);
        const rows = abilityRows(1003),
          held = deferred(),
          started = deferred();
        state.request = async (type, body) => {
          assert.equal(type, 'find-ability-block');
          assert.equal(body.page_size, 1000);
          assert.deepEqual(body.content_sources, [81000]);
          if (body.after_id === undefined) return rows.slice(0, 1000);
          assert.equal(body.after_id, rows[999].id);
          started.resolve();
          return held.promise;
        };
        const first = store.fetchContentAll('ability-block', [81000]);
        const second = store.fetchContentAll('ability-block', [81000]);
        await started.promise;
        assert.deepEqual(store.getCachedContent('ability-block'), [], 'a staged page is not a cached catalog');
        assert.equal(state.requests.length, 2, 'concurrent readers share one page chain');
        held.resolve(rows.slice(1000));
        for (const result of await Promise.all([first, second]))
          assert.deepEqual(
            result.map((row) => row.id),
            rows.map((row) => row.id)
          );
        assert.equal(store.getCachedContent('ability-block').length, 1003);
        await store.fetchContentAll('ability-block', [81000]);
        assert.equal(state.requests.length, 2, 'the complete logical query is cached');
      }
    );
    await t.test('an exactly full final page requires an empty read and empty catalogs stay valid', async (child) => {
      preparePages(child);
      const rows = abilityRows(1000);
      state.request = async (_type, body) => (body.after_id === undefined ? rows : []);
      assert.equal((await store.fetchContentAll('ability-block', [81000])).length, 1000);
      assert.deepEqual(
        state.requests.map(([, body]) => body.after_id),
        [undefined, rows.at(-1).id]
      );
      store.resetContentStore(true, true);
      state.requests = [];
      state.request = async () => [];
      assert.deepEqual(await store.fetchContentAll('ability-block', [81000]), []);
      assert.deepEqual(await store.fetchContentAll('ability-block', [81000]), []);
      assert.equal(state.requests.length, 1, 'a successful empty catalog is complete and reusable');
    });
    await t.test(
      'every page and the cache key retain captured filters when the caller changes its arrays',
      { timeout: 10000 },
      async (child) => {
        preparePages(child);
        const rows = abilityRows(1001),
          held = deferred(),
          started = deferred();
        const traits = [471],
          prerequisites = ['Original requirement'];
        state.request = async (_type, body) => {
          assert.deepEqual(body.traits, [471]);
          assert.deepEqual(body.prerequisites, ['Original requirement']);
          if (body.after_id === undefined) {
            started.resolve();
            return held.promise;
          }
          return rows.slice(1000);
        };
        const pending = store.fetchContent('ability-block', { content_sources: [81000], traits, prerequisites });
        await started.promise;
        traits[0] = 999;
        prerequisites[0] = 'Changed requirement';
        held.resolve(rows.slice(0, 1000));
        assert.equal((await pending).length, 1001);
        assert.equal(
          (
            await store.fetchContent('ability-block', {
              content_sources: [81000],
              traits: [471],
              prerequisites: ['Original requirement'],
            })
          ).length,
          1001
        );
        assert.equal(state.requests.length, 2, 'the original filter scope is cached, not the mutated caller state');
      }
    );
    await t.test('a failed later page publishes nothing and a retry restarts the complete catalog', async (child) => {
      preparePages(child);
      const rows = abilityRows(1002);
      let unavailable = true;
      state.request = async (_type, body) => {
        if (body.after_id === undefined) return rows.slice(0, 1000);
        if (unavailable) throw new Error('Second page unavailable');
        return rows.slice(1000);
      };
      await assert.rejects(store.fetchContentAll('ability-block', [81000]), /Second page unavailable/);
      assert.deepEqual(store.getCachedContent('ability-block'), []);
      unavailable = false;
      assert.equal((await store.fetchContentAll('ability-block', [81000])).length, 1002);
      assert.deepEqual(
        state.requests.map(([, body]) => body.after_id),
        [undefined, rows[999].id, undefined, rows[999].id]
      );
    });
    await t.test('account and source resets discard a catalog between pages', { timeout: 10000 }, async (child) => {
      preparePages(child);
      for (const change of ['account', 'source']) {
        store.resetContentStore(true, true);
        const rows = abilityRows(1001),
          held = deferred(),
          started = deferred();
        state.request = async (_type, body) => {
          assert.deepEqual(body.content_sources, [81000]);
          if (body.after_id === undefined) return rows.slice(0, 1000);
          started.resolve();
          return held.promise;
        };
        const pending = store.fetchContentAll('ability-block', [81000]);
        await started.promise;
        if (change === 'account') {
          state.actor = 'B';
          store.setContentCacheActor('B');
        } else {
          store.resetContentStore(true, true);
          store.defineDefaultSources('BOTH', [81009]);
        }
        const rejected = assert.rejects(pending, /Content changed while loading/);
        held.resolve(rows.slice(1000));
        await rejected;
        assert.deepEqual(store.getCachedContent('ability-block'), []);
      }
    });
    await t.test('oversized, unordered and non-advancing pages cannot become complete catalogs', async (child) => {
      preparePages(child);
      for (const invalid of ['oversized', 'duplicate', 'backward', 'unsafe-id']) {
        store.resetContentStore(true, true);
        const rows = abilityRows(1001);
        state.request = async (_type, body) => {
          if (invalid === 'oversized') return rows;
          if (invalid === 'duplicate') return [rows[0], rows[0]];
          if (invalid === 'unsafe-id') return [{ ...rows[0], id: Number.MAX_SAFE_INTEGER + 1 }];
          return body.after_id === undefined ? rows.slice(0, 1000) : [rows[999]];
        };
        await assert.rejects(
          store.fetchContentAll('ability-block', [81000]),
          /Could not load ability-block|pagination did not advance/
        );
        assert.deepEqual(store.getCachedContent('ability-block'), [], invalid);
      }
    });
    await t.test('single-record ability lookups retain their existing request and response shape', async (child) => {
      preparePages(child);
      const record = abilityRows(1)[0];
      state.request = async (_type, body) => {
        assert.equal(body.id, record.id);
        assert.equal(body.page_size, undefined);
        assert.equal(body.after_id, undefined);
        return record;
      };
      assert.equal(
        (await store.fetchContent('ability-block', { id: record.id, content_sources: [81000] }))[0].id,
        record.id
      );
      assert.equal(state.requests.length, 1);
    });

    const row = {
      id: 81001,
      uuid: 81001,
      name: 'Fixture Language',
      description: 'Fixture',
      content_source_id: 81000,
      created_at: '2026-09-05T00:00:00Z',
      updated_at: '2026-09-05T00:00:00Z',
      rarity: 'COMMON',
      availability: 'STANDARD',
      meta_data: {},
      version: '1.0',
      speakers: '',
      script: '',
      deprecated: false,
    };
    const query = { id: row.id, content_sources: [81000] };
    state.request = async () => [row];
    assert.equal((await store.fetchContent('language', query))[0].id, row.id);
    const before = state.requests.length;
    assert.equal((await store.fetchContent('language', query))[0].id, row.id);
    assert.equal(state.requests.length, before, 'same scoped request is cached');

    state.request = async () => [];
    assert.deepEqual(
      await store.fetchContent('language', { ...query, content_sources: [99999] }),
      [],
      'cached ID cannot escape source filter'
    );
    state.request = async () => [row, { ...row, id: 81002, name: 'Fixture Language Variant' }];
    assert.equal(
      (await store.fetchContent('language', { name: row.name, content_sources: [81000] })).length,
      2,
      'a cached exact name cannot swallow substring results'
    );

    state.records.set('content-store:A', {
      version: 4,
      actorId: 'A',
      savedAt: Date.now(),
      idStore: new Map([['language', new Map([[row.id, row]])]]),
      contentStore: new Map(),
    });
    state.actor = 'B';
    state.request = async () => [];
    assert.deepEqual(
      await store.fetchContent('language', query),
      [],
      'actor B cannot use actor A memory or persisted cache'
    );

    const oldSession = deferred();
    state.session = () => oldSession.promise;
    const oldLookup = store.fetchContent('language', query);
    const oldRejected = assert.rejects(oldLookup, /Content changed|Current account changed/);
    state.actor = 'C';
    store.setContentCacheActor('C');
    state.session = async () => ({ data: { session: { user: { id: state.actor } } } });
    state.request = async () => [row];
    await store.fetchContent('language', query);
    const requestsAfterSwitch = state.requests.length;
    oldSession.resolve({ data: { session: { user: { id: 'B' } } } });
    await oldRejected;
    await store.fetchContent('language', query);
    assert.equal(state.requests.length, requestsAfterSwitch, 'an old session read cannot restore actor B over actor C');

    store.resetContentStore(true, true);
    const started = deferred(),
      late = deferred();
    state.request = async () => {
      started.resolve();
      return late.promise;
    };
    const pending = store.fetchContent('language', query);
    const rejected = assert.rejects(pending, /Content changed/);
    await started.promise;
    store.resetContentStore(true, true);
    late.resolve([row]);
    await rejected;
    assert.deepEqual(store.getCachedContent('language'), [], 'obsolete response never repopulates reset cache');

    const hydration = deferred();
    state.read = async () => hydration.promise;
    store.resetContentStore();
    store.resetContentStore(true, true);
    hydration.resolve({
      version: 4,
      actorId: 'B',
      savedAt: Date.now(),
      idStore: new Map([['language', new Map([[row.id, row]])]]),
      contentStore: new Map(),
    });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.deepEqual(store.getCachedContent('language'), [], 'obsolete hydration never repopulates reset cache');
    state.read = async (key) => state.records.get(key);

    await t.test('a malformed persisted query result cannot replace fresh content', async () => {
      store.resetContentStore(true, true);
      await new Promise((resolve) => setImmediate(resolve));
      state.records.set('content-store:C', {
        version: 4,
        actorId: 'C',
        savedAt: Date.now(),
        idStore: new Map(),
        contentStore: new Map([[store.fixtureHash({ type: 'language', data: query }), 'broken cached result']]),
      });
      state.request = async () => [row];
      store.resetContentStore(false);
      const reads = state.requests.length;
      const result = await store.fetchContent('language', query);
      assert.equal(result[0].id, row.id);
      assert.equal(result[0].name, row.name);
      assert.equal(state.requests.length, reads + 1, 'malformed storage must not bypass the network');
      store.resetContentStore(true, true);
    });

    state.request = async (type) => (type === 'find-ability-block' ? null : []);
    await assert.rejects(
      store.fetchContentPackage([81000]),
      /Could not load ability-block/,
      'partial package is never published'
    );
    state.request = async () => [];
    const empty = await store.fetchContentPackage([81000]);
    assert.deepEqual(empty.abilityBlocks, [], 'successful empty tables remain valid');
    assert.deepEqual(empty.classes, []);
    state.request = async (type) => (type === 'find-content-source' ? null : []);
    store.resetContentStore(true, true);
    await assert.rejects(
      store.fetchContentPackage('ALL-OFFICIAL-PUBLIC'),
      /content-source/,
      'failed source resolution cannot masquerade as an empty source set'
    );
    const pageTrait = {
      id: 81001,
      name: 'Wizard School',
      description: 'Fixture',
      created_at: row.created_at,
      meta_data: {},
      content_source_id: 81000,
    };
    const infoTrait = { ...pageTrait, id: 81002, content_source_id: 81009 };
    const prepareTraitLookup = (readLookup) => {
      store.resetContentStore(true, true);
      store.defineDefaultSources('PAGE', [81000]);
      store.defineDefaultSources('INFO', [81009]);
      state.request = async (type, body) => {
        if (type === 'find-content-source') return body.id.map((id) => ({ id, name: `Fixture source ${id}` }));
        if (type === 'find-trait') {
          if (body.content_sources.includes(81009)) {
            assert.deepEqual(body.content_sources, [3, 81000, 81009], 'lookup catalog keeps captured INFO+PAGE scope');
            return readLookup();
          }
          return [pageTrait];
        }
        return [];
      };
    };
    await t.test(
      'trait lookup metadata uses the normal cache while PAGE candidates keep their source scope',
      async () => {
        prepareTraitLookup(async () => [infoTrait, pageTrait]);
        const content = await store.fetchContentPackage([3, 81000]);
        assert.deepEqual(content.traits, [pageTrait]);
        assert.deepEqual(content.lookupTraits, [infoTrait, pageTrait]);
        const before = state.requests.length;
        const warm = await store.fetchContentPackage([3, 81000]);
        assert.deepEqual(warm.lookupTraits, content.lookupTraits);
        assert.equal(state.requests.length, before, 'a warm package does not download lookup metadata again');
      }
    );
    await t.test('unavailable optional trait lookup metadata does not fail otherwise complete content', async () => {
      prepareTraitLookup(async () => null);
      const content = await store.fetchContentPackage([3, 81000]);
      assert.deepEqual(content.traits, [pageTrait]);
      assert.equal(content.lookupTraits, undefined);
    });
    await t.test(
      'slow optional metadata has a bounded wait and cannot change an already returned packet',
      async (t) => {
        const lookup = deferred(),
          started = deferred();
        prepareTraitLookup(() => {
          started.resolve();
          return lookup.promise;
        });
        t.mock.timers.enable({ apis: ['setTimeout'] });
        const pending = store.fetchContentPackage([3, 81000]);
        try {
          await started.promise;
          await new Promise((resolve) => setImmediate(resolve));
          t.mock.timers.tick(750);
          const content = await pending;
          assert.deepEqual(content.traits, [pageTrait]);
          assert.equal(
            content.lookupTraits,
            undefined,
            'required content returns without waiting for the network timeout'
          );
          lookup.resolve([infoTrait, pageTrait]);
          await new Promise((resolve) => setImmediate(resolve));
          assert.equal(content.lookupTraits, undefined, 'late data cannot enter a running calculation');
          assert.deepEqual(content.traits, [pageTrait]);
        } finally {
          lookup.resolve([]);
          await pending;
          t.mock.timers.reset();
          store.resetContentStore(true, true);
        }
      }
    );
    await t.test('an account change retires both a pending package and its optional trait catalog', async () => {
      const lookup = deferred(),
        started = deferred();
      prepareTraitLookup(() => {
        started.resolve();
        return lookup.promise;
      });
      const pending = store.fetchContentPackage([3, 81000]);
      const rejected = assert.rejects(pending, /Content changed/);
      try {
        await started.promise;
        state.actor = 'trait-next-actor';
        store.setContentCacheActor(state.actor);
        lookup.resolve([infoTrait, pageTrait]);
        await rejected;
        assert.deepEqual(store.getCachedContent('trait'), [], 'old actor metadata never populates the new cache');
      } finally {
        lookup.resolve([]);
        store.resetContentStore(true, true);
      }
    });
    await t.test('a stalled optional cache deletion cannot block fresh homebrew content', async () => {
      const deleting = deferred();
      state.delete = () => deleting.promise;
      state.request = async () => [row];
      store.resetContentStore(false, true);
      const pending = store.fetchContent('language', query);
      let timeout;
      try {
        const result = await Promise.race([
          pending,
          new Promise((resolve) => {
            timeout = setTimeout(() => resolve('blocked'), 3000);
          }),
        ]);
        assert.notEqual(result, 'blocked', 'optional storage must not prevent a healthy network read');
        assert.equal(result[0].id, row.id);
      } finally {
        clearTimeout(timeout);
        deleting.resolve();
        await pending;
        state.delete = async (key) => {
          state.records.delete(key);
        };
      }
    });
    await t.test('late hydration cannot resurrect rows absent from a fresh source download', async () => {
      const reading = deferred();
      state.read = () => reading.promise;
      state.request = async () => [];
      store.resetContentStore(false);
      try {
        assert.deepEqual(await store.fetchContent('language', { content_sources: [81000] }), []);
        reading.resolve({
          version: 4,
          actorId: state.actor,
          savedAt: Date.now(),
          idStore: new Map([['language', new Map([[row.id, row]])]]),
          contentStore: new Map(),
        });
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(store.getCachedContent('language'), [], 'late cache rows must not reappear in selectors');
        assert.deepEqual(await store.fetchContent('language', query), [], 'ID lookups must respect the fresh download');
      } finally {
        reading.resolve(null);
        state.read = async (key) => state.records.get(key);
        store.resetContentStore(false, true);
      }
    });
    await t.test('fresh content stays usable and survives deletion queued behind an old write', async (t) => {
      store.resetContentStore(false, true);
      await new Promise((resolve) => setImmediate(resolve));
      t.mock.timers.enable({ apis: ['setTimeout'] });
      const writing = deferred();
      const started = deferred();
      let fresh;
      state.write = async (key, value) => {
        if (value.idStore.get('language')?.get(row.id)?.name === 'Before homebrew edit') {
          started.resolve();
          await writing.promise;
        }
        state.records.set(key, structuredClone(value));
      };
      try {
        state.request = async () => [{ ...row, name: 'Before homebrew edit' }];
        await store.fetchContent('language', query);
        t.mock.timers.tick(10000);
        await started.promise;
        store.resetContentStore(false, true);
        state.request = async () => [{ ...row, name: 'After homebrew edit' }];
        let displayed;
        fresh = store.fetchContent('language', query).then((rows) => {
          displayed = rows;
          return rows;
        });
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(displayed?.[0].name, 'After homebrew edit', 'a stuck old write must not block fresh content');
        t.mock.timers.tick(10000);
        writing.resolve();
        await new Promise((resolve) => setImmediate(resolve));
        const saved = state.records.get(`content-store:${state.actor}`);
        assert.equal(saved.idStore.get('language').get(row.id).name, 'After homebrew edit');
        store.resetContentStore(false);
        state.request = async () => {
          throw new Error('The fresh persisted copy should satisfy this read');
        };
        assert.equal((await store.fetchContent('language', query))[0].name, 'After homebrew edit');
      } finally {
        writing.resolve();
        await fresh;
        state.write = async (key, value) => {
          state.records.set(key, structuredClone(value));
        };
        store.resetContentStore(false, true);
      }
    });
    const cachedSnapshot = (savedAt = Date.now()) => ({
      version: 4,
      actorId: state.actor,
      savedAt,
      idStore: new Map([
        ['content-source', new Map([[81000, { id: 81000, updated_at: 'old-source-token' }]])],
        ['language', new Map([[row.id, row]])],
      ]),
      contentStore: new Map(),
    });

    await t.test('a late confirmed source change retires the snapshot before the next reload', async (t) => {
      const checking = deferred(),
        started = deferred(),
        nextChecking = deferred();
      const snapshot = cachedSnapshot();
      const fresh = {
        ...row,
        description: 'Published *corrected* description with [another reference](link_trait_1).',
      };
      const key = `content-store:${state.actor}`;
      const draftKey = `character-draft:${state.actor}:fixture`;
      const draft = { unsaved: 'Retain this input', character: { id: 1 } };
      state.records.set(key, structuredClone(snapshot));
      state.records.set(draftKey, structuredClone(draft));
      state.read = async (recordKey) => state.records.get(recordKey);
      state.request = async (type, body) => {
        if (type === 'get-content-versions') {
          started.resolve();
          return checking.promise;
        }
        return [{ ...fresh, id: body.id }];
      };
      t.mock.timers.enable({ apis: ['setTimeout'] });
      store.resetContentStore(false);
      const pending = store.fetchContent('language', query);
      try {
        await started.promise;
        await new Promise((resolve) => setImmediate(resolve));
        t.mock.timers.tick(750);
        const currentVisit = await pending;
        assert.deepEqual(currentVisit, [row], 'the bounded offline fallback keeps the current visit usable');

        checking.resolve([{ id: 81000, updated_at: 'new-source-token' }]);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(currentVisit, [row], 'retirement never mutates content already used by a calculation');
        assert.equal(state.records.has(key), false, 'only the positively stale content snapshot is retired');
        await store.fetchContent('language', { ...query, id: 81002 });
        t.mock.timers.tick(10000);
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(state.records.has(key), false, 'the retired live generation cannot persist stale rows again');

        state.request = async (type, body) =>
          type === 'get-content-versions' ? nextChecking.promise : [{ ...fresh, id: body.id }];
        store.resetContentStore(false);
        const reloaded = store.fetchContent('language', query);
        await new Promise((resolve) => setImmediate(resolve));
        t.mock.timers.tick(750);
        const reloadedRows = await reloaded;
        assert.equal(reloadedRows[0]?.id, fresh.id);
        assert.equal(
          reloadedRows[0]?.description,
          fresh.description,
          'reload cannot reuse a positively proven stale description'
        );
        assert.deepEqual(state.records.get(draftKey), draft, 'content retirement must preserve character drafts');
      } finally {
        checking.resolve(null);
        nextChecking.resolve(null);
        await pending;
        t.mock.timers.reset();
        state.read = async (recordKey) => state.records.get(recordKey);
        store.resetContentStore(false, true);
      }
    });

    for (const boundary of ['generation', 'account']) {
      await t.test(`a late stale verdict cannot retire a newer ${boundary} snapshot`, async (t) => {
        const checking = deferred(),
          started = deferred();
        const snapshot = cachedSnapshot();
        const originalActor = state.actor;
        const originalKey = `content-store:${originalActor}`;
        const fresh = { ...row, description: 'Fresh replacement content' };
        state.records.set(originalKey, structuredClone(snapshot));
        state.read = async (key) => state.records.get(key);
        state.request = async (type) => {
          if (type === 'get-content-versions') {
            started.resolve();
            return checking.promise;
          }
          return [];
        };
        t.mock.timers.enable({ apis: ['setTimeout'] });
        store.resetContentStore(false);
        const pending = store.fetchContent('language', query);
        try {
          await started.promise;
          await new Promise((resolve) => setImmediate(resolve));
          t.mock.timers.tick(750);
          assert.deepEqual(await pending, [row]);
          if (boundary === 'account') {
            state.actor = `${originalActor}-next`;
            store.setContentCacheActor(state.actor);
          } else {
            store.resetContentStore(false);
          }
          const replacement = cachedSnapshot();
          replacement.idStore.get('content-source').get(81000).updated_at = 'new-source-token';
          replacement.idStore.get('language').set(row.id, fresh);
          const replacementKey = `content-store:${state.actor}`;
          state.records.set(replacementKey, structuredClone(replacement));
          state.request = async (type) =>
            type === 'get-content-versions' ? [{ id: 81000, updated_at: 'new-source-token' }] : [fresh];
          assert.equal((await store.fetchContent('language', query))[0].description, fresh.description);
          checking.resolve([{ id: 81000, updated_at: 'new-source-token' }]);
          await new Promise((resolve) => setImmediate(resolve));
          assert.deepEqual(state.records.get(replacementKey), replacement, 'obsolete work cannot delete fresh storage');
          assert.equal((await store.fetchContent('language', query))[0].description, fresh.description);
          if (boundary === 'account') {
            assert.deepEqual(
              state.records.get(originalKey),
              snapshot,
              'the old account is not touched after switching'
            );
          }
        } finally {
          checking.resolve(null);
          await pending;
          t.mock.timers.reset();
          state.actor = originalActor;
          store.setContentCacheActor(originalActor);
          store.resetContentStore(false, true);
        }
      });
    }

    await t.test('a late stale verdict preserves a fresh snapshot written by another tab', async (t) => {
      const checking = deferred(),
        started = deferred();
      const snapshot = cachedSnapshot();
      const key = `content-store:${state.actor}`;
      const replacement = cachedSnapshot();
      replacement.idStore.get('content-source').get(81000).updated_at = 'new-source-token';
      replacement.idStore.get('language').set(row.id, { ...row, description: 'Other tab fresh description' });
      state.records.set(key, structuredClone(snapshot));
      state.request = async (type, body) => {
        if (type === 'get-content-versions') {
          started.resolve();
          return checking.promise;
        }
        return [{ ...row, id: body.id }];
      };
      t.mock.timers.enable({ apis: ['setTimeout'] });
      store.resetContentStore(false);
      const pending = store.fetchContent('language', query);
      try {
        await started.promise;
        await new Promise((resolve) => setImmediate(resolve));
        t.mock.timers.tick(750);
        const currentVisit = await pending;
        state.records.set(key, structuredClone(replacement));
        checking.resolve([{ id: 81000, updated_at: 'new-source-token' }]);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(state.records.get(key), replacement, 'conditional retirement refuses the newer token');
        assert.deepEqual(currentVisit, [row], 'the current calculation input is not replaced');
        await store.fetchContent('language', { ...query, id: 81002 });
        t.mock.timers.tick(10000);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(state.records.get(key), replacement, "old live maps cannot overwrite another tab's refresh");
      } finally {
        checking.resolve(null);
        await pending;
        t.mock.timers.reset();
        store.resetContentStore(false, true);
      }
    });

    await t.test('retirement follows an already started stale write and prevents resurrection', async (t) => {
      const checking = deferred(),
        checkingStarted = deferred(),
        writing = deferred(),
        writingStarted = deferred();
      const snapshot = cachedSnapshot();
      const key = `content-store:${state.actor}`;
      const normalWrite = state.write;
      state.records.set(key, structuredClone(snapshot));
      state.request = async (type, body) => {
        if (type === 'get-content-versions') {
          checkingStarted.resolve();
          return checking.promise;
        }
        return [{ ...row, id: body.id }];
      };
      state.write = async (recordKey, value) => {
        writingStarted.resolve();
        await writing.promise;
        state.records.set(recordKey, structuredClone(value));
      };
      t.mock.timers.enable({ apis: ['setTimeout'] });
      store.resetContentStore(false);
      const pending = store.fetchContent('language', query);
      try {
        await checkingStarted.promise;
        await new Promise((resolve) => setImmediate(resolve));
        t.mock.timers.tick(750);
        const currentVisit = await pending;
        await store.fetchContent('language', { ...query, id: 81002 });
        t.mock.timers.tick(10000);
        await writingStarted.promise;
        checking.resolve([{ id: 81000, updated_at: 'new-source-token' }]);
        await new Promise((resolve) => setImmediate(resolve));
        writing.resolve();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(state.records.has(key), false, 'retirement runs after the in-flight stale write');
        assert.deepEqual(currentVisit, [row]);
        await store.fetchContent('language', { ...query, id: 81003 });
        t.mock.timers.tick(10000);
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(state.records.has(key), false, 'further lookups cannot resurrect the stale snapshot');
      } finally {
        checking.resolve(null);
        writing.resolve();
        await pending;
        t.mock.timers.reset();
        state.write = normalWrite;
        store.resetContentStore(false, true);
      }
    });

    await t.test('a reset during conditional retirement preserves the replacement snapshot', async (t) => {
      const checking = deferred(),
        checkingStarted = deferred(),
        deleting = deferred(),
        deletingStarted = deferred();
      const key = `content-store:${state.actor}`;
      const snapshot = cachedSnapshot();
      const replacement = cachedSnapshot();
      replacement.idStore.get('content-source').get(81000).updated_at = 'new-source-token';
      replacement.idStore.get('language').set(row.id, { ...row, description: 'New generation replacement' });
      const normalDeleteIf = state.deleteIf;
      state.records.set(key, structuredClone(snapshot));
      state.deleteIf = async (recordKey, matches) => {
        deletingStarted.resolve();
        await deleting.promise;
        const value = state.records.get(recordKey);
        if (value !== undefined && matches(value)) state.records.delete(recordKey);
      };
      state.request = async (type) => {
        if (type === 'get-content-versions') {
          checkingStarted.resolve();
          return checking.promise;
        }
        return [];
      };
      t.mock.timers.enable({ apis: ['setTimeout'] });
      store.resetContentStore(false);
      const pending = store.fetchContent('language', query);
      try {
        await checkingStarted.promise;
        await new Promise((resolve) => setImmediate(resolve));
        t.mock.timers.tick(750);
        assert.deepEqual(await pending, [row]);
        checking.resolve([{ id: 81000, updated_at: 'new-source-token' }]);
        await deletingStarted.promise;
        store.resetContentStore(false);
        state.records.set(key, structuredClone(replacement));
        state.request = async (type) =>
          type === 'get-content-versions' ? [{ id: 81000, updated_at: 'new-source-token' }] : [];
        deleting.resolve();
        const reloaded = await store.fetchContent('language', query);
        assert.equal(reloaded[0]?.description, 'New generation replacement');
        assert.deepEqual(state.records.get(key), replacement, 'the predicate rechecks generation after its await');
      } finally {
        checking.resolve(null);
        deleting.resolve();
        await pending;
        t.mock.timers.reset();
        state.deleteIf = normalDeleteIf;
        store.resetContentStore(false, true);
      }
    });

    await t.test('an unavailable freshness endpoint retains the bounded offline snapshot', async () => {
      const snapshot = cachedSnapshot();
      const key = `content-store:${state.actor}`;
      state.records.set(key, structuredClone(snapshot));
      state.request = async (type) => {
        assert.equal(type, 'get-content-versions', 'an unavailable probe must not force catalog downloads');
        return null;
      };
      store.resetContentStore(false);
      try {
        assert.deepEqual(await store.fetchContent('language', query), [row]);
        assert.deepEqual(state.records.get(key), snapshot, 'unavailable is not a positive stale verdict');
      } finally {
        store.resetContentStore(false, true);
      }
    });

    await t.test('a slow version check uses the recent snapshot without extending its age', async (t) => {
      const checking = deferred();
      const snapshot = cachedSnapshot(Date.now() - 20 * 60 * 60 * 1000);
      state.read = async () => snapshot;
      state.request = async (type) => (type === 'get-content-versions' ? checking.promise : []);
      store.resetContentStore(false);
      try {
        const before = state.requests.length;
        assert.deepEqual(await store.fetchContent('language', query), [row]);
        assert.deepEqual(
          state.requests.slice(before).map(([type]) => type),
          ['get-content-versions'],
          'slow freshness must not trigger a replacement download'
        );
        checking.resolve([{ id: 81000, updated_at: 'old-source-token' }]);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(
          await store.fetchContent('language', query),
          [row],
          'a late verdict cannot change content underneath running calculations'
        );

        t.mock.timers.enable({ apis: ['setTimeout'] });
        await store.fetchContent('language', { ...query, id: 81002 });
        t.mock.timers.tick(10000);
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(
          state.records.get(`content-store:${state.actor}`).savedAt,
          snapshot.savedAt,
          'persisting another lookup must not renew unverified cached content'
        );
      } finally {
        checking.resolve(null);
        t.mock.timers.reset();
        state.read = async (key) => state.records.get(key);
        store.resetContentStore(false, true);
      }
    });

    await t.test('a prompt changed source token still rejects stale cached content', async () => {
      state.read = async () => cachedSnapshot();
      state.request = async (type) =>
        type === 'get-content-versions' ? [{ id: 81000, updated_at: 'new-source-token' }] : [];
      store.resetContentStore(false);
      try {
        assert.deepEqual(await store.fetchContent('language', query), []);
        assert.deepEqual(store.getCachedContent('language'), []);
      } finally {
        state.read = async (key) => state.records.get(key);
        store.resetContentStore(false, true);
      }
    });

    await t.test('an expired snapshot cannot be used during an outage', async () => {
      state.read = async () => cachedSnapshot(Date.now() - 25 * 60 * 60 * 1000);
      state.request = async () => [];
      store.resetContentStore(false);
      try {
        const before = state.requests.length;
        assert.deepEqual(await store.fetchContent('language', query), []);
        assert.deepEqual(
          state.requests.slice(before).map(([type]) => type),
          ['find-language']
        );
      } finally {
        state.read = async (key) => state.records.get(key);
        store.resetContentStore(false, true);
      }
    });

    await t.test('account changes retire a snapshot waiting for its version check', async () => {
      const checking = deferred(),
        started = deferred();
      const snapshot = cachedSnapshot();
      state.read = async () => snapshot;
      state.request = async (type) => {
        if (type === 'get-content-versions') {
          started.resolve();
          return checking.promise;
        }
        return [];
      };
      store.resetContentStore(false);
      const pending = store.fetchContent('language', query);
      const rejected = assert.rejects(pending, /Content changed/);
      try {
        await started.promise;
        state.actor = 'D';
        store.setContentCacheActor('D');
        checking.resolve([{ id: 81000, updated_at: 'old-source-token' }]);
        await rejected;
        assert.deepEqual(await store.fetchContent('language', query), []);
      } finally {
        checking.resolve(null);
        state.read = async (key) => state.records.get(key);
        store.resetContentStore(false, true);
      }
    });
  } finally {
    store?.resetContentStore(true, true);
    await rm(directory, { recursive: true, force: true });
    delete globalThis.__contentCacheTest;
  }
});

/** Check the real IndexedDB helper's transaction boundary without a browser or user storage. */
test('conditional cache deletion checks and removes within one readwrite transaction', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'wg-content-cache-db-'));
  const originalIndexedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  const records = new Map();
  const transactions = [];
  const key = 'content-store:fixture';
  const draftKey = 'character-draft:fixture';
  const draft = { input: 'Preserve this unrelated value' };
  let beforeRead = () => {};
  const db = {
    transaction(storeName, mode) {
      const observations = { storeName, mode, reads: [], deletes: [] };
      transactions.push(observations);
      const tx = {
        objectStore(name) {
          assert.equal(name, storeName);
          return {
            get(recordKey) {
              observations.reads.push(recordKey);
              const request = {};
              queueMicrotask(() => {
                beforeRead();
                request.result = records.get(recordKey);
                request.onsuccess?.();
                queueMicrotask(() => tx.oncomplete?.());
              });
              return request;
            },
            delete(recordKey) {
              observations.deletes.push(recordKey);
              records.delete(recordKey);
            },
          };
        },
      };
      return tx;
    },
  };
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: {
      open() {
        const request = {};
        queueMicrotask(() => {
          request.result = db;
          request.onsuccess?.();
        });
        return request;
      },
    },
  });
  try {
    const result = await build({
      entryPoints: [join(frontend, 'src/process/content/content-cache-db.ts')],
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
    });
    const modulePath = join(directory, 'cache-db.mjs');
    await writeFile(modulePath, result.outputFiles[0].text);
    const cacheDb = await import(pathToFileURL(modulePath).href);
    records.set(draftKey, structuredClone(draft));

    await t.test('matching snapshots are checked and removed by the same transaction', async () => {
      records.set(key, { token: 'old' });
      await cacheDb.idbDeleteIf(key, (value) => value.token === 'old');
      assert.equal(records.has(key), false);
      assert.deepEqual(transactions.at(-1), { storeName: 'kv', mode: 'readwrite', reads: [key], deletes: [key] });
      assert.deepEqual(records.get(draftKey), draft);
    });

    await t.test('a replacement installed before the transaction reads is never deleted', async () => {
      const replacement = { token: 'new', data: 'Fresh content' };
      records.set(key, { token: 'old' });
      beforeRead = () => records.set(key, replacement);
      try {
        await cacheDb.idbDeleteIf(key, (value) => value.token === 'old');
        assert.deepEqual(records.get(key), replacement);
        assert.deepEqual(transactions.at(-1), { storeName: 'kv', mode: 'readwrite', reads: [key], deletes: [] });
        assert.deepEqual(records.get(draftKey), draft);
      } finally {
        beforeRead = () => {};
      }
    });

    await t.test('an absent snapshot does not invoke the predicate or delete another key', async () => {
      records.delete(key);
      await cacheDb.idbDeleteIf(key, () => assert.fail('No snapshot exists to compare'));
      assert.deepEqual(transactions.at(-1), { storeName: 'kv', mode: 'readwrite', reads: [key], deletes: [] });
      assert.deepEqual(records.get(draftKey), draft);
    });
  } finally {
    if (originalIndexedDb) Object.defineProperty(globalThis, 'indexedDB', originalIndexedDb);
    else delete globalThis.indexedDB;
    await rm(directory, { recursive: true, force: true });
  }
});
