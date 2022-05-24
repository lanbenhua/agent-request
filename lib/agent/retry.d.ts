declare type RetryCancel = () => void;
declare type RetryRunner<T> = () => Promise<T>;
declare type RetryInit<T> = {
    maxTimes?: number;
    delay?: number | ((attempt: number, error: Error | null | undefined, response: T | null | undefined) => number);
    retryOn?: (attempt: number, error: Error | null | undefined, response: T | null | undefined) => boolean | Promise<boolean>;
};
export interface CancelablePromise<T> extends Promise<T> {
    cancel?: RetryCancel;
}
declare class Retry<T> {
    private __attempt;
    private __canceled?;
    private __intervalId?;
    private _init?;
    private _runner?;
    constructor(runner: RetryRunner<T>, init: RetryInit<T>);
    get init(): RetryInit<T> | undefined;
    start(): CancelablePromise<T | undefined>;
    cancel(): void;
    private _cancel;
    private _run;
    private _retry;
    private _check;
}
export default Retry;
