export declare type SupportedContentType = 'json' | 'form' | 'text' | 'buffer' | 'blob' | 'formdata';
export declare const enum ContentType {
    JSON = "json",
    FORM = "form",
    FORMDATA = "formdata",
    TEXT = "text",
    BUFFER = "buffer",
    BLOB = "blob"
}
export declare const enum Method {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS"
}
export interface CancelablePromise<T> extends Promise<T> {
    cancel?: (reason?: any) => void;
}
