import {
  OperationCharacterResultPackage,
  OperationCreatureResultPackage,
  OperationExecution,
  OperationResultData,
} from '@typing/operations';
import { importVariableStore } from '@variables/variable-manager';
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

  if (execution.type === 'CHARACTER') {
    if (useDirectExecution) {
      results = await _executeCharacterOperations(execution.data);
    } else {
      results = (await pool.exec('executeOperationsViaWorker', [execution])) as OperationResultData;
    }
    importVariableStore('CHARACTER', results.store);
    return results.ors as T;
  } else if (execution.type === 'CREATURE') {
    if (useDirectExecution) {
      results = await _executeCreatureOperations(execution.data);
    } else {
      results = (await pool.exec('executeOperationsViaWorker', [execution])) as OperationResultData;
    }
    importVariableStore(execution.data.id, results.store);
    return results.ors as T;
  } else {
    throw new Error(`Unknown operation execution type`);
  }
}
