import { PollingInit, PollingRunner, PollingCancel } from './type';

class Polling<T = unknown> {
  private _init: PollingInit<T>;

  constructor(init: PollingInit<T>) {
    if (!init) throw Error('Polling must have an init, but null');

    this._init = init;
  }

  public getInit(): PollingInit<T> {
    return this._init;
  }

  public polling(runner: PollingRunner<T>): PollingCancel {
    const { interval, pollingOn } = this._init;
    if (!runner) throw Error('Must have a runner when polling');
    if (!pollingOn || !interval)
      throw Error('Must have a pollingOn function when polling');

    let intervalId: NodeJS.Timeout | null | undefined;
    // @ts-ignore
    this._init.__isInitial = true;
    // @ts-ignore
    if (this._init.__isInitial) {
      this._run(runner);
    } else {
      intervalId = setInterval(() => {
        this._run(runner);
      }, interval);
    }

    return () =>
      intervalId !== null &&
      intervalId !== undefined &&
      clearInterval(intervalId);
  }

  private _run(runner: PollingRunner<T>): Promise<T | undefined> {
    const { pollingOn } = this._init;
    if (!pollingOn)
      throw new Error('Must have a pollingOn function when polling');

    // @ts-ignore
    delete this._init.__isInitial;

    return runner()
      .then((res) => {
        try {
          Promise.resolve(pollingOn(null, res))
            .then((pollingOnRes) => {
              if (pollingOnRes) runner();
            })
            .catch((err) => {
              throw err;
            });
        } catch (err) {
          throw err;
        }
        return res;
      })
      .catch((err) => {
        try {
          Promise.resolve(pollingOn(err, null))
            .then((pollingOnRes) => {
              if (pollingOnRes) runner();
            })
            .catch((err) => {
              throw err;
            });
        } catch (err) {
          throw err;
        }
        throw err;
      });
  }
}

export default Polling;
