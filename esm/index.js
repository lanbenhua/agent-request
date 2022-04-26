/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

/* eslint-disable @typescript-eslint/no-explicit-any */
var stringify = function (value, replacer, space) {
    try {
        return JSON.stringify(value, replacer, space);
    }
    catch (e) {
        // TODO catch error and report error
        return '';
    }
};

var BodyParser = /** @class */ (function () {
    function BodyParser(contentType) {
        this._contentType = contentType;
    }
    BodyParser.prototype.marshal = function (body) {
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
                .reduce(function (o, _a) {
                var key = _a[0], value = _a[1];
                if (isNil(value))
                    return o;
                if (Array.isArray(value)) {
                    value.forEach(function (v) {
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
    };
    return BodyParser;
}());
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

var InterceptorManager = /** @class */ (function () {
    function InterceptorManager() {
        this.handlers = [];
        this.handlers = [];
    }
    InterceptorManager.prototype.use = function (onFulfilled, onRejected, options) {
        this.handlers = this.handlers.concat({
            onFulfilled: onFulfilled,
            onRejected: onRejected,
            synchronous: options ? options.synchronous : false,
            runWhen: options ? options.runWhen : null,
        });
        return this.handlers.length - 1;
    };
    InterceptorManager.prototype.reject = function (id) {
        if (this.handlers[id]) {
            this.handlers[id] = null;
        }
    };
    InterceptorManager.prototype.forEach = function (h) {
        this.handlers.forEach(function (handler, index) {
            if (handler !== null) {
                h(handler, index);
            }
        });
    };
    return InterceptorManager;
}());

/* eslint-disable @typescript-eslint/no-explicit-any */
var originFetch = window.fetch;
/**
 * application/x-www-form-urlencoded
 * multipart/form-data
 * text/plain
 * application/json
 */
var ContentTypeMap = {
    json: "application/json; charset=utf-8",
    form: "application/x-www-form-urlencoded; charset=utf-8",
    formdata: undefined,
    buffer: "text/plain; charset=utf-8",
    text: "text/plain; charset=utf-8",
    blob: undefined,
};
var Agent = /** @class */ (function () {
    function Agent(base, init) {
        this._dafaultInit = {
            timeout: 20000,
            includeAbort: true,
        };
        this._interceptors = {
            request: new InterceptorManager(),
            response: new InterceptorManager(),
        };
        this._base = base;
        this._init = init;
    }
    Object.defineProperty(Agent.prototype, "interceptors", {
        get: function () {
            return this._interceptors;
        },
        enumerable: false,
        configurable: true
    });
    // eslint-disable-next-line
    Agent.prototype.abort = function (reason) {
        var _a;
        // @ts-ignore
        (_a = this._abortController) === null || _a === void 0 ? void 0 : _a.abort(reason);
    };
    Agent.prototype.request = function (reqInit) {
        // resolve input
        this.resolveInput(reqInit);
        // resolve reqInit
        var resolveReqInit = this.resolveReqInit(reqInit);
        // resolve timeout auto abort
        this.resolveTimeoutAutoAbort(resolveReqInit);
        // handle request/response interceptors
        return this.handleInterceptors(resolveReqInit);
    };
    Agent.prototype.resolveInput = function (reqInit) {
        var _a;
        var url = path_join(this._base || (reqInit === null || reqInit === void 0 ? void 0 : reqInit.base), reqInit.input);
        // If the method is GET, we should merge the data of reqInit and url search
        if (((_a = reqInit === null || reqInit === void 0 ? void 0 : reqInit.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "GET" /* GET */ && (reqInit === null || reqInit === void 0 ? void 0 : reqInit.data)) {
            var qIndex = url.indexOf("?");
            var path = qIndex < 0 ? url : url.slice(0, url.indexOf("?"));
            var search = qIndex < 0
                ? resolve_search_params("", reqInit === null || reqInit === void 0 ? void 0 : reqInit.data)
                : resolve_search_params(url.slice(url.indexOf("?")), reqInit === null || reqInit === void 0 ? void 0 : reqInit.data);
            url = path + (search ? "?".concat(search) : "");
        }
        // update url after resolved
        reqInit.url = url;
    };
    Agent.prototype.resolveReqInit = function (reqInit) {
        var defaultReqInit = {
            timeout: 20000,
            responseType: "json" /* JSON */,
            method: "GET" /* GET */,
            credentials: "include",
        };
        var resolveReqInit = __assign(__assign(__assign(__assign({}, this._dafaultInit), defaultReqInit), this._init), reqInit);
        // default method is GET if none
        // transform to upper case
        if (!resolveReqInit.method)
            resolveReqInit.method = "GET" /* GET */;
        resolveReqInit.method = resolveReqInit.method.toUpperCase();
        // default credentials is include if none
        if (!resolveReqInit.credentials)
            resolveReqInit.credentials = "include";
        // if no contentType set and method is not GET, will set default `json`
        if (!resolveReqInit.contentType && resolveReqInit.method !== "GET" /* GET */)
            resolveReqInit.contentType = "json" /* JSON */;
        // if no responseType set, will set default `json`
        if (!resolveReqInit.responseType)
            resolveReqInit.responseType = "json" /* JSON */;
        // add some usual headers
        var reqContentType = (resolveReqInit === null || resolveReqInit === void 0 ? void 0 : resolveReqInit.contentType) &&
            ContentTypeMap[resolveReqInit === null || resolveReqInit === void 0 ? void 0 : resolveReqInit.contentType];
        var h = __assign({}, (reqContentType ? { "Content-Type": reqContentType } : null));
        resolveReqInit.headers = __assign(__assign(__assign({}, defaultReqInit === null || defaultReqInit === void 0 ? void 0 : defaultReqInit.headers), h), resolveReqInit.headers);
        if (resolveReqInit.method === "GET" /* GET */ ||
            resolveReqInit.method === "HEAD" /* HEAD */) {
            resolveReqInit.body = undefined;
        }
        else {
            resolveReqInit.body =
                resolveReqInit.body !== null && resolveReqInit.body !== undefined
                    ? resolveReqInit.body
                    : new BodyParser(resolveReqInit === null || resolveReqInit === void 0 ? void 0 : resolveReqInit.contentType).marshal(resolveReqInit.data);
        }
        return resolveReqInit;
    };
    Agent.prototype.resolveTimeoutAutoAbort = function (reqInit) {
        // resolve timeout
        var controller;
        var timeout = reqInit === null || reqInit === void 0 ? void 0 : reqInit.timeout;
        var includeAbort = timeout || ((reqInit === null || reqInit === void 0 ? void 0 : reqInit.includeAbort) !== false && (reqInit === null || reqInit === void 0 ? void 0 : reqInit.includeAbort));
        if (includeAbort && !(reqInit === null || reqInit === void 0 ? void 0 : reqInit.signal)) {
            controller = new AbortController();
            this._abortController = controller;
            reqInit.signal = controller.signal;
        }
        if (timeout && controller) {
            this._timer = setTimeout(function () {
                controller === null || controller === void 0 ? void 0 : controller.abort();
            }, timeout);
        }
    };
    Agent.prototype.clearAutoAbortTimeout = function () {
        if (this._timer) {
            window.clearTimeout(this._timer);
            this._timer = null;
        }
    };
    Agent.prototype.handleInterceptors = function (reqInit) {
        var requestInterceptorChain = [];
        var synchronousRequestInterceptors = true;
        this._interceptors.request.forEach(function (interceptor) {
            var runWhen = interceptor.runWhen, onFulfilled = interceptor.onFulfilled, onRejected = interceptor.onRejected;
            if (typeof runWhen === "function" && runWhen(reqInit) === false)
                return;
            synchronousRequestInterceptors =
                synchronousRequestInterceptors && interceptor.synchronous;
            requestInterceptorChain.unshift(onFulfilled, onRejected);
        });
        var responseInterceptorChain = [];
        this._interceptors.response.forEach(function (interceptor) {
            return responseInterceptorChain.unshift(interceptor.onFulfilled, interceptor.onRejected);
        });
        var promiseChain;
        if (!synchronousRequestInterceptors) {
            var chain = [this.dispatchFetch, undefined];
            Array.prototype.unshift.apply(chain, requestInterceptorChain);
            chain = chain.concat(responseInterceptorChain);
            promiseChain = Promise.resolve(reqInit);
            while (chain.length) {
                var onFulfilled = chain.shift();
                var onRejected = chain.shift();
                if (onFulfilled)
                    promiseChain = promiseChain.then(onFulfilled, onRejected);
            }
            return promiseChain;
        }
        var chainReqInit = reqInit;
        while (requestInterceptorChain.length) {
            var onFulfilled = requestInterceptorChain.shift();
            var onRejected = requestInterceptorChain.shift();
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
        var responsePromiseChain = this.dispatchFetch(reqInit);
        while (responseInterceptorChain.length) {
            var onFulfilled = responseInterceptorChain.shift();
            var onRejected = responseInterceptorChain.shift();
            if (onFulfilled)
                responsePromiseChain = responsePromiseChain.then(onFulfilled, onRejected);
        }
        return responsePromiseChain;
    };
    Agent.prototype.dispatchFetch = function (reqInit) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var __self = this;
        var __res__;
        var url = reqInit.url || reqInit.input;
        // this wil be never reached!
        if (!url) {
            return Promise.reject(new Error("Unexpected error: url must have a value and be a string, but null!"));
        }
        return originFetch(url, reqInit)
            .then(function (res) {
            __res__ = res;
            var responseType = (reqInit === null || reqInit === void 0 ? void 0 : reqInit.responseType) || get_response_type(res);
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
            .then(function (data) {
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
            .catch(function (e) {
            __self.clearAutoAbortTimeout();
            throw e;
        });
    };
    return Agent;
}());
var get_response_type = function (res) {
    var contentType = res.headers.get("content-type");
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
var path_join = function () {
    var paths = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        paths[_i] = arguments[_i];
    }
    var non_pre_reg = /(?<!(https?|file|wss?):)\/\/+/;
    var pre_reg = /^(https?|file|wss?):\/\//;
    return paths
        .filter(Boolean)
        .map(String)
        .reduce(function (pre, path) {
        if (new RegExp(pre_reg).test(path)) {
            return path;
        }
        return pre + "/" + path;
    })
        .replace(new RegExp(non_pre_reg, "gm"), "/");
};
function resolve_search_params(search, data) {
    var q = new URLSearchParams(search);
    var b = new BodyParser("form").marshal(data);
    var q2 = new URLSearchParams("?" + b);
    q2.forEach(function (value, key) {
        if (value !== undefined && value !== null)
            q.append(key, value);
    });
    return q2.toString();
}

export { Agent as default };
