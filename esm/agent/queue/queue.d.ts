import { QueueOptions, QueueItem, QueueTask } from './type';
import { CancelablePromise } from '../type';
declare class Queue {
    private _options?;
    private _isPaused;
    private _pending;
    private _concurrency;
    private _queue;
    constructor(concurrency: number, options?: QueueOptions);
    get size(): number;
    get concurrency(): number;
    get options(): QueueOptions | undefined;
    get pending(): number;
    get isPaused(): boolean;
    pause(): void;
    resume(): void;
    reconcurrency(concurrency: number): void;
    enqueue<T = unknown>(task: QueueTask<T>): CancelablePromise<T>;
    dequeue<T = unknown>(): void;
    protected _check<T>(): void;
    protected _cancel<T>(task: QueueItem<T>): void;
    protected _run<T>(): void;
    protected _push<T>(task: QueueItem<T>): void;
    protected _pop(): void;
    protected _resolve(res: any): any;
    protected _reject(err: any): void;
}
export default Queue;
