import { SupportedContentType, ContentType } from './type';
import InterceptorManager from './interceptor-manager';
import Queue, { QueueTaskPriority } from '../queue';
declare type RetryInit<T, U> = {
    retryInheritTimeout?: boolean;
    retryMaxTimes?: number;
    retryDelay?: number | ((attempt: number, error: Error | null | undefined, response: AgentResponse<T, U> | null | undefined) => number);
    retryOn?: number[] | ((attempt: number, error: Error | null | undefined, response: AgentResponse<T, U> | null | undefined) => boolean | Promise<boolean>);
};
declare type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
export declare type AgentInit<T, U> = {
    base?: string;
    timeout?: number;
    queue?: {
        concurrency?: number;
        defaultName?: string;
        concurrencies?: Record<string, number>;
    };
    retry?: RetryInit<T, U>;
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
    contentType?: ContentType | SupportedContentType;
    responseType?: ContentType | SupportedContentType;
};
export interface AgentResponse<T, U> {
    url: string;
    data: T | undefined;
    ok: boolean;
    status: number;
    statusText: string;
    headers: Response['headers'];
    __init__: AgentReqInit<T, U> | undefined;
    __agent__: Agent;
    __response__: Response;
}
declare class Agent {
    private _fetch;
    private _init?;
    private _queueMap?;
    private _interceptors;
    get init(): AgentInit<any, any> | undefined;
    get queueMap(): Map<string, Queue> | undefined;
    get interceptors(): {
        request: InterceptorManager<AgentReqInit<any, any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    constructor(fetch: Fetch, init?: AgentInit<any, any>);
    queue(name: string): Queue | undefined;
    request<T, U>(reqInit: AgentReqInit<T, U>): Promise<AgentResponse<T, U>>;
    private _initQueues;
    private _createOrGetQueue;
    private _request;
    private _resolveReqInit;
    private _resolveInput;
    private _resolveTimeoutAutoAbort;
    private _dispatchFetch;
    private _handleInterceptors;
    private _wrappedFetch;
    private _checkAborter;
    private _clearTimeoutAutoAbort;
    private _checkResponseType;
    private _decorateResponse;
}
export default Agent;
