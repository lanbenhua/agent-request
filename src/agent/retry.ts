import { isNil } from './utils/is';

type RetryCancel = () => void;
type RetryRunner<T> = () => Promise<T>;
type RetryInit<T> = {
  // inheritTimeout?: boolean;
  maxTimes?: number;
  delay?:
    | number
    | ((
        attempt: number,
        error: Error | null | undefined,
        response: T | null | undefined
      ) => number);
  retryOn?: (
    attempt: number,
    error: Error | null | undefined,
    response: T | null | undefined
  ) => boolean | Promise<boolean>;
};
export interface CancelablePromise<T> extends Promise<T> {
  cancel?: RetryCancel;
}

class Retry<T> {
  private __attempt: number = 0;
  private __canceled?: boolean;
  private __intervalId?: NodeJS.Timeout;
  private _init?: RetryInit<T>;
  private _runner?: RetryRunner<T>;

  constructor(runner: RetryRunner<T>, init: RetryInit<T>) {
    if (!runner) throw Error('Retry must have a runner, but null');
    if (!init) throw Error('Retry must have an init, but null');

    if (isNil(init.delay) && isNil(init.retryOn))
      console.warn('Retry init must have a delay or retryOn, but noth null');

    this.__attempt = 0;
    this._runner = runner;
    this._init = init;
  }

  public get init(): RetryInit<T> | undefined {
    return this._init;
  }

  public start(): CancelablePromise<T | undefined> {
    const res: CancelablePromise<T | undefined> = this._run();

    res.cancel = () => {
      this._cancel();
    };
    return res;
  }

  public cancel() {
    this._cancel();
  }

  private _cancel() {
    if (!this.__canceled) this.__canceled = true;

    if (this.__intervalId !== null && this.__intervalId !== undefined)
      clearTimeout(this.__intervalId);
  }

  private _run(): Promise<T | undefined> {
    if (!this._runner) throw Error('Retry must have a runner, but null');

    return new Promise((resolve, reject) => {
      this._runner?.().then(
        (res) => {
          this._check(resolve, reject, undefined, res);
          return res;
        },
        (err) => {
          this._check(resolve, reject, err, undefined);
          throw err;
        }
      );
    });
  }

  private _retry(
    resolve: (value: T | PromiseLike<T | undefined> | undefined) => void,
    reject: (reason?: any) => void,
    err?: Error | null,
    res?: T | null
  ) {
    if (!this._runner) throw Error('Retry must have a runner, but null');

    const { delay } = this._init || {};
    this.__attempt++;

    const delay2 =
      typeof delay === 'function' ? delay(this.__attempt, err, res) : delay;

    this.__intervalId = setTimeout(() => {
      this._runner?.().then(
        (res) => {
          this._check(resolve, reject, undefined, res);
        },
        (err) => {
          this._check(resolve, reject, err, undefined);
        }
      );
    }, delay2);
  }

  private _check(
    resolve: (value: T | PromiseLike<T | undefined> | undefined) => void,
    reject: (reason?: any) => void,
    err?: Error | null,
    res?: T | null
  ) {
    const { retryOn, maxTimes } = this._init || {};

    if (this.__canceled)
      return err != null ? reject(err) : resolve(res ?? undefined);

    if (
      maxTimes !== null &&
      maxTimes !== undefined &&
      maxTimes >= this.__attempt
    ) {
      return err != null ? reject(err) : resolve(res ?? undefined);
    }

    if (retryOn) {
      return Promise.resolve(retryOn(this.__attempt, err, res)).then(
        (retryOnRes) => {
          if (retryOnRes) this._retry(resolve, reject, err, res);
          else err != null ? reject(err) : resolve(res ?? undefined);
        },
        () => {
          err != null ? reject(err) : resolve(res ?? undefined);
        }
      );
    }

    if (
      maxTimes !== null &&
      maxTimes !== undefined &&
      maxTimes < this.__attempt
    ) {
      this._retry(resolve, reject, err, res);
    }

    return err != null ? reject(err) : resolve(res ?? undefined);
  }
}

export default Retry;
