type Resolver = (value: any) => any;
type Rejecter = (error: any) => any;

export default function unfetch(url: string, options?: {
  method?: string;
  headers?: HeadersInit | Record<string, string>;
  credentials?: RequestCredentials | "include" | "omit" | "same-origin";
  body?: XMLHttpRequestBodyInit;  // Parameters<XMLHttpRequest["send"]>[0];
}) {
	options = options || {};

	return new Promise((resolve: Resolver, reject: Rejecter) => {
		const request: XMLHttpRequest = new XMLHttpRequest();
		const keys: string[] = [];
		const all: [string, string][] = [];
		const headers = {};

		const response = () => ({
			ok: (request.status/100|0) == 2,		// 200-299
			statusText: request.statusText,
			status: request.status,
			url: request.responseURL,
			text: () => Promise.resolve(request.responseText),
			json: () => Promise.resolve(request.responseText).then(JSON.parse),
			blob: () => Promise.resolve(new Blob([request.response])),
			clone: response,
			headers: {
				keys: () => keys,
				entries: () => all,
				get: (n: string) => headers[n.toLowerCase()],
				has: (n: string) => n.toLowerCase() in headers
			}
		});

		request.open(options.method || 'get', url, true);

		request.onload = () => {
			request.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm, (m: string, key: string, value: string): string => {
				keys.push(key = key.toLowerCase());
				all.push([key, value]);
				headers[key] = headers[key] ? `${headers[key]},${value}` : value;

        return m;
			});
			resolve(response());
		};

		request.onerror = reject;

		request.withCredentials = options.credentials=='include';

		for (const i in options.headers) {
			request.setRequestHeader(i, options.headers[i]);
		}

		request.send(options.body || null);
	});
}