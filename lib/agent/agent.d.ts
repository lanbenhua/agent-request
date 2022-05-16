import { SupportedContentType, ContentType } from './type';
import InterceptorManager from "./interceptor-manager";
import Queue, { QueueTaskPriority } from '../queue';
export declare type PollingInit<T, U> = {
    interval?: number;
    pollingOn?: number[] | ((error: Error | null | undefined, response: AgentResponse<T, U> | null | undefined) => boolean | Promise<boolean>);
};
export declare type RetryInit<T, U> = {
    retryMaxTimes?: number;
    retryDelay?: number | ((attempt: number, error: Error | null | undefined, response: AgentResponse<T, U> | null | undefined) => number);
    retryOn?: number[] | ((attempt: number, error: Error | null | undefined, response: AgentResponse<T, U> | null | undefined) => boolean | Promise<boolean>);
};
export declare type QueueInit = {
    concurrency?: number;
    defaultName?: string;
    concurrencies?: Record<string, number>;
};
export declare type AgentInit<T, U> = {
    base?: string;
    timeout?: number;
    queue?: QueueInit;
    retry?: RetryInit<T, U>;
    polling?: PollingInit<T, U>;
};
export declare type AgentReqInit<T, U> = RequestInit & {
    input: string;
    url?: string;
    base?: string;
    data?: U;
    timeout?: number;
    abortController?: AbortController;
    queue?: {
        name?: string;
        priority?: number | QueueTaskPriority;
    };
    retry?: RetryInit<T, U>;
    polling?: PollingInit<T, U>;
    contentType?: ContentType | SupportedContentType;
    responseType?: ContentType | SupportedContentType;
};
export interface AgentResponse<T, U> {
    url: string;
    data: T | undefined;
    ok: boolean;
    status: number;
    statusText: string;
    headers: Response["headers"];
    __init__: AgentReqInit<T, U> | undefined;
    __agent__: Agent;
    __response__: Response;
}
declare class Agent {
    private _init?;
    private _queues?;
    private _interceptors;
    get init(): AgentInit<any, any> | undefined;
    get queues(): Map<string, Queue> | undefined;
    get interceptors(): {
        request: InterceptorManager<AgentReqInit<any, any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    constructor(init?: AgentInit<any, any>);
    queue(name: string): Queue | undefined;
    private _initQueues;
    private _createOrGetQueue;
    request<T, U>(reqInit: AgentReqInit<T, U>): Promise<AgentResponse<T, U>>;
    private _request;
    private _resolveInput;
    private _resolveReqInit;
    private _resolveTimeoutAutoAbort;
    private _resolvePolling;
    private _handleInterceptors;
    private _dispatchFetch;
    private _wrappedFetch;
    private _clearTimeoutAutoAbort;
    private _checkResponseType;
    private _decorateResponse;
}
export default Agent;
