import Tinypool from 'tinypool';
import { env } from '../../env';

/** the subset of Tinypool used by the services. */
export interface WorkerPool {
  run(task: unknown): Promise<unknown>;
}

/**
 * ETS2 Navigasyon: creates a worker pool, or, when WORKER_THREADS=0, runs
 * the task function in the main thread.
 *
 * In-process mode is used when running under Bun (the Windows desktop app):
 * Tinypool's workerData doesn't survive Bun's worker_threads, and a local
 * single-user server doesn't need worker threads anyway.
 *
 * `inline` must behave exactly like the worker wrapper: the task function
 * called with the task options merged with `workerData`.
 */
export function createPool<T extends object>(opts: {
  wrapperUrl: URL;
  workerData: object;
  inline: () => Promise<(task: T) => unknown>;
}): WorkerPool {
  if (env.WORKER_THREADS === 0) {
    const fnPromise = opts.inline();
    return {
      run: async (task: unknown) => {
        const fn = await fnPromise;
        return fn({ ...(task as T), ...opts.workerData });
      },
    };
  }
  return new Tinypool({
    minThreads: 1,
    maxThreads: env.WORKER_THREADS,
    filename: opts.wrapperUrl.href,
    workerData: opts.workerData,
  });
}
