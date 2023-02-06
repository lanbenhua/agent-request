type InterceptorFulfilled<T> = (response: T) => T | Promise<T>;
// eslint-disable-next-line
type InterceptorRejected = (error: any) => any;

export interface InterceptorOptions<T> {
  level?: InterceptorLevel;
  priority?: number;
  synchronous?: boolean;
  runWhen?: ((init: T) => boolean) | null;
};

export interface InterceptorInit<T> extends InterceptorOptions<T> {
  onFulfilled?: InterceptorFulfilled<T>;
  onRejected?: InterceptorRejected;
}

export const enum InterceptorLevel {
  Initial = 0,
  Buildin = 1,
  High = 2,
  Normal = 3,
  Low = 4,
}