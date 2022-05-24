export type QueueRunner<T> = () => Promise<T>;

export type QueueTaskPriority =
  | number
  | 'HIGHEST'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'LOWEST';

export type QueueOptions = {
  auto?: boolean;
};
  
export interface QueueTask<T> {
  runner: QueueRunner<T>;
  priority?: QueueTaskPriority | null;
};

export interface QueueItem<T> extends QueueTask<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: any) => void;
};