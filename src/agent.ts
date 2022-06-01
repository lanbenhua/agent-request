import { Method, Fetch, SupportedContentType, ContentType, CancelablePromise, AgentInit, AgentReqInit, AgentResponse, AgentFetch } from './types/agent';
import { get_content_type, get_response_type, path_join, resolve_search_params } from './utils/helper';
import { InterceptorInit } from './types/interceptor';
import QueueScheduler, { queueFetch } from './queue';
import BodyParser from './body-parser';
import Interceptor from './interceptor';
import TimeoutScheduler from './timeout';
import { retryFetch } from './retry';
import { TimeoutError } from './error';

class Agent {
  private _fetch: Fetch;
  private _init?: AgentInit<any, any>;
  private _queueSchedulerMap: Map<string, QueueScheduler> = new Map<string, QueueScheduler>();
  private _interceptors = {
    request: new Interceptor<AgentReqInit<any, any>>(),
    response: new Interceptor<AgentResponse<any, any>>(),
  };

  public get agentInit(): AgentInit<any, any> | undefined {
    return this._init;
  }
  public get queueSchedulerMap(): Map<string, QueueScheduler> {
    return this._queueSchedulerMap;
  }
  public get interceptors() {
    return this._interceptors;
  }

  constructor(fetch: Fetch, init?: AgentInit<any, any>) {
    if (!fetch) throw new Error('Fetch must be a function but null');

    this._fetch = fetch;
    this._init = init;

    this.init();
    
    this._request = this._request.bind(this);
    this._wrappedFetch = this._wrappedFetch.bind(this);
    this._handleInterceptors = this._handleInterceptors.bind(this);
  }

  private init() {
    this._initQueueScheduler();

    this._interceptors.request.use((init) => {
      // set default method equals GET if none
      // then transform to upper case
      if (!init.url) {
        let url = path_join(init?.base ?? this._init?.base, init.input);
        // If the method is GET, we should merge the data of reqInit and url search
        if (init?.method?.toUpperCase() === Method.GET && init?.data) {
          const qIndex = url.indexOf('?');
          const path = qIndex < 0 ? url : url.slice(0, url.indexOf('?'));
          const search =
            qIndex < 0
              ? resolve_search_params('', init?.data)
              : resolve_search_params(url.slice(url.indexOf('?')), init?.data);

          url = path + (search ? `?${search}` : '');
        }
        init.url = url;
      }

      init.method = (init.method ?? Method.GET).toUpperCase();

      // handle content-type header according to the contentType
      // if no contentType, will ignore
      // else handle the responsible content type according to the ContentTypeMap
      const contentType = get_content_type(init?.contentType)
      init.headers = {
        ...(contentType ? {'content-type': contentType} : undefined),
        ...init.headers,
      };

      // if init includes body, will use it directly
      // else handle the responsible body
      init.body =
        init.method === Method.GET || init.method === Method.HEAD
          ? undefined
          : init.body !== undefined && init.body !== null
          ? init.body
          : new BodyParser(init?.contentType).marshal(init.data) ??
            undefined;

      return init;
    }, (err) => {
      return Promise.reject(err)
    })
  }

  private _initQueueScheduler() {
    if (!this._init?.queue) return;
    const { queue } = this._init;
    if (!this._queueSchedulerMap) this._queueSchedulerMap = new Map<string, QueueScheduler>();
    const { concurrency, defaultName = 'default', concurrencies } = queue;
    if (concurrency) {
      const newQueue = new QueueScheduler(concurrency);
      this._queueSchedulerMap.set(defaultName, newQueue);
    }
    if (concurrencies) {
      Object.entries(concurrencies).map(([name, concurrency]) => {
        const newQueue = new QueueScheduler(concurrency);
        this._queueSchedulerMap.set(name, newQueue);
      });
    }
  }

  public getQueue(name: string): QueueScheduler | undefined {
    return this._queueSchedulerMap?.get(name);
  }

  public request<T, U>(reqInit: AgentReqInit<T, U>): CancelablePromise<AgentResponse<T, U>> {
    let fetcher: AgentFetch<T, U> = this._request;

    // enhance retry
    const retry = this._init?.retry || reqInit.retry ? { ...this._init?.retry, ...reqInit.retry } : null;
    if (retry) fetcher = retryFetch<T, U>(fetcher, retry)

    // enhance queue
    const queue = this.getQueue(reqInit.queue?.name ?? this._init?.queue?.defaultName ?? 'default');
    if (queue) fetcher = queueFetch<T, U>(fetcher, queue);

    return fetcher(reqInit);
  }

