import {
  OperationCharacterResultPackage,
  OperationCharacterResultPackageSchema,
  OperationCreatureResultPackage,
  OperationCreatureResultPackageSchema,
  OperationExecution,
  OperationResultData,
  OperationResultDataSchema,
} from '@schemas/content';
import { StoreID, VariableStore } from '@schemas/variables';
import { exportVariableStore, importVariableStore, normalizeProficiencies } from '@variables/variable-manager';
import { _executeCharacterOperations, _executeCreatureOperations } from './operation-controller';
import { displayError } from '@utils/notifications';
import { z } from 'zod';

// The controller synthesizes display sources such as "Elf Feat". They are not
// persisted content rows and intentionally omit authoring-only database fields.
// Keep their extension fields, while validating the computed results and the
// complete variable store using their existing runtime schemas.
const computedSourceSchema = z.object({ id: z.number(), name: z.string() }).passthrough();
const computedSourceResultsSchema = OperationCharacterResultPackageSchema.shape.ancestrySectionResults.element.extend({
  baseSource: computedSourceSchema,
});
const characterResultSchema = OperationCharacterResultPackageSchema.extend({
  contentSourceResults: z.array(computedSourceResultsSchema),
  classFeatureResults: z.array(computedSourceResultsSchema),
  ancestrySectionResults: z.array(computedSourceResultsSchema),
  itemResults: z.array(computedSourceResultsSchema),
});
const creatureResultSchema = OperationCreatureResultPackageSchema.extend({
  abilityResults: z.array(computedSourceResultsSchema),
  itemResults: z.array(computedSourceResultsSchema),
});
const workerResultDataSchema = OperationResultDataSchema.extend({
  ors: z.union([characterResultSchema, creatureResultSchema]),
});
const workerResponseSchema = z.discriminatedUnion('status', [
  z.object({ id: z.number().int(), status: z.literal('success'), data: z.unknown() }),
  z.object({ id: z.number().int(), status: z.literal('error'), message: z.string() }),
]);

/** Expected cancellation when a newer calculation or navigation replaces a request. */
export class OperationCancelledError extends Error {
  constructor() {
    super('Calculation superseded');
    this.name = 'AbortError';
  }
}

/** Distinguish navigation/supersession from a calculation that needs user recovery. */
export function isOperationCancelled(error: unknown): boolean {
  return error instanceof OperationCancelledError;
}

type Slot = { worker: Worker | null; job?: Job };
type Job = {
  id: number;
  storeId: StoreID;
  execution: OperationExecution;
  charStore: VariableStore;
  characterVersion: number;
  deadline: number;
  signal?: AbortSignal;
  resolve: (value: OperationResultData) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  abort: () => void;
};
const slots: Slot[] = [];
const queue: Job[] = [];
const jobs = new Map<number, Job>();
const versions = new Map<StoreID, number>();
let nextId = 0;
let characterVersion = 0;
let committedCharacterVersion = 0;
let characterFailure: Error | null = null;
const snapshotWaiters = new Set<() => void>();
let directQueue: Promise<void> = Promise.resolve();
let directExecutions = 0;
const CALCULATION_TIMEOUT_MS = 60_000;

/** Wake consumers after callers have had a chance to apply committed character effects. */
function notifySnapshotWaiters(): void {
  queueMicrotask(() => {
    for (const notify of [...snapshotWaiters]) notify();
  });
}

/** A superseded view never retries just because its parent character became current. */
function ownsStore(job: Pick<Job, 'id' | 'storeId' | 'signal'>): boolean {
  return !job.signal?.aborted && versions.get(job.storeId) === job.id;
}

/** Wait for a stable parent without occupying a worker or extending the request deadline. */
function waitForCharacterSnapshot(job: Pick<Job, 'id' | 'storeId' | 'signal' | 'deadline'>): Promise<void> {
  return new Promise((resolve, reject) => {
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error): void => {
      if (finished) return;
      finished = true;
      if (timer !== undefined) clearTimeout(timer);
      snapshotWaiters.delete(check);
      job.signal?.removeEventListener('abort', check);
      if (error) reject(error);
      else resolve();
    };
    const check = (): void => {
      if (!ownsStore(job)) finish(new OperationCancelledError());
      else if (Date.now() >= job.deadline) finish(new Error('Calculation took too long. Please retry.'));
      else if (characterFailure)
        finish(new Error('The character calculation failed. Retry it before calculating companions.'));
      else if (committedCharacterVersion === characterVersion) finish();
    };
    snapshotWaiters.add(check);
    job.signal?.addEventListener('abort', check, { once: true });
    timer = setTimeout(
      () => finish(new Error('Calculation took too long. Please retry.')),
      Math.max(0, job.deadline - Date.now())
    );
    check();
  });
}

