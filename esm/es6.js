const t=(t,e,n)=>{try{return JSON.stringify(t,e,n)}catch(t){return""}};class e{constructor(t){this._contentType=t}marshal(e){return""===e||null==e||e instanceof FormData||e instanceof Blob||e instanceof ArrayBuffer||e instanceof URLSearchParams?e:"json"===this._contentType&&"string"!=typeof e?t(e):"form"===this._contentType&&function(t){if(!o(t))return!1;if(void 0===t.constructor)return!0;if(!o(t.constructor.prototype))return!1;if(!t.constructor.prototype.hasOwnProperty("isPrototypeOf"))return!1;return!0}(e)?Object.entries(e).reduce(((t,[e,o])=>n(o)?t:Array.isArray(o)?(o.forEach((o=>{n(o)||t.append(e,r(o))})),t):(t.append(e,r(o)),t)),new URLSearchParams).toString():e}}function n(t){return null==t}function r(e){return n(e)?"":"string"==typeof e?e:"number"==typeof e||"boolean"==typeof e?String(e):t(e)}
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */function o(t){return"[object Object]"===Object.prototype.toString.call(t)}class s{constructor(){this.handlers=[],this.handlers=[]}use(t,e,n){return this.handlers=this.handlers.concat({onFulfilled:t,onRejected:e,synchronous:!!n&&n.synchronous,runWhen:n?n.runWhen:null}),this.handlers.length-1}reject(t){this.handlers[t]&&(this.handlers[t]=null)}forEach(t){this.handlers.forEach(((e,n)=>{null!==e&&t(e,n)}))}}const i=window.fetch,l={json:"application/json; charset=utf-8",form:"application/x-www-form-urlencoded; charset=utf-8",formdata:void 0,buffer:"text/plain; charset=utf-8",text:"text/plain; charset=utf-8",blob:void 0};class a{constructor(t,e){this._dafaultInit={timeout:2e4,includeAbort:!0},this._interceptors={request:new s,response:new s},this._base=t,this._init=e}get interceptors(){return this._interceptors}abort(t){var e;null===(e=this._abortController)||void 0===e||e.abort(t)}request(t){this.resolveInput(t);const e=this.resolveReqInit(t);return this.resolveTimeoutAutoAbort(e),this.handleInterceptors(e)}resolveInput(t){var e;let n=u(this._base||(null==t?void 0:t.base),t.input);if("GET"===(null===(e=null==t?void 0:t.method)||void 0===e?void 0:e.toUpperCase())&&(null==t?void 0:t.data)){const e=n.indexOf("?"),r=e<0?n:n.slice(0,n.indexOf("?")),o=h(e<0?"":n.slice(n.indexOf("?")),null==t?void 0:t.data);n=r+(o?`?${o}`:"")}t.url=n}resolveReqInit(t){const n={timeout:2e4,responseType:"json",method:"GET",credentials:"include"},r=Object.assign(Object.assign(Object.assign(Object.assign({},this._dafaultInit),n),this._init),t);r.method||(r.method="GET"),r.method=r.method.toUpperCase(),r.credentials||(r.credentials="include"),r.contentType||"GET"===r.method||(r.contentType="json"),r.responseType||(r.responseType="json");const o=(null==r?void 0:r.contentType)&&l[null==r?void 0:r.contentType],s=Object.assign({},o?{"Content-Type":o}:null);return r.headers=Object.assign(Object.assign(Object.assign({},null==n?void 0:n.headers),s),r.headers),"GET"===r.method||"HEAD"===r.method?r.body=void 0:r.body=null!==r.body&&void 0!==r.body?r.body:new e(null==r?void 0:r.contentType).marshal(r.data),r}resolveTimeoutAutoAbort(t){let e;const n=null==t?void 0:t.timeout;(n||!1!==(null==t?void 0:t.includeAbort)&&(null==t?void 0:t.includeAbort))&&!(null==t?void 0:t.signal)&&(e=new AbortController,this._abortController=e,t.signal=e.signal),n&&e&&(this._timer=setTimeout((()=>{null==e||e.abort()}),n))}clearAutoAbortTimeout(){this._timer&&(window.clearTimeout(this._timer),this._timer=null)}handleInterceptors(t){const e=[];let n=!0;this._interceptors.request.forEach((r=>{const{runWhen:o,onFulfilled:s,onRejected:i}=r;"function"==typeof o&&!1===o(t)||(n=n&&r.synchronous,e.unshift(s,i))}));const r=[];let o;if(this._interceptors.response.forEach((t=>r.unshift(t.onFulfilled,t.onRejected))),!n){let n=[this.dispatchFetch.bind(this),void 0];for(Array.prototype.unshift.apply(n,e),n=n.concat(r),o=Promise.resolve(t);n.length;){const t=n.shift(),e=n.shift();t&&(o=o.then(t,e))}return o}let s=t;for(;e.length;){const t=e.shift(),n=e.shift();try{t&&(s=t(s))}catch(t){n&&n(t);break}}let i=this.dispatchFetch(t);for(;r.length;){const t=r.shift(),e=r.shift();t&&(i=i.then(t,e))}return i}dispatchFetch(t){const e=this;let n;const r=t.url||t.input;return r?i(r,t).then((e=>{n=e;const r=(null==t?void 0:t.responseType)||c(e);return"json"===r?e.json():"buffer"===r?e.arrayBuffer():"text"===r?e.text():"blob"===r?e.blob():"form"===r||"formdata"===r?e.formData():e.json()})).then((r=>({url:n.url,data:r,ok:n.ok,status:n.status,statusText:n.statusText,headers:n.headers,__reqInit__:t,__fetch__:e,__response__:n}))).catch((t=>{throw e.clearAutoAbortTimeout(),t})):Promise.reject(new Error("Unexpected error: url must have a value and be a string, but null!"))}}const c=t=>{const e=t.headers.get("content-type");return e?e.includes("application/json")?"json":e.includes("text/plain")||e.includes("text/html")||e.includes("application/xml")?"text":"json":"text"},u=(...t)=>{const e=/^(https?|file|wss?):\/\//;return t.filter(Boolean).map(String).reduce(((t,n)=>new RegExp(e).test(n)?n:t+"/"+n)).replace(new RegExp(/(?<!(https?|file|wss?):)\/\/+/,"gm"),"/")};function h(t,n){const r=new URLSearchParams(t),o=new e("form").marshal(n),s=new URLSearchParams("?"+o);return s.forEach(((t,e)=>{null!=t&&r.append(e,t)})),s.toString()}export{a as default};