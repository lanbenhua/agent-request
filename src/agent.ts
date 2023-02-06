import { Method, Fetch, SupportedContentType, ContentType, CancelablePromise, AgentInit, AgentReqInit, AgentResponse, AgentFetch } from './types/agent';
import { getOriginalFetch, get_content_type, get_response_type, path_join, resolve_search_params } from './utils/helper';
import { InterceptorInit, InterceptorLevel } from './types/interceptor';
import QueueScheduler, { queueFetch } from './queue';
import BodyParser from './body-parser';
import Interceptor from './interceptor';
import TimeoutScheduler from './timeout';
import { retryFetch } from './retry';
import { TimeoutError } from './error';

class Agent {
  public originalFetch?: Fetch;
  public queueSchedulerMap: Map<string, QueueScheduler> = new Map<string, QueueScheduler>();
  public interceptors = {
    request: new Interceptor<AgentReqInit<any, any>>(),
    response: new Interceptor<AgentResponse<any, any>>(),
  };
  public initOptions?: AgentInit<any, any>;

  constructor(fetch?: Fetch, init?: AgentInit<any, any>) {
    // if (!fetch) throw new Error('Fetch must be a function but null');
    this.originalFetch = fetch ?? getOriginalFetch() as Fetch;
    this.initOptions = init;
    this.init();
    
    this.requester = this.requester.bind(this);
    this.wrappedFetch = this.wrappedFetch.bind(this);
  }

