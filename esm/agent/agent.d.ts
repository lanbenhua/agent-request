import { SupportedContentType, ContentType } from './type';
import InterceptorManager from "./interceptor-manager";
import Queue, { QueueTaskPriority } from '../queue';
export declare type AgentInit = {
    timeout?: number;
    queue?: {
        concurrency?: number;
        defaultName?: string;
        concurrencies?: Record<string, number>;
    };
};
export declare type AgentReqInit<U> = RequestInit & {
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
    __init__: AgentReqInit<U> | undefined;
    __agent__: Agent;
    __response__: Response;
}
declare class Agent {
    private _base?;
    private _init?;
    private _queues?;
    private _interceptors;
    get init(): AgentInit | undefined;
    get base(): string | undefined;
    get queues(): Map<string, Queue> | undefined;
    get interceptors(): {
        request: InterceptorManager<AgentReqInit<any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    constructor(base?: string, init?: AgentInit);
    queue(name: string): Queue | undefined;
    private _initQueues;
    private _createOrGetQueue;
    request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    private _request;
    private _resolveInput;
    private _resolveReqInit;
    private _resolveTimeoutAutoAbort;
    private _handleInterceptors;
    private _dispatchFetch;
    private _checkResponseType;
    private _decorateResponse;
}
export default Agent;
