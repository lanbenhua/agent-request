

export type Runner<T> = () => T | Promise<T> ;
export type Kill = () => boolean;
export type QueueTaskPriority = number | 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
export type QueueTask<T> = {
  runner: Runner<T>;
  kill?: Kill | null;
  priority?: QueueTaskPriority | null;
}
export type QueueOptions = {}

class Queue {
  private _options?: QueueOptions;
  private _pending: number = 0;
  private _concurrency: number = 100;
  private _queue: QueueTask<any>[] = [];

  constructor(concurrency: number, options?: QueueOptions) {
    this._queue = [];
    this._pending = 0;
    this._options = options;

    this._resolve = this._resolve.bind(this)
    this._reject = this._reject.bind(this)

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

  public reconcurrency(concurrency: number) {
    this._concurrency = concurrency;

    // // Trigger queued items if queue became bigger
    // this._check();
  }

  public push<T>(task: QueueTask<T>): boolean {
    const { kill, runner } = task;
    new Promise<T>((resolve, reject) => {
      const kill2 = () => {
        const killed = kill();
        if (killed) {
          reject();
          return true;
        }

        return false;
      }
      const runner2 = () => {
        this._pending++;

        const result = runner();
        if (isPromise(result)) {
          return (result as Promise<T>).then(res => {
            resolve(res)
            return res;
          }, err => {
            reject(err);
            throw err;
          })
        }
        resolve(result)
        return result;
      }

      this._push<T>({
        ...task,
        kill: kill2,
        runner: runner2,
      })
    })
    .then(this._resolve, this._reject)

    // always return true
    // In the future, we maybe add maxinum size of queue to reject some task, that will return false 
    return true;
  }

  public pop<T>(): QueueTask<T> | undefined {
    if (!this._check()) return undefined

    const task = this._queue.shift();
    return task
  }

  protected _check(): boolean {
    if (this._pending >= this.size)
      return false;

    if (this._queue.length < 1)
      return false;

    return true
  }

  protected _priority(priority?: QueueTaskPriority | null): number {
    if (isNil(priority)) return 0;
    if (priority === 'HIGHEST') priority = Number.MAX_SAFE_INTEGER;
    if (priority === 'HIGH') priority = 1e4;
    if (priority === 'MEDIUM') priority = 0;
    if (priority === 'LOW') priority = -1e4;
    if (priority === 'LOWEST') priority = Number.MIN_SAFE_INTEGER;

    return priority;
  }

  protected _compare(priorityA?: QueueTaskPriority | null, priorityB?: QueueTaskPriority | null): number {
    priorityA = this._priority(priorityA)
    priorityB = this._priority(priorityB)

    return priorityB-priorityA
  }
 
  protected _push<T>(task: QueueTask<T>) {
    this._queue = this._queue.concat(task).sort((a, b) => this._compare(a.priority, b.priority));
  }

  protected _pop() {
    this._pending--;

    if (this._pending < 0)
      throw new Error('Pop called more than there were pending fetches');
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

export default Queue

function isNil(target: any): boolean {
  return target === null || target === undefined;
}

function isPromise(target: any): boolean {
  if (target && target.then && typeof target.then === 'function') return true;
  return false;
}