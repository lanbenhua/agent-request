import { stringify } from './utils/json';
import { isNil, isPlainObject } from './utils/is';
import { ContentType, SupportedContentType } from './type';

class BodyParser {
  private _contentType?: ContentType | SupportedContentType;

  constructor(contentType?: ContentType | SupportedContentType) {
    this._contentType = contentType;
  }

  // eslint-disable-next-line
  public marshal(body: any): BodyInit | null | undefined {
    const { _contentType } = this;

    if (_contentType === ContentType.FORMDATA) return formdataencode(body);

    if (_contentType === ContentType.JSON)
      return typeof body === 'string' ? body : stringify(body);

    if (_contentType === ContentType.FORM) return formurlencode(body);

    if (_contentType === ContentType.BLOB) {
      if (!(body instanceof Blob))
        throw new Error('BodyParser: must be a blob when content type is blob');
      return body;
    }

    if (_contentType === ContentType.BUFFER) {
      if (!(body instanceof ArrayBuffer))
        throw new Error(
          'BodyParser: must be a arraybuffer when content type is arraybuffer'
        );
      return body;
    }

    if (_contentType === ContentType.TEXT)
      return typeof body === 'string' ? body : stringify(body);

    return body;
  }
}

// eslint-disable-next-line
function formdataencode(obj: any): FormData {
  if (obj instanceof FormData) return obj;

  const formdata = new FormData();

  if (isPlainObject(obj))
    // eslint-disable-next-line @typescript-eslint/ban-types
    Object.entries(obj as {}).forEach(([key, value]) => {
      if (isNil(value)) return;
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (!isNil(v)) formdata.append(key, searchParamsStringify(v));
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

// eslint-disable-next-line @typescript-eslint/ban-types
function marshalObj(obj: {}): string {
  return Object.entries(obj)
    .reduce((o, [key, value]) => {
      if (isNil(value)) return o;
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (!isNil(v)) o.append(key, searchParamsStringify(v));
        });
        return o;
      }
      o.append(key, searchParamsStringify(value));
      return o;
    }, new URLSearchParams())
    .toString();
}

// eslint-disable-next-line
function formurlencode(obj: any): string {
  if (typeof obj === 'string') return obj;
  if (obj instanceof URLSearchParams) return obj.toString();
  if (isPlainObject(obj)) return marshalObj(obj);

  if (obj instanceof FormData) {
    // eslint-disable-next-line
    const draftObj: Record<string, any> = {};
    obj.forEach((value, key) => {
      draftObj[key] = value;
    });
    return marshalObj(draftObj);
  }

  return '';
}
// eslint-disable-next-line
function searchParamsStringify(obj: any): string {
  if (isNil(obj)) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'boolean') return String(obj);

  return stringify(obj);
}

export default BodyParser;
