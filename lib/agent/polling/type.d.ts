export declare type PollingRunner<T> = () => Promise<T | undefined>;
export declare type PollingCancel = () => void;
export interface PollingInit<T> {
    interval: number;
    pollingOn?: (error?: Error | null, response?: T | null) => boolean | Promise<boolean>;
}
