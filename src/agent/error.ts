import { CustomError } from '../queue';

class TimeoutError extends CustomError {
  public type = 'TimeoutError';

  constructor(message?: string, name?: string) {
    super(message, 'TimeoutError', name);
  }
}

export { TimeoutError };
