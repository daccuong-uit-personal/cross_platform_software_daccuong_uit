import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { fetch } from 'undici';
import { createLogger } from '@platform/logger';
import { ApiSuccessResponse, ApiErrorResponse } from '@platform/common';

const logger = createLogger({ service: 'gateway:http' });

/**
 * Thin HTTP proxy client for calling internal microservices.
 * Uses undici (native Node.js fetch) for maximum performance.
 *
 * Architecture:
 * - All internal services wrap responses via TransformInterceptor → { statusCode, data, message?, meta }
 * - This service UNWRAPS `data` + hoists `message` before returning to the controller
 * - The Gateway's own TransformInterceptor is the SINGLE public-facing wrapping boundary
 * - This prevents double wrapping and keeps the contract: FE always gets one clean envelope
 */
@Injectable()
export class HttpProxyService {
  async forward<T = unknown>(
    method: string,
    url: string,
    options: { body?: any; headers?: Record<string, string>; isFormData?: boolean } = {},
  ): Promise<T> {
    const { body, headers = {}, isFormData = false } = options;

    logger.info(`Forwarding ${method} → ${url}`);

    const fetchHeaders: Record<string, string> = { ...headers };
    if (!isFormData) {
      fetchHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });

    const json = await response.json();

    if (!response.ok) {
      // Forward the full upstream error payload so AllExceptionsFilter
      // can extract validation `errors` and re-surface them to FE.
      const err = json as ApiErrorResponse;
      throw new HttpException(
        {
          message: err.message ?? 'Upstream service error',
          error: err.error ?? 'Bad Gateway',
          errors: err.errors,
        },
        err.statusCode ?? HttpStatus.BAD_GATEWAY,
      );
    }

    // Unwrap the internal service envelope: { statusCode, data, message?, meta }
    // Returns a flat object { ...data, message? } that our TransformInterceptor
    // will re-wrap into the standard gateway response for the FE.
    const wrapped = json as ApiSuccessResponse<Record<string, unknown>>;
    if (wrapped && typeof wrapped === 'object' && 'data' in wrapped) {
      const { data, message } = wrapped;
      return {
        ...(data ?? {}),
        ...(message ? { message } : {}),
      } as T;
    }

    // Fallback: not a wrapped response (e.g. health check), return as-is
    return json as T;
  }

  async pipeForward(url: string, res: any): Promise<void> {
    logger.info(`Piping GET → ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new HttpException('Upstream streaming error', HttpStatus.BAD_GATEWAY);
    }

    res.header('Content-Type', response.headers.get('Content-Type'));
    res.header('Content-Disposition', response.headers.get('Content-Disposition'));

    if (response.body) {
      // Fastify/Express compatibility: response.body from undici is a ReadableStream
      for await (const chunk of response.body as any) {
        res.raw.write(chunk);
      }
      res.raw.end();
    } else {
      res.send();
    }
  }
}
