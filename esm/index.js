/* eslint-disable @typescript-eslint/no-explicit-any */
const stringify = (value, replacer, space) => {
    try {
        return JSON.stringify(value, replacer, space);
    }
    catch (e) {
        // TODO catch error and report error
        return '';
    }
};

class BodyParser {
    _contentType;
    constructor(contentType) {
        this._contentType = contentType;
    }
    marshal(body) {
        if (body === "" || body === null || body === undefined)
            return body;
        if (body instanceof FormData)
            return body;
        if (body instanceof Blob)
            return body;
        if (body instanceof ArrayBuffer)
            return body;
        if (body instanceof URLSearchParams)
            return body;
        if (this._contentType === "json" /* JSON */ && typeof body !== "string") {
            return stringify(body);
        }
        if (this._contentType === "form" /* FORM */ && isPlainObject(body)) {
            return Object.entries(body)
                .reduce((o, [key, value]) => {
                if (isNil(value))
                    return o;
                if (Array.isArray(value)) {
                    value.forEach((v) => {
                        if (!isNil(v))
                            o.append(key, searchParamsStringify(v));
                    });
                    return o;
                }
                o.append(key, searchParamsStringify(value));
                return o;
            }, new URLSearchParams())
                .toString();
        }
        return body;
    }
}
function isNil(obj) {
    return obj === null || obj === undefined;
}
function searchParamsStringify(obj) {
    if (isNil(obj))
        return "";
    if (typeof obj === "string")
        return obj;
    if (typeof obj === "number")
        return String(obj);
    if (typeof obj === "boolean")
        return String(obj);
    return stringify(obj);
}
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */
// eslint-disable-next-line
function isObject(o) {
    return Object.prototype.toString.call(o) === "[object Object]";
}
// eslint-disable-next-line
function isPlainObject(o) {
    if (!isObject(o))
        return false;
    // If has modified constructor
    if (o.constructor === undefined)
        return true;
    // If has modified prototype
    if (!isObject(o.constructor.prototype))
        return false;
    // If constructor does not have an Object-specific method
    if (!o.constructor.prototype.hasOwnProperty("isPrototypeOf")) {
        return false;
    }
    // Most likely a plain Object
    return true;
}

