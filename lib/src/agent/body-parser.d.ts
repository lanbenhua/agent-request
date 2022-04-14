import { ContentType, SupportedContentType } from "./agent";
declare class BodyParser {
    private _contentType?;
    constructor(contentType?: ContentType | SupportedContentType);
    marshal(body: unknown): BodyInit | null | undefined;
}
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */
declare function isObject(o: any): boolean;
declare function isPlainObject(o: any): boolean;
export { isObject, isPlainObject };
export default BodyParser;
