import { QueueTaskPriority } from './type';
declare class Priority {
    private _priority?;
    constructor(priority?: QueueTaskPriority | null);
    num(): number;
}
export default Priority;