  private init() {
    this.initQueueScheduler();

    this.interceptors.request.use((init) => {
      // set default method equals GET if none
      // then transform to upper case
      if (!init.url) {
        let url = path_join(init?.base ?? this.initOptions?.base, init.input);
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
    }, { level: InterceptorLevel.Initial });

    this.interceptors.response.use(async(res) => {
      // if (!res.ok) throw new Error(res.statusText);
      res.data = await this.getResponseData(res)
      return res;
    }, (err) => {
      return Promise.reject(err)
    }, { level: InterceptorLevel.Buildin });

  }

  private initQueueScheduler() {
    if (!this.initOptions?.queue) return;
    const { queue } = this.initOptions;
    if (!this.queueSchedulerMap) this.queueSchedulerMap = new Map<string, QueueScheduler>();
    const { concurrency, defaultName = 'default', concurrencies } = queue;
    if (concurrency) {
      const newQueue = new QueueScheduler(concurrency);
      this.queueSchedulerMap.set(defaultName, newQueue);
    }
    if (concurrencies) {
      Object.entries(concurrencies).map(([name, concurrency]) => {
        const newQueue = new QueueScheduler(concurrency);
        this.queueSchedulerMap.set(name, newQueue);
      });
    }
  }

  public getQueue(name: string): QueueScheduler | undefined {
    return this.queueSchedulerMap?.get(name);
  }

  public request<T, U>(reqInit: AgentReqInit<T, U>): CancelablePromise<AgentResponse<T, U>> {
    let requester: AgentFetch<T, U> = this.requester;

    // enhance retry
    const retry = this.initOptions?.retry || reqInit.retry ? { ...this.initOptions?.retry, ...reqInit.retry } : null;
    if (retry) requester = retryFetch<T, U>(requester, retry)

    // enhance queue
    const queue = this.getQueue(reqInit.queue?.name ?? this.initOptions?.queue?.defaultName ?? 'default');
    if (queue) requester = queueFetch<T, U>(requester, queue);

    return requester(reqInit);
  }

  private requester<T, U>(reqInit: AgentReqInit<T, U>): CancelablePromise<AgentResponse<T, U>> {
    const initialReqInit = {
      ...reqInit,
      base: reqInit.base ?? this.initOptions?.base,
      timeout: reqInit.timeout ?? this.initOptions?.timeout,
      retry: this.initOptions?.retry || reqInit.retry ? { ...this.initOptions?.retry, ...reqInit.retry } : undefined,
      headers: {
        ...reqInit.headers,
      }
    };

    let __timeoutError: TimeoutError | null = null;

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
          __timeoutError = new TimeoutError('Timeout of exceeded', 'TimeoutError');
          controller?.abort('Timeout of exceeded');
        };
      })
    }

   
    const promise = this.handleInterceptors<T, U>(initialReqInit)
      .catch(err => {
        if (__timeoutError) {
          // clear side effects
          timeoutScheduler?.clear();
          throw __timeoutError;
        }
        throw err;
      });

    // @ts-ignore
    promise.cancel = (reason?: any) => {
      if (!initialReqInit.abortController?.signal.aborted) initialReqInit.abortController?.abort(reason);
    };

    return promise;
  }

  private handleInterceptors<T, U>(reqInit: AgentReqInit<T, U>): Promise<AgentResponse<T, U>> {
    const requestInterceptorChain: (
      | InterceptorInit<AgentReqInit<T, U>>['onFulfilled']
      | InterceptorInit<AgentReqInit<T, U>>['onRejected']
    )[] = [];

    let synchronousRequestInterceptors: boolean | undefined = true;

    this.interceptors.request.forEach(interceptor => {
      const { runWhen, onFulfilled, onRejected } = interceptor;

      if (typeof runWhen === 'function' && runWhen(reqInit) === false) return;

      synchronousRequestInterceptors =
        synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.push(onFulfilled, onRejected);
    });

    const responseInterceptorChain: (
      | InterceptorInit<AgentResponse<T, U>>['onFulfilled']
      | InterceptorInit<AgentResponse<T, U>>['onRejected']
    )[] = [];
    this.interceptors.response.forEach(interceptor =>
      responseInterceptorChain.push(
        interceptor.onFulfilled,
        interceptor.onRejected
      )
    );

    let promiseChain: Promise<AgentResponse<T, U> | AgentReqInit<T, U>>;

    if (!synchronousRequestInterceptors) {
      let chain: any[] = [
        (init: AgentReqInit<T, U>) => this.wrappedFetch(init), 
        (err) => Promise.reject(err)
      ];

      Array.prototype.unshift.apply(chain, requestInterceptorChain);
      chain = chain.concat(responseInterceptorChain);

      promiseChain = Promise.resolve(reqInit);
      while (chain.length) {
        const onFulfilled = chain.shift();
        const onRejected = chain.shift();
        if (onFulfilled)
          promiseChain = promiseChain.then(onFulfilled, onRejected);
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

    let responsePromiseChain = this.wrappedFetch(chainReqInit);

    while (responseInterceptorChain.length) {
      const onFulfilled:
        | InterceptorInit<AgentResponse<T, U>>['onFulfilled']
        | undefined = responseInterceptorChain.shift();
      const onRejected:
        | InterceptorInit<AgentResponse<T, U>>['onRejected']
        | undefined = responseInterceptorChain.shift();
      if (onFulfilled)
        responsePromiseChain = responsePromiseChain.then(
          onFulfilled,
          onRejected
        );
    }

    return responsePromiseChain as Promise<AgentResponse<T, U>>;
  }

  private wrappedFetch<T, U>(reqInit: AgentReqInit<T, U>): Promise<AgentResponse<T, U>> {
    const url = reqInit.url || reqInit.input;

    // Actually this wil be never reached!
    // if reached, must be an unexcepted error
    if (!this.originalFetch) throw new Error('Agent: expect a original fetch but null!');
    if (!url) return Promise.reject(new Error('Agent: unexpected error, url must have a value and be a string, but null!'))

    return this.originalFetch(url, reqInit).then(res => {
      return this.decorateResponse<T, U>(reqInit, res, undefined)
    });
  }

  private getResponseType(res: Response, responseType: ContentType | SupportedContentType | undefined): ContentType | SupportedContentType | undefined {
    const responseTypeFromResponse = get_response_type(res);
    if (!responseType && !responseTypeFromResponse)
      console.warn('Agent: except a response type but null')
    if (
      responseTypeFromResponse &&
      responseType &&
      responseTypeFromResponse !== responseType
    ) {
      console.warn(`Agent: except a '${responseType}' response type but '${responseTypeFromResponse}'`)
    }
    return responseTypeFromResponse ?? responseType;
  }

  private getResponseData<T, U>(res: AgentResponse<T, U>) {
    const response = res.__response__;
    const init = res.__init__;
    const responseType = this.getResponseType(response, init.responseType);

    if (responseType === ContentType.JSON) return response.json();
    if (responseType === ContentType.BUFFER) return response.arrayBuffer();
    if (responseType === ContentType.TEXT) return response.text();
    if (responseType === ContentType.BLOB) return response.blob();
    if (
      responseType === ContentType.FORM ||
      responseType === ContentType.FORMDATA
    )
      return response.formData();

    return response.text();
  }

  private decorateResponse<T, U>(init: AgentReqInit<T, U>, response: Response, data?: T): AgentResponse<T, U> {
    return {
      data: data,
      url: response.url,
      ok: response.ok,
      status: response.status,
      type: response.type,
      redirected: response.redirected,
      statusText: response.statusText,
      headers: response.headers,
      __init__: init,
      __agent__: this,
      __response__: response,
    };
  }
}

export default Agent;
