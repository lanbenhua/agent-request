export declare const parse: <T = any>(text: string, reviver?: ((this: any, key: string, value: any) => any) | undefined) => T | null;
export declare const stringify: (value: any, replacer?: ((this: any, key: string, value: any) => any) | undefined, space?: string | number | undefined) => string;
