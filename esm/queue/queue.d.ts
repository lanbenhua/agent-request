import { QueueOptions, QueueItem, QueueTask, QueuePromise } from './type';
declare class Queue {
    private _options?;
    private _isPaused;
    private _pending;
    private _concurrency;
    private _queue;
    constructor(concurrency: number, options?: QueueOptions);
    getSize(): number;
    getConcurrency(): number;
    getOptions(): QueueOptions | undefined;
    getPending(): number;
    getIsPaused(): boolean;
    pause(): void;
    resume(): void;
    reconcurrency(concurrency: number): void;
    enqueue<T = unknown>(task: QueueTask<T>): QueuePromise<T>;
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
