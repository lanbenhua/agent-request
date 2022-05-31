import { PromiseTaskRunner } from "./agent";

export type QueueTaskPriority =
  | number
  | 'HIGHEST'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'LOWEST';

export interface QueueOptions {
  auto?: boolean;
}

export interface QueueTask<T> {
  runner: PromiseTaskRunner<T>;
  priority?: QueueTaskPriority | null;
}

export interface QueueItem<T> extends QueueTask<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: any) => void;
}
