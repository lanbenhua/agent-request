import BodyParser from '../body-parser';
import { ContentType, SupportedContentType } from '../types/agent';

export const get_response_type = (res: Response): ContentType | undefined => {
  const contentType = res.headers.get('content-type');

  if (!contentType) return undefined;
  if (contentType?.includes('application/json')) return ContentType.JSON;
  if (contentType?.includes('text/plain')) return ContentType.TEXT;
  if (contentType?.includes('text/html')) return ContentType.TEXT;
  if (contentType?.includes('application/xml')) return ContentType.TEXT;

  return undefined;
};


export const get_content_type = (
  type?: string | ContentType | SupportedContentType
): string | undefined => {
  const ContentTypeMap: Record<string, string | undefined> = {
    json: 'application/json; charset=utf-8',
    form: 'application/x-www-form-urlencoded; charset=utf-8',
    formdata: undefined,
    buffer: 'text/plain; charset=utf-8',
    text: 'text/plain; charset=utf-8',
    blob: undefined,
  };

  return type && ContentTypeMap[type];
};

const lookbehinds = (
  str: string,
  regexp: RegExp,
  cb: (...substr: string[]) => string
) => {
  return str.replace(regexp, cb);
};

export const path_join = (...paths: (string | null | undefined)[]): string => {
  const pre_reg = /^(https?|file|wss?):\/\//;

  // safari do not support lookbehinds syntax
  // we use replace function to instead it
  return lookbehinds(
    paths
      .filter(Boolean)
      .map(String)
      .reduce((pre, path) => {
        if (new RegExp(pre_reg).test(path)) return path;
        return pre + '/' + path;
      }),
    /(https?:|file:|wss?:)?\/\/+/g,
    ($0, $1) => {
      return $1 ? $0 : '/';
    }
  );
};

export const resolve_search_params = (
  search?: string,
  data?: unknown
): string => {
  const q = new URLSearchParams(search);
  const b = new BodyParser(ContentType.FORM).marshal(data);
  const q2 = new URLSearchParams('?' + b);

  q2.forEach((value, key) => {
    if (value !== undefined && value !== null) q.append(key, value);
  });

  return q2.toString();
};

export const getOriginalFetch = () => {
  return self && self.fetch ? self.fetch : global && global.fetch ? global.fetch : typeof window !== 'undefined' ? window.fetch : () => Promise.resolve()
}