import Queue from './queue';
import InterceptorManager from './interceptor-manager';
import { Fetch, CancelablePromise, AgentInit, AgentReqInit, AgentResponse } from './type';
declare class Agent {
    private _fetch;
    private _init?;
    private _queueMap;
    private _interceptors;
    get init(): AgentInit<any, any>;
    get queueMap(): Map<string, Queue>;
    get interceptors(): {
        request: InterceptorManager<AgentReqInit<any, any>>;
        response: InterceptorManager<AgentResponse<any, any>>;
    };
    constructor(fetch: Fetch, init?: AgentInit<any, any>);
    queue(name: string): Queue | undefined;
    request<T, U>(reqInit: AgentReqInit<T, U>): CancelablePromise<AgentResponse<T, U>>;
    private _initQueues;
    private _queueRequest;
    private _request;
    private _resolveReqInit;
    private _resolveInput;
    private _resolveTimeoutAutoAbort;
    private _handleInterceptors;
    private _wrappedFetch;
    private _checkAborter;
    private _clearTimeoutAutoAbort;
    private _checkResponseType;
    private _decorateResponse;
}
export default Agent;
