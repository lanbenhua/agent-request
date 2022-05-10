/// <reference types="node" />
import InterceptorManager from "./interceptor-manager";
import { SupportedContentType, ContentType } from './type';
export declare type AgentInit = {
    timeout?: number;
};
export declare type AgentReqInit<U> = RequestInit & AgentInit & {
    input: string;
    url?: string;
    base?: string;
    data?: U;
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
    protected _base?: string;
    protected _init?: AgentInit;
    protected _timer?: NodeJS.Timeout | null;
    protected _abortController?: AbortController;
    protected _interceptors: {
        request: InterceptorManager<AgentReqInit<any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    get interceptors(): {
        request: InterceptorManager<AgentReqInit<any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    get init(): AgentInit | undefined;
    constructor(base?: string, init?: AgentInit);
    abort(reason?: any): void;
    request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    protected resolveInput<U>(reqInit: AgentReqInit<U>): void;
    protected resolveReqInit<U>(reqInit: AgentReqInit<U>): AgentReqInit<U>;
    protected resolveTimeoutAutoAbort<U>(reqInit: AgentReqInit<U>): void;
    protected clearAutoAbortTimeout(): void;
    protected handleInterceptors<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    protected dispatchFetch<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    private decorateResponse;
}
export default Agent;
