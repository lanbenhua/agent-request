import { QueueOptions, QueueItem, QueueTask, QueuePromise } from './type';
import Priority from './priority';
import { CustomCancelError } from './error';

const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
  auto: true,
};

class Queue {
  private _options?: QueueOptions;
  private _isPaused: boolean = false;
  private _pending: number = 0;
  private _concurrency: number = 10;
  private _queue: QueueItem<any>[] = [];

  constructor(concurrency: number, options?: QueueOptions) {
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

  public enqueue<T = unknown>(task: QueueTask<T>): QueuePromise<T> {
    const { runner } = task;

    let queueItem: QueueItem<T>;
    const promise: QueuePromise<T> = new Promise<T>((resolve, reject) => {
      queueItem = {
        ...task,
        runner,
        resolve,
        reject,
      };
      this._push<T>(queueItem);
    }).then(this._resolve, this._reject);

    promise.cancel = () => {
      this._cancel<T>(queueItem);
    };

    return promise;
  }

  public dequeue<T = unknown>() {
    this._check<T>();
  }

  protected _check<T>() {
    if (this._isPaused) return;
    if (this._pending >= this.size) return;
    if (this._queue.length < 1) return;

    this._run<T>();

    // Flush all queued items until queue is full
    this._check();
  }

  protected _cancel<T>(task: QueueItem<T>) {
    const { reject } = task;
    reject(new CustomCancelError('Canceled', 'QueueCancelError'));
  }

  protected _run<T>() {
    const task: QueueItem<T> | undefined | null = this._queue.shift();
    if (!task) return;

    this._pending++;

    const { runner, resolve, reject } = task;

    runner().then(resolve, reject);
  }

  protected _push<T>(task: QueueItem<T>) {
    this._queue = this._queue
      .concat(task)
      .sort(
        (a, b) =>
          new Priority(b.priority).num() - new Priority(a.priority).num()
      );

    this._check();
  }

  protected _pop() {
    this._pending--;

    if (this._pending < 0)
      throw new Error('Pop called more than there were pending fetches');

    this._check();
  }

  protected _resolve(res: any): any {
    this._pop();
    return res;
  }

  protected _reject(err: any) {
    this._pop();
    throw err;
  }
}

export default Queue;
