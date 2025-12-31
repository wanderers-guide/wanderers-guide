import { JSendResponse } from './requests';

export interface WorkerRequest<T = Record<string, any>> {
  type: 'RUN';
  payload: T;
}

export interface WorkerResponse<T = Record<string, any>> {
  type: 'RESULT';
  payload: JSendResponse<T>;
}
