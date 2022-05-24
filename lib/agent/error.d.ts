import { CustomError } from './queue';
declare class TimeoutError extends CustomError {
    type: string;
    constructor(message?: string, name?: string);
}
export { TimeoutError };
