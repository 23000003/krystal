/**
 * An error with a client-safe message and the HTTP status the API should use.
 * Anything else that escapes a service is treated as a 500.
 */
export class SessionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SessionError';
  }
}
