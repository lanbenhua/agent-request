declare class AbortManager {
    private _d;
    constructor();
    signal(id: string): AbortSignal | undefined;
    isAborted(id: string): boolean;
    abort(id: string, reason?: string): void;
    set(id: string, controller: AbortController): void;
    delete(id: string): boolean;
    clear(): void;
}
export default AbortManager;
