declare module 'whatwg-fetch/fetch' {
  export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  export const fetch: Fetch;
}