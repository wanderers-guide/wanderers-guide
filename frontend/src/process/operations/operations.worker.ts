/// <reference lib="webworker" />

import { OperationExecution } from '@typing/operations';
import workerpool from 'workerpool';
import { _executeCharacterOperations, _executeCreatureOperations } from '../operations/operation-controller';

async function executeOperationsViaWorker(execution: OperationExecution) {
  if (execution.type === 'CHARACTER') {
    return await _executeCharacterOperations(execution.data);
  } else if (execution.type === 'CREATURE') {
    return await _executeCreatureOperations(execution.data);
  } else {
    throw new Error('Unknown operation execution type');
  }
}

workerpool.worker({
  executeOperationsViaWorker,
});
