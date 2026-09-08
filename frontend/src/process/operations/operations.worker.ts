/// <reference lib="webworker" />
export {};

import { OperationExecution } from '@schemas/content';
import { _executeCharacterOperations, _executeCreatureOperations } from '../operations/operation-controller';
import { VariableStore } from '@schemas/variables';
import { withWorkerContentPackage } from './operation-content-package';

type WorkerRequest = {
  id: number;
  execution: OperationExecution;
  charStore?: VariableStore;
};

type WorkerResponse = { id: number; status: 'success'; data: any } | { id: number; status: 'error'; message: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, execution, charStore } = e.data;

  try {
    const result = await withWorkerContentPackage(execution.data.content, async () => {
      if (execution.type === 'CHARACTER') return await _executeCharacterOperations(execution.data);
      if (execution.type === 'CREATURE')
        return await _executeCreatureOperations({ ...execution.data, charStore: charStore! });
      throw new Error('Unknown operation execution type');
    });

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
