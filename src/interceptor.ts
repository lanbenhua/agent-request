import { InterceptorInit, InterceptorOptions } from "./types/interceptor";

class InterceptorManager<T> {
  public handlers: (InterceptorInit<T> | null)[] = [];

  constructor() {
    this.handlers = [];
  }

  public use(
    onFulfilled: InterceptorInit<T>['onFulfilled'],
    onRejected: InterceptorInit<T>['onRejected'],
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

  public forEach(h: (handler: InterceptorInit<T>, index: number) => void) {
    this.handlers.sort((a, b) => a?.initial ? -1 : (b?.priority ?? 0) - (a?.priority ?? 0))
    .forEach((handler, index) => {
      if (handler !== null) {
        h(handler, index);
      }
    });
  }
}

export default InterceptorManager;
