/* eslint-disable @typescript-eslint/no-explicit-any */
import BodyParser from "./body-parser";
import InterceptorManager, {
  OnFulfilled,
  OnRejected,
} from "./interceptor-manager";
import {Method, SupportedContentType, ContentType} from './type'

// TODO: make polyfill to support more platform
const originFetch = window.fetch;

/**
 * application/x-www-form-urlencoded
 * multipart/form-data
 * text/plain
 * application/json
 */
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
};

export type AgentReqInit<U> = RequestInit &
  AgentInit & {
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

const DEFAULT_AGENT_INIT: AgentInit = {
  timeout: 20000,
}
// @ts-ignore
const DEFAULT_REQ_INIT: Partial<AgentReqInit<any>> = {
};

class Agent {
  protected _base?: string;
  protected _init?: AgentInit;

  protected _timer?: NodeJS.Timeout | null;

  protected _abortController?: AbortController;

  protected _interceptors = {
    request: new InterceptorManager<AgentReqInit<any>>(),
    response: new InterceptorManager<AgentResponse<any, any>>(),
  };

  public get interceptors() {
    return this._interceptors;
  }

  public get init() {
    return this._init;
  }

  constructor(base?: string, init?: AgentInit) {
    this._base = base;
    this._init = {...DEFAULT_AGENT_INIT, ...init};
  }

  // eslint-disable-next-line
  public abort(reason?: any) {
    // @ts-ignore
    this._abortController?.abort(reason);
  }

  public request<T, U>(reqInit: AgentReqInit<U>): Promise<AgentResponse<T, U>> {
    // resolve input
    this.resolveInput<U>(reqInit);

    // resolve reqInit
    const resolveReqInit = this.resolveReqInit<U>(reqInit);

    // resolve timeout auto abort
    this.resolveTimeoutAutoAbort<U>(resolveReqInit);

    // handle request/response interceptors
    return this.handleInterceptors<T, U>(resolveReqInit);
  }

  protected resolveInput<U>(reqInit: AgentReqInit<U>) {
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

  protected resolveReqInit<U>(reqInit: AgentReqInit<U>): AgentReqInit<U> {
    const resolvedReqInit: AgentReqInit<U> = {
      ...this._init,
      ...DEFAULT_REQ_INIT,
      ...reqInit,
    };

    // default method is GET if none
    // transform to upper case
    if (!resolvedReqInit.method) resolvedReqInit.method = Method.GET;
    resolvedReqInit.method = resolvedReqInit.method.toUpperCase();

    // add some usual headers
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

    if (
      resolvedReqInit.method === Method.GET ||
      resolvedReqInit.method === Method.HEAD
    ) {
      resolvedReqInit.body = undefined;
    } else {
      resolvedReqInit.body =
        resolvedReqInit.body !== undefined && resolvedReqInit.body !== null
          ? resolvedReqInit.body
          : new BodyParser(resolvedReqInit?.contentType).marshal(
              resolvedReqInit.data
            );
    }

    return resolvedReqInit;
  }

  protected resolveTimeoutAutoAbort<U>(reqInit: AgentReqInit<U>) {
    // resolve timeout
    let controller: AbortController | undefined;
    const timeout = reqInit?.timeout;
    // const includeAbort =
    //   timeout || (reqInit?.includeAbort !== false && reqInit?.includeAbort);
    if (timeout && !reqInit?.signal) {
      controller = new AbortController();
      this._abortController = controller;
      reqInit.signal = controller.signal;
    }

    if (timeout && controller) {
      this._timer = setTimeout(() => {
        controller?.abort("Timeout of exceeded");
      }, timeout);
    }
  }

  protected clearAutoAbortTimeout() {
    if (this._timer) {
      window.clearTimeout(this._timer);
      this._timer = null;
    }
  }

  protected handleInterceptors<T, U>(
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
      )[] = [this.dispatchFetch.bind(this), undefined];

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
      this.dispatchFetch(reqInit);

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

  protected dispatchFetch<T, U>(
    reqInit: AgentReqInit<U>
  ): Promise<AgentResponse<T, U>> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const __self = this;
    let __res__: Response;

    const url = reqInit.url || reqInit.input;

    // this wil be never reached!
    if (!url) {
      return Promise.reject(
        new Error(
          "Agent: unexpected error, url must have a value and be a string, but null!"
        )
      );
    }

    return originFetch(url, reqInit)
      .then((res) => {
        __res__ = res;

        const responseType = reqInit?.responseType || get_response_type(res);
        if (!responseType) throw new Error("Agent: except a response type but null")

        if (responseType === ContentType.JSON) return res.json();
        if (responseType === ContentType.BUFFER) return res.arrayBuffer();
        if (responseType === ContentType.TEXT) return res.text();
        if (responseType === ContentType.BLOB) return res.blob();
        if (
          responseType === ContentType.FORM ||
          responseType === ContentType.FORMDATA
        )
          return res.formData();

        return res.json();
      })
      .then((data) => {
        return this.decorateResponse<T, U>(reqInit, __res__, data);
      })
      .catch((e) => {
        __self.clearAutoAbortTimeout();

        throw e;
      });
  }

  private decorateResponse<T, U>(init: AgentReqInit<U>, res: Response, data: T): AgentResponse<T, U> {
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
