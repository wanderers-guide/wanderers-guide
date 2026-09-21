import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';

test('Dominion Epithet options have distinct selection and operation IDs', async () => {
  const [{ row: source }] = await readContentRows([{ table: 'content_source', id: 811 }]);
  const options = source.operations
    .filter((operation) => operation.type === 'injectSelectOption')
    .map((operation) => JSON.parse(operation.data.value))
    .filter((injection) => injection.opId === '0ce089ed-74cb-4051-b24b-eec5a5070614')
    .map((injection) => injection.option);

  assert.deepEqual(
    options.map((option) => option.title),
    ['Plunderer of the Hive’s Riches', 'Trespasser in Death’s Realm']
  );
  assert.equal(new Set(options.map((option) => option.id)).size, options.length);

  const operationIds = options.flatMap((option) => option.operations.map((operation) => operation.id));
  assert.equal(new Set(operationIds).size, operationIds.length);
});
