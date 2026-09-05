// Real controller/store with the existing synthetic content boundary. No network.
import assert from 'node:assert/strict';
import { createOperationEngine } from '../../../frontend/scripts/operation-test-harness.mjs';
import { summoner, content } from '../../../frontend/scripts/fixtures/eidolon.mjs';
const engine = await createOperationEngine();
try {
  const characters = [1, 9].map((level, i) => ({ ...summoner(), id: i + 1, level, companions: { list: [] } }));
  const run = character => engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  const sequential = [];
  for (const character of characters) sequential.push(structuredClone(await run(character)).store.variables.LEVEL.value);
  const concurrent = (await Promise.all(characters.map(run))).map(result => result.store.variables.LEVEL.value);
  assert.deepEqual(sequential, [1, 9]);
  assert.deepEqual(concurrent, [9, 9]);
  console.log(JSON.stringify({ probe: 'real controller overlap', sequential, concurrent, stateCollision: true }));
  // This proves non-reentrancy, not that cached worker messages overlap: fully resolved
  // microtasks finish before the next message task. A worker needs a pending I/O boundary;
  // direct/fallback concurrent calls can overlap immediately.
} finally { await engine.cleanup(); }
