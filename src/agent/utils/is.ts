// eslint-disable-next-line
function isNil(obj: any): boolean {
  return obj === null || obj === undefined;
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

export {
  isNil,
  isObject,
  isPlainObject
}