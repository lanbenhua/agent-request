import { PollingInit, PollingRunner, PollingCancel } from './type';
declare class Polling<T = unknown> {
    private __intervalId?;
    private _init?;
    private _runner?;
    constructor(runner: PollingRunner<T>, init: PollingInit<T>);
    get init(): PollingInit<T> | undefined;
    polling(): PollingCancel;
    cancel(): void;
    private _cancel;
    private _run;
    private _check;
}
export default Polling;
