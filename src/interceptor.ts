import { InterceptorInit, InterceptorLevel, InterceptorOptions } from "./types/interceptor";

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
    this.handlers.sort((a, b) => {
      const 
        aLevel = a?.level ?? InterceptorLevel.Normal,
        bLevel = b?.level ?? InterceptorLevel.Normal,
        aPriority = a?.priority ?? 0,
        bPriority = b?.priority ?? 0;

      return (aLevel - bLevel) || (bPriority - aPriority);
    })
    .forEach((handler, index) => {
      if (handler !== null) {
        h(handler, index);
      }
    });
  }
}

export default InterceptorManager;
