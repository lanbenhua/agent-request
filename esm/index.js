var t=setTimeout;function e(t){return Boolean(t&&void 0!==t.length)}function r(){}function n(t){if(!(this instanceof n))throw new TypeError("Promises must be constructed via new");if("function"!=typeof t)throw new TypeError("not a function");this._state=0,this._handled=!1,this._value=void 0,this._deferreds=[],c(t,this)}function o(t,e){for(;3===t._state;)t=t._value;0!==t._state?(t._handled=!0,n._immediateFn((function(){var r=1===t._state?e.onFulfilled:e.onRejected;if(null!==r){var n;try{n=r(t._value)}catch(t){return void u(e.promise,t)}i(e.promise,n)}else(1===t._state?i:u)(e.promise,t._value)}))):t._deferreds.push(e)}function i(t,e){try{if(e===t)throw new TypeError("A promise cannot be resolved with itself.");if(e&&("object"==typeof e||"function"==typeof e)){var r=e.then;if(e instanceof n)return t._state=3,t._value=e,void s(t);if("function"==typeof r)return void c((o=r,i=e,function(){o.apply(i,arguments)}),t)}t._state=1,t._value=e,s(t)}catch(e){u(t,e)}var o,i}function u(t,e){t._state=2,t._value=e,s(t)}function s(t){2===t._state&&0===t._deferreds.length&&n._immediateFn((function(){t._handled||n._unhandledRejectionFn(t._value)}));for(var e=0,r=t._deferreds.length;e<r;e++)o(t,t._deferreds[e]);t._deferreds=null}function a(t,e,r){this.onFulfilled="function"==typeof t?t:null,this.onRejected="function"==typeof e?e:null,this.promise=r}function c(t,e){var r=!1;try{t((function(t){r||(r=!0,i(e,t))}),(function(t){r||(r=!0,u(e,t))}))}catch(t){if(r)return;r=!0,u(e,t)}}n.prototype.catch=function(t){return this.then(null,t)},n.prototype.then=function(t,e){var n=new this.constructor(r);return o(this,new a(t,e,n)),n},n.prototype.finally=function(t){var e=this.constructor;return this.then((function(r){return e.resolve(t()).then((function(){return r}))}),(function(r){return e.resolve(t()).then((function(){return e.reject(r)}))}))},n.all=function(t){return new n((function(r,n){if(!e(t))return n(new TypeError("Promise.all accepts an array"));var o=Array.prototype.slice.call(t);if(0===o.length)return r([]);var i=o.length;function u(t,e){try{if(e&&("object"==typeof e||"function"==typeof e)){var s=e.then;if("function"==typeof s)return void s.call(e,(function(e){u(t,e)}),n)}o[t]=e,0==--i&&r(o)}catch(t){n(t)}}for(var s=0;s<o.length;s++)u(s,o[s])}))},n.allSettled=function(t){return new this((function(e,r){if(!t||void 0===t.length)return r(new TypeError(typeof t+" "+t+" is not iterable(cannot read property Symbol(Symbol.iterator))"));var n=Array.prototype.slice.call(t);if(0===n.length)return e([]);var o=n.length;function i(t,r){if(r&&("object"==typeof r||"function"==typeof r)){var u=r.then;if("function"==typeof u)return void u.call(r,(function(e){i(t,e)}),(function(r){n[t]={status:"rejected",reason:r},0==--o&&e(n)}))}n[t]={status:"fulfilled",value:r},0==--o&&e(n)}for(var u=0;u<n.length;u++)i(u,n[u])}))},n.resolve=function(t){return t&&"object"==typeof t&&t.constructor===n?t:new n((function(e){e(t)}))},n.reject=function(t){return new n((function(e,r){r(t)}))},n.race=function(t){return new n((function(r,o){if(!e(t))return o(new TypeError("Promise.race accepts an array"));for(var i=0,u=t.length;i<u;i++)n.resolve(t[i]).then(r,o)}))},n._immediateFn="function"==typeof setImmediate&&function(t){setImmediate(t)}||function(e){t(e,0)},n._unhandledRejectionFn=function(t){"undefined"!=typeof console&&console&&console.warn("Possible Unhandled Promise Rejection:",t)};var h="undefined"!=typeof globalThis&&globalThis||"undefined"!=typeof self&&self||void 0!==h&&h,f="URLSearchParams"in h,l="Symbol"in h&&"iterator"in Symbol,p="FileReader"in h&&"Blob"in h&&function(){try{return new Blob,!0}catch(t){return!1}}(),d="FormData"in h,y="ArrayBuffer"in h;if(y)var _=["[object Int8Array]","[object Uint8Array]","[object Uint8ClampedArray]","[object Int16Array]","[object Uint16Array]","[object Int32Array]","[object Uint32Array]","[object Float32Array]","[object Float64Array]"],v=ArrayBuffer.isView||function(t){return t&&_.indexOf(Object.prototype.toString.call(t))>-1};function b(t){if("string"!=typeof t&&(t=String(t)),/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(t)||""===t)throw new TypeError('Invalid character in header field name: "'+t+'"');return t.toLowerCase()}function m(t){return"string"!=typeof t&&(t=String(t)),t}function w(t){var e={next:function(){var e=t.shift();return{done:void 0===e,value:e}}};return l&&(e[Symbol.iterator]=function(){return e}),e}function g(t){this.map={},t instanceof g?t.forEach((function(t,e){this.append(e,t)}),this):Array.isArray(t)?t.forEach((function(t){this.append(t[0],t[1])}),this):t&&Object.getOwnPropertyNames(t).forEach((function(e){this.append(e,t[e])}),this)}function E(t){if(t.bodyUsed)return Promise.reject(new TypeError("Already read"));t.bodyUsed=!0}function T(t){return new Promise((function(e,r){t.onload=function(){e(t.result)},t.onerror=function(){r(t.error)}}))}function A(t){var e=new FileReader,r=T(e);return e.readAsArrayBuffer(t),r}function j(t){if(t.slice)return t.slice(0);var e=new Uint8Array(t.byteLength);return e.set(new Uint8Array(t)),e.buffer}function O(){return this.bodyUsed=!1,this._initBody=function(t){var e;this.bodyUsed=this.bodyUsed,this._bodyInit=t,t?"string"==typeof t?this._bodyText=t:p&&Blob.prototype.isPrototypeOf(t)?this._bodyBlob=t:d&&FormData.prototype.isPrototypeOf(t)?this._bodyFormData=t:f&&URLSearchParams.prototype.isPrototypeOf(t)?this._bodyText=t.toString():y&&p&&((e=t)&&DataView.prototype.isPrototypeOf(e))?(this._bodyArrayBuffer=j(t.buffer),this._bodyInit=new Blob([this._bodyArrayBuffer])):y&&(ArrayBuffer.prototype.isPrototypeOf(t)||v(t))?this._bodyArrayBuffer=j(t):this._bodyText=t=Object.prototype.toString.call(t):this._bodyText="",this.headers.get("content-type")||("string"==typeof t?this.headers.set("content-type","text/plain;charset=UTF-8"):this._bodyBlob&&this._bodyBlob.type?this.headers.set("content-type",this._bodyBlob.type):f&&URLSearchParams.prototype.isPrototypeOf(t)&&this.headers.set("content-type","application/x-www-form-urlencoded;charset=UTF-8"))},p&&(this.blob=function(){var t=E(this);if(t)return t;if(this._bodyBlob)return Promise.resolve(this._bodyBlob);if(this._bodyArrayBuffer)return Promise.resolve(new Blob([this._bodyArrayBuffer]));if(this._bodyFormData)throw new Error("could not read FormData body as blob");return Promise.resolve(new Blob([this._bodyText]))},this.arrayBuffer=function(){if(this._bodyArrayBuffer){var t=E(this);return t||(ArrayBuffer.isView(this._bodyArrayBuffer)?Promise.resolve(this._bodyArrayBuffer.buffer.slice(this._bodyArrayBuffer.byteOffset,this._bodyArrayBuffer.byteOffset+this._bodyArrayBuffer.byteLength)):Promise.resolve(this._bodyArrayBuffer))}return this.blob().then(A)}),this.text=function(){var t,e,r,n=E(this);if(n)return n;if(this._bodyBlob)return t=this._bodyBlob,e=new FileReader,r=T(e),e.readAsText(t),r;if(this._bodyArrayBuffer)return Promise.resolve(function(t){for(var e=new Uint8Array(t),r=new Array(e.length),n=0;n<e.length;n++)r[n]=String.fromCharCode(e[n]);return r.join("")}(this._bodyArrayBuffer));if(this._bodyFormData)throw new Error("could not read FormData body as text");return Promise.resolve(this._bodyText)},d&&(this.formData=function(){return this.text().then(x)}),this.json=function(){return this.text().then(JSON.parse)},this}g.prototype.append=function(t,e){t=b(t),e=m(e);var r=this.map[t];this.map[t]=r?r+", "+e:e},g.prototype.delete=function(t){delete this.map[b(t)]},g.prototype.get=function(t){return t=b(t),this.has(t)?this.map[t]:null},g.prototype.has=function(t){return this.map.hasOwnProperty(b(t))},g.prototype.set=function(t,e){this.map[b(t)]=m(e)},g.prototype.forEach=function(t,e){for(var r in this.map)this.map.hasOwnProperty(r)&&t.call(e,this.map[r],r,this)},g.prototype.keys=function(){var t=[];return this.forEach((function(e,r){t.push(r)})),w(t)},g.prototype.values=function(){var t=[];return this.forEach((function(e){t.push(e)})),w(t)},g.prototype.entries=function(){var t=[];return this.forEach((function(e,r){t.push([r,e])})),w(t)},l&&(g.prototype[Symbol.iterator]=g.prototype.entries);var P=["DELETE","GET","HEAD","OPTIONS","POST","PUT"];function q(t,e){if(!(this instanceof q))throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.');var r,n,o=(e=e||{}).body;if(t instanceof q){if(t.bodyUsed)throw new TypeError("Already read");this.url=t.url,this.credentials=t.credentials,e.headers||(this.headers=new g(t.headers)),this.method=t.method,this.mode=t.mode,this.signal=t.signal,o||null==t._bodyInit||(o=t._bodyInit,t.bodyUsed=!0)}else this.url=String(t);if(this.credentials=e.credentials||this.credentials||"same-origin",!e.headers&&this.headers||(this.headers=new g(e.headers)),this.method=(r=e.method||this.method||"GET",n=r.toUpperCase(),P.indexOf(n)>-1?n:r),this.mode=e.mode||this.mode||null,this.signal=e.signal||this.signal,this.referrer=null,("GET"===this.method||"HEAD"===this.method)&&o)throw new TypeError("Body not allowed for GET or HEAD requests");if(this._initBody(o),!("GET"!==this.method&&"HEAD"!==this.method||"no-store"!==e.cache&&"no-cache"!==e.cache)){var i=/([?&])_=[^&]*/;if(i.test(this.url))this.url=this.url.replace(i,"$1_="+(new Date).getTime());else{this.url+=(/\?/.test(this.url)?"&":"?")+"_="+(new Date).getTime()}}}function x(t){var e=new FormData;return t.trim().split("&").forEach((function(t){if(t){var r=t.split("="),n=r.shift().replace(/\+/g," "),o=r.join("=").replace(/\+/g," ");e.append(decodeURIComponent(n),decodeURIComponent(o))}})),e}function R(t,e){if(!(this instanceof R))throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.');e||(e={}),this.type="default",this.status=void 0===e.status?200:e.status,this.ok=this.status>=200&&this.status<300,this.statusText=void 0===e.statusText?"":""+e.statusText,this.headers=new g(e.headers),this.url=e.url||"",this._initBody(t)}q.prototype.clone=function(){return new q(this,{body:this._bodyInit})},O.call(q.prototype),O.call(R.prototype),R.prototype.clone=function(){return new R(this._bodyInit,{status:this.status,statusText:this.statusText,headers:new g(this.headers),url:this.url})},R.error=function(){var t=new R(null,{status:0,statusText:""});return t.type="error",t};var I=[301,302,303,307,308];R.redirect=function(t,e){if(-1===I.indexOf(e))throw new RangeError("Invalid status code");return new R(null,{status:e,headers:{location:t}})};var B=h.DOMException;try{new B}catch(t){(B=function(t,e){this.message=t,this.name=e;var r=Error(t);this.stack=r.stack}).prototype=Object.create(Error.prototype),B.prototype.constructor=B}function S(t,e){return new Promise((function(r,n){var o=new q(t,e);if(o.signal&&o.signal.aborted)return n(new B("Aborted","AbortError"));var i=new XMLHttpRequest;function u(){i.abort()}i.onload=function(){var t,e,n={status:i.status,statusText:i.statusText,headers:(t=i.getAllResponseHeaders()||"",e=new g,t.replace(/\r?\n[\t ]+/g," ").split("\r").map((function(t){return 0===t.indexOf("\n")?t.substr(1,t.length):t})).forEach((function(t){var r=t.split(":"),n=r.shift().trim();if(n){var o=r.join(":").trim();e.append(n,o)}})),e)};n.url="responseURL"in i?i.responseURL:n.headers.get("X-Request-URL");var o="response"in i?i.response:i.responseText;setTimeout((function(){r(new R(o,n))}),0)},i.onerror=function(){setTimeout((function(){n(new TypeError("Network request failed"))}),0)},i.ontimeout=function(){setTimeout((function(){n(new TypeError("Network request failed"))}),0)},i.onabort=function(){setTimeout((function(){n(new B("Aborted","AbortError"))}),0)},i.open(o.method,function(t){try{return""===t&&h.location.href?h.location.href:t}catch(e){return t}}(o.url),!0),"include"===o.credentials?i.withCredentials=!0:"omit"===o.credentials&&(i.withCredentials=!1),"responseType"in i&&(p?i.responseType="blob":y&&o.headers.get("Content-Type")&&-1!==o.headers.get("Content-Type").indexOf("application/octet-stream")&&(i.responseType="arraybuffer")),!e||"object"!=typeof e.headers||e.headers instanceof g?o.headers.forEach((function(t,e){i.setRequestHeader(e,t)})):Object.getOwnPropertyNames(e.headers).forEach((function(t){i.setRequestHeader(t,m(e.headers[t]))})),o.signal&&(o.signal.addEventListener("abort",u),i.onreadystatechange=function(){4===i.readyState&&o.signal.removeEventListener("abort",u)}),i.send(void 0===o._bodyInit?null:o._bodyInit)}))}S.polyfill=!0,h.fetch||(h.fetch=S,h.Headers=g,h.Request=q,h.Response=R)
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
***************************************************************************** */;var F=function(t,e){return F=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r])},F(t,e)};function U(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Class extends value "+String(e)+" is not a constructor or null");function r(){this.constructor=t}F(t,e),t.prototype=null===e?Object.create(e):(r.prototype=e.prototype,new r)}var k=function(){return k=Object.assign||function(t){for(var e,r=1,n=arguments.length;r<n;r++)for(var o in e=arguments[r])Object.prototype.hasOwnProperty.call(e,o)&&(t[o]=e[o]);return t},k.apply(this,arguments)},D=function(){function t(){this.handlers=[],this.handlers=[]}return t.prototype.use=function(t,e,r){return this.handlers=this.handlers.concat({onFulfilled:t,onRejected:e,synchronous:!!r&&r.synchronous,runWhen:r?r.runWhen:null}),this.handlers.length-1},t.prototype.reject=function(t){this.handlers[t]&&(this.handlers[t]=null)},t.prototype.forEach=function(t){this.handlers.forEach((function(e,r){null!==e&&t(e,r)}))},t}();var C=function(){function t(t){this._priority=0,this._priority=t||0}return t.prototype.num=function(){var t=this._priority;return null==t?0:"HIGHEST"===t?Number.MAX_SAFE_INTEGER:"HIGH"===t?1e4:"MEDIUM"===t?0:"LOW"===t?-1e4:"LOWEST"===t?Number.MIN_SAFE_INTEGER:t},t}(),L=function(t){function e(e,r,n){var o=t.call(this,e)||this;return o.custom=!0,o.type="CustomError",o.type=r||"CustomError",o.name=n||"CustomError",o.message=e||"Invalid",o}return U(e,t),e.prototype.toString=function(t){return 1===t?"".concat(this.name,": ").concat(this.message):2===t?"".concat(this.message):"[".concat(this.type,"] ").concat(this.name,": ").concat(this.message)},e}(Error),G=function(t){function e(e,r){var n=t.call(this,e,"CancelError",r)||this;return n.type="CancelError",n}return U(e,t),e}(L);function M(t){return t.custom}function H(t){return t.custom&&"CancelError"===t.type}var N={auto:!0},Q=function(){function t(t,e){this._isPaused=!1,this._pending=0,this._concurrency=10,this._queue=[],this._queue=[],this._pending=0,this._options=k(k({},N),e),this._resolve=this._resolve.bind(this),this._reject=this._reject.bind(this),this.reconcurrency(t)}return Object.defineProperty(t.prototype,"size",{get:function(){return this._queue.length},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"concurrency",{get:function(){return this._concurrency},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"options",{get:function(){return this._options},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"pending",{get:function(){return this._pending},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"isPaused",{get:function(){return this._isPaused},enumerable:!1,configurable:!0}),t.prototype.pause=function(){this._isPaused=!0},t.prototype.resume=function(){var t;this._isPaused=!1,(null===(t=this._options)||void 0===t?void 0:t.auto)&&this._check()},t.prototype.reconcurrency=function(t){var e;this._concurrency=t,(null===(e=this._options)||void 0===e?void 0:e.auto)&&this._check()},t.prototype.enqueue=function(t){var e,r=this,n=t.runner,o=new Promise((function(o,i){e=k(k({},t),{runner:n,resolve:o,reject:i}),r._push(e)})).then(this._resolve,this._reject);return o.cancel=function(){r._cancel(e)},o},t.prototype.dequeue=function(){this._check()},t.prototype._check=function(){this._isPaused||this._pending>=this.size||this._queue.length<1||(this._run(),this._check())},t.prototype._cancel=function(t){(0,t.reject)(new G("Canceled","QueueCancelError"))},t.prototype._run=function(){var t=this._queue.shift();if(t){this._pending++;var e=t.runner,r=t.resolve,n=t.reject;e().then(r,n)}},t.prototype._push=function(t){this._queue=this._queue.concat(t).sort((function(t,e){return new C(e.priority).num()-new C(t.priority).num()})),this._check()},t.prototype._pop=function(){if(this._pending--,this._pending<0)throw new Error("Pop called more than there were pending fetches");this._check()},t.prototype._resolve=function(t){return this._pop(),t},t.prototype._reject=function(t){throw this._pop(),t},t}(),W=function(t,e,r){try{return JSON.stringify(t,e,r)}catch(t){return""}};function z(t){return null==t}
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */function V(t){return"[object Object]"===Object.prototype.toString.call(t)}function X(t){return!!V(t)&&(void 0===t.constructor||!!V(t.constructor.prototype)&&!!t.constructor.prototype.hasOwnProperty("isPrototypeOf"))}var J=function(){function t(t){this._contentType=t}return t.prototype.marshal=function(t){var e=this._contentType;if("formdata"===e)return function(t){if(t instanceof FormData)return t;var e=new FormData;X(t)&&Object.entries(t).forEach((function(t){var r=t[0],n=t[1];z(n)||(Array.isArray(n)&&n.forEach((function(t){z(t)||e.append(r,K(t))})),e.append(r,K(n)))}));"string"==typeof t&&new URLSearchParams(t).forEach((function(t,r){e.append(r,t)}));return e}(t);if("json"===e)return"string"==typeof t?t:W(t);if("form"===e)return function(t){if("string"==typeof t)return t;if(t instanceof URLSearchParams)return t.toString();if(X(t))return $(t);if(t instanceof FormData){var e={};return t.forEach((function(t,r){e[r]=t})),$(e)}return""}(t);if("blob"===e){if(!(t instanceof Blob))throw new Error("BodyParser: must be a blob when content type is blob");return t}if("buffer"===e){if(!(t instanceof ArrayBuffer))throw new Error("BodyParser: must be a arraybuffer when content type is arraybuffer");return t}return"text"===e?"string"==typeof t?t:W(t):t},t}();function $(t){return Object.entries(t).reduce((function(t,e){var r=e[0],n=e[1];return z(n)?t:Array.isArray(n)?(n.forEach((function(e){z(e)||t.append(r,K(e))})),t):(t.append(r,K(n)),t)}),new URLSearchParams).toString()}function K(t){return z(t)?"":"string"==typeof t?t:"number"==typeof t||"boolean"==typeof t?String(t):W(t)}var Y=function(t){function e(e,r){var n=t.call(this,e,"TimeoutError",r)||this;return n.type="TimeoutError",n}return U(e,t),e}(L),Z=function(){function t(t,e){if(this.__attempt=0,!t)throw Error("Retry must have a runner, but null");if(!e)throw Error("Retry must have an init, but null");if(z(e.delay)&&z(e.retryOn))throw Error("Retry init must have a delay or retryOn, but noth null");this.__attempt=0,this._runner=t,this._init=e}return Object.defineProperty(t.prototype,"init",{get:function(){return this._init},enumerable:!1,configurable:!0}),t.prototype.start=function(){var t=this,e=this._run();return e.cancel=function(){t._cancel()},e},t.prototype.cancel=function(){this._cancel()},t.prototype._cancel=function(){this.__canceled||(this.__canceled=!0),null!==this.__intervalId&&void 0!==this.__intervalId&&clearTimeout(this.__intervalId)},t.prototype._run=function(){var t=this;if(!this._runner)throw Error("Retry must have a runner, but null");return new Promise((function(e,r){var n;null===(n=t._runner)||void 0===n||n.call(t).then((function(n){return t._check(e,r,void 0,n),n}),(function(n){throw t._check(e,r,n,void 0),n}))}))},t.prototype._retry=function(t,e,r,n){var o=this;if(!this._runner)throw Error("Retry must have a runner, but null");var i=(this._init||{}).delay;this.__attempt++;var u="function"==typeof i?i(this.__attempt,r,n):i;this.__intervalId=setTimeout((function(){var r;null===(r=o._runner)||void 0===r||r.call(o).then((function(r){o._check(t,e,void 0,r)}),(function(r){o._check(t,e,r,void 0)}))}),u)},t.prototype._check=function(t,e,r,n){var o=this,i=this._init||{},u=i.retryOn,s=i.maxTimes;return this.__canceled||null!=s&&s>=this.__attempt?null!=r?e(r):t(null!=n?n:void 0):u?Promise.resolve(u(this.__attempt,r,n)).then((function(i){i?o._retry(t,e,r,n):null!=r?e(r):t(null!=n?n:void 0)}),(function(){null!=r?e(r):t(null!=n?n:void 0)})):(null!=s&&s<this.__attempt&&this._retry(t,e,r,n),null!=r?e(r):t(null!=n?n:void 0))},t}(),tt={json:"application/json; charset=utf-8",form:"application/x-www-form-urlencoded; charset=utf-8",formdata:void 0,buffer:"text/plain; charset=utf-8",text:"text/plain; charset=utf-8",blob:void 0},et={},rt={},nt=function(){function t(t,e){if(this._interceptors={request:new D,response:new D},!t)throw new Error("Fetch must be a function but null");this._fetch=t.bind(null),this._init=k(k({},et),e),this._initQueues(),this._request=this._request.bind(this),this._queueRequest=this._queueRequest.bind(this),this._wrappedFetch=this._wrappedFetch.bind(this),this._handleInterceptors=this._handleInterceptors.bind(this)}return Object.defineProperty(t.prototype,"init",{get:function(){return this._init},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"queueMap",{get:function(){return this._queueMap},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"interceptors",{get:function(){return this._interceptors},enumerable:!1,configurable:!0}),t.prototype.queue=function(t){var e;return null===(e=this._queueMap)||void 0===e?void 0:e.get(t)},t.prototype.request=function(t){var e,r=this;return t.retry?new Z((function(){return r._queueRequest(t)}),k(k({},t.retry),{retryOn:(null===(e=t.retry)||void 0===e?void 0:e.retryOn)?function(e,r,n){var o,i,u,s,a;return Array.isArray(null===(o=t.retry)||void 0===o?void 0:o.retryOn)?!(!n||!(null===(i=t.retry)||void 0===i?void 0:i.retryOn.includes(null==n?void 0:n.status))):null!==(a=null===(s=null===(u=t.retry)||void 0===u?void 0:u.retryOn)||void 0===s?void 0:s.call(u,e,r,n))&&void 0!==a&&a}:void 0})).start():this._queueRequest(t)},t.prototype._initQueues=function(){var t=this;if(this._init&&this._init.queue){var e=this._init.queue,r=e.concurrency,n=e.defaultName,o=e.concurrencies;r&&n&&this._createOrGetQueue(n,r),o&&Object.entries(o).map((function(e){var r=e[0],n=e[1];t._createOrGetQueue(r,n)}))}},t.prototype._createOrGetQueue=function(t,e){void 0===t&&(t="default"),void 0===e&&(e=5),this._queueMap||(this._queueMap=new Map);var r=this.queue(t);if(r)return r;var n=new Q(e);return this._queueMap.set(t,n),n},t.prototype._queueRequest=function(t){var e,r,n,o,i,u,s,a=this;if(this._queueMap){var c=null!==(r=null===(e=t.queue)||void 0===e?void 0:e.name)&&void 0!==r?r:null===(o=null===(n=this._init)||void 0===n?void 0:n.queue)||void 0===o?void 0:o.defaultName,h=null===(u=null===(i=this._init)||void 0===i?void 0:i.queue)||void 0===u?void 0:u.concurrency;return this._createOrGetQueue(c,h).enqueue({runner:function(){return a._request(t)},priority:null===(s=t.queue)||void 0===s?void 0:s.priority})}return this._request(t)},t.prototype._request=function(t){var e=this,r=this._resolveTimeoutAutoAbort(this._resolveReqInit(this._resolveInput(t)));return r.__origin_reqInit=t,this._wrappedFetch(r).catch((function(t){throw e._checkAborter(r),t})).finally((function(){e._clearTimeoutAutoAbort(r),r.__origin_reqInit&&delete r.__origin_reqInit}))},t.prototype._resolveReqInit=function(t){var e,r,n,o,i,u,s,a,c=k(k(k({},rt),t),{base:null!==(e=t.base)&&void 0!==e?e:null===(r=this._init)||void 0===r?void 0:r.base,timeout:null!==(n=t.timeout)&&void 0!==n?n:null===(o=this._init)||void 0===o?void 0:o.timeout});(null===(i=this._init)||void 0===i?void 0:i.retry)&&(c.retry=k(k({},null===(u=this._init)||void 0===u?void 0:u.retry),t.retry)),c.method=(null!==(s=t.method)&&void 0!==s?s:"GET").toUpperCase();var h=(null==t?void 0:t.contentType)&&tt[null==t?void 0:t.contentType];return c.headers=k(k(k({},rt.headers),h?{"content-type":h}:null),t.headers),c.body="GET"===t.method||"HEAD"===t.method?void 0:void 0!==t.body&&null!==t.body?t.body:null!==(a=new J(null==t?void 0:t.contentType).marshal(t.data))&&void 0!==a?a:void 0,c},t.prototype._resolveInput=function(t){var e,r,n,o=it(null!==(e=null==t?void 0:t.base)&&void 0!==e?e:null===(r=this._init)||void 0===r?void 0:r.base,t.input);if("GET"===(null===(n=null==t?void 0:t.method)||void 0===n?void 0:n.toUpperCase())&&(null==t?void 0:t.data)){var i=o.indexOf("?"),u=i<0?o:o.slice(0,o.indexOf("?")),s=ut(i<0?"":o.slice(o.indexOf("?")),null==t?void 0:t.data);o=u+(s?"?".concat(s):"")}return k(k({},t),{url:o})},t.prototype._resolveTimeoutAutoAbort=function(t){var e=k({},t),r=e.timeout;if(!r)return e;if(e.signal)return e;var n=new AbortController;n.signal.onabort=function(){e.__aborter=this,n.signal.onabort=null},e.abortController=n,e.signal=n.signal;var o=setTimeout((function(){n.abort("Timeout of exceeded")}),r);return e.__abortTimer=o,e},t.prototype._handleInterceptors=function(t){var e=[],r=!0;this._interceptors.request.forEach((function(n){var o=n.runWhen,i=n.onFulfilled,u=n.onRejected;"function"==typeof o&&!1===o(t)||(r=r&&n.synchronous,e.unshift(i,u))}));var n,o=[];if(this._interceptors.response.forEach((function(t){return o.unshift(t.onFulfilled,t.onRejected)})),!r){var i=[this._wrappedFetch,void 0];for(Array.prototype.unshift.apply(i,e),i=i.concat(o),n=Promise.resolve(t);i.length;){var u=i.shift(),s=i.shift();u&&(n=n.then(u,s))}return n}for(var a=t;e.length;){u=e.shift(),s=e.shift();try{u&&(a=u(a))}catch(t){s&&s(t);break}}for(var c=this._wrappedFetch(a);o.length;){u=o.shift(),s=o.shift();u&&(c=c.then(u,s))}return c},t.prototype._wrappedFetch=function(t){var e,r=this,n=t.url||t.input;return n?this._fetch(n,t).then((function(n){e=n;var o=r._checkResponseType(n,t.responseType);if("json"===o)return n.json();if("buffer"===o)return n.arrayBuffer();if("text"===o)return n.text();if("blob"===o)return n.blob();if("form"===o||"formdata"===o)return n.formData();throw new Error("Agent: unexcepted response type '".concat(o,"'"))})).then((function(n){return r._decorateResponse(t,e,n)})):Promise.reject(new Error("Agent: unexpected error, url must have a value and be a string, but null!"))},t.prototype._checkAborter=function(t){var e,r=t.__aborter;if(null==r?void 0:r.aborted)throw new Y(null!==(e=r.reason)&&void 0!==e?e:"Timeout of exceeded","TimeoutError")},t.prototype._clearTimeoutAutoAbort=function(t){t.__aborter&&delete t.__aborter,z(t.__abortTimer)||(clearTimeout(t.__abortTimer),delete t.__abortTimer)},t.prototype._checkResponseType=function(t,e){var r=ot(t);if(!e&&!r)throw new Error("Agent: except a response type but null");if(r&&e&&r!==e)throw new Error("Agent: except a '".concat(e,"' response type but '").concat(r,"'"));return e||r},t.prototype._decorateResponse=function(t,e,r){return{data:r,url:e.url,ok:e.ok,status:e.status,statusText:e.statusText,headers:e.headers,__init__:t,__agent__:this,__response__:e}},t}(),ot=function(t){var e=t.headers.get("content-type");if(e)return(null==e?void 0:e.includes("application/json"))?"json":(null==e?void 0:e.includes("text/plain"))||(null==e?void 0:e.includes("text/html"))||(null==e?void 0:e.includes("application/xml"))?"text":void 0},it=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];var r=/(?<!(https?|file|wss?):)\/\/+/,n=/^(https?|file|wss?):\/\//;return t.filter(Boolean).map(String).reduce((function(t,e){return new RegExp(n).test(e)?e:t+"/"+e})).replace(new RegExp(r,"gm"),"/")};function ut(t,e){var r=new URLSearchParams(t),n=new J("form").marshal(e),o=new URLSearchParams("?"+n);return o.forEach((function(t,e){null!=t&&r.append(e,t)})),o.toString()}var st=function(){function t(t,e){if(!t)throw Error("Polling must have a runner, but null");if(!e)throw Error("Polling must have an init, but null");this.__intervalId=void 0,this._init=e,this._runner=t,this._cancel=this._cancel.bind(this)}return Object.defineProperty(t.prototype,"init",{get:function(){return this._init},enumerable:!1,configurable:!0}),t.prototype.polling=function(){var t=this,e=(this._init||{}).interval;return e?(this.__intervalId=setInterval((function(){t._run()}),e),this._run(),function(){return t._cancel()}):function(){}},t.prototype.cancel=function(){this._cancel()},t.prototype._cancel=function(){null!==this.__intervalId&&void 0!==this.__intervalId&&clearInterval(this.__intervalId)},t.prototype._run=function(){var t=this;if(!this._runner)throw Error("Polling must have a runner, but null");return this._runner().then((function(e){return t._check(void 0,e),e}),(function(e){throw t._check(e,void 0),e}))},t.prototype._check=function(t,e){var r=this,n=(this._init||{}).pollingOn;n&&Promise.resolve(n(t,e)).then((function(t){t||r._cancel()}),(function(){r._cancel()}))},t}();export{G as CustomCancelError,L as CustomError,st as Polling,n as Promise,Q as Queue,nt as default,S as fetch,H as isCustomCancelError,M as isCustomError};
