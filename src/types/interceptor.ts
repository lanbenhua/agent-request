type InterceptorFulfilled<T> = (response: T) => T | Promise<T>;
// eslint-disable-next-line
type InterceptorRejected = (error: any) => any;

export interface InterceptorOptions<T> {
  initial?: boolean;
  priority?: number;
  synchronous?: boolean;
  runWhen?: ((init: T) => boolean) | null;
};

export interface InterceptorInit<T> extends InterceptorOptions<T> {
  onFulfilled: InterceptorFulfilled<T>;
  onRejected: InterceptorRejected;
}
