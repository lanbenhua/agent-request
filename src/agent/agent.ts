import InterceptorManager, { OnFulfilled, OnRejected } from "./interceptor-manager";
import { Method, SupportedContentType, ContentType } from './type';
import AbortManager from "./abort-manager";
import BodyParser from "./body-parser";
import Queue from '../queue';

// TODO: make polyfill to support more platform
const _fetch = window.fetch;

const ContentTypeMap: Record<string, string | undefined | null> = {
  json: "application/json; charset=utf-8",
  form: "application/x-www-form-urlencoded; charset=utf-8",
  formdata: undefined,
  buffer: "text/plain; charset=utf-8",
  text: "text/plain; charset=utf-8",
  blob: undefined,
};

export type AgentInit = {
  timeout?: number;
  queue?: {
    concurrency?: number;
    defaultQueueName?: string;
    concurrencies?: Record<string, number>;
  }
};
export type AgentReqInit<U> = RequestInit &
  {
    input: string;
    url?: string;
    base?: string;
    data?: U;
    timeout?: number;
    abortId?: string;
    queueName?: string;
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

const DEFAULT_AGENT_INIT: AgentInit = {
  timeout: 60000,
}
const DEFAULT_REQ_INIT: Partial<AgentReqInit<any>> = {
};
const DEFAULT_QUEUE_NAME = 'default';

class Agent {
  private _base?: string;
  private _init?: AgentInit;
  private _queues?: Map<string, Queue>;
  private _abortors: AbortManager = new AbortManager();
  private _interceptors = {
    request: new InterceptorManager<AgentReqInit<any>>(),
    response: new InterceptorManager<AgentResponse<any, any>>(),
  };

  public get init(): AgentInit | undefined {
    return this._init;
  }
  public get base(): string | undefined {
    return this._base;
  }
  public get queues(): Map<string, Queue> | undefined {
    return this._queues;
  }
  public get interceptors() {
    return this._interceptors;
  }

  constructor(base?: string, init?: AgentInit) {
    this._base = base;
    this._init = {...DEFAULT_AGENT_INIT, ...init};

    this._initQueues();

    this._request = this._request.bind(this);
  }

  public queue(name: string): Queue | undefined {
    return this._queues?.get(name);
  }

  private _initQueues() {
    if (!this._init) return;
    if (!this._init.queue) return;
    const { queue } = this._init;
    const { concurrency, defaultQueueName, concurrencies } = queue;
    if (concurrency || defaultQueueName || concurrencies) {
      const map = new Map<string, Queue>();
      if (defaultQueueName) map.set(defaultQueueName || DEFAULT_QUEUE_NAME, new Queue(concurrency ?? 5));
      if (concurrencies) {
        Object.entries(concurrencies).map(([name, concurrency]) => {
          map.set(name, new Queue(concurrency));
        })
      }
      this._queues = map; 
    }
  }

  public abort(id: string, reason?: string) {
    this._abortors.abort(id, reason);
  }

  public request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>> {
    if (this._queues) {
      const queue = this.queue(reqInit.queueName ?? this._init?.queue?.defaultQueueName ?? DEFAULT_QUEUE_NAME);
      if (queue)
        return queue.enqueue<AgentResponse<T, U>>({
          runner: () => this._request(reqInit),
          priority: "MEDIUM",
        })
    }
    return this._request(reqInit)
  }

  private _request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>> {
    // resolve input
    this._resolveInput<U>(reqInit);

    // resolve reqInit
    const resolveReqInit = this._resolveReqInit<U>(reqInit);

    // resolve timeout auto abort
    this._resolveTimeoutAutoAbort<U>(resolveReqInit);

    // handle request/response interceptors
    return this._handleInterceptors<T, U>(resolveReqInit);
  }

  private _resolveInput<U>(reqInit: AgentReqInit<U>) {
    let url = path_join(this._base || reqInit?.base, reqInit.input);

    // If the method is GET, we should merge the data of reqInit and url search
    if (reqInit?.method?.toUpperCase() === Method.GET && reqInit?.data) {
      const qIndex = url.indexOf("?");
      const path = qIndex < 0 ? url : url.slice(0, url.indexOf("?"));
      const search =
        qIndex < 0
          ? resolve_search_params("", reqInit?.data)
          : resolve_search_params(url.slice(url.indexOf("?")), reqInit?.data);

      url = path + (search ? `?${search}` : "");
    }

    // update url after resolved
    reqInit.url = url;
  }

  private _resolveReqInit<U>(reqInit: AgentReqInit<U>): AgentReqInit<U> {
    const resolvedReqInit: AgentReqInit<U> = {
      ...DEFAULT_REQ_INIT,
      ...this._init,
      ...reqInit,
    };

    // set default method equals GET if none
    // then transform to upper case
    if (!resolvedReqInit.method) resolvedReqInit.method = Method.GET;
    resolvedReqInit.method = resolvedReqInit.method.toUpperCase();

    // handle content-type header according to the contentType
    // if no contentType, will ignore
    // else handle the responsible content type according to the ContentTypeMap
    const reqContentType =
      resolvedReqInit?.contentType &&
      ContentTypeMap[resolvedReqInit?.contentType];
    const h: RequestInit["headers"] = {
      ...(reqContentType ? { "Content-Type": reqContentType } : null),
    };
    resolvedReqInit.headers = {
      ...DEFAULT_REQ_INIT.headers,
      ...h,
      ...resolvedReqInit.headers,
    };

    // if init includes body, will use it directly
    // else handle the responsible body
    resolvedReqInit.body = resolvedReqInit.method === Method.GET || resolvedReqInit.method === Method.HEAD 
      ? undefined
      : resolvedReqInit.body !== undefined && resolvedReqInit.body !== null 
      ? resolvedReqInit.body
      : new BodyParser(resolvedReqInit?.contentType).marshal(resolvedReqInit.data)

    return resolvedReqInit;
  }

  private _resolveTimeoutAutoAbort<U>(reqInit: AgentReqInit<U>) {
    const { timeout } = reqInit;

    // if no timeout or timeout equals 0, will return directly
    if (!timeout) return;

    // if the request init includes signal, the abort event will control by the outside
    // we do not need to do the auto abort any more.
    if (reqInit.signal) return;

    const controller = new AbortController();

    if (!reqInit.signal) reqInit.signal = controller.signal;

    this._abortors.set(this._getAbortId(reqInit), controller);

    const timer = setTimeout(() => {
      controller.abort("Timeout of exceeded");
 
      this._abortors.delete(this._getAbortId(reqInit))
      clearTimeout(timer)
    }, timeout);
  }

  private _getAbortId<U>(reqInit: AgentReqInit<U>): string {
    return reqInit.abortId ?? (reqInit.method ?? '') + (reqInit.url ?? '');
  }

  private _handleInterceptors<T, U>(
    reqInit: AgentReqInit<U>
  ): Promise<AgentResponse<T, U>> {
    const requestInterceptorChain: (
      | OnFulfilled<AgentReqInit<U>>
      | OnRejected
    )[] = [];

    let synchronousRequestInterceptors: boolean | undefined = true;

    this._interceptors.request.forEach((interceptor) => {
      const { runWhen, onFulfilled, onRejected } = interceptor;

      if (typeof runWhen === "function" && runWhen(reqInit) === false) return;

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

    let promiseChain: Promise<AgentResponse<T, U> | AgentReqInit<U>>;

    if (!synchronousRequestInterceptors) {
      let chain: (
        | OnFulfilled<AgentReqInit<U>>
        | OnRejected
        | undefined
        | ((reqInit: AgentReqInit<U>) => Promise<AgentResponse<T, U>>)
        | OnFulfilled<AgentResponse<T, U>>
      )[] = [this._dispatchFetch.bind(this), undefined];

      Array.prototype.unshift.apply(chain, requestInterceptorChain);
      chain = chain.concat(responseInterceptorChain);

      promiseChain = Promise.resolve(reqInit);
      while (chain.length) {
        const onFulfilled = chain.shift();
        const onRejected = chain.shift();
        if (onFulfilled)
          promiseChain = promiseChain.then(onFulfilled as never, onRejected);
      }

      return promiseChain as never as Promise<AgentResponse<T, U>>;
    }

    let chainReqInit = reqInit;
    while (requestInterceptorChain.length) {
      const onFulfilled: OnFulfilled<AgentReqInit<U>> | undefined =
        requestInterceptorChain.shift();
      const onRejected: OnRejected | undefined =
        requestInterceptorChain.shift();
      try {
        if (onFulfilled)
          chainReqInit = onFulfilled(chainReqInit) as AgentReqInit<U>;
      } catch (error) {
        if (onRejected) onRejected(error);
        break;
      }
    }

    let responsePromiseChain: Promise<AgentResponse<T, U>> =
      this._dispatchFetch(reqInit);

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

  private _dispatchFetch<T, U>(
    reqInit: AgentReqInit<U>
  ): Promise<AgentResponse<T, U>> {
    let __res__: Response;

    const url = reqInit.url || reqInit.input;

    // Actually this wil be never reached!
    // if reached, must be an unexcepted error
    if (!url) {
      return Promise.reject(
        new Error(
          "Agent: unexpected error, url must have a value and be a string, but null!"
        )
      );
    }

    return _fetch(url, reqInit)
      .then((res) => {
        __res__ = res;

        const responseType = reqInit?.responseType || get_response_type(res);
        if (!responseType) throw new Error("Agent: except a response type but null")

        if (responseType === ContentType.JSON) return res.json();
        if (responseType === ContentType.BUFFER) return res.arrayBuffer();
        if (responseType === ContentType.TEXT) return res.text();
        if (responseType === ContentType.BLOB) return res.blob();
        if (responseType === ContentType.FORM || responseType === ContentType.FORMDATA) return res.formData();

        return res.json();
      })
      .then((data) => {
        return this._decorateResponse<T, U>(reqInit, __res__, data);
      })
      .finally(() => {
        this._abortors.delete(this._getAbortId(reqInit))
      })
  }

  private _decorateResponse<T, U>(init: AgentReqInit<U>, res: Response, data: T): AgentResponse<T, U> {
    return  {
      url: res.url,
      data: data,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      __init__: init,
      __agent__: this,
      __response__: res,
    }
  }
}

const get_response_type = (res: Response): ContentType | undefined | null => {
  const contentType = res.headers.get("content-type");

  if (!contentType) return null;
  if (contentType?.includes("application/json")) return ContentType.JSON;
  if (contentType?.includes("text/plain")) return ContentType.TEXT;
  if (contentType?.includes("text/html")) return ContentType.TEXT;
  if (contentType?.includes("application/xml")) return ContentType.TEXT;
  
  return undefined
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
      return pre + "/" + path;
    })
    .replace(new RegExp(non_pre_reg, "gm"), "/");
};

function resolve_search_params(search?: string, data?: unknown): string {
  const q = new URLSearchParams(search);
  const b = new BodyParser(ContentType.FORM).marshal(data);
  const q2 = new URLSearchParams("?" + b);

  q2.forEach((value, key) => {
    if (value !== undefined && value !== null) q.append(key, value);
  });

  return q2.toString();
}

export default Agent;
