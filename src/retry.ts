/* eslint-disable @typescript-eslint/no-inferrable-types */
import { AgentFetch, AgentReqInit, AgentResponse, CancelablePromise, PromiseTaskRunner } from './types/agent';
import { RetryInit } from './types/retry';
import { isNil } from './utils/is';

class RetryScheduler<T> {
  private __attempt: number = 0;
  private __canceled?: boolean;
  // @ts-ignore
  private __intervalId?: number | null;
  private _init?: RetryInit<T>;
  private _runner?: PromiseTaskRunner<T>;

  constructor(runner: PromiseTaskRunner<T>, init: RetryInit<T>) {
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

  public start(): CancelablePromise<T> {
    const res: CancelablePromise<T> = this._run();

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

    if (this.__intervalId !== null && this.__intervalId !== undefined) {
      window.clearTimeout(this.__intervalId);
      this.__intervalId = null;
    }
  }

  private _run(): Promise<T> {
    if (!this._runner) throw Error('Retry must have a runner, but null');

    return new Promise<T>((resolve, reject) => {
      this._runner?.().then(
        res => this._check(resolve, reject, undefined, res),
        err => this._check(resolve, reject, err, undefined)
      );
    });
  }

  private _retry(
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void,
    err?: Error | null, 
    res?: T | null
  ) {
    if (!this._runner) throw Error('Retry must have a runner, but null');

    this.__attempt++;

    const delay = typeof this._init?.delay === 'function' ? this._init.delay(this.__attempt, err, res) : this._init?.delay;

    this.__intervalId = window.setTimeout(() => {
      this._runner?.().then(
        res => this._check(resolve, reject, undefined, res),
        err => this._check(resolve, reject, err, undefined)
      );
    }, delay);
  }

  private _check(
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void,
    err?: Error | null,
    res?: T | null
  ) {
    const { retryOn, maxTimes } = this._init || {};

    const resolveOrReject = () => err !== null && err !== undefined ? reject(err) : resolve((res ?? undefined) as T);

    if (this.__canceled) return resolveOrReject();

    if (maxTimes !== null && maxTimes !== undefined && this.__attempt >= maxTimes) return resolveOrReject()

    if (retryOn) {
      return Promise.resolve(retryOn(this.__attempt, err, res)).then(
        retryOnRes => {
          if (retryOnRes) return this._retry(resolve, reject, err, res);
          resolveOrReject();
        },
        () => resolveOrReject()
      );
    }

    if (maxTimes !== null && maxTimes !== undefined && maxTimes < this.__attempt) return this._retry(resolve, reject, err, res);

    return resolveOrReject();
  }
}

export default RetryScheduler;

export const retryFetch = <T, U>(fetcher: AgentFetch<T, U>, retry: RetryInit<AgentResponse<T, U>>) => (
  init: AgentReqInit<T, U>
): Promise<AgentResponse<T, U>> => {
  return new RetryScheduler<AgentResponse<T, U>>(() => fetcher(init), retry).start();
};

