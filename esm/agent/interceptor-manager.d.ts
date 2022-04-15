declare type OnFulfilled<T> = (response: T) => T | Promise<T>;
declare type OnRejected = (error: any) => any;
declare type InterceptorOptions<T> = {
    synchronous?: boolean;
    runWhen?: ((init: T) => boolean) | null;
};
interface Interceptor<T> {
    onFulfilled: OnFulfilled<T>;
    onRejected: OnRejected;
    synchronous?: InterceptorOptions<T>['synchronous'];
    runWhen?: InterceptorOptions<T>['runWhen'];
}
declare class InterceptorManager<T> {
    handlers: (Interceptor<T> | null)[];
    constructor();
    use(onFulfilled: OnFulfilled<T>, onRejected: OnRejected, options?: InterceptorOptions<T>): number;
    reject(id: number): void;
    forEach(h: (handler: Interceptor<T>, index: number) => void): void;
}
export { Interceptor, InterceptorOptions, OnFulfilled, OnRejected };
export default InterceptorManager;
