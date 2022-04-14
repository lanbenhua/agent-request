import InterceptorManager from "./interceptor-manager";
export declare type SupportedContentType = "json" | "form" | "text" | "buffer" | "blob" | "formdata";
export declare const enum ContentType {
    JSON = "json",
    FORM = "form",
    FORMDATA = "formdata",
    TEXT = "text",
    BUFFER = "buffer",
    BLOB = "blob"
}
export declare const enum Method {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS"
}
export declare type AgentInit = {
    timeout?: number;
    includeAbort?: boolean;
};
export declare type AgentReqInit<U> = RequestInit & AgentInit & {
    input: string;
    url?: string;
    base?: string;
    data?: U;
    contentType?: ContentType | SupportedContentType;
    responseType?: ContentType | SupportedContentType;
    skipErrorNotification?: boolean;
};
export interface AgentResponse<T, U> {
    url: string;
    data: T | undefined;
    ok: boolean;
    status: number;
    statusText: string;
    headers: Response["headers"];
    __reqInit__: AgentReqInit<U> | undefined;
    __fetch__: Agent;
    __response__: Response;
}
declare class Agent {
    protected _base?: string;
    protected _init?: AgentInit;
    private _dafaultInit?;
    protected _timer?: number | null;
    protected _abortController?: AbortController;
    protected _interceptors: {
        request: InterceptorManager<AgentReqInit<any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    get interceptors(): {
        request: InterceptorManager<AgentReqInit<any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    constructor(base?: string, init?: AgentInit);
    abort(reason?: any): void;
    request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    protected resolveInput<U>(reqInit: AgentReqInit<U>): void;
    protected resolveReqInit<U>(reqInit: AgentReqInit<U>): AgentReqInit<U>;
    protected resolveTimeoutAutoAbort<U>(reqInit: AgentReqInit<U>): void;
    protected clearAutoAbortTimeout(): void;
    protected handleInterceptors<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
    protected dispatchFetch<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>>;
}
export default Agent;
