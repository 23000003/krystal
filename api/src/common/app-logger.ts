import pino, { type Logger as PinoLogger } from 'pino';
import { env } from '../config/env';

/**
 * Server-side application logger. Pretty in development, JSON in production.
 * Named `AppLogger` so it never gets confused with Nest's own `Logger`.
 *
 * @example
 * const logger = new AppLogger('interview-session');
 * logger.info('Session started', { sessionId });
 */
const environment = process.env.NODE_ENV;

export type LogContext = { group?: string } & Record<string, unknown>;

export class AppLogger {
  private context: LogContext;
  private logger: PinoLogger;

  private static readonly baseLogger: PinoLogger = pino({
    level: env.LOG_LEVEL ?? (environment === 'production' ? 'info' : 'debug'),
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(environment === 'production'
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname,group',
              messageFormat: '{if group}[{group}] {end}{msg}',
            },
          },
        }),
  });

  constructor(context: LogContext | string = {}) {
    this.context = typeof context === 'string' ? { group: context } : context;
    this.logger = AppLogger.baseLogger.child(
      this.context.group ? { group: this.context.group } : {},
    );
  }

  private static payload(data?: object) {
    return data ? { ...data, environment } : { environment };
  }

  private withContext(data?: object) {
    const rest = Object.fromEntries(
      Object.entries(this.context ?? {}).filter(([key]) => key !== 'group'),
    );
    return {
      ...AppLogger.payload(data),
      ...(Object.keys(rest).length > 0 ? { context: rest } : {}),
    };
  }

  debug(msg: string, data?: object) {
    this.logger.debug(this.withContext(data), msg);
  }

  info(msg: string, data?: object) {
    this.logger.info(this.withContext(data), msg);
  }

  warn(msg: string, data?: object) {
    this.logger.warn(this.withContext(data), msg);
  }

  error(msg: string, data?: object) {
    this.logger.error(this.withContext(data), msg);
  }
}
