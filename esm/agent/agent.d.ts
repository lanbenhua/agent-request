import InterceptorManager from "./interceptor-manager";
import { SupportedContentType, ContentType } from './type';
import Queue from './queue';
export declare type AgentInit = {
    timeout?: number;
    queue?: {
        size: number;
    };
};
export declare type AgentReqInit<U> = RequestInit & {
    input: string;
    url?: string;
    base?: string;
    data?: U;
    timeout?: number;
    abortId?: string;
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
    private _queue?;
    private _abortors;
    private _interceptors;
    get init(): AgentInit | undefined;
    get base(): string | undefined;
    get queue(): Queue | undefined;
    get interceptors(): {
        request: InterceptorManager<AgentReqInit<any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    constructor(base?: string, init?: AgentInit);
    abort(id: string, reason?: string): void;
    request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    _request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    private resolveInput;
    private resolveReqInit;
    private resolveTimeoutAutoAbort;
    private _getAbortId;
    private handleInterceptors;
    private dispatchFetch;
    private decorateResponse;
}
export default Agent;
