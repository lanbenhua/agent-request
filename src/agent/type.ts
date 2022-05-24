import Agent from "./agent";
import { QueueTaskPriority } from "./queue";
import { RetryInit } from "./retry/type";

export type SupportedContentType =
  | 'json'
  | 'form'
  | 'text'
  | 'buffer'
  | 'blob'
  | 'formdata';

export const enum ContentType {
  JSON = 'json',
  FORM = 'form',
  FORMDATA = 'formdata',
  TEXT = 'text',
  BUFFER = 'buffer',
  BLOB = 'blob',
}

export const enum Method {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export interface CancelablePromise<T> extends Promise<T> {
  cancel?: (reason?: any) => void;
}

export interface AgentRetryInit<T, U> {
  maxTimes?: number;
  delay?:
    | number
    | ((
        attempt: number,
        error: Error | null | undefined,
        response: AgentResponse<T, U> | null | undefined
      ) => number);
  retryOn?:
    | number[]
    | ((
        attempt: number,
        error: Error | null | undefined,
        response: AgentResponse<T, U> | null | undefined
      ) => boolean | Promise<boolean>);
};

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export type AgentInit<T, U> = {
  base?: string;
  timeout?: number;
  queue?: {
    concurrency?: number;
    defaultName?: string;
    concurrencies?: Record<string, number>;
  };
  retry?: AgentRetryInit<T, U>;
};

export type AgentReqInit<T, U> = RequestInit & {
  input: string;
  url?: string;
  base?: string;
  data?: U;
  timeout?: number;
  abortController?: AbortController;
  queue?: {
    name?: string;
    priority?: number | QueueTaskPriority;
  };
  retry?: AgentRetryInit<T, U>;
  contentType?: ContentType | SupportedContentType;
  responseType?: ContentType | SupportedContentType;
};

export interface AgentResponse<T, U> {
  url: string;
  data: T | undefined;
  ok: boolean;
  status: number;
  statusText: string;
  headers: Response['headers'];
  __init__: AgentReqInit<T, U> | undefined;
  __agent__: Agent;
  __response__: Response;
}
