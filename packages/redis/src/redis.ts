import Redis, { RedisOptions } from 'ioredis';

export interface RedisClientOptions {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  /** Enable automatic reconnect on connection loss. Default: true */
  enableAutoReconnect?: boolean;
}

/**
 * Creates a configured ioredis client.
 * Supports both URL-based and host/port connection strings.
 *
 * @throws Will throw if the connection cannot be established within the timeout.
 */
export function createRedisClient(options: RedisClientOptions = {}): Redis {
  const { url, enableAutoReconnect = true, keyPrefix, ...rest } = options;

  const ioredisOptions: RedisOptions = {
    keyPrefix,
    enableAutoPipelining: true,
    maxRetriesPerRequest: 3,
    retryStrategy: enableAutoReconnect
      ? (times) => Math.min(times * 100, 3000) // exponential backoff capped at 3s
      : undefined,
    ...rest,
  };

  if (url) {
    return new Redis(url, ioredisOptions);
  }

  return new Redis({
    host: rest.host ?? 'localhost',
    port: rest.port ?? 6379,
    ...ioredisOptions,
  });
}

export { Redis };
export type { RedisOptions };
