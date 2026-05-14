import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { createLogger } from '@platform/logger';

const logger = createLogger({ service: 'gateway:errors' });

/**
 * Global exception filter that standardizes all error responses.
 * Follows the platform error format: { statusCode, error, message, timestamp }.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r['message'] as string) ?? message;
        error = (r['error'] as string) ?? error;
      }
    } else if (exception instanceof Error) {
      logger.error('Unhandled exception', { error: exception.message, stack: exception.stack });
    }

    response.status(status).send({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
