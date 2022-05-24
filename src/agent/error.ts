class CustomError extends Error {
  public custom: boolean = true;

  public type: string = 'CustomError';

  constructor(message?: string, type?: string, name?: string) {
    super(message);

    this.type = type || 'CustomError';
    this.name = name || 'CustomError';
    this.message = message || 'Invalid';
  }

  public toString(ecode?: number): string {
    if (ecode === 1) return `${this.name}: ${this.message}`;
    if (ecode === 2) return `${this.message}`;
    return `[${this.type}] ${this.name}: ${this.message}`;
  }
}

class CustomCancelError extends CustomError {
  public type = 'CancelError';

  constructor(message?: string, name?: string) {
    super(message, 'CancelError', name);
  }
}

class TimeoutError extends CustomError {
  public type = 'TimeoutError';

  constructor(message?: string, name?: string) {
    super(message, 'TimeoutError', name);
  }
}

function isCustomError(err: CustomError): boolean {
  return err.custom;
}
function isCustomCancelError(err: CustomError): boolean {
  return err.custom && err.type === 'CancelError';
}
function isCustomTimeoutError(err: CustomError): boolean {
  return err.custom && err.type === 'TimeoutError';
}

export { CustomError, CustomCancelError, TimeoutError, isCustomError, isCustomCancelError, isCustomTimeoutError };
