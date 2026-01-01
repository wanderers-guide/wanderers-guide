/// <reference lib="webworker" />

import { OperationExecution } from '@typing/operations';
import workerpool from 'workerpool';
import { _executeCharacterOperations, _executeCreatureOperations } from '../operations/operation-controller';
import { VariableStore } from '@typing/variables';

async function executeOperationsViaWorker(execution: OperationExecution, charStore?: VariableStore) {
  if (execution.type === 'CHARACTER') {
    return await _executeCharacterOperations(execution.data);
  } else if (execution.type === 'CREATURE') {
    return await _executeCreatureOperations({
      ...execution.data,
      charStore: charStore!,
    });
  } else {
    throw new Error('Unknown operation execution type');
  }
}

workerpool.worker({
  executeOperationsViaWorker,
});
