export declare function Headers(headers?: Headers | [string, string][] | Record<string, string>): void;
export declare function Request(input: Request | URL | string, options: any): void;
export declare function Response(bodyInit: any, options: any): void;
export declare namespace Response {
    var error: () => any;
    var redirect: (url: any, status: any) => any;
}
export declare var DOMException: any;
export declare function fetch(input: string | URL, init: RequestInit): Promise<Response>;
export declare namespace fetch {
    var polyfill: boolean;
}
