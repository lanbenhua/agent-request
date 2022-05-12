export declare type Runner<T> = () => T | Promise<T>;
export declare type QueueTask<T> = (value: T | PromiseLike<T>) => void;
export declare type QueueOptions = {};
declare class Queue {
    private _size;
    private _options?;
    private _queue;
    private _pending;
    constructor(size: number, options?: QueueOptions);
    get size(): number;
    get queue(): QueueTask<any>[];
    get options(): QueueOptions | undefined;
    get pending(): number;
    resize(size: number): void;
    run<T>(runner: Runner<T>): Promise<T>;
    protected _check(): void;
    protected _push(task: QueueTask<any>): void;
    protected _pop(): void;
    protected _finish(res: any): any;
    protected _error(err: any): void;
}
export default Queue;
