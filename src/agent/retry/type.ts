export type RetryRunner<T> = () => Promise<T>;

export interface RetryInit<T> {
  maxTimes?: number;
  delay?:
    | number
    | ((
        attempt: number,
        error: Error | null | undefined,
        response: T | null | undefined
      ) => number);
  retryOn?: (
    attempt: number,
    error: Error | null | undefined,
    response: T | null | undefined
  ) => boolean | Promise<boolean>;
};
