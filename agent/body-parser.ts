import { stringify } from "./utils/json";
import { ContentType, SupportedContentType } from "./agent";

class BodyParser {
  private _contentType?: ContentType | SupportedContentType;

  constructor(contentType?: ContentType | SupportedContentType) {
    this._contentType = contentType;
  }

  public marshal(body: unknown): BodyInit | null | undefined {
    if (body === "" || body === null || body === undefined) return body;

    if (body instanceof FormData) return body;
    if (body instanceof Blob) return body;
    if (body instanceof ArrayBuffer) return body;
    if (body instanceof URLSearchParams) return body;

    if (this._contentType === ContentType.JSON && typeof body !== "string") {
      return stringify(body);
    }

    if (this._contentType === ContentType.FORM && isPlainObject(body)) {
      return Object.entries(body as Record<string, unknown>)
        .reduce((o, [key, value]) => {
          if (isNil(value)) return o;
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (!isNil(v)) o.append(key, searchParamsStringify(v));
            });
            return o;
          }
          o.append(key, searchParamsStringify(value));
          return o;
        }, new URLSearchParams())
        .toString();
    }

    return body as BodyInit | null | undefined;
  }
}

function isNil(obj: unknown): boolean {
  return obj === null || obj === undefined;
}

function searchParamsStringify(obj: unknown): string {
  if (isNil(obj)) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "boolean") return String(obj);

  return stringify(obj);
}

/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

// eslint-disable-next-line
function isObject(o: any): boolean {
  return Object.prototype.toString.call(o) === "[object Object]";
}

// eslint-disable-next-line
function isPlainObject(o: any): boolean {
  if (!isObject(o)) return false;

  // If has modified constructor
  if (o.constructor === undefined) return true;

  // If has modified prototype
  if (!isObject(o.constructor.prototype)) return false;

  // If constructor does not have an Object-specific method
  if (!o.constructor.prototype.hasOwnProperty("isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

export { isObject, isPlainObject };

export default BodyParser;
