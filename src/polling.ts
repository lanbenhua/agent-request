import { PromiseTaskRunner } from './types/agent';
import { PollingInit, PollingCancel } from './types/polling';

class PollingScheduler<T = unknown> {
  // @ts-ignore
  private __intervalId?: NodeJS.Timeout;
  private _init?: PollingInit<T>;
  private _runner?: PromiseTaskRunner<T>;

  constructor(runner: PromiseTaskRunner<T>, init: PollingInit<T>) {
    if (!runner) throw Error('Polling must have a runner, but null');
    if (!init) throw Error('Polling must have an init, but null');

    this.__intervalId = undefined;
    this._init = init;
    this._runner = runner;
  }

  public get init(): PollingInit<T> | undefined {
    return this._init;
  }

  public polling(): PollingCancel {
    const { interval } = this._init || {};

    if (!interval) return () => this._cancel();

    this.__intervalId = setInterval(() => {
      this._run();
    }, interval);

    this._run();

    return () => this._cancel();
  }

  public cancel() {
    this._cancel();
  }

  private _cancel() {
    if (this.__intervalId !== null && this.__intervalId !== undefined)
      clearInterval(this.__intervalId);
  }

  private _run(): Promise<T | undefined> {
    if (!this._runner) throw Error('Polling must have a runner, but null');

    return this._runner().then(
      res => {
        this._check(undefined, res);
        return res;
      },
      err => {
        this._check(err, undefined);
        throw err;
      }
    );
  }

  private _check(err?: Error | null, res?: T | null) {
    const { pollingOn } = this._init || {};
    if (pollingOn) {
      Promise.resolve(pollingOn(err, res)).then(
        pollingOnRes => {
          if (!pollingOnRes) this._cancel();
        },
        () => {
          this._cancel();
        }
      );
    }
  }
}

export default PollingScheduler;
