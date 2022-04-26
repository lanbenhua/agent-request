/* eslint-disable @typescript-eslint/no-explicit-any */

import BodyParser from "./body-parser";
import InterceptorManager, {
  OnFulfilled,
  OnRejected,
} from "./interceptor-manager";

const originFetch = window.fetch;

export type SupportedContentType =
  | "json"
  | "form"
  | "text"
  | "buffer"
  | "blob"
  | "formdata";

export const enum ContentType {
  JSON = "json",
  FORM = "form",
  FORMDATA = "formdata",
  TEXT = "text",
  BUFFER = "buffer",
  BLOB = "blob",
}

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

export const enum Method {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

export type AgentInit = {
  timeout?: number;
  includeAbort?: boolean;
};

export type AgentReqInit<U> = RequestInit &
  AgentInit & {
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

class Agent {
  protected _base?: string;
  protected _init?: AgentInit;

  private _dafaultInit?: AgentInit = {
    timeout: 20000,
    includeAbort: true,
  };

  protected _timer?: NodeJS.Timeout | null;

  protected _abortController?: AbortController;

  protected _interceptors = {
    request: new InterceptorManager<AgentReqInit<any>>(),
    response: new InterceptorManager<AgentResponse<any, any>>(),
  };

  public get interceptors() {
    return this._interceptors;
  }

  constructor(base?: string, init?: AgentInit) {
    this._base = base;
    this._init = init;
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
    const defaultReqInit: Partial<AgentReqInit<U>> = {
      timeout: 20000,
      responseType: ContentType.JSON,
      method: Method.GET,
      credentials: "include",
    };

    const resolveReqInit: AgentReqInit<U> = {
      ...this._dafaultInit,
      ...defaultReqInit,
      ...this._init,
      ...reqInit,
    };

    // default method is GET if none
    // transform to upper case
    if (!resolveReqInit.method) resolveReqInit.method = Method.GET;
    resolveReqInit.method = resolveReqInit.method.toUpperCase();

    // default credentials is include if none
    if (!resolveReqInit.credentials) resolveReqInit.credentials = "include";

    // if no contentType set and method is not GET, will set default `json`
    if (!resolveReqInit.contentType && resolveReqInit.method !== Method.GET)
      resolveReqInit.contentType = ContentType.JSON;

    // if no responseType set, will set default `json`
    if (!resolveReqInit.responseType)
      resolveReqInit.responseType = ContentType.JSON;

    // add some usual headers
    const reqContentType =
      resolveReqInit?.contentType &&
      ContentTypeMap[resolveReqInit?.contentType];

    const h: RequestInit["headers"] = {
      ...(reqContentType ? { "Content-Type": reqContentType } : null),
    };

    resolveReqInit.headers = {
      ...defaultReqInit?.headers,
      ...h,
      ...resolveReqInit.headers,
    };

    if (
      resolveReqInit.method === Method.GET ||
      resolveReqInit.method === Method.HEAD
    ) {
      resolveReqInit.body = undefined;
    } else {
      resolveReqInit.body =
        resolveReqInit.body !== null && resolveReqInit.body !== undefined
          ? resolveReqInit.body
          : new BodyParser(resolveReqInit?.contentType).marshal(
              resolveReqInit.data
            );
    }

    return resolveReqInit;
  }

  protected resolveTimeoutAutoAbort<U>(reqInit: AgentReqInit<U>) {
    // resolve timeout
    let controller: AbortController | undefined;
    const timeout = reqInit?.timeout;
    const includeAbort =
      timeout || (reqInit?.includeAbort !== false && reqInit?.includeAbort);
    if (includeAbort && !reqInit?.signal) {
      controller = new AbortController();
      this._abortController = controller;
      reqInit.signal = controller.signal;
    }

    if (timeout && controller) {
      this._timer = setTimeout(() => {
        controller?.abort();
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
          "Unexpected error: url must have a value and be a string, but null!"
        )
      );
    }

    return originFetch(url, reqInit)
      .then((res) => {
        __res__ = res;

        const responseType = reqInit?.responseType || get_response_type(res);

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
        return {
          url: __res__.url,
          data: data,
          ok: __res__.ok,
          status: __res__.status,
          statusText: __res__.statusText,
          headers: __res__.headers,
          __reqInit__: reqInit,
          __fetch__: __self,
          __response__: __res__,
        };
      })
      .catch((e) => {
        __self.clearAutoAbortTimeout();

        throw e;
      });
  }
}

const get_response_type = (res: Response): ContentType => {
  const contentType = res.headers.get("content-type");
  if (!contentType) return ContentType.TEXT;
  if (contentType.includes("application/json")) return ContentType.JSON;
  if (contentType.includes("text/plain")) return ContentType.TEXT;
  if (contentType.includes("text/html")) return ContentType.TEXT;
  if (contentType.includes("application/xml")) return ContentType.TEXT;
  return ContentType.JSON;
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
  const b = new BodyParser("form").marshal(data);
  const q2 = new URLSearchParams("?" + b);

  q2.forEach((value, key) => {
    if (value !== undefined && value !== null) q.append(key, value);
  });

  return q2.toString();
}

export default Agent;
