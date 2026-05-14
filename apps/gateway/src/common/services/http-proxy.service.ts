import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { fetch } from 'undici';
import { createLogger } from '@platform/logger';

const logger = createLogger({ service: 'gateway:http' });

/**
 * Thin HTTP proxy client for calling internal microservices.
 * Uses undici (native Node.js fetch) for maximum performance.
 */
@Injectable()
export class HttpProxyService {
  async forward<T = unknown>(
    method: string,
    url: string,
    options: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const { body, headers = {} } = options;

    logger.info(`Forwarding ${method} → ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as T;

    if (!response.ok) {
      const err = data as Record<string, unknown>;
      throw new HttpException(
        err['message'] ?? 'Upstream service error',
        (err['statusCode'] as number) ?? HttpStatus.BAD_GATEWAY,
      );
    }

    return data;
  }
}
