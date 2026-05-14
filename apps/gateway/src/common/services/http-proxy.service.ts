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
