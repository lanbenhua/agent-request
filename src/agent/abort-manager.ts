class AbortManager {
  private _d = new Map<string, AbortController | null>();

  constructor() {}

  public signal(id: string): AbortSignal | undefined {
    return this._d.get(id)?.signal
  }

  public isAborted(id: string): boolean {
    return this.signal(id)?.aborted ?? true
  }

  public abort(id: string, reason?: string) {
    if (this.isAborted(id)) return;
    const controller = this._d.get(id);
    if (controller) controller.abort(reason);
  }

  public set(id: string, controller: AbortController) {
    this._d.set(id, controller);
  }

  public delete(id: string): boolean {
    return this._d.delete(id);
  }

  public clear() {
    this._d.clear()
  }
}

export default AbortManager;