/** A calculation can commit only while its store and parent character are current. */
function isCurrent(job: Pick<Job, 'id' | 'storeId' | 'characterVersion' | 'signal'>): boolean {
  return (
    ownsStore(job) &&
    (job.storeId === 'CHARACTER' ||
      (job.characterVersion === characterVersion && committedCharacterVersion === characterVersion))
  );
}

/** Release listeners, deadlines and worker occupancy on every terminal path. */
function settle(job: Job, result: OperationResultData | Error, terminate = false): void {
  if (!jobs.delete(job.id)) return;
  clearTimeout(job.timer);
  job.signal?.removeEventListener('abort', job.abort);
  const queued = queue.indexOf(job);
  if (queued !== -1) queue.splice(queued, 1);
  const slot = slots.find((entry) => entry.job === job);
  if (slot) {
    slot.job = undefined;
    if (terminate) {
      slot.worker?.terminate();
      slot.worker = null;
    }
  }
  if (result instanceof Error) job.reject(result);
  else job.resolve(result);
  queueMicrotask(pump);
}

/** Only one request occupies a worker, including while its controller awaits content. */
function pump(): void {
  const count = Math.max(1, Math.min(navigator.hardwareConcurrency || 2, 4));
  while (queue.length > 0) {
    let slot = slots.find((entry) => !entry.job);
    if (!slot && slots.length < count) {
      slot = { worker: null };
      slots.push(slot);
    }
    if (!slot) return;
    const job = queue.shift()!;
    slot.job = job;
    try {
      if (!slot.worker) {
        const worker = new Worker(new URL('./operations.worker.ts', import.meta.url), { type: 'module' });
        slot.worker = worker;
        const owner = slot;
        worker.onmessage = (event: MessageEvent<unknown>) => {
          const active = owner.job;
          if (owner.worker !== worker || !active) return;
          const parsed = workerResponseSchema.safeParse(event.data);
          if (!parsed.success) {
            settle(active, new Error('Invalid calculation response'), true);
            return;
          }
          if (parsed.data.id !== active.id) return;
          if (parsed.data.status === 'error') {
            settle(active, new Error(parsed.data.message || 'Calculation failed'));
            return;
          }
          const result = workerResultDataSchema.safeParse(parsed.data.data);
          if (!result.success) {
            settle(active, new Error('Invalid calculation response'), true);
            return;
          }
          const packageSchema = active.execution.type === 'CHARACTER' ? characterResultSchema : creatureResultSchema;
          if (!packageSchema.safeParse(result.data.ors).success) {
            settle(active, new Error('Calculation response has the wrong entity type'), true);
            return;
          }
          // Preserve the validated original packet, including extensible descriptors.
          // Legacy public result types label those descriptors as full content rows;
          // this one assertion bridges that existing nominal type mismatch.
          settle(active, parsed.data.data as OperationResultData);
        };
        worker.onerror = (event) => {
          event.preventDefault();
          if (owner.worker === worker && owner.job)
            settle(owner.job, new Error('Calculation worker failed. Please retry.'), true);
        };
        worker.onmessageerror = () => {
          if (owner.worker === worker && owner.job)
            settle(owner.job, new Error('Could not read calculation result. Please retry.'), true);
        };
      }
      slot.worker.postMessage({ id: job.id, execution: job.execution, charStore: job.charStore });
    } catch (error) {
      settle(job, error instanceof Error ? error : new Error('Could not start calculation'), true);
    }
  }
}

