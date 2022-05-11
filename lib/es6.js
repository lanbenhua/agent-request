(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Agent = {}));
})(this, (function (exports) { 'use strict';

    class InterceptorManager {
        constructor() {
            this.handlers = [];
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
    const stringify = (value, replacer, space) => {
        try {
            return JSON.stringify(value, replacer, space);
        }
        catch (e) {
            // TODO catch error and report error
            return '';
        }
    };

    // eslint-disable-next-line
    function isNil(obj) {
        return obj === null || obj === undefined;
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

    class BodyParser {
        constructor(contentType) {
            this._contentType = contentType;
        }
        // eslint-disable-next-line
        marshal(body) {
            const { _contentType } = this;
            if (_contentType === "formdata" /* FORMDATA */)
                return formdataencode(body);
            if (_contentType === "json" /* JSON */)
                return typeof body === 'string' ? body : stringify(body);
            if (_contentType === "form" /* FORM */)
                return formurlencode(body);
            if (_contentType === "blob" /* BLOB */) {
                if (!(body instanceof Blob))
                    throw new Error("BodyParser: must be a blob when content type is blob");
                return body;
            }
            if (_contentType === "buffer" /* BUFFER */) {
                if (!(body instanceof ArrayBuffer))
                    throw new Error("BodyParser: must be a arraybuffer when content type is arraybuffer");
                return body;
            }
            if (_contentType === "text" /* TEXT */)
                return typeof body === 'string' ? body : stringify(body);
            return body;
        }
    }
    // eslint-disable-next-line
    function formdataencode(obj) {
        if (obj instanceof FormData)
            return obj;
        const formdata = new FormData();
        if (isPlainObject(obj))
            Object.entries(obj).forEach(([key, value]) => {
                if (isNil(value))
                    return;
                if (Array.isArray(value)) {
                    value.forEach((v) => {
                        if (!isNil(v))
                            formdata.append(key, searchParamsStringify(v));
                    });
                }
                formdata.append(key, searchParamsStringify(value));
            });
        if (typeof obj === 'string')
            new URLSearchParams(obj).forEach((v, k) => {
                formdata.append(k, v);
            });
        return formdata;
    }
    function marshalObj(obj) {
        return Object.entries(obj)
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
    // eslint-disable-next-line
    function formurlencode(obj) {
        if (typeof obj === 'string')
            return obj;
        if (obj instanceof URLSearchParams)
            return obj.toString();
        if (isPlainObject(obj))
            return marshalObj(obj);
        if (obj instanceof FormData) {
            // eslint-disable-next-line
            const draftObj = {};
            obj.forEach((value, key) => {
                draftObj[key] = value;
            });
            return marshalObj(draftObj);
        }
        return "";
    }
    // eslint-disable-next-line
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

    class Queue {
        constructor(size, options) {
            this._size = 10;
            this._queue = [];
            this._pending = 0;
            this._queue = [];
            this._pending = 0;
            this._options = options;
            this.resize(size);
        }
        get size() {
            return this._size;
        }
        get queue() {
            return this._queue;
        }
        get options() {
            return this._options;
        }
        get pending() {
            return this._pending;
        }
        resize(size) {
            this._size = size;
            // Trigger queued items if queue became bigger
            this._check();
        }
        run(runner) {
            return new Promise((resolve) => this._push(resolve))
                .then(runner)
                .then(this._finish, this._error);
        }
        _check() {
            if (this._pending >= this.size)
                return;
            if (this._queue.length < 1)
                return;
            this._pending++;
            const task = this._queue.shift();
            task && task(undefined);
            // Flush all queued items until queue is full
            this._check();
        }
        _push(runner) {
            this._queue.push(runner);
            this._check();
        }
        _pop() {
            this._pending--;
            if (this._pending < 0)
                throw new Error('Pop called more than there were pending fetches');
            this._check();
        }
        _finish(res) {
            this._pop();
            return res;
        }
        _error(err) {
            this._pop();
            throw err;
        }
    }

    class AbortManager {
        constructor() {
            this._d = new Map();
        }
        signal(id) {
            var _a;
            return (_a = this._d.get(id)) === null || _a === void 0 ? void 0 : _a.signal;
        }
        isAborted(id) {
            var _a, _b;
            return (_b = (_a = this.signal(id)) === null || _a === void 0 ? void 0 : _a.aborted) !== null && _b !== void 0 ? _b : true;
        }
        abort(id, reason) {
            if (this.isAborted(id))
                return;
            const controller = this._d.get(id);
            if (controller)
                controller.abort(reason);
        }
        set(id, controller) {
            this._d.set(id, controller);
        }
        delete(id) {
            return this._d.delete(id);
        }
        clear() {
            this._d.clear();
        }
    }

    // TODO: make polyfill to support more platform
    const _fetch = window.fetch;
    const ContentTypeMap = {
        json: "application/json; charset=utf-8",
        form: "application/x-www-form-urlencoded; charset=utf-8",
        formdata: undefined,
        buffer: "text/plain; charset=utf-8",
        text: "text/plain; charset=utf-8",
        blob: undefined,
    };
    const DEFAULT_AGENT_INIT = {
        timeout: 60000,
    };
    // @ts-ignore
    const DEFAULT_REQ_INIT = {};
    class Agent {
        constructor(base, init) {
            var _a;
            this._abortors = new AbortManager();
            this._interceptors = {
                request: new InterceptorManager(),
                response: new InterceptorManager(),
            };
            this._base = base;
            this._init = Object.assign(Object.assign({}, DEFAULT_AGENT_INIT), init);
            if ((_a = init === null || init === void 0 ? void 0 : init.queue) === null || _a === void 0 ? void 0 : _a.size)
                this._queue = new Queue(init === null || init === void 0 ? void 0 : init.queue.size);
        }
        get init() {
            return this._init;
        }
        get base() {
            return this._base;
        }
        get queue() {
            return this._queue;
        }
        get interceptors() {
            return this._interceptors;
        }
        abort(id, reason) {
            this._abortors.abort(id, reason);
        }
        request(reqInit) {
            if (this._queue)
                return this._queue.run(() => this._request(reqInit));
            return this._request(reqInit);
        }
        _request(reqInit) {
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
            var _a;
            let url = path_join(this._base || (reqInit === null || reqInit === void 0 ? void 0 : reqInit.base), reqInit.input);
            // If the method is GET, we should merge the data of reqInit and url search
            if (((_a = reqInit === null || reqInit === void 0 ? void 0 : reqInit.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "GET" /* GET */ && (reqInit === null || reqInit === void 0 ? void 0 : reqInit.data)) {
                const qIndex = url.indexOf("?");
                const path = qIndex < 0 ? url : url.slice(0, url.indexOf("?"));
                const search = qIndex < 0
                    ? resolve_search_params("", reqInit === null || reqInit === void 0 ? void 0 : reqInit.data)
                    : resolve_search_params(url.slice(url.indexOf("?")), reqInit === null || reqInit === void 0 ? void 0 : reqInit.data);
                url = path + (search ? `?${search}` : "");
            }
            // update url after resolved
            reqInit.url = url;
        }
        resolveReqInit(reqInit) {
            const resolvedReqInit = Object.assign(Object.assign(Object.assign({}, DEFAULT_REQ_INIT), this._init), reqInit);
            // set default method equals GET if none
            // then transform to upper case
            if (!resolvedReqInit.method)
                resolvedReqInit.method = "GET" /* GET */;
            resolvedReqInit.method = resolvedReqInit.method.toUpperCase();
            // handle content-type header according to the contentType
            // if no contentType, will ignore
            // else handle the responsible content type according to the ContentTypeMap
            const reqContentType = (resolvedReqInit === null || resolvedReqInit === void 0 ? void 0 : resolvedReqInit.contentType) &&
                ContentTypeMap[resolvedReqInit === null || resolvedReqInit === void 0 ? void 0 : resolvedReqInit.contentType];
            const h = Object.assign({}, (reqContentType ? { "Content-Type": reqContentType } : null));
            resolvedReqInit.headers = Object.assign(Object.assign(Object.assign({}, DEFAULT_REQ_INIT.headers), h), resolvedReqInit.headers);
            // if init includes body, will use it directly
            // else handle the responsible body
            resolvedReqInit.body = resolvedReqInit.method === "GET" /* GET */ || resolvedReqInit.method === "HEAD" /* HEAD */
                ? undefined
                : resolvedReqInit.body !== undefined && resolvedReqInit.body !== null
                    ? resolvedReqInit.body
                    : new BodyParser(resolvedReqInit === null || resolvedReqInit === void 0 ? void 0 : resolvedReqInit.contentType).marshal(resolvedReqInit.data);
            return resolvedReqInit;
        }
        resolveTimeoutAutoAbort(reqInit) {
            const { timeout } = reqInit;
            // if no timeout or timeout equals 0, will return directly
            if (!timeout)
                return;
            // if the request init includes signal, the abort event will control by the outside
            // we do not need to do the auto abort any more.
            if (reqInit.signal)
                return;
            const controller = new AbortController();
            if (!reqInit.signal)
                reqInit.signal = controller.signal;
            this._abortors.set(this._getAbortId(reqInit), controller);
            const timer = setTimeout(() => {
                controller.abort("Timeout of exceeded");
                this._abortors.delete(this._getAbortId(reqInit));
                clearTimeout(timer);
            }, timeout);
        }
        _getAbortId(reqInit) {
            var _a, _b, _c;
            return (_a = reqInit.abortId) !== null && _a !== void 0 ? _a : ((_b = reqInit.method) !== null && _b !== void 0 ? _b : '') + ((_c = reqInit.url) !== null && _c !== void 0 ? _c : '');
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
                let chain = [this.dispatchFetch.bind(this), undefined];
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
            let __res__;
            const url = reqInit.url || reqInit.input;
            // Actually this wil be never reached!
            // if reached, must be an unexcepted error
            if (!url) {
                return Promise.reject(new Error("Agent: unexpected error, url must have a value and be a string, but null!"));
            }
            return _fetch(url, reqInit)
                .then((res) => {
                __res__ = res;
                const responseType = (reqInit === null || reqInit === void 0 ? void 0 : reqInit.responseType) || get_response_type(res);
                if (!responseType)
                    throw new Error("Agent: except a response type but null");
                if (responseType === "json" /* JSON */)
                    return res.json();
                if (responseType === "buffer" /* BUFFER */)
                    return res.arrayBuffer();
                if (responseType === "text" /* TEXT */)
                    return res.text();
                if (responseType === "blob" /* BLOB */)
                    return res.blob();
                if (responseType === "form" /* FORM */ || responseType === "formdata" /* FORMDATA */)
                    return res.formData();
                return res.json();
            })
                .then((data) => {
                return this.decorateResponse(reqInit, __res__, data);
            })
                .finally(() => {
                this._abortors.delete(this._getAbortId(reqInit));
            });
        }
        decorateResponse(init, res, data) {
            return {
                url: res.url,
                data: data,
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
    const get_response_type = (res) => {
        const contentType = res.headers.get("content-type");
        if (!contentType)
            return null;
        if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("application/json"))
            return "json" /* JSON */;
        if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("text/plain"))
            return "text" /* TEXT */;
        if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("text/html"))
            return "text" /* TEXT */;
        if (contentType === null || contentType === void 0 ? void 0 : contentType.includes("application/xml"))
            return "text" /* TEXT */;
        return undefined;
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
        const b = new BodyParser("form" /* FORM */).marshal(data);
        const q2 = new URLSearchParams("?" + b);
        q2.forEach((value, key) => {
            if (value !== undefined && value !== null)
                q.append(key, value);
        });
        return q2.toString();
    }

    exports["default"] = Agent;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