class InterceptorManager {
    handlers = [];
    constructor() {
        this.handlers = [];
    }
    use(onFulfilled, onRejected, options) {
        this.handlers = this.handlers.concat({
            onFulfilled: onFulfilled,
            onRejected: onRejected,
            synchronous: options ? options.synchronous : false,
            runWhen: options ? options.runWhen : null,
        });
        return this.handlers.length - 1;
    }
    reject(id) {
        if (this.handlers[id]) {
            this.handlers[id] = null;
        }
    }
    forEach(h) {
        this.handlers.forEach((handler, index) => {
            if (handler !== null) {
                h(handler, index);
            }
        });
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const originFetch = window.fetch;
/**
 * application/x-www-form-urlencoded
 * multipart/form-data
 * text/plain
 * application/json
 */
const ContentTypeMap = {
    json: "application/json; charset=utf-8",
    form: "application/x-www-form-urlencoded; charset=utf-8",
    formdata: undefined,
    buffer: "text/plain; charset=utf-8",
    text: "text/plain; charset=utf-8",
    blob: undefined,
};
class Agent {
    _base;
    _init;
    _dafaultInit = {
        timeout: 20000,
        includeAbort: true,
    };
    _timer;
    _abortController;
    _interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager(),
    };
    get interceptors() {
        return this._interceptors;
    }
    constructor(base, init) {
        this._base = base;
        this._init = init;
    }
    // eslint-disable-next-line
    abort(reason) {
        // @ts-ignore
        this._abortController?.abort(reason);
    }
    request(reqInit) {
        // resolve input
        this.resolveInput(reqInit);
        // resolve reqInit
        const resolveReqInit = this.resolveReqInit(reqInit);
        // resolve timeout auto abort
        this.resolveTimeoutAutoAbort(resolveReqInit);
        // handle request/response interceptors
        return this.handleInterceptors(resolveReqInit);
    }
    resolveInput(reqInit) {
        let url = path_join(this._base || reqInit?.base, reqInit.input);
        if (reqInit?.method?.toUpperCase() === "GET" /* GET */ && reqInit?.data) {
            const qIndex = url.indexOf("?");
            const path = qIndex < 0 ? url : url.slice(0, url.indexOf("?"));
            const search = qIndex < 0
                ? resolve_search_params("", reqInit?.data)
                : resolve_search_params(url.slice(url.indexOf("?")), reqInit?.data);
            url = path + (search ? `?${search}` : "");
        }
        reqInit.url = url;
    }
    resolveReqInit(reqInit) {
        const defaultReqInit = {
            timeout: 20000,
            responseType: "json" /* JSON */,
            method: "GET" /* GET */,
            credentials: "include",
        };
        const resolveReqInit = {
            ...this._dafaultInit,
            ...defaultReqInit,
            ...this._init,
            ...reqInit,
        };
        if (!resolveReqInit.method)
            resolveReqInit.method = "GET" /* GET */;
        resolveReqInit.method = resolveReqInit.method.toUpperCase();
        if (!resolveReqInit.credentials)
            resolveReqInit.method = "include";
        if (!resolveReqInit.contentType && resolveReqInit.method !== "GET" /* GET */)
            resolveReqInit.contentType = "json" /* JSON */;
        if (!resolveReqInit.responseType)
            resolveReqInit.responseType = "json" /* JSON */;
        const reqContentType = resolveReqInit?.contentType &&
            ContentTypeMap[resolveReqInit?.contentType];
        // add some usual headers
        const h = {
            ...(reqContentType ? { "Content-Type": reqContentType } : null),
        };
        resolveReqInit.headers = {
            ...defaultReqInit?.headers,
            ...h,
            ...resolveReqInit.headers,
        };
        if (resolveReqInit.method === "GET" /* GET */ ||
            resolveReqInit.method === "HEAD" /* HEAD */) {
            resolveReqInit.body = undefined;
        }
        else {
            resolveReqInit.body =
                resolveReqInit.body !== null && resolveReqInit.body !== undefined
                    ? resolveReqInit.body
                    : new BodyParser(resolveReqInit?.contentType).marshal(resolveReqInit.data);
        }
        return resolveReqInit;
    }
    resolveTimeoutAutoAbort(reqInit) {
        // resolve timeout
        let controller;
        const timeout = reqInit?.timeout;
        const includeAbort = timeout || (reqInit?.includeAbort !== false && reqInit?.includeAbort);
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
    clearAutoAbortTimeout() {
        if (this._timer) {
            window.clearTimeout(this._timer);
            this._timer = null;
        }
    }
    handleInterceptors(reqInit) {
        const requestInterceptorChain = [];
        let synchronousRequestInterceptors = true;
        this._interceptors.request.forEach((interceptor) => {
            const { runWhen, onFulfilled, onRejected } = interceptor;
            if (typeof runWhen === "function" && runWhen(reqInit) === false)
                return;
            synchronousRequestInterceptors =
                synchronousRequestInterceptors && interceptor.synchronous;
            requestInterceptorChain.unshift(onFulfilled, onRejected);
        });
        const responseInterceptorChain = [];
        this._interceptors.response.forEach((interceptor) => responseInterceptorChain.unshift(interceptor.onFulfilled, interceptor.onRejected));
        let promiseChain;
        if (!synchronousRequestInterceptors) {
            let chain = [this.dispatchFetch, undefined];
            Array.prototype.unshift.apply(chain, requestInterceptorChain);
            chain = chain.concat(responseInterceptorChain);
            promiseChain = Promise.resolve(reqInit);
            while (chain.length) {
                const onFulfilled = chain.shift();
                const onRejected = chain.shift();
                if (onFulfilled)
                    promiseChain = promiseChain.then(onFulfilled, onRejected);
            }
            return promiseChain;
        }
        let chainReqInit = reqInit;
        while (requestInterceptorChain.length) {
            const onFulfilled = requestInterceptorChain.shift();
            const onRejected = requestInterceptorChain.shift();
            try {
                if (onFulfilled)
                    chainReqInit = onFulfilled(chainReqInit);
            }
            catch (error) {
                if (onRejected)
                    onRejected(error);
                break;
            }
        }
        let responsePromiseChain = this.dispatchFetch(reqInit);
        while (responseInterceptorChain.length) {
            const onFulfilled = responseInterceptorChain.shift();
            const onRejected = responseInterceptorChain.shift();
            if (onFulfilled)
                responsePromiseChain = responsePromiseChain.then(onFulfilled, onRejected);
        }
        return responsePromiseChain;
    }
    dispatchFetch(reqInit) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const __self = this;
        let __res__;
        const url = reqInit.url || reqInit.input;
        // this wil be never reached!
        if (!url) {
            return Promise.reject(new Error("Unexpected error: url must have a value and be a string, but null!"));
        }
        return originFetch(url, reqInit)
            .then((res) => {
            __res__ = res;
            const responseType = reqInit?.responseType || get_response_type(res);
            if (responseType === "json" /* JSON */)
                return res.json();
            if (responseType === "buffer" /* BUFFER */)
                return res.arrayBuffer();
            if (responseType === "text" /* TEXT */)
                return res.text();
            if (responseType === "blob" /* BLOB */)
                return res.blob();
            if (responseType === "form" /* FORM */ ||
                responseType === "formdata" /* FORMDATA */)
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
            this.clearAutoAbortTimeout();
            throw e;
        });
    }
}
const get_response_type = (res) => {
    const contentType = res.headers.get("content-type");
    if (!contentType)
        return "text" /* TEXT */;
    if (contentType.includes("application/json"))
        return "json" /* JSON */;
    if (contentType.includes("text/plain"))
        return "text" /* TEXT */;
    if (contentType.includes("text/html"))
        return "text" /* TEXT */;
    if (contentType.includes("application/xml"))
        return "text" /* TEXT */;
    return "json" /* JSON */;
};
const path_join = (...paths) => {
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
function resolve_search_params(search, data) {
    const q = new URLSearchParams(search);
    const b = new BodyParser("form").marshal(data);
    const q2 = new URLSearchParams("?" + b);
    q2.forEach((value, key) => {
        if (value !== undefined && value !== null)
            q.append(key, value);
    });
    return q2.toString();
}

export { Agent as default };
