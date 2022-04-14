export declare type Cookie = {
    name: string;
    value?: string;
    expires?: string | number | Date;
    domain?: string;
    path?: string;
    secure?: boolean;
};
export interface CookieProviderInterface {
    getItem: (name: string) => string | null;
    setItem: (cookie: Cookie) => boolean;
    removeItem: (cookie: Cookie) => boolean;
    clearItem: () => void;
    hasItem: (name: string) => boolean;
    names: () => string[];
}
export declare class CookieProvider {
    constructor();
    getItem(name: string): string | null;
    setItem(c: Cookie): boolean;
    removeItem(c: Cookie): boolean;
    clearItem(): void;
    hasItem(name: string): boolean;
    names(): string[];
}
declare const _default: CookieProvider;
export default _default;
