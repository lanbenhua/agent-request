import { QueueOptions, QueueTask } from './type';
import { CancelablePromise } from '../type';
declare class Queue {
    private _options?;
    private _isPaused;
    private _pending;
    private _concurrency;
    private _queue;
    constructor(concurrency?: number, options?: QueueOptions);
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
    private _check;
    private _cancel;
    private _run;
    private _push;
    private _pop;
    private _resolve;
    private _reject;
}
export default Queue;
