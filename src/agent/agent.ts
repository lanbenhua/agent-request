import { TimeoutError } from './error';
import { isNil } from './utils/is';
import BodyParser from './body-parser';
import Retry from './retry';
import Queue from './queue';
import InterceptorManager, {
  OnFulfilled,
  OnRejected,
} from './interceptor-manager';
import { 
  get_content_type, 
  get_response_type, 
  path_join, 
  resolve_search_params,
} from './utils/helper';
import {
  Method,
  Fetch,
  SupportedContentType,
  ContentType,
  CancelablePromise,
  AgentInit,
  AgentReqInit,
  AgentResponse,
} from './type';


const DEFAULT_AGENT_INIT: AgentInit<any, any> = {};
const DEFAULT_AGENT_REQ_INIT: Partial<AgentReqInit<any, any>> = {};

class Agent {
  private _fetch: Fetch;
  private _init?: AgentInit<any, any>;
  private _queueMap: Map<string, Queue> = new Map<string, Queue>();
  private _interceptors = {
    request: new InterceptorManager<AgentReqInit<any, any>>(),
    response: new InterceptorManager<AgentResponse<any, any>>(),
  };

  public get init(): AgentInit<any, any> {
    return this._init ?? DEFAULT_AGENT_INIT;
  }
  public get queueMap(): Map<string, Queue> {
    return this._queueMap;
  }
  public get interceptors() {
    return this._interceptors;
  }

  constructor(fetch: Fetch, init?: AgentInit<any, any>) {
    if (!fetch) throw new Error('Fetch must be a function but null');

    this._fetch = fetch;
    this._init = { ...DEFAULT_AGENT_INIT, ...init };

    this._initQueues();

    this._request = this._request.bind(this);
    this._queueRequest = this._queueRequest.bind(this);
    this._wrappedFetch = this._wrappedFetch.bind(this);
    this._handleInterceptors = this._handleInterceptors.bind(this);
  }

  public queue(name: string): Queue | undefined {
    return this._queueMap?.get(name);
  }

  public request<T, U>(
    reqInit: AgentReqInit<T, U>
  ): CancelablePromise<AgentResponse<T, U>> {
    const retryInit =
      this._init?.retry || reqInit.retry
        ? { ...this._init?.retry, ...reqInit.retry }
        : null;

    if (retryInit) {
      const { retryOn } = retryInit;
      const retry = new Retry<AgentResponse<T, U>>(
        () => this._queueRequest(reqInit),
        {
          ...retryInit,
          retryOn: retryOn
            ? (attempt, err, res) => {
                if (Array.isArray(retryOn)) {
                  return !!(res && retryOn.includes(res?.status));
                }
                return retryOn?.(attempt, err, res) ?? false;
              }
            : undefined,
        }
      );

      return retry.start() as Promise<AgentResponse<T, U>>;
    }

    return this._queueRequest(reqInit);
  }

  private _initQueues() {
    if (!this._init?.queue) return;
    const { queue } = this._init;
    if (!this._queueMap) this._queueMap = new Map<string, Queue>();
    const { concurrency, defaultName = 'default', concurrencies } = queue;
    if (concurrency) {
      const newQueue = new Queue(concurrency);
      this._queueMap.set(defaultName, newQueue);
    }
    if (concurrencies) {
      Object.entries(concurrencies).map(([name, concurrency]) => {
        const newQueue = new Queue(concurrency);
        this._queueMap.set(name, newQueue);
      });
    }
  }

  private _queueRequest<T, U>(
    reqInit: AgentReqInit<T, U>
  ): CancelablePromise<AgentResponse<T, U>> {
    const queue = this.queue(reqInit.queue?.name ?? this._init?.queue?.defaultName ?? 'default');
    
    if (queue) return queue.enqueue<AgentResponse<T, U>>({
      runner: () => this._request(reqInit),
      priority: reqInit.queue?.priority,
    });

    return this._request(reqInit);
  }

  private _request<T, U>(
    reqInit: AgentReqInit<T, U>
  ): CancelablePromise<AgentResponse<T, U>> {
    // resolve reqInit
    const resolvedReqInit = this._resolveTimeoutAutoAbort<T, U>(
      this._resolveReqInit<T, U>(this._resolveInput<T, U>(reqInit))
    );
    const promise = this._handleInterceptors<T, U>(resolvedReqInit)
      .catch((err) => {
        this._checkAborter<T, U>(resolvedReqInit);
        throw err;
      })
      .finally(() => {
        this._clearTimeoutAutoAbort<T, U>(resolvedReqInit);
      });
    // @ts-ignore
    promise.cancel = (reason?: any) => {
      resolvedReqInit.abortController?.abort(reason);
    };
    return promise;
  }

