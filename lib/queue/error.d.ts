declare class CustomError extends Error {
    custom: boolean;
    type: string;
    constructor(message?: string, type?: string, name?: string);
    toString(ecode?: number): string;
}
declare class CustomCancelError extends CustomError {
    type: string;
    constructor(message?: string, name?: string);
}
declare function isCustomError(err: CustomError): boolean;
declare function isCustomCancelError(err: CustomError): boolean;
export { CustomError, CustomCancelError, isCustomError, isCustomCancelError, };
