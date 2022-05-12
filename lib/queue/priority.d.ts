import { QueueTaskPriority } from './type';
declare class Priority {
    _priority?: QueueTaskPriority | null;
    constructor(priority?: QueueTaskPriority | null);
    num(): number;
}
export default Priority;
