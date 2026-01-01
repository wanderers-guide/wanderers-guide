import {
  OperationCharacterResultPackage,
  OperationCreatureResultPackage,
  OperationExecution,
  OperationResultData,
} from '@typing/operations';
import { VariableStore } from '@typing/variables';
import { exportVariableStore, importVariableStore } from '@variables/variable-manager';
import { _executeCharacterOperations, _executeCreatureOperations } from './operation-controller';

// // Create a worker pool
// const pool =
//   'Worker' in window
//     ? workerpool.pool(new URL('./operations.worker.ts', import.meta.url).toString(), {
//         minWorkers: 1,
//         maxWorkers: 4,
//         workerOpts: {
//           // By default, Vite uses a module worker in dev mode, which can cause your application to fail. Therefore, we need to use a module worker in dev mode and a classic worker in prod mode.
//           type: import.meta.env.PROD ? undefined : 'module',
//         },
//       })
//     : null;

// // Cache for operation results to avoid redundant computations
// // const opsCache = new Map<number, OperationResultData>();

// // const getOpsCache = (execution: OperationExecution): OperationResultData | null => {
// //   const cacheKey = hashData(execution);
// //   console.log('Checking ops cache for key:', cacheKey, opsCache.size);
// //   if (opsCache.has(cacheKey)) {
// //     console.log('!!!! Cache hit for key:', cacheKey);
// //     return opsCache.get(cacheKey)!;
// //   }
// //   return null;
// // };

// // const setOpsCache = (execution: OperationExecution, results: OperationResultData) => {
// //   const cacheKey = hashData(execution);
// //   opsCache.set(cacheKey, results);
// // };

// /**
//  * Main function to execute operations for a character or creature
//  * @param execution - Operation execution data
//  * @returns - Operation results data
//  */
// export async function executeOperations<T = OperationCharacterResultPackage | OperationCreatureResultPackage>(
//   execution: OperationExecution,
//   options?: { directExecution?: boolean }
// ) {
//   let results: OperationResultData | null = null;
//   const useDirectExecution = options?.directExecution || !pool;

//   // Check cache first
//   // const cache = getOpsCache(execution);
//   // if (cache) {
//   //   if (execution.type === 'CHARACTER') {
//   //     importVariableStore('CHARACTER', cache.store);
//   //     return cache.ors as T;
//   //   } else if (execution.type === 'CREATURE') {
//   //     importVariableStore(execution.data.id, cache.store);
//   //     return cache.ors as T;
//   //   } else {
//   //     throw new Error(`Unknown operation execution type`);
//   //   }
//   // }

//   // Execute based on type
//   if (execution.type === 'CHARACTER') {
//     if (useDirectExecution) {
//       results = await _executeCharacterOperations(execution.data);
//     } else {
//       results = (await pool.exec('executeOperationsViaWorker', [execution])) as OperationResultData;
//     }
//     importVariableStore('CHARACTER', results.store);
//     // setOpsCache(execution, results);
//     return results.ors as T;
//   } else if (execution.type === 'CREATURE') {
//     if (useDirectExecution) {
//       results = await _executeCreatureOperations({
//         ...execution.data,
//         charStore: exportVariableStore('CHARACTER'),
//       });
//     } else {
//       results = (await pool.exec('executeOperationsViaWorker', [
//         execution,
//         exportVariableStore('CHARACTER'),
//       ])) as OperationResultData;
//     }
//     importVariableStore(execution.data.id, results.store);
//     // setOpsCache(execution, results);
//     return results.ors as T;
//   } else {
//     throw new Error(`Unknown operation execution type`);
//   }
// }

type Pending = {
  resolve: (value: any) => void;
  reject: (err: Error) => void;
};

const MAX_WORKERS = 4;
const workers: Worker[] = [];
const pending = new Map<number, Pending>();

let nextWorker = 0;
let nextId = 0;

// ─────────────────────────────────────────────
// Worker setup
// ─────────────────────────────────────────────

function initWorkers() {
  if (!('Worker' in window) || workers.length > 0) return;

  const count = Math.min(navigator.hardwareConcurrency || 2, MAX_WORKERS);

  for (let i = 0; i < count; i++) {
    const worker = new Worker(new URL('./operations.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      const { id, status, data, message } = e.data;
      const entry = pending.get(id);
      if (!entry) return;

      pending.delete(id);

      if (status === 'success') {
        entry.resolve(data);
      } else {
        entry.reject(new Error(message));
      }
    };

    workers.push(worker);
  }
}

// ─────────────────────────────────────────────
// Dispatch helper
// ─────────────────────────────────────────────

function execInWorker(execution: OperationExecution, charStore?: VariableStore): Promise<any> {
  initWorkers();

  if (workers.length === 0) {
    throw new Error('Workers unavailable');
  }

  const id = nextId++;
  const worker = workers[nextWorker];
  nextWorker = (nextWorker + 1) % workers.length;

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, execution, charStore });
  });
}

export async function executeOperations<T = OperationCharacterResultPackage | OperationCreatureResultPackage>(
  execution: OperationExecution,
  options?: { directExecution?: boolean }
) {
  let results: OperationResultData | null = null;

  const useDirectExecution = options?.directExecution || !('Worker' in window);

  if (execution.type === 'CHARACTER') {
    if (useDirectExecution) {
      results = await _executeCharacterOperations(execution.data);
    } else {
      results = await execInWorker(execution);
    }

    importVariableStore('CHARACTER', results!.store);
    return results!.ors as T;
  }

  if (execution.type === 'CREATURE') {
    const charStore = exportVariableStore('CHARACTER');

    if (useDirectExecution) {
      results = await _executeCreatureOperations({
        ...execution.data,
        charStore,
      });
    } else {
      results = await execInWorker(execution, charStore);
    }

    importVariableStore(execution.data.id, results!.store);
    return results!.ors as T;
  }

  throw new Error(`Unknown operation execution type`);
}
