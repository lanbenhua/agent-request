import { Method, SupportedContentType, ContentType } from './type';
import InterceptorManager, {
  OnFulfilled,
  OnRejected,
} from './interceptor-manager';
import Queue, { QueueTaskPriority } from '../queue';
import BodyParser from './body-parser';
import { TimeoutError } from './error';
import { isNil } from './utils/is';
import Retry from './retry';

const ContentTypeMap: Record<string, string | undefined | null> = {
  json: 'application/json; charset=utf-8',
  form: 'application/x-www-form-urlencoded; charset=utf-8',
  formdata: undefined,
  buffer: 'text/plain; charset=utf-8',
  text: 'text/plain; charset=utf-8',
  blob: undefined,
};

type RetryInit<T, U> = {
  // inheritTimeout?: boolean;
  maxTimes?: number;
  delay?:
    | number
    | ((
        attempt: number,
        error: Error | null | undefined,
        response: AgentResponse<T, U> | null | undefined
      ) => number);
  retryOn?:
    | number[]
    | ((
        attempt: number,
        error: Error | null | undefined,
        response: AgentResponse<T, U> | null | undefined
      ) => boolean | Promise<boolean>);
};
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;
export type AgentInit<T, U> = {
  base?: string;
  timeout?: number;
  queue?: {
    concurrency?: number;
    defaultName?: string;
    concurrencies?: Record<string, number>;
  };
  retry?: RetryInit<T, U>;
};
export type AgentReqInit<T, U> = RequestInit & {
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

const DEFAULT_AGENT_INIT: RetryInit<any, any> = {};
const DEFAULT_REQ_INIT: Partial<AgentReqInit<any, any>> = {};

class Agent {
  private _fetch: Fetch;
  private _init?: AgentInit<any, any>;
  private _queueMap?: Map<string, Queue>;
  private _interceptors = {
    request: new InterceptorManager<AgentReqInit<any, any>>(),
    response: new InterceptorManager<AgentResponse<any, any>>(),
  };

  public get init(): AgentInit<any, any> | undefined {
    return this._init;
  }
  public get queueMap(): Map<string, Queue> | undefined {
    return this._queueMap;
  }
  public get interceptors() {
    return this._interceptors;
  }

  constructor(fetch: Fetch, init?: AgentInit<any, any>) {
    if (!fetch) throw new Error('Fetch must be a function but null');
    this._fetch = fetch.bind(null);
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
  ): Promise<AgentResponse<T, U>> {
    if (reqInit.retry) {
      const retry = new Retry<AgentResponse<T, U>>(
        () => this._queueRequest(reqInit),
        {
          ...reqInit.retry,
          retryOn: reqInit.retry?.retryOn
            ? (attempt, err, res) => {
                if (Array.isArray(reqInit.retry?.retryOn)) {
                  return !!(
                    res && reqInit.retry?.retryOn.includes(res?.status)
                  );
                }
                return reqInit.retry?.retryOn?.(attempt, err, res) ?? false;
              }
            : undefined,
        }
      );

      return retry.start() as Promise<AgentResponse<T, U>>;
    }

    return this._queueRequest(reqInit);
  }

  private _initQueues() {
    if (!this._init) return;
    if (!this._init.queue) return;
    const { queue } = this._init;
    const { concurrency, defaultName, concurrencies } = queue;
    if (concurrency && defaultName) {
      this._createOrGetQueue(defaultName, concurrency);
    }
    if (concurrencies) {
      Object.entries(concurrencies).map(([name, concurrency]) => {
        this._createOrGetQueue(name, concurrency);
      });
    }
  }

  private _createOrGetQueue(
    name: string = 'default',
    concurrency: number = 5
  ): Queue {
    if (!this._queueMap) this._queueMap = new Map<string, Queue>();
    const oldQueue = this.queue(name);
    if (oldQueue) return oldQueue;
    const newQueue = new Queue(concurrency);
    this._queueMap.set(name, newQueue);
    return newQueue;
  }

  private _queueRequest<T, U>(
    reqInit: AgentReqInit<T, U>
  ): Promise<AgentResponse<T, U>> {
    if (this._queueMap) {
      const queueName = reqInit.queue?.name ?? this._init?.queue?.defaultName;
      const queueConcurrency = this._init?.queue?.concurrency;
      const queue = this._createOrGetQueue(queueName, queueConcurrency);
      return queue.enqueue<AgentResponse<T, U>>({
        runner: () => this._request(reqInit),
        priority: reqInit.queue?.priority,
      });
    }

    return this._request(reqInit);
  }

  private _request<T, U>(
    reqInit: AgentReqInit<T, U>
  ): Promise<AgentResponse<T, U>> {
    // resolve reqInit
    const reqInit2 = this._resolveTimeoutAutoAbort<T, U>(
      this._resolveReqInit<T, U>(this._resolveInput<T, U>(reqInit))
    );
    // @ts-ignore
    reqInit2.__origin_reqInit = reqInit;

    // handle request/response interceptors
    return this._wrappedFetch<T, U>(reqInit2)
      .catch((err) => {
        this._checkAborter<T, U>(reqInit2);
        throw err;
      })
      .finally(() => {
        this._clearTimeoutAutoAbort<T, U>(reqInit2);

        // @ts-ignore
        if (reqInit2.__origin_reqInit) delete reqInit2.__origin_reqInit;
      });
  }

  private _resolveReqInit<T, U>(
    reqInit: AgentReqInit<T, U>
  ): AgentReqInit<T, U> {
    const reqInit2 = {
      ...DEFAULT_REQ_INIT,
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
    const reqContentType =
      reqInit?.contentType && ContentTypeMap[reqInit?.contentType];
    reqInit2.headers = {
      ...DEFAULT_REQ_INIT.headers,
      ...(reqContentType ? { 'content-type': reqContentType } : null),
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

    // if no timeout or timeout equals 0, will return directly
    if (!timeout) return reqInit2;

    // if the request init includes signal, the abort event will control by the outside
    // we do not need to do the auto abort any more.
    if (reqInit2.signal) return reqInit2;

    const controller = new AbortController();

    controller.signal.onabort = function abortHandler() {
      // @ts-ignore
      reqInit2.__aborter = this;
      controller.signal.onabort = null;
    };

    reqInit2.abortController = controller;
    reqInit2.signal = controller.signal;

    const timer = setTimeout(() => {
      controller.abort('Timeout of exceeded');
    }, timeout);

    // @ts-ignore
    reqInit2.__abortTimer = timer;

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

const get_response_type = (res: Response): ContentType | undefined => {
  const contentType = res.headers.get('content-type');

  if (!contentType) return undefined;
  if (contentType?.includes('application/json')) return ContentType.JSON;
  if (contentType?.includes('text/plain')) return ContentType.TEXT;
  if (contentType?.includes('text/html')) return ContentType.TEXT;
  if (contentType?.includes('application/xml')) return ContentType.TEXT;

  return undefined;
};

const path_join = (...paths: (string | null | undefined)[]): string => {
  const non_pre_reg = /(?<!(https?|file|wss?):)\/\/+/;
  const pre_reg = /^(https?|file|wss?):\/\//;

  return paths
    .filter(Boolean)
    .map(String)
    .reduce((pre, path) => {
      if (new RegExp(pre_reg).test(path)) {
        return path;
      }
      return pre + '/' + path;
    })
    .replace(new RegExp(non_pre_reg, 'gm'), '/');
};

function resolve_search_params(search?: string, data?: unknown): string {
  const q = new URLSearchParams(search);
  const b = new BodyParser(ContentType.FORM).marshal(data);
  const q2 = new URLSearchParams('?' + b);

  q2.forEach((value, key) => {
    if (value !== undefined && value !== null) q.append(key, value);
  });

  return q2.toString();
}

export default Agent;
