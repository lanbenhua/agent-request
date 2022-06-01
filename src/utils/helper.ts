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

export const path_join = (...paths: (string | null | undefined)[]): string => {
  const non_pre_reg = /(?<!(https?|file|wss?):)\/\/+/;
  const pre_reg = /^(https?|file|wss?):\/\//;

  return paths
    .filter(Boolean)
    .map(String)
    .reduce((pre, path) => {
      if (new RegExp(pre_reg).test(path)) return path;
      return pre + '/' + path;
    })
    .replace(new RegExp(non_pre_reg, 'gm'), '/');
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
