export type PollingCancel = () => void;

export interface PollingInit<T> {
  interval: number;
  pollingOn?: (
    error?: Error | null,
    response?: T | null
  ) => boolean | Promise<boolean>;
};
