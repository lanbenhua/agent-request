export default function unfetch(url: string, options?: {
    method?: string;
    headers?: HeadersInit | Record<string, string>;
    credentials?: RequestCredentials | "include" | "omit" | "same-origin";
    body?: XMLHttpRequestBodyInit;
}): Promise<any>;
