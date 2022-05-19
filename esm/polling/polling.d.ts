import { PollingInit, PollingRunner, PollingCancel } from './type';
declare class Polling<T = unknown> {
    private _init;
    constructor(init: PollingInit<T>);
    getInit(): PollingInit<T>;
    polling(runner: PollingRunner<T>): PollingCancel;
    private _run;
}
export default Polling;