  private _resolveReqInit<T, U>(
    reqInit: AgentReqInit<T, U>
  ): AgentReqInit<T, U> {
    const reqInit2 = {
      ...DEFAULT_AGENT_REQ_INIT,
      ...reqInit,
      base: reqInit.base ?? this._init?.base,
      timeout: reqInit.timeout ?? this._init?.timeout,
    };

    if (this._init?.retry)
      reqInit2.retry = { ...this._init?.retry, ...reqInit.retry };

    // set default method equals GET if none
    // then transform to upper case
    reqInit2.method = (reqInit.method ?? Method.GET).toUpperCase();

    // handle content-type header according to the contentType
    // if no contentType, will ignore
    // else handle the responsible content type according to the ContentTypeMap
    const contentType = get_content_type(reqInit?.contentType)
    reqInit2.headers = {
      ...DEFAULT_AGENT_REQ_INIT.headers,
      ...(contentType ? { 'content-type': contentType } : null),
      ...reqInit.headers,
    };

    // if init includes body, will use it directly
    // else handle the responsible body
    reqInit2.body =
      reqInit.method === Method.GET || reqInit.method === Method.HEAD
        ? undefined
        : reqInit.body !== undefined && reqInit.body !== null
        ? reqInit.body
        : new BodyParser(reqInit?.contentType).marshal(reqInit.data) ??
          undefined;

    return reqInit2;
  }

  private _resolveInput<T, U>(reqInit: AgentReqInit<T, U>): AgentReqInit<T, U> {
    let url = path_join(reqInit?.base ?? this._init?.base, reqInit.input);

    // If the method is GET, we should merge the data of reqInit and url search
    if (reqInit?.method?.toUpperCase() === Method.GET && reqInit?.data) {
      const qIndex = url.indexOf('?');
      const path = qIndex < 0 ? url : url.slice(0, url.indexOf('?'));
      const search =
        qIndex < 0
          ? resolve_search_params('', reqInit?.data)
          : resolve_search_params(url.slice(url.indexOf('?')), reqInit?.data);

      url = path + (search ? `?${search}` : '');
    }

    // update url after resolved
    return {
      ...reqInit,
      url,
    };
  }

  private _resolveTimeoutAutoAbort<T, U>(
    reqInit: AgentReqInit<T, U>
  ): AgentReqInit<T, U> {
    const reqInit2 = { ...reqInit };
    const { timeout } = reqInit2;

    // if the request init includes signal, the abort event will control by the outside
    // we do not need to do the auto abort any more.

    let controller: AbortController | undefined;
    if (!reqInit2.signal) {
      controller = new AbortController();
      reqInit2.signal = controller.signal;
      reqInit2.abortController = controller;
    }
    reqInit2.signal.onabort = function abortHandler() {
      // @ts-ignore
      reqInit2.__aborter = this;
      // @ts-ignore
      reqInit2.signal.onabort = null;
    };

    if (timeout) {
      const timer = setTimeout(() => {
        if (reqInit2.signal?.aborted) return;
        controller?.abort('Timeout of exceeded');
      }, timeout);
      // @ts-ignore
      reqInit2.__abortTimer = timer;
    }

    return reqInit2;
  }

