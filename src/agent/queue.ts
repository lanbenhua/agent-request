

export type Runner<T> = () => T | Promise<T> ;
export type Task<T> = (value: T | PromiseLike<T>) => void;
export type QueueOptions = {}

class Queue {
  private _size: number = 10;
  private _options?: QueueOptions;
  private _queue: Task<any>[] = [];
  private _pending: number = 0;

  constructor(size: number, options?: QueueOptions) {
    this._queue = [];
    this._pending = 0;
    this._options = options;

    this.resize(size);
  }

  public get size(): number {
    return this._size;
  }

  public get queue(): Task<any>[]  {
    return this._queue;
  }

  public get options(): QueueOptions | undefined {
    return this._options;
  }

  public get pending(): number {
    return this._pending;
  }

  public resize(size: number) {
    this._size = size;

    // Trigger queued items if queue became bigger
    this._check();
  }

  public run<T>(runner: Runner<T>): Promise<T> {
    return new Promise<number>((resolve) => this._push(resolve))
      .then(runner)
      .then(this._finish, this._error)
  }

  protected _check() {
    if (this._pending >= this.size)
      return;

    if (this._queue.length < 1)
      return;

    this._pending++;
    const task = this._queue.shift();
    task && task(undefined);

    // Flush all queued items until queue is full
    this._check();
  }

  protected _push(runner: Task<any>) {
    this._queue.push(runner);
    this._check();
  }

  protected _pop() {
    this._pending--;

    if (this._pending < 0)
      throw new Error('Pop called more than there were pending fetches');

    this._check();
  }

  protected _finish(res: any): any {
    this._pop();
    return res;
  }

  protected _error(err: any) {
    this._pop();
    throw err;
  }
}

export default Queue