import { TimeoutError } from './error';

class TimeoutScheduler {
  private _timeout: number;
  private _controller?: AbortController;
  // @ts-ignore
  private _timer?: number | null;
  private _isClear: boolean = false;
  
  constructor(
    timeout: number,
    controller?: AbortController,
  ) {
    this._timeout = timeout;
    this._controller = controller;
  }

  public wait() {
    return new Promise((resolve, reject) => {
      const cancel = () => {
        if (this.clear() === false) return;
        reject(new TimeoutError('User aborts exception'));
      };

      this._timer = window.setTimeout(resolve, this._timeout)
  
      if (this._controller?.signal.aborted) return cancel();
      this._controller?.signal.addEventListener('abort', cancel);
    });
  }

  public clear() {
    if (this._isClear) return false;
    if (this._timer !== null && this._timer !== undefined) {
      window.clearTimeout(this._timer);
      this._timer = undefined;
    }
    
    this._isClear = true;
  }
}

export default TimeoutScheduler;

export const sleep = (timeout: number, controller?: AbortController) => {
  return new TimeoutScheduler(timeout, controller).wait();
};