/** Queue a bounded worker request, replacing older work for the same store. */
function inWorker(data: Omit<Job, 'resolve' | 'reject' | 'timer' | 'abort'>): Promise<OperationResultData> {
  return new Promise((resolve, reject) => {
    const job: Job = {
      ...data,
      resolve,
      reject,
      timer: setTimeout(
        () => settle(job, new Error('Calculation took too long. Please retry.'), true),
        Math.max(0, data.deadline - Date.now())
      ),
      abort: () => settle(job, new OperationCancelledError(), true),
    };
    jobs.set(job.id, job);
    job.signal?.addEventListener('abort', job.abort, { once: true });
    queue.push(job);
    if (job.signal?.aborted) job.abort();
    else pump();
  });
}

/** Serialize the workerless path and restore the last committed stores before publishing. */
function directly(data: Omit<Job, 'resolve' | 'reject' | 'timer' | 'abort'>): Promise<OperationResultData> {
  directExecutions++;
  const run = directQueue.then(async () => {
    if (!isCurrent(data)) throw new OperationCancelledError();
    const previousCharacter = exportVariableStore('CHARACTER');
    const previousStore = exportVariableStore(data.storeId);
    try {
      return data.execution.type === 'CHARACTER'
        ? await _executeCharacterOperations(data.execution.data)
        : await _executeCreatureOperations({ ...data.execution.data, charStore: data.charStore });
    } finally {
      importVariableStore('CHARACTER', previousCharacter);
      if (data.storeId !== 'CHARACTER') importVariableStore(data.storeId, previousStore);
    }
  });
  directQueue = run.then(
    () => {
      directExecutions--;
    },
    () => {
      directExecutions--;
    }
  );
  return run;
}

/**
 * Compute an entity in an isolated worker and commit only its latest generation.
 * Callers controlling a view pass a signal to invalidate work and side effects on navigation.
 */
export async function executeOperations<T = OperationCharacterResultPackage | OperationCreatureResultPackage>(
  execution: OperationExecution,
  options?: { directExecution?: boolean; signal?: AbortSignal }
): Promise<T> {
  if (options?.signal?.aborted) throw new OperationCancelledError();
  const storeId = execution.type === 'CHARACTER' ? 'CHARACTER' : execution.data.id;
  const id = ++nextId;
  const deadline = Date.now() + CALCULATION_TIMEOUT_MS;
  versions.set(storeId, id);
  if (execution.type === 'CHARACTER') {
    characterVersion++;
    characterFailure = null;
  }
  notifySnapshotWaiters();
  for (const job of [...jobs.values()]) {
    if (job.storeId === storeId || (execution.type === 'CHARACTER' && job.storeId !== 'CHARACTER')) job.abort();
  }
  const request = { id, storeId, signal: options?.signal, deadline };
  while (true) {
    if (execution.type === 'CREATURE' && committedCharacterVersion !== characterVersion) {
      await waitForCharacterSnapshot(request);
      // Another edit can arrive between the wake-up and this continuation.
      if (committedCharacterVersion !== characterVersion) continue;
    }
    if (!ownsStore(request)) throw new OperationCancelledError();
    if (Date.now() >= deadline) throw new Error('Calculation took too long. Please retry.');
    const data = { ...request, execution, charStore: exportVariableStore('CHARACTER'), characterVersion };
    try {
      const result = options?.directExecution || !('Worker' in window) ? await directly(data) : await inWorker(data);
      // A fallback controller temporarily owns the main-thread stores. Publish
      // isolated worker results only after that controller restores its snapshot.
      while (directExecutions > 0) await directQueue;
      if (!isCurrent(data)) throw new OperationCancelledError();
      if (Date.now() >= deadline) throw new Error('Calculation took too long. Please retry.');
      importVariableStore(storeId, result.store);
      normalizeProficiencies(storeId);
      if (execution.type === 'CHARACTER') {
        committedCharacterVersion = characterVersion;
        notifySnapshotWaiters();
      }
      result.errors?.forEach((error) => displayError(error));
      return result.ors as T;
    } catch (error) {
      if (
        execution.type === 'CREATURE' &&
        isOperationCancelled(error) &&
        ownsStore(request) &&
        data.characterVersion !== characterVersion
      ) {
        // The view is still current: rebuild against its newly committed parent.
        continue;
      }
      if (execution.type === 'CHARACTER' && versions.get(storeId) === id) {
        characterFailure = error instanceof Error ? error : new Error('Character calculation failed');
        notifySnapshotWaiters();
      }
      throw error;
    }
  }
}
