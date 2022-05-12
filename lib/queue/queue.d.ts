export declare type Runner<T> = () => T | Promise<T>;
export declare type Kill = () => boolean;
export declare type QueueTaskPriority = number | 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
export declare type QueueTask<T> = {
    runner: Runner<T>;
    kill?: Kill | null;
    priority?: QueueTaskPriority | null;
};
export declare type QueueOptions = {};
declare class Queue {
    private _options?;
    private _pending;
    private _concurrency;
    private _queue;
    constructor(concurrency: number, options?: QueueOptions);
    get size(): number;
    get concurrency(): number;
    get options(): QueueOptions | undefined;
    get pending(): number;
    reconcurrency(concurrency: number): void;
    push<T>(task: QueueTask<T>): boolean;
    pop<T>(): QueueTask<T> | undefined;
    protected _check(): boolean;
    protected _priority(priority?: QueueTaskPriority | null): number;
    protected _compare(priorityA?: QueueTaskPriority | null, priorityB?: QueueTaskPriority | null): number;
    protected _push<T>(task: QueueTask<T>): void;
    protected _pop(): void;
    protected _resolve(res: any): any;
    protected _reject(err: any): void;
}
export default Queue;
