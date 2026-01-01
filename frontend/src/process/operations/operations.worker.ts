/// <reference lib="webworker" />
export {};

import { OperationExecution } from '@typing/operations';
import { _executeCharacterOperations, _executeCreatureOperations } from '../operations/operation-controller';
import { VariableStore } from '@typing/variables';

type WorkerRequest = {
  id: number;
  execution: OperationExecution;
  charStore?: VariableStore;
};

type WorkerResponse = { id: number; status: 'success'; data: any } | { id: number; status: 'error'; message: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, execution, charStore } = e.data;

  try {
    let result;

    if (execution.type === 'CHARACTER') {
      result = await _executeCharacterOperations(execution.data);
    } else if (execution.type === 'CREATURE') {
      result = await _executeCreatureOperations({
        ...execution.data,
        charStore: charStore!,
      });
    } else {
      throw new Error('Unknown operation execution type');
    }

    const response: WorkerResponse = {
      id,
      status: 'success',
      data: result,
    };

    self.postMessage(response);
  } catch (err) {
    self.postMessage({
      id,
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse);
  }
};