  private _handleInterceptors<T, U>(
    reqInit: AgentReqInit<T, U>
  ): Promise<AgentResponse<T, U>> {
    const requestInterceptorChain: (
      | OnFulfilled<AgentReqInit<T, U>>
      | OnRejected
    )[] = [];

    let synchronousRequestInterceptors: boolean | undefined = true;

    this._interceptors.request.forEach((interceptor) => {
      const { runWhen, onFulfilled, onRejected } = interceptor;

      if (typeof runWhen === 'function' && runWhen(reqInit) === false) return;

      synchronousRequestInterceptors =
        synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.unshift(onFulfilled, onRejected);
    });

    const responseInterceptorChain: (
      | OnFulfilled<AgentResponse<T, U>>
      | OnRejected
    )[] = [];
    this._interceptors.response.forEach((interceptor) =>
      responseInterceptorChain.unshift(
        interceptor.onFulfilled,
        interceptor.onRejected
      )
    );

    let promiseChain: Promise<AgentResponse<T, U> | AgentReqInit<T, U>>;

    if (!synchronousRequestInterceptors) {
      let chain: (
        | OnFulfilled<AgentReqInit<T, U>>
        | OnRejected
        | undefined
        | ((reqInit: AgentReqInit<T, U>) => Promise<AgentResponse<T, U>>)
        | OnFulfilled<AgentResponse<T, U>>
      )[] = [this._wrappedFetch, undefined];

      Array.prototype.unshift.apply(chain, requestInterceptorChain);
      chain = chain.concat(responseInterceptorChain);

      promiseChain = Promise.resolve(reqInit);
      while (chain.length) {
        const onFulfilled = chain.shift();
        const onRejected = chain.shift();
        if (onFulfilled)
          promiseChain = promiseChain.then(onFulfilled as never, onRejected);
      }

      return promiseChain as unknown as Promise<AgentResponse<T, U>>;
    }

    let chainReqInit = reqInit;
    while (requestInterceptorChain.length) {
      const onFulfilled: OnFulfilled<AgentReqInit<T, U>> | undefined =
        requestInterceptorChain.shift();
      const onRejected: OnRejected | undefined =
        requestInterceptorChain.shift();
      try {
        if (onFulfilled)
          chainReqInit = onFulfilled(chainReqInit) as AgentReqInit<T, U>;
      } catch (error) {
        if (onRejected) onRejected(error);
        break;
      }
    }

    let responsePromiseChain: Promise<AgentResponse<T, U>> =
      this._wrappedFetch(chainReqInit);

    while (responseInterceptorChain.length) {
      const onFulfilled: OnFulfilled<AgentResponse<T, U>> | undefined =
        responseInterceptorChain.shift() as OnFulfilled<AgentResponse<T, U>>;
      const onRejected: OnRejected | undefined =
        responseInterceptorChain.shift();
      if (onFulfilled)
        responsePromiseChain = responsePromiseChain.then(
          onFulfilled,
          onRejected
        );
    }

    return responsePromiseChain;
  }

  private _wrappedFetch<T, U>(
    reqInit: AgentReqInit<T, U>
  ): Promise<AgentResponse<T, U>> {
    let __res__: Response;

    const url = reqInit.url || reqInit.input;

    // Actually this wil be never reached!
    // if reached, must be an unexcepted error
    if (!url)
      return Promise.reject(
        new Error(
          'Agent: unexpected error, url must have a value and be a string, but null!'
        )
      );

    return this._fetch(url, reqInit)
      .then((res) => {
        __res__ = res;

        const responseType = this._checkResponseType(res, reqInit.responseType);

        if (responseType === ContentType.JSON) return res.json();
        if (responseType === ContentType.BUFFER) return res.arrayBuffer();
        if (responseType === ContentType.TEXT) return res.text();
        if (responseType === ContentType.BLOB) return res.blob();
        if (
          responseType === ContentType.FORM ||
          responseType === ContentType.FORMDATA
        )
          return res.formData();

        throw new Error(`Agent: unexcepted response type '${responseType}'`);
      })
      .then((data) => this._decorateResponse<T, U>(reqInit, __res__, data));
  }

  private _checkAborter<T, U>(reqInit: AgentReqInit<T, U>) {
    // @ts-ignore
    const aborter: AbortSignal | undefined = reqInit.__aborter;
    if (aborter?.aborted) {
      throw new TimeoutError(
        // @ts-ignore
        aborter.reason ?? 'Timeout of exceeded',
        'TimeoutError'
      );
    }
  }

  private _clearTimeoutAutoAbort<T, U>(reqInit: AgentReqInit<T, U>) {
    // @ts-ignore
    if (reqInit.__aborter) {
      // @ts-ignore
      delete reqInit.__aborter;
    }
    // @ts-ignore
    if (!isNil(reqInit.__abortTimer)) {
      // @ts-ignore
      clearTimeout(reqInit.__abortTimer);
      // @ts-ignore
      delete reqInit.__abortTimer;
    }
  }

  private _checkResponseType(
    res: Response,
    responseType: ContentType | SupportedContentType | undefined
  ): ContentType | SupportedContentType | undefined {
    const responseTypeFromResponse = get_response_type(res);
    if (!responseType && !responseTypeFromResponse)
      throw new Error('Agent: except a response type but null');
    if (
      responseTypeFromResponse &&
      responseType &&
      responseTypeFromResponse !== responseType
    ) {
      throw new Error(
        `Agent: except a '${responseType}' response type but '${responseTypeFromResponse}'`
      );
    }
    return responseType || responseTypeFromResponse;
  }

  private _decorateResponse<T, U>(
    init: AgentReqInit<T, U>,
    res: Response,
    data: T
  ): AgentResponse<T, U> {
    return {
      data: data,
      url: res.url,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      __init__: init,
      __agent__: this,
      __response__: res,
    };
  }
}

export default Agent;
