export type Runner<T> = () => Promise<T>;
export type Kill = () => boolean;
export type QueueTaskPriority =
  | number
  | 'HIGHEST'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'LOWEST';
export type QueueTask<T> = {
  runner: Runner<T>;
  priority?: QueueTaskPriority | null;
};
export type QueueItem<T> = QueueTask<T> & {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: any) => void;
};
export type QueueOptions = {
  auto?: boolean;
};
export interface QueuePromise<T> extends Promise<T> {
  cancel?: () => void;
}
