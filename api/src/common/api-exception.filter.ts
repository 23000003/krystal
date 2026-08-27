import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { fail } from './api-response';
import { AppLogger } from './app-logger';
import { SessionError } from './session.error';
import { describeError } from './describe-error';

/** Renders `SessionError` (and anything else) as the shared envelope. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger('api');

  catch(exception: unknown, host: ArgumentsHost) {
    // Socket errors are handled inside the gateway, not here.
    if (host.getType() !== 'http') throw exception;

    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof SessionError) {
      this.logger.warn('Request rejected', {
        code: exception.code,
        ...describeError(exception),
      });
      response
        .status(exception.status)
        .json(fail(exception.message, exception.code));
      return;
    }

    if (exception instanceof HttpException) {
      response
        .status(exception.getStatus())
        .json(fail(exception.message, 'http_error'));
      return;
    }

    this.logger.error('Unhandled error', describeError(exception));
    response
      .status(500)
      .json(fail('Something went wrong. Please try again.', 'internal_error'));
  }
}
