export type QueueRunner<T> = () => Promise<T>;
export type QueueTaskPriority =
  | number
  | 'HIGHEST'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'LOWEST';
export type QueueTask<T> = {
  runner: QueueRunner<T>;
  priority?: QueueTaskPriority | null;
};
export type QueueItem<T> = QueueTask<T> & {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: any) => void;
};
export type QueueOptions = {
  auto?: boolean;
};
