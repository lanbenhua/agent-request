import { isNil } from '../utils/is';
import { QueueTaskPriority } from './type';

class Priority {
  private _priority?: QueueTaskPriority | null = 0;

  constructor(priority?: QueueTaskPriority | null) {
    this._priority = priority || 0;
  }

  public num(): number {
    const priority = this._priority;
    if (isNil(priority)) return 0;
    if (priority === 'HIGHEST') return Number.MAX_SAFE_INTEGER;
    if (priority === 'HIGH') return 1e4;
    if (priority === 'MEDIUM') return 0;
    if (priority === 'LOW') return -1e4;
    if (priority === 'LOWEST') return Number.MIN_SAFE_INTEGER;

    return priority as number;
  }
}

export default Priority;
