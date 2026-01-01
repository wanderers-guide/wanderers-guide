import {
  OperationCharacterResultPackage,
  OperationCreatureResultPackage,
  OperationExecution,
  OperationResultData,
} from '@typing/operations';
import { exportVariableStore, importVariableStore } from '@variables/variable-manager';
import workerpool from 'workerpool';
import { _executeCharacterOperations, _executeCreatureOperations } from './operation-controller';

// Create a worker pool
const pool =
  'Worker' in window
    ? workerpool.pool(new URL('./operations.worker.ts', import.meta.url).toString(), {
        minWorkers: 1,
        maxWorkers: 4,
        workerOpts: {
          type: 'module',
        },
      })
    : null;

// Cache for operation results to avoid redundant computations
// const opsCache = new Map<number, OperationResultData>();

// const getOpsCache = (execution: OperationExecution): OperationResultData | null => {
//   const cacheKey = hashData(execution);
//   console.log('Checking ops cache for key:', cacheKey, opsCache.size);
//   if (opsCache.has(cacheKey)) {
//     console.log('!!!! Cache hit for key:', cacheKey);
//     return opsCache.get(cacheKey)!;
//   }
//   return null;
// };

// const setOpsCache = (execution: OperationExecution, results: OperationResultData) => {
//   const cacheKey = hashData(execution);
//   opsCache.set(cacheKey, results);
// };

/**
 * Main function to execute operations for a character or creature
 * @param execution - Operation execution data
 * @returns - Operation results data
 */
export async function executeOperations<T = OperationCharacterResultPackage | OperationCreatureResultPackage>(
  execution: OperationExecution,
  options?: { directExecution?: boolean }
) {
  let results: OperationResultData | null = null;
  const useDirectExecution = options?.directExecution || !pool;

  // Check cache first
  // const cache = getOpsCache(execution);
  // if (cache) {
  //   if (execution.type === 'CHARACTER') {
  //     importVariableStore('CHARACTER', cache.store);
  //     return cache.ors as T;
  //   } else if (execution.type === 'CREATURE') {
  //     importVariableStore(execution.data.id, cache.store);
  //     return cache.ors as T;
  //   } else {
  //     throw new Error(`Unknown operation execution type`);
  //   }
  // }

  // Execute based on type
  if (execution.type === 'CHARACTER') {
    if (useDirectExecution) {
      results = await _executeCharacterOperations(execution.data);
    } else {
      results = (await pool.exec('executeOperationsViaWorker', [execution])) as OperationResultData;
    }
    importVariableStore('CHARACTER', results.store);
    // setOpsCache(execution, results);
    return results.ors as T;
  } else if (execution.type === 'CREATURE') {
    if (useDirectExecution) {
      results = await _executeCreatureOperations({
        ...execution.data,
        charStore: exportVariableStore('CHARACTER'),
      });
    } else {
      results = (await pool.exec('executeOperationsViaWorker', [
        execution,
        exportVariableStore('CHARACTER'),
      ])) as OperationResultData;
    }
    importVariableStore(execution.data.id, results.store);
    // setOpsCache(execution, results);
    return results.ors as T;
  } else {
    throw new Error(`Unknown operation execution type`);
  }
}
