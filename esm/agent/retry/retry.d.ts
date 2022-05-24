import { CancelablePromise } from '../type';
import { RetryInit, RetryRunner } from './type';
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
