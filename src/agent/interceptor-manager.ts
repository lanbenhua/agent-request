type OnFulfilled<T> = (response: T) => T | Promise<T>;
// eslint-disable-next-line
type OnRejected = (error: any) => any;

type InterceptorOptions<T> = {
  synchronous?: boolean;
  runWhen?: ((init: T) => boolean) | null;
};

interface Interceptor<T> {
  onFulfilled: OnFulfilled<T>;
  onRejected: OnRejected;
  synchronous?: InterceptorOptions<T>['synchronous'];
  runWhen?: InterceptorOptions<T>['runWhen'];
}

class InterceptorManager<T> {
  public handlers: (Interceptor<T> | null)[] = [];

  constructor() {
    this.handlers = [];
  }

  public use(
    onFulfilled: OnFulfilled<T>,
    onRejected: OnRejected,
    options?: InterceptorOptions<T>
  ): number {
    this.handlers = this.handlers.concat({
      onFulfilled: onFulfilled,
      onRejected: onRejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null,
    });

    return this.handlers.length - 1;
  }

  public reject(id: number) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  public forEach(h: (handler: Interceptor<T>, index: number) => void) {
    this.handlers.forEach((handler, index) => {
      if (handler !== null) {
        h(handler, index);
      }
    });
  }
}

export { Interceptor, InterceptorOptions, OnFulfilled, OnRejected };

export default InterceptorManager;