  private _request<T, U>(reqInit: AgentReqInit<T, U>): CancelablePromise<AgentResponse<T, U>> {
    const initialReqInit = {
      ...reqInit,
      base: reqInit.base ?? this._init?.base,
      timeout: reqInit.timeout ?? this._init?.timeout,
      retry: this._init?.retry || reqInit.retry ? { ...this._init?.retry, ...reqInit.retry } : undefined,
      headers: {
        ...reqInit.headers,
      }
    };

    // enhance timeout
    let timeoutScheduler: TimeoutScheduler | undefined;
    if (initialReqInit.timeout) {
      let controller: AbortController | undefined;
      if (!initialReqInit.signal) {
        controller = new AbortController();
        initialReqInit.signal = controller.signal;
        initialReqInit.abortController = controller;
      }
      timeoutScheduler = new TimeoutScheduler(initialReqInit.timeout, controller);
      timeoutScheduler.wait().then(() => {
        if (!controller?.signal.aborted) {
          // @ts-ignore
          initialReqInit.__timeoutError = new TimeoutError('Timeout of exceeded', 'TimeoutError');
          controller?.abort('Timeout of exceeded');
        };
      })
    }

    const promise = this._handleInterceptors<T, U>(initialReqInit)
      .catch(err => {
        // @ts-ignore
        const timeoutError = initialReqInit.__timeoutError;
        if (timeoutError) {
          // clear side effects
          // @ts-ignore
          delete initialReqInit.__timeoutError;
          timeoutScheduler?.clear();

          throw timeoutError;
        }
        throw err;
      });

    // @ts-ignore
    promise.cancel = (reason?: any) => {
      if (!initialReqInit.abortController?.signal.aborted) initialReqInit.abortController?.abort(reason);
    };

    return promise;
  }

  private _handleInterceptors<T, U>(reqInit: AgentReqInit<T, U>): Promise<AgentResponse<T, U>> {
    const requestInterceptorChain: (
      | InterceptorInit<AgentReqInit<T, U>>['onFulfilled']
      | InterceptorInit<AgentReqInit<T, U>>['onRejected']
    )[] = [];

    let synchronousRequestInterceptors: boolean | undefined = true;

    this._interceptors.request.forEach(interceptor => {
      const { runWhen, onFulfilled, onRejected } = interceptor;

      if (typeof runWhen === 'function' && runWhen(reqInit) === false) return;

      synchronousRequestInterceptors =
        synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.unshift(onFulfilled, onRejected);
    });

    const responseInterceptorChain: (
      | InterceptorInit<AgentResponse<T, U>>['onFulfilled']
      | InterceptorInit<AgentResponse<T, U>>['onRejected']
    )[] = [];
    this._interceptors.response.forEach(interceptor =>
      responseInterceptorChain.unshift(
        interceptor.onFulfilled,
        interceptor.onRejected
      )
    );

    let promiseChain: Promise<AgentResponse<T, U> | AgentReqInit<T, U>>;

    if (!synchronousRequestInterceptors) {
      let chain: (
        | InterceptorInit<AgentReqInit<T, U>>['onFulfilled']
        | InterceptorInit<AgentReqInit<T, U>>['onRejected']
        | undefined
        | ((reqInit: AgentReqInit<T, U>) => Promise<AgentResponse<T, U>>)
        | InterceptorInit<AgentResponse<T, U>>['onFulfilled']
      | InterceptorInit<AgentResponse<T, U>>['onRejected']
      )[] = [
        (init: AgentReqInit<T, U>) => this._wrappedFetch(init), undefined
      ];

      Array.prototype.unshift.apply(chain, requestInterceptorChain);
      chain = chain.concat(responseInterceptorChain);

      promiseChain = Promise.resolve(reqInit);
      while (chain.length) {
        const onFulfilled = chain.shift();
        const onRejected = chain.shift();
        if (onFulfilled)
          promiseChain = promiseChain.then(onFulfilled as never, onRejected);
      }

      return promiseChain as Promise<AgentResponse<T, U>>;
    }

    let chainReqInit = reqInit;
    while (requestInterceptorChain.length) {
      const onFulfilled:
        | InterceptorInit<AgentReqInit<T, U>>['onFulfilled']
        | undefined = requestInterceptorChain.shift();
      const onRejected:
        | InterceptorInit<AgentReqInit<T, U>>['onRejected']
        | undefined = requestInterceptorChain.shift();
      try {
        if (onFulfilled)
          chainReqInit = onFulfilled(chainReqInit) as AgentReqInit<T, U>;
      } catch (error) {
        if (onRejected) onRejected(error);
        break;
      }
    }

    let responsePromiseChain: Promise<AgentResponse<T, U>> = this._wrappedFetch(
      chainReqInit
    );

    while (responseInterceptorChain.length) {
      const onFulfilled:
        | InterceptorInit<AgentResponse<T, U>>['onFulfilled']
        | undefined = responseInterceptorChain.shift() as InterceptorInit<AgentResponse<T, U>>['onFulfilled']
      ;
      const onRejected:
        | InterceptorInit<AgentResponse<T, U>>['onRejected']
        | undefined = responseInterceptorChain.shift();
      if (onFulfilled)
        responsePromiseChain = responsePromiseChain.then(
          onFulfilled,
          onRejected
        );
    }

    return responsePromiseChain;
  }

  private _wrappedFetch<T, U>(reqInit: AgentReqInit<T, U>): Promise<AgentResponse<T, U>> {
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
      .then(res => {
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
      .then(data => this._decorateResponse<T, U>(reqInit, __res__, data));
  }

  private _checkResponseType(res: Response, responseType: ContentType | SupportedContentType | undefined): ContentType | SupportedContentType | undefined {
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

  private _decorateResponse<T, U>(init: AgentReqInit<T, U>, res: Response, data: T): AgentResponse<T, U> {
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
