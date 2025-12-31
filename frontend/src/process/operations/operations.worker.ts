/// <reference lib="webworker" />

import { OperationCharacterResultPackage, OperationCreatureResultPackage } from '@typing/operations';
import { WorkerRequest, WorkerResponse } from '@typing/worker';
import {
  _internal_executeCharacterOperations,
  _internal_executeCreatureOperations,
  OperationExecution,
} from '../operations/operation-controller';

self.onmessage = async (e: MessageEvent<WorkerRequest<OperationExecution>>) => {
  try {
    if (e.data.type === 'RUN') {
      if (e.data.payload.type === 'CHARACTER') {
        const result = await _internal_executeCharacterOperations(e.data.payload.data);
        const response: WorkerResponse<OperationCharacterResultPackage> = {
          type: 'RESULT',
          payload: {
            status: 'success',
            data: result,
          },
        };
        return self.postMessage(response);
      } else if (e.data.payload.type === 'CREATURE') {
        const result = await _internal_executeCreatureOperations(e.data.payload.data);
        const response: WorkerResponse<OperationCreatureResultPackage> = {
          type: 'RESULT',
          payload: {
            status: 'success',
            data: result,
          },
        };
        return self.postMessage(response);
      } else {
        throw new Error('Unknown operation type');
      }
    }
  } catch (err) {
    const response: WorkerResponse<{}> = {
      type: 'RESULT',
      payload: {
        status: 'error',
        message:
          err instanceof Error
            ? JSON.stringify({
                name: err.name,
                cause: err.cause ?? null,
                stack: err.stack ?? null,
                message: err.message,
              })
            : 'Unknown error',
      },
    };
    return self.postMessage(response);
  }
};
