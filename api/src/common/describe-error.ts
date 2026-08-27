/**
 * Unwraps an error and everything it was thrown `{ cause }` of.
 *
 * Wrapper errors carry a client-safe message that says nothing useful in a log
 * ("The speech service is unavailable"). The cause chain is where the actual
 * failure lives — a 429, a TypeError, a socket reset — so always log this
 * rather than `error.message` alone.
 */
export function describeError(error: unknown): {
  reason: string;
  cause?: string;
  stack?: string;
} {
  const message = (value: unknown): string =>
    value instanceof Error ? value.message : safeStringify(value);

  const chain: string[] = [];
  let current: unknown = error instanceof Error ? error.cause : undefined;
  // Bounded: a self-referential cause would otherwise loop forever.
  for (let depth = 0; current && depth < 5; depth++) {
    chain.push(message(current));
    current = current instanceof Error ? current.cause : undefined;
  }

  return {
    reason: message(error),
    ...(chain.length ? { cause: chain.join(' <- ') } : {}),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  };
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return '[unserialisable]';
  }
}

/**
 * HTTP status off a thrown SDK error. `@google/genai` puts it on `.status`;
 * anything without one returns undefined.
 */
export function httpStatusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}
