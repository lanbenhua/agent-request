/* eslint-disable @typescript-eslint/no-inferrable-types */
import { CustomCancelError } from './error';
import { AgentFetch, AgentInit, AgentReqInit, AgentResponse, CancelablePromise } from './types/agent';
import { QueueItem, QueueOptions, QueueTask, QueueTaskPriority } from './types/queue';
import { isNil } from './utils/is';

const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
  auto: true,
};

class QueuePriority {
  private _priority?: QueueTaskPriority | null = 0;

  constructor(priority?: QueueTaskPriority | null) {
    this._priority = priority || 0;
  }

  public num(): number {
    const priority = this._priority;
    if (isNil(priority)) return 0;
    if (priority === 'HIGHEST') return Number.MAX_SAFE_INTEGER;
    if (priority === 'HIGH') return 1e4;
    if (priority === 'MEDIUM') return 0;
    if (priority === 'LOW') return -1e4;
    if (priority === 'LOWEST') return Number.MIN_SAFE_INTEGER;

    return priority as number;
  }
}

class QueueScheduler {
  private _options?: QueueOptions;
  private _isPaused: boolean = false;
  private _pending: number = 0;
  private _concurrency: number = 5;
  private _queue: QueueItem<any>[] = [];

  constructor(concurrency: number = 5, options?: QueueOptions) {
    this._queue = [];
    this._pending = 0;
    this._options = { ...DEFAULT_QUEUE_OPTIONS, ...options };

    this._resolve = this._resolve.bind(this);
    this._reject = this._reject.bind(this);

    this.reconcurrency(concurrency);
  }

  public get size(): number {
    return this._queue.length;
  }

  public get concurrency(): number {
    return this._concurrency;
  }

  public get options(): QueueOptions | undefined {
    return this._options;
  }

  public get pending(): number {
    return this._pending;
  }

  public get isPaused(): boolean {
    return this._isPaused;
  }

  public pause() {
    this._isPaused = true;
  }

  public resume() {
    this._isPaused = false;

    if (this._options?.auto) {
      this._check();
    }
  }

  public reconcurrency(concurrency: number) {
    this._concurrency = concurrency;

    if (this._options?.auto) {
      // Trigger queued items if queue became bigger
      this._check();
    }
  }

  public enqueue<T = unknown>(task: QueueTask<T>): CancelablePromise<T> {
    const { runner } = task;

    let queueItem: QueueItem<T> | undefined;
    const promise: CancelablePromise<T> = new Promise<T>((resolve, reject) => {
      queueItem = {
        ...task,
        runner,
        resolve,
        reject,
      };
      this._push<T>(queueItem);
    }).then(this._resolve, this._reject);

    promise.cancel = () => {
      queueItem && this._cancel<T>(queueItem);
    };

    return promise;
  }

  public dequeue<T = unknown>() {
    this._check<T>();
  }

  private _check<T>() {
    if (this._isPaused) return;
    if (this._pending >= this.size) return;
    if (this._queue.length < 1) return;

    this._run<T>();

    // Flush all queued items until queue is full
    this._check();
  }

  private _cancel<T>(task: QueueItem<T>) {
    const { reject } = task;
    reject(new CustomCancelError('Canceled', 'QueueCancelError'));
  }

  private _run<T>() {
    const task: QueueItem<T> | undefined | null = this._queue.shift();
    if (!task) return;

    this._pending++;

    const { runner, resolve, reject } = task;

    runner().then(resolve, reject);
  }

  private _push<T>(task: QueueItem<T>) {
    this._queue = this._queue
      .concat(task)
      .sort(
        (a, b) =>
          new QueuePriority(b.priority).num() - new QueuePriority(a.priority).num()
      );

    this._check();
  }

  private _pop() {
    this._pending--;

    if (this._pending < 0)
      throw new Error('Pop called more than there were pending fetches');

    this._check();
  }

  private _resolve(res: any): any {
    this._pop();
    return res;
  }

  private _reject(err: any) {
    this._pop();
    throw err;
  }
}

export default QueueScheduler;

export const queueFetch = <T, U>(fetcher: AgentFetch<T, U>, queue: QueueScheduler) => (
  init: AgentReqInit<T, U>
): Promise<AgentResponse<T, U>> => {
  return queue.enqueue<AgentResponse<T, U>>({
    runner: () => fetcher(init),
    priority: init.queue?.priority,
  })
};