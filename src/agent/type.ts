
export type SupportedContentType =
  | "json"
  | "form"
  | "text"
  | "buffer"
  | "blob"
  | "formdata";

export const enum ContentType {
  JSON = "json",
  FORM = "form",
  FORMDATA = "formdata",
  TEXT = "text",
  BUFFER = "buffer",
  BLOB = "blob",
}

export const enum Method {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}